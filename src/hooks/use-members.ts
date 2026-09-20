import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
    const channel = supabase.channel('members:watch');
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
