import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveChannelTopic, supabase } from '@/lib/supabase';
import type { DmListItem, Room, UnreadRow } from '@/lib/types';

export function useChats() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dms, setDms] = useState<DmListItem[]>([]);
  const [unreadByChat, setUnreadByChat] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const [roomsRes, dmsRes, unreadRes] = await Promise.all([
      supabase.from('rooms').select('*').order('kind', { ascending: true }).order('created_at'),
      supabase.rpc('my_dms'),
      supabase.rpc('unread_counts'),
    ]);
    setRooms((roomsRes.data ?? []) as Room[]);
    setDms((dmsRes.data ?? []) as DmListItem[]);
    const map: Record<string, number> = {};
    for (const row of (unreadRes.data ?? []) as UnreadRow[]) {
      const key = row.room_id ?? row.conversation_id;
      if (key) map[key] = Number(row.unread ?? 0);
    }
    setUnreadByChat(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    // Any visible message change refreshes badges/inbox (debounced).
    // NOTE: this hook is mounted by BOTH the tabs layout (unread badge) and the
    // chats screen, so the topic must be unique per effect run — a shared fixed
    // topic would make the second mount grab the already-subscribed channel and
    // supabase-js would throw "cannot add `postgres_changes` callbacks ... after
    // `subscribe()`".
    const channel = supabase.channel(resolveChannelTopic('chats:watch', { unique: true }));
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => void refresh(), 600);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [refresh]);

  return { rooms, dms, unreadByChat, loading, refresh };
}
