import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ChatScreen } from '@/features/chat/chat-screen';
import { useMembers } from '@/hooks/use-members';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { lastSeenLabel } from '@/lib/time';
import type { Profile } from '@/lib/types';

export default function DmScreen() {
  const gated = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, onlineIds } = useSession();
  const { byId } = useMembers();
  const [other, setOther] = useState<Profile | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!id || !session) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('dm_participants')
        .select('user_id')
        .eq('conversation_id', id);
      if (cancelled) return;
      if (error || !data || !data.some((p) => p.user_id === session.user.id)) {
        setDenied(true);
        return;
      }
      const otherId = data.find((p) => p.user_id !== session.user.id)?.user_id;
      if (!otherId) {
        setDenied(true);
        return;
      }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', otherId).maybeSingle();
      if (!cancelled) setOther((prof as Profile) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, session]);

  useEffect(() => {
    if (denied) {
      Alert.alert('Chat unavailable', 'You are not a participant in this conversation.');
      router.back();
    }
  }, [denied]);

  if (gated || !other || !session) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const online = onlineIds.has(other.id);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ChatScreen
        scope={{ kind: 'dm', id }}
        title={other.display_name}
        subtitle={online ? 'Online' : lastSeenLabel(other.last_seen)}
        memberProfiles={[byId[other.id] ?? other]}
      />
    </View>
  );
}
