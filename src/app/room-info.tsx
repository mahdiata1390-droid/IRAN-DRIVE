import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { RoleBadge } from '@/components/role-badge';
import { Button, GlassSurface, Input } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { supabase } from '@/lib/supabase';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';
import type { Profile, Room } from '@/lib/types';

interface RoomMember {
  user_id: string;
  room_role: 'owner' | 'admin' | 'moderator' | 'member';
  profile: Profile;
}

export default function RoomInfoScreen() {
  useRequireAuth();
  const tr = t();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: me } = useSession();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [roomRes, memberRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('room_members')
        .select('user_id, room_role, profile:profiles!room_members_user_id_fkey(*)')
        .eq('room_id', id),
    ]);
    if (roomRes.data) {
      setRoom(roomRes.data as Room);
      setName((roomRes.data as Room).name);
      setDescription((roomRes.data as Room).description ?? '');
    }
    setMembers((memberRes.data as unknown as RoomMember[]) ?? []);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isLeader = me ? ['owner', 'leader', 'co_leader'].includes(me.role) : false;
  const isClanRoom = room?.kind === 'clan';

  const saveInfo = async () => {
    if (!room) return;
    setBusy(true);
    const { error } = await supabase
      .from('rooms')
      .update({ name: name.trim(), description: description.trim() })
      .eq('id', room.id);
    setBusy(false);
    if (error) {
      Alert.alert(tr.common.error, error.message);
      return;
    }
    setEditing(false);
    void load();
  };

  const changeRole = async (userId: string, roomRole: string) => {
    const { error } = await supabase
      .from('room_members')
      .update({ room_role: roomRole })
      .eq('room_id', id!)
      .eq('user_id', userId);
    if (error) Alert.alert(tr.common.error, error.message);
    else void load();
  };

  const removeMember = async (userId: string) => {
    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', id!)
      .eq('user_id', userId);
    if (error) Alert.alert(tr.common.error, error.message);
    else void load();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr.rooms.info,
          headerStyle: { backgroundColor: C.header },
          headerTintColor: C.text,
        }}
      />
      <FlatList
        data={members}
        keyExtractor={(m) => m.user_id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 10 }}>
            <GlassSurface style={{ padding: 18, borderRadius: R.xl, alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  backgroundColor: C.redSoft,
                  borderWidth: 1.5,
                  borderColor: C.redBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="people" size={36} color={C.red} />
              </View>
              {editing ? (
                <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 8 }}>
                  <Input label={tr.rooms.name} value={name} onChangeText={setName} />
                  <Input label="Description" value={description} onChangeText={setDescription} multiline style={{ height: 70, textAlignVertical: 'top' }} />
                  <Button label={tr.common.save} onPress={() => void saveInfo()} loading={busy} />
                </View>
              ) : (
                <>
                  <Text style={{ color: C.text, fontSize: 22, fontWeight: '900' }}>
                    {room?.name ?? '…'}
                  </Text>
                  <Text style={{ color: C.textDim, fontSize: 13.5, textAlign: 'center' }}>
                    {room?.description || '—'}
                  </Text>
                  {isLeader && !isClanRoom ? (
                    <Pressable onPress={() => setEditing(true)}>
                      <Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }}>
                        {tr.common.edit}
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              )}
            </GlassSurface>

            <Text style={{ color: C.textDim, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 }}>
              {tr.common.members} ({members.length})
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <GlassSurface style={{ padding: 12, borderRadius: R.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar
                url={item.profile.avatar_url}
                name={item.profile.display_name}
                size="m"
                online={Date.now() - new Date(item.profile.last_seen).getTime() < 120_000}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>
                    {item.profile.display_name}
                  </Text>
                  <RoleBadge role={item.profile.role} size="s" />
                </View>
                <Text style={{ color: C.textFaint, fontSize: 12 }}>
                  @{item.profile.username} · {item.room_role}
                </Text>
              </View>
              {isLeader && !isClanRoom && item.user_id !== me?.id ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    onPress={() =>
                      void changeRole(item.user_id, item.room_role === 'admin' ? 'member' : 'admin')
                    }
                    style={{ backgroundColor: C.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 11.5 }}>
                      {item.room_role === 'admin' ? '↓' : '★'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void removeMember(item.user_id)}
                    style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Ionicons name="person-remove-outline" size={14} color={C.danger} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          </GlassSurface>
        )}
      />
    </SafeAreaView>
  );
}
