import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, Input } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { canCreateRooms } from '@/lib/roles';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

export default function NewRoomScreen() {
  const gated = useRequireAuth();
  const { profile } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile && !canCreateRooms(profile.role)) {
      Alert.alert('Restricted', 'Co-Leaders and above can create rooms.');
      router.back();
    }
  }, [profile]);

  if (gated) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const slug = slugify(name);

  const create = async () => {
    if (!profile) return;
    if (name.trim().length < 2) {
      Alert.alert('Name too short', 'Room names need at least 2 characters.');
      return;
    }
    if (slug.length < 2) {
      Alert.alert('Invalid name', 'Use letters and numbers so the room gets a valid link.');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name: name.trim(),
        slug,
        description: description.trim(),
        kind: 'room',
        created_by: profile.id,
      })
      .select('id')
      .single();
    setBusy(false);
    if (error) {
      const msg = error.message.includes('duplicate')
        ? 'A room with a similar name already exists.'
        : error.message;
      Alert.alert('Could not create room', msg);
      return;
    }
    router.replace(`/room/${data.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'New Room',
          headerStyle: { backgroundColor: C.bgElevated },
          headerTintColor: C.text,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Input label="Room Name" value={name} onChangeText={setName} placeholder="Scrims" />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What is this room for?"
          multiline
          style={{ height: 90, textAlignVertical: 'top' }}
        />
        {name.trim() ? (
          <Text style={{ color: C.textFaint, fontSize: 12.5 }}>
            Channel link: #{slug}
          </Text>
        ) : null}
        <Button label="Create Room" onPress={() => void create()} loading={busy} />
      </ScrollView>
    </View>
  );
}
