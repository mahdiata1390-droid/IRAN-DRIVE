import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ChatSettings {
  room_id: string | null;
  conversation_id: string | null;
  pinned: boolean;
  muted: boolean;
  favorite: boolean;
  archived: boolean;
  draft: string;
}

export type ChatScopeKey = string; // `room:<id>` or `dm:<id>`

export function scopeKey(kind: 'room' | 'dm', id: string): ChatScopeKey {
  return `${kind}:${id}`;
}

/**
 * Loads all chat settings for the signed-in user once and exposes optimistic
 * toggles that write through to `chat_settings`.
 */
export function useChatSettings(myId: string | null) {
  const [settings, setSettings] = useState<Map<ChatScopeKey, ChatSettings>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!myId) return;
    void (async () => {
      const { data } = await supabase
        .from('chat_settings')
        .select('room_id, conversation_id, pinned, muted, favorite, archived, draft');
      const map = new Map<ChatScopeKey, ChatSettings>();
      for (const row of (data as ChatSettings[]) ?? []) {
        if (row.room_id) map.set(scopeKey('room', row.room_id), { ...row, room_id: row.room_id });
        if (row.conversation_id)
          map.set(scopeKey('dm', row.conversation_id), { ...row, conversation_id: row.conversation_id });
      }
      setSettings(map);
      setLoading(false);
    })();
  }, [myId]);

  const update = useCallback(
    async (
      kind: 'room' | 'dm',
      id: string,
      patch: Partial<Omit<ChatSettings, 'room_id' | 'conversation_id'>>,
    ) => {
      const key = scopeKey(kind, id);
      setSettings((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        const base: ChatSettings = existing ?? {
          room_id: kind === 'room' ? id : null,
          conversation_id: kind === 'dm' ? id : null,
          pinned: false,
          muted: false,
          favorite: false,
          archived: false,
          draft: '',
        };
        next.set(key, { ...base, ...patch });
        return next;
      });

      const payload: Record<string, unknown> = { user_id: myId, updated_at: new Date().toISOString() };
      if (kind === 'room') payload.room_id = id;
      else payload.conversation_id = id;
      Object.assign(payload, patch);

      await supabase.from('chat_settings').upsert(payload, {
        onConflict: kind === 'room' ? 'user_id,room_id' : 'user_id,conversation_id',
      });
    },
    [myId],
  );

  const get = useCallback(
    (kind: 'room' | 'dm', id: string): ChatSettings =>
      settings.get(scopeKey(kind, id)) ?? {
        room_id: null,
        conversation_id: null,
        pinned: false,
        muted: false,
        favorite: false,
        archived: false,
        draft: '',
      },
    [settings],
  );

  return { settings, loading, update, get };
}
