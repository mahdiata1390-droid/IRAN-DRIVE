import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import * as ExpoClipboard from 'expo-clipboard';
import { Avatar } from '@/components/avatar';
import { RoleBadge } from '@/components/role-badge';
import { Button, Spinner } from '@/components/ui';
import { useMembers } from '@/hooks/use-members';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';
import { lastSeenLabel } from '@/lib/time';
import { ROLE_ORDER, canAssignRole, roleLabel, roleRank } from '@/lib/roles';
import type { ClanRole, Profile } from '@/lib/types';

export default function MemberScreen() {
  const gated = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile, onlineIds, refreshProfile } = useSession();
  const { byId, loading, refresh } = useMembers();
  const [openingChat, setOpeningChat] = useState(false);

  if (gated) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const member: Profile | undefined = id ? byId[id] : undefined;
  const isMe = member?.id === session?.user.id;
  const online = member ? onlineIds.has(member.id) : false;

  const startChat = async () => {
    if (!member || !session) return;
    setOpeningChat(true);
    try {
      const { data, error } = await supabase.rpc('create_dm', { other_user: member.id });
      if (error) throw error;
      router.replace(`/dm/${data}`);
    } catch (e) {
      Alert.alert('Could not open chat', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setOpeningChat(false);
    }
  };

  const assignRole = (newRole: ClanRole) => {
    if (!member) return;
    Alert.alert(
      'Change role',
      `Set ${member.display_name}'s role to ${roleLabel(newRole)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            void supabase
              .rpc('set_member_role', { target_user: member.id, new_role: newRole })
              .then(async ({ error }) => {
                if (error) {
                  Alert.alert('Not allowed', error.message);
                } else {
                  await refresh();
                  if (member.id === session?.user.id) await refreshProfile();
                }
              });
          },
        },
      ],
    );
  };

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Spinner />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.textFaint }}>Member not found</Text>
        <Button label="Go back" variant="subtle" onPress={() => router.back()} />
      </View>
    );
  }

  const assignable: ClanRole[] = ROLE_ORDER.filter(
    (r) => r !== member.role && canAssignRole(profile.role, member.role, r),
  );

  const copyUid = async () => {
    if (!member.cod_uid) return;
    await ExpoClipboard.setStringAsync(member.cod_uid);
    Alert.alert('Copied', 'COD Mobile UID copied.');
  };

  const detailRow = (label: string, value: string, copyable = false) => (
    <Pressable
      onPress={copyable ? () => void copyUid() : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      <Text style={{ color: C.textDim, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>
        {value}
        {copyable ? '  ⧉' : ''}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Member',
          headerStyle: { backgroundColor: C.bgElevated },
          headerTintColor: C.text,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Avatar url={member.avatar_url} name={member.display_name} size="xl" online={online} />
          <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginTop: 6 }}>
            {member.display_name}
          </Text>
          <Text style={{ color: C.textFaint, fontSize: 14 }}>@{member.username}</Text>
          <RoleBadge role={member.role} />
          <Text style={{ color: online ? C.online : C.textFaint, fontSize: 13 }}>
            {online ? 'Online' : lastSeenLabel(member.last_seen)}
          </Text>
        </View>

        {member.bio ? (
          <Text style={{ color: C.textDim, fontSize: 14.5, textAlign: 'center', lineHeight: 21 }}>
            {member.bio}
          </Text>
        ) : null}

        {!isMe ? (
          <Button label="Send Message" onPress={() => void startChat()} loading={openingChat} />
        ) : (
          <Button label="Edit My Profile" variant="subtle" onPress={() => router.push('/edit-profile')} />
        )}

        <View
          style={{
            backgroundColor: C.bgElevated,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: R.l,
            paddingHorizontal: 16,
          }}
        >
          {detailRow('COD Mobile UID', member.cod_uid ?? 'Not set', Boolean(member.cod_uid))}
          {detailRow('Clan role', roleLabel(member.role))}
          {detailRow('Joined', new Date(member.created_at).toLocaleDateString())}
        </View>

        {/* Role management — enforced again server-side */}
        {assignable.length > 0 && roleRank(profile.role) > roleRank(member.role) ? (
          <View
            style={{
              backgroundColor: C.bgElevated,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: R.l,
              padding: 16,
              gap: 10,
            }}
          >
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>Clan Management</Text>
            <Text style={{ color: C.textFaint, fontSize: 12.5 }}>
              Permissions are enforced on the server, not just in the app.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {assignable.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => assignRole(r)}
                  style={({ pressed }) => ({
                    backgroundColor: C.bgCard,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 999,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>
                    → {roleLabel(r)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
