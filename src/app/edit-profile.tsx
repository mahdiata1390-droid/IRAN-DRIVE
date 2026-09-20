import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '@/components/avatar';
import { Button, Input } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';

export default function EditProfileScreen() {
  const gated = useRequireAuth();
  const { session, profile, refreshProfile } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [codUid, setCodUid] = useState('');
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? '');
      setCodUid(profile.cod_uid ?? '');
    }
  }, [profile]);

  if (gated || !profile) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const userId = session!.user.id;
    const ext = asset.mimeType?.split('/')[1] ?? 'jpg';
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const res = await fetch(asset.uri);
    const blob = await res.blob();

    // Replace any previous avatar file under the user's folder.
    const { data: existing } = await supabase.storage.from('avatars').list(userId);
    if (existing?.length) {
      await supabase.storage
        .from('avatars')
        .remove(existing.map((f) => `${userId}/${f.name}`));
    }

    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: false,
    });
    if (error) {
      Alert.alert('Upload failed', error.message);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarPath(data.publicUrl);
  };

  const save = async () => {
    if (!displayName.trim()) {
      Alert.alert('Missing name', 'Display name cannot be empty.');
      return;
    }
    setBusy(true);
    const updates: Record<string, string | null> = {
      display_name: displayName.trim(),
      bio: bio.trim() || null,
      cod_uid: codUid.trim() || null,
    };
    if (avatarPath) updates.avatar_url = avatarPath;
    const { error } = await supabase.from('profiles').update(updates).eq('id', session!.user.id);
    setBusy(false);
    if (error) {
      Alert.alert('Save failed', error.message);
      return;
    }
    await refreshProfile();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Profile',
          headerStyle: { backgroundColor: C.bgElevated },
          headerTintColor: C.text,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => void pickAvatar()}>
            {avatarPath ? (
              <Image
                source={{ uri: avatarPath }}
                style={{ width: 96, height: 96, borderRadius: 48 }}
              />
            ) : (
              <Avatar url={profile.avatar_url} name={profile.display_name} size="xl" />
            )}
          </Pressable>
          <Pressable onPress={() => void pickAvatar()}>
            <Text style={{ color: C.red, fontSize: 13.5, fontWeight: '700' }}>Change Avatar</Text>
          </Pressable>
        </View>

        <Input label="Display Name" value={displayName} onChangeText={setDisplayName} placeholder="Shadow" />
        <Input
          label="Bio"
          value={bio}
          onChangeText={(t) => setBio(t.slice(0, 280))}
          placeholder="Sniper main · BP grinder"
          multiline
          style={{ height: 90, textAlignVertical: 'top' }}
        />
        <Input
          label="COD Mobile UID"
          value={codUid}
          onChangeText={(t) => setCodUid(t.replace(/\D/g, '').slice(0, 12))}
          keyboardType="number-pad"
          placeholder="1234567890"
        />

        <Button label="Save Changes" onPress={() => void save()} loading={busy} />
      </ScrollView>
    </View>
  );
}
