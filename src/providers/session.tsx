import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface SessionContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  onlineIds: Set<string>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

const HEARTBEAT_MS = 60_000;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) setProfile(data as Profile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) await fetchProfile(session.user.id);
  }, [session?.user.id, fetchProfile]);

  // Boot: restore session.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        if (data.session) void fetchProfile(data.session.user.id);
      })
      .finally(() => setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setOnlineIds(new Set());
        presenceChannelRef.current?.unsubscribe();
        presenceChannelRef.current = null;
      } else if (nextSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        void fetchProfile(nextSession.user.id);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [fetchProfile]);

  // Per-session live wiring: profile row sync, presence, last-seen heartbeat.
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;

    const profileSub = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => setProfile(payload.new as Profile),
      )
      .subscribe();

    const heartbeat = setInterval(() => {
      void supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', userId);
    }, HEARTBEAT_MS);

    const channel = supabase.channel('clan:online', { config: { presence: { key: userId } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ online_at: new Date().toISOString() });
      });
    presenceChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(profileSub);
      presenceChannelRef.current = null;
      clearInterval(heartbeat);
    };
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ session, profile, loading, onlineIds, refreshProfile, signOut }),
    [session, profile, loading, onlineIds, refreshProfile, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
