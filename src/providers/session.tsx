import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { resolveChannelTopic, supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface SessionContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
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
  const [profileLoading, setProfileLoading] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const clearSessionState = useCallback(() => {
    setSession(null);
    setProfile(null);
    setProfileLoading(false);
    setOnlineIds(new Set());
    const presence = presenceChannelRef.current;
    presenceChannelRef.current = null;
    if (presence) void supabase.removeChannel(presence);
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    // The profile row is created by a database trigger (handle_new_user) right
    // after signup; the row can take a moment to become visible to the new
    // session, so retry a few times before treating it as missing.
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (data) {
        setProfile(data as Profile);
        setProfileLoading(false);
        return;
      }
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 800));
    }
    setProfileLoading(false);
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
      if (event === 'SIGNED_OUT') {
        clearSessionState();
        router.replace('/(auth)/welcome');
        return;
      }

      setSession(nextSession);
      if (nextSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
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
      .channel(resolveChannelTopic(`profile:${userId}`))
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => setProfile(payload.new as Profile),
      )
      .subscribe();

    const heartbeat = setInterval(() => {
      void supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', userId);
    }, HEARTBEAT_MS);

    const channel = supabase.channel(resolveChannelTopic('clan:online'), {
      config: { presence: { key: userId } },
    });
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
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      clearSessionState();
      router.replace('/(auth)/welcome');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign out right now.';
      Alert.alert('Sign out failed', message);
    }
  }, [clearSessionState]);

  const value = useMemo<SessionContextValue>(
    () => ({ session, profile, loading, profileLoading, onlineIds, refreshProfile, signOut }),
    [session, profile, loading, profileLoading, onlineIds, refreshProfile, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
