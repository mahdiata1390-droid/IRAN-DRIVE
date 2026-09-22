import { useEffect } from 'react';
import { router } from 'expo-router';
import { useSession } from '@/providers/session';

/**
 * Guards protected screens. Requires BOTH a session and a completed profile;
 * signed-out users go to welcome, profile-less sessions go to setup.
 *
 * While the profile fetch is still in flight (profileLoading) the guard holds
 * on the current screen instead of ejecting — right after signup the profile
 * row is created by a DB trigger and the first fetch may miss it, so ejecting
 * immediately used to bounce brand-new users back to /sign-up (blank screen).
 */
export function useRequireAuth(): boolean {
  const { session, profile, loading, profileLoading } = useSession();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!session) {
      router.replace('/(auth)/welcome');
    } else if (!profile) {
      router.replace('/(auth)/sign-up');
    }
  }, [loading, profileLoading, session, profile]);

  return loading || profileLoading || !session || !profile;
}
