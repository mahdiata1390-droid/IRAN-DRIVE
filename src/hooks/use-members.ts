import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveChannelTopic, supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { roleRank } from '@/lib/roles';

export function useMembers() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*');
    const list = (data ?? []) as Profile[];
    list.sort(
      (a, b) =>
        roleRank(b.role) - roleRank(a.role) ||
        a.display_name.localeCompare(b.display_name),
    );
    setMembers(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    // useMembers is mounted by the members tab and by dm/member/room screens, so
    // the topic is reused across concurrent mounts — resolveChannelTopic adds a
    // suffix when the topic is still taken (avoids "cannot add ... after
    // subscribe()" from supabase-js).
    const channel = supabase.channel(resolveChannelTopic('members:watch'));
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const byUsername = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const m of members) map[m.username.toLowerCase()] = m;
    return map;
  }, [members]);

  const byId = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const m of members) map[m.id] = m;
    return map;
  }, [members]);

  return { members, byUsername, byId, loading, refresh };
}
