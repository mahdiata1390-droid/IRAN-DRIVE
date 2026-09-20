import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Announcement, FriendRequestRow, FriendRow, ReportRow, WarEvent } from '@/lib/types';

export function useFriends(myId: string | null) {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [requests, setRequests] = useState<FriendRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!myId) return;
    const [f, r] = await Promise.all([
      supabase.rpc('my_friends'),
      supabase.rpc('my_friend_requests'),
    ]);
    setFriends((f.data as FriendRow[]) ?? []);
    setRequests((r.data as FriendRequestRow[]) ?? []);
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    void refresh();
    if (!myId) return;
    const sub = supabase
      .channel(`friends:${myId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void sub.unsubscribe();
    };
  }, [myId, refresh]);

  const sendRequest = useCallback(async (other: string) => {
    const { error } = await supabase.rpc('send_friend_request', { other });
    return error;
  }, []);

  const respond = useCallback(async (requestId: string, accept: boolean) => {
    const { error } = await supabase.rpc('respond_friend_request', {
      req_id: requestId,
      accept,
    });
    await refresh();
    return error;
  }, [refresh]);

  const removeFriend = useCallback(
    async (other: string) => {
      await supabase.rpc('remove_friend', { other });
      await refresh();
    },
    [refresh],
  );

  return { friends, requests, loading, sendRequest, respond, removeFriend, refresh };
}

export function useAnnouncements(canPost: boolean) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const query = supabase
      .from('announcements')
      .select('*, author_profile:profiles!announcements_author_fkey(display_name, username)')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    const { data } = await query;
    setItems((data as Announcement[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const publish = useCallback(
    async (title: string, body: string, priority: 'normal' | 'important' | 'critical') => {
      const { error } = await supabase.from('announcements').insert({ title, body, priority });
      await refresh();
      return error;
    },
    [refresh],
  );

  return { items, loading, publish, refresh, canPost };
}

export function useWarEvents(canManage: boolean) {
  const [events, setEvents] = useState<WarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('war_events').select('*').order('starts_at', { ascending: false }).limit(50);
    setEvents((data as WarEvent[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: { title: string; opponent: string; starts_at: string; notes?: string }) => {
      const { error } = await supabase.from('war_events').insert(input);
      await refresh();
      return error;
    },
    [refresh],
  );

  const setResult = useCallback(
    async (id: string, result: 'win' | 'loss' | 'draw', score: string) => {
      const { error } = await supabase.from('war_events').update({ result, score }).eq('id', id);
      await refresh();
      return error;
    },
    [refresh],
  );

  return { events, loading, create, setResult, canManage };
}

export function useReports(isMod: boolean) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isMod) {
      setReports([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('reports')
      .select(
        '*, reporter_profile:profiles!reports_reporter_fkey(display_name, username), target_profile:profiles!reports_target_user_fkey(display_name, username)',
      )
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50);
    setReports((data as ReportRow[]) ?? []);
    setLoading(false);
  }, [isMod]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resolve = useCallback(
    async (id: string, status: 'resolved' | 'dismissed') => {
      await supabase.from('reports').update({ status, resolved_at: new Date().toISOString() }).eq('id', id);
      await refresh();
    },
    [refresh],
  );

  return { reports, loading, resolve, refresh };
}

export function submitReport(input: {
  target_user?: string | null;
  message_id?: string | null;
  room_id?: string | null;
  reason: string;
}) {
  return supabase.from('reports').insert(input);
}

export async function isUserMuted(): Promise<boolean> {
  const { data } = await supabase.rpc('am_i_muted');
  return data === true;
}
