import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveChannelTopic, supabase } from '@/lib/supabase';
import type { Message, Reaction } from '@/lib/types';

export interface ChatScope {
  kind: 'room' | 'dm';
  id: string;
}

const PAGE_SIZE = 50;
const MESSAGE_SELECT =
  // Both embeds are disambiguated with FK hints: `messages.sender_id` has a
  // many-to-many path to profiles via reactions, which made the plain
  // `sender:profiles(*)` embed ambiguous → PostgREST answered HTTP 300
  // (PGRST201) and every message insert silently failed on web.
  '*, sender:profiles!messages_sender_id_fkey(*), reply_to:messages(id, content, sender_id, deleted_at, sender:profiles!messages_sender_id_fkey(display_name, username))';

export function useMessages(scope: ChatScope, myId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, Reaction[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [partnerLastRead, setPartnerLastRead] = useState<string | null>(null);
  const [myLastReadAt, setMyLastReadAt] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const messageIdsRef = useRef<Set<string>>(new Set());
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastTypingSentRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myIdRef = useRef(myId);
  myIdRef.current = myId;

  const scopeColumn = scope.kind === 'room' ? 'room_id' : 'conversation_id';

  const mergeMessage = useCallback((incoming: Message) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === incoming.id);
      if (idx === -1) {
        // Keep chronological order; realtime can arrive slightly out of order.
        const next = [...prev, incoming];
        next.sort((a, b) => a.created_at.localeCompare(b.created_at));
        return next;
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...incoming };
      return next;
    });
    messageIdsRef.current.add(incoming.id);
  }, []);

  // Initial load + realtime wiring.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setReactionsByMessage({});
    setHasMore(true);
    messageIdsRef.current = new Set();
    setPartnerLastRead(null);

    (async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq(scopeColumn, scope.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (cancelled) return;
      const rows = ((data ?? []) as Message[]).slice().reverse();
      setMessages(rows);
      messageIdsRef.current = new Set(rows.map((m) => m.id));
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);

      if (rows.length > 0) {
        const ids = rows.map((m) => m.id);
        const { data: reactions } = await supabase.from('reactions').select('*').in('message_id', ids);
        if (!cancelled && reactions) {
          const map: Record<string, Reaction[]> = {};
          for (const r of reactions as Reaction[]) {
            (map[r.message_id] ??= []).push(r);
          }
          setReactionsByMessage(map);
        }
      }

      if (scope.kind === 'dm') {
        const { data: readState } = await supabase
          .from('dm_read_states')
          .select('user_id, last_read_at')
          .eq('conversation_id', scope.id);
        if (!cancelled && readState) {
          const rows = readState as { user_id: string; last_read_at: string }[];
          const other = rows.find((r) => r.user_id !== myIdRef.current);
          if (other) setPartnerLastRead(other.last_read_at);
          const mine = rows.find((r) => r.user_id === myIdRef.current);
          if (mine) setMyLastReadAt(mine.last_read_at);
        }
      }
    })();

    // Attach ALL listeners before subscribe(): supabase-js throws
    // "cannot add `postgres_changes` callbacks ... after `subscribe()`" once the
    // channel is joining/joined.
    const topic = resolveChannelTopic(`${scope.kind}:${scope.id}`);
    const channel = supabase.channel(topic, {
      config: { presence: { key: myIdRef.current ?? 'anon' } },
    });

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `${scopeColumn}=eq.${scope.id}` },
        (payload) => {
          const row = payload.new as Message;
          if (row.sender_id === myIdRef.current) return; // already appended optimistically
          mergeMessage(row);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `${scopeColumn}=eq.${scope.id}` },
        (payload) => mergeMessage(payload.new as Message),
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' }, (payload) => {
        const r = payload.new as Reaction;
        if (!messageIdsRef.current.has(r.message_id)) return;
        setReactionsByMessage((prev) => {
          const list = prev[r.message_id] ?? [];
          if (list.some((x) => x.user_id === r.user_id && x.emoji === r.emoji)) return prev;
          return { ...prev, [r.message_id]: [...list, r] };
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reactions' }, (payload) => {
        const r = payload.old as Reaction;
        if (!r?.message_id) return;
        setReactionsByMessage((prev) => {
          const list = prev[r.message_id];
          if (!list) return prev;
          return {
            ...prev,
            [r.message_id]: list.filter((x) => !(x.user_id === r.user_id && x.emoji === r.emoji)),
          };
        });
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { user_id, name, typing } = payload as { user_id: string; name: string; typing: boolean };
        if (user_id === myIdRef.current) return;
        const timers = typingTimersRef.current;
        const prevTimer = timers.get(user_id);
        if (prevTimer) {
          clearTimeout(prevTimer);
          timers.delete(user_id);
        }
        setTypingNames((prev) => prev.filter((n) => n !== name));
        if (typing) {
          setTypingNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
          timers.set(
            user_id,
            setTimeout(() => {
              timers.delete(user_id);
              setTypingNames((prev) => prev.filter((n) => n !== name));
            }, 4500),
          );
        }
      })
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length);
      });

    if (scope.kind === 'dm') {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_read_states',
          filter: `conversation_id=eq.${scope.id}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { user_id: string; last_read_at: string } | null;
          if (row && row.user_id !== myIdRef.current) setPartnerLastRead(row.last_read_at);
        },
      );
    }

    channel.subscribe();

    channelRef.current = channel;
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      channelRef.current = null;
      for (const t of typingTimersRef.current.values()) clearTimeout(t);
      typingTimersRef.current.clear();
    };
  }, [scope.kind, scope.id, scopeColumn, mergeMessage]);

  const loadMore = useCallback(async () => {
    setMessages((current) => {
      if (loadingMore || !hasMore || current.length === 0) return current;
      const oldest = current[0];
      void (async () => {
        setLoadingMore(true);
        const { data } = await supabase
          .from('messages')
          .select(MESSAGE_SELECT)
          .eq(scopeColumn, scope.id)
          .lt('created_at', oldest.created_at)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);
        if (data) {
          const rows = (data as Message[]).slice().reverse();
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id));
            const fresh = rows.filter((m) => !known.has(m.id));
            for (const m of fresh) messageIdsRef.current.add(m.id);
            return [...fresh, ...prev];
          });
          if (rows.length > 0) {
            const ids = rows.map((m) => m.id);
            const { data: reactions } = await supabase.from('reactions').select('*').in('message_id', ids);
            if (reactions) {
              const map: Record<string, Reaction[]> = {};
              for (const r of reactions as Reaction[]) {
                (map[r.message_id] ??= []).push(r);
              }
              setReactionsByMessage((prev) => ({ ...prev, ...map }));
            }
          }
          setHasMore(rows.length === PAGE_SIZE);
        }
        setLoadingMore(false);
      })();
      return current;
    });
  }, [loadingMore, hasMore, scope.id, scopeColumn]);

  // Throttled typing broadcaster for the current user.
  const setTypingNameProvider = useCallback((name: string) => {
    return (typing: boolean) => {
      const now = Date.now();
      if (typing && now - lastTypingSentRef.current < 2000) return;
      lastTypingSentRef.current = now;
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: myIdRef.current, name, typing },
      });
    };
  }, []);

  const send = useCallback(
    async (content: string, replyToId: string | null, mentionIds: string[]) => {
      if (!myId) return;
      const insert = {
        [scopeColumn]: scope.id,
        sender_id: myId,
        content,
        reply_to_id: replyToId,
        mentions: mentionIds,
      };
      const { data, error } = await supabase
        .from('messages')
        .insert(insert)
        .select(MESSAGE_SELECT)
        .single();
      if (error) throw error;
      if (data) mergeMessage(data as Message);
    },
    [myId, scope.id, scopeColumn, mergeMessage],
  );

  /** Forwards an existing message (text or media) into this chat as a new one. */
  const forward = useCallback(
    async (source: Message, target?: ChatScope) => {
      if (!myId) return;
      const dest = target ?? scope;
      const destColumn = dest.kind === 'room' ? 'room_id' : 'conversation_id';
      const insert: Record<string, unknown> = {
        [destColumn]: dest.id,
        sender_id: myId,
        content: source.content,
        forwarded_from: source.sender?.display_name ?? null,
        media_type: source.media_type,
        media_url: source.media_url,
        media_name: source.media_name,
        media_size: source.media_size,
        media_duration_ms: source.media_duration_ms,
        media_waveform: source.media_waveform,
      };
      const { data, error } = await supabase
        .from('messages')
        .insert(insert)
        .select(MESSAGE_SELECT)
        .single();
      if (error) throw error;
      if (data && !target) mergeMessage(data as Message);
    },
    [myId, scope, scopeColumn, mergeMessage],
  );

  /** Sends a media message (already uploaded to storage) or a text sticker. */
  const sendMedia = useCallback(
    async (media: {
      kind: 'image' | 'video' | 'audio' | 'voice' | 'file' | 'sticker';
      uri: string;
      name?: string;
      size?: number;
      durationMs?: number;
      waveform?: number[];
      stickerText?: string;
    }) => {
      if (!myId) return;
      const isSticker = media.kind === 'sticker' && !!media.stickerText;
      const insert = {
        [scopeColumn]: scope.id,
        sender_id: myId,
        content: isSticker ? media.stickerText! : '',
        media_type: media.kind,
        media_url: isSticker ? null : media.uri,
        media_name: media.name ?? null,
        media_size: media.size ?? null,
        media_duration_ms: media.durationMs ?? null,
        media_waveform: media.waveform ?? null,
      };
      const { data, error } = await supabase
        .from('messages')
        .insert(insert)
        .select(MESSAGE_SELECT)
        .single();
      if (error) throw error;
      if (data) mergeMessage(data as Message);
    },
    [myId, scope.id, scopeColumn, mergeMessage],
  );

  const edit = useCallback(async (messageId: string, content: string) => {
    const { data, error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId)
      .select(MESSAGE_SELECT)
      .single();
    if (error) throw error;
    if (data) mergeMessage(data as Message);
  }, [mergeMessage]);

  const remove = useCallback(async (messageId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .select(MESSAGE_SELECT)
      .single();
    if (error) throw error;
    if (data) mergeMessage(data as Message);
  }, [mergeMessage]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!myId) return;
    const existing = reactionsByMessage[messageId]?.find(
      (r) => r.user_id === myId && r.emoji === emoji,
    );
    if (existing) {
      setReactionsByMessage((prev) => ({
        ...prev,
        [messageId]: (prev[messageId] ?? []).filter((r) => !(r.user_id === myId && r.emoji === emoji)),
      }));
      await supabase
        .from('reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', myId)
        .eq('emoji', emoji);
    } else {
      setReactionsByMessage((prev) => ({
        ...prev,
        [messageId]: [...(prev[messageId] ?? []), { message_id: messageId, user_id: myId, emoji }],
      }));
      await supabase
        .from('reactions')
        .upsert(
          { message_id: messageId, user_id: myId, emoji },
          { onConflict: 'message_id,user_id,emoji', ignoreDuplicates: true },
        );
    }
  }, [myId, reactionsByMessage]);

  const togglePin = useCallback(async (messageId: string) => {
    const { data, error } = await supabase.rpc('toggle_pin', { msg_id: messageId });
    if (error) throw error;
    const pinned = Boolean(data);
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, pinned } : m)),
    );
    return pinned;
  }, []);

  const markRead = useCallback(() => {
    if (!myId) return;
    setMyLastReadAt(new Date().toISOString());
    void (scope.kind === 'room'
      ? supabase.rpc('mark_room_read', { p_room_id: scope.id })
      : supabase.rpc('mark_dm_read', { p_conversation_id: scope.id }));
  }, [myId, scope.kind, scope.id]);

  const search = useCallback(
    async (query: string) => {
      const { data, error } = await supabase.rpc('search_messages', {
        p_room_id: scope.kind === 'room' ? scope.id : null,
        p_conversation_id: scope.kind === 'dm' ? scope.id : null,
        p_q: query,
      });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    [scope.kind, scope.id],
  );

  const pinnedMessages = useMemo(() => messages.filter((m) => m.pinned && !m.deleted_at), [messages]);

  return {
    messages,
    reactionsByMessage,
    loading,
    loadingMore,
    hasMore,
    typingNames,
    partnerLastRead,
    myLastReadAt,
    onlineCount,
    pinnedMessages,
    send,
    sendMedia,
    forward,
    edit,
    remove,
    toggleReaction,
    togglePin,
    markRead,
    search,
    loadMore,
    notifyTyping: setTypingNameProvider,
  };
}
