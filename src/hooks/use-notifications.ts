import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveChannelTopic, supabase } from '@/lib/supabase';

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'dm' | 'mention';
  title: string;
  body: string;
  conversation_id: string | null;
  room_id: string | null;
  message_id: string | null;
  read_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

/**
 * Realtime notifications feed backed by the existing `notifications` table
 * (populated by the notify_message() DB trigger on every message insert:
 * DMs for the recipient, mentions for the mentioned users in rooms).
 */
export function useNotifications(myId: string | null, opts?: { live?: boolean }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchPage = useCallback(async () => {
    if (!myId) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    setItems((data ?? []) as AppNotification[]);
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    void fetchPage();
    if (cancelled) return;
    if (opts?.live === false) return; // badge-only usage: no channel needed

    const topic = resolveChannelTopic(`notifications:${myId}`, { unique: true });
    const channel = supabase.channel(topic);
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${myId}` },
        (payload) => {
          const row = payload.new as AppNotification;
          if (row) setItems((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]));
        },
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      cancelled = true;
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) void supabase.removeChannel(ch);
    };
  }, [myId, fetchPage, opts?.live]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => !n.read_at);
    if (unread.length === 0) return;
    const ids = unread.map((n) => n.id);
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
  }, [items]);

  return { items, loading, unreadCount, markAllRead, refresh: fetchPage };
}
