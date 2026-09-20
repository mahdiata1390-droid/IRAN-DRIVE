import { useEffect } from 'react';
import { router } from 'expo-router';
import { useSession } from '@/providers/session';

/** Guards protected screens: redirects signed-out users to the welcome screen. */
export function useRequireAuth(): boolean {
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/welcome');
    }
  }, [loading, session]);

  return loading || !session;
}
