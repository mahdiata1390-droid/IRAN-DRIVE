import { useEffect } from 'react';
import { router } from 'expo-router';
import { useSession } from '@/providers/session';

/**
 * Guards protected screens. Requires BOTH a session and a completed profile;
 * signed-out users go to welcome, profile-less sessions go to setup.
 */
export function useRequireAuth(): boolean {
  const { session, profile, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/(auth)/welcome');
    } else if (!profile) {
      router.replace('/(auth)/sign-up');
    }
  }, [loading, session, profile]);

  return loading || !session || !profile;
}
