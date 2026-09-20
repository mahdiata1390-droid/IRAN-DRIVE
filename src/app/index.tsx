import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/providers/session';
import { C } from '@/lib/theme';

export default function Index() {
  const { session, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    router.replace(session ? '/(tabs)/chats' : '/(auth)/welcome');
  }, [loading, session]);

  return <View style={{ flex: 1, backgroundColor: C.bg }} />;
}
