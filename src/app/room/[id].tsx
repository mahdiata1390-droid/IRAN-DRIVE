import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ChatScreen } from '@/features/chat/chat-screen';
import { useMembers } from '@/hooks/use-members';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';
import type { Room } from '@/lib/types';

export default function RoomScreen() {
  const gated = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { onlineIds } = useSession();
  const [room, setRoom] = useState<Room | null>(null);
  const [missing, setMissing] = useState(false);
  const { members } = useMembers();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('rooms').select('*').eq('id', id).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setMissing(true);
        return;
      }
      setRoom(data as Room);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (missing) {
      Alert.alert('Room not found', 'This room may have been removed.');
      router.back();
    }
  }, [missing]);

  if (gated || !room || !session) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const onlineCount = members.filter((m) => onlineIds.has(m.id)).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ChatScreen
        scope={{ kind: 'room', id: room.id }}
        title={room.name}
        subtitle={`${onlineCount} online · ${members.length} members`}
        memberProfiles={members}
      />
    </View>
  );
}
