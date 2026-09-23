import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { RoleBadge } from '@/components/role-badge';
import { EmptyState, Spinner } from '@/components/ui';
import { useMembers } from '@/hooks/use-members';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/alert';
import { C, R } from '@/lib/theme';
import { lastSeenLabel } from '@/lib/time';
import type { Profile } from '@/lib/types';

export default function MembersScreen() {
  const gated = useRequireAuth();
  const { session, profile, onlineIds } = useSession();
  const insets = useSafeAreaInsets();
  const { members, loading, refresh } = useMembers();
  const [query, setQuery] = useState('');
  const [opening, setOpenning] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return members;
    const q = query.toLowerCase();
    return members.filter(
      (m) =>
        m.display_name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q),
    );
  }, [members, query]);

  if (gated) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const openDm = async (other: Profile) => {
    if (!session) return;
    setOpenning(other.id);
    try {
      const { data, error } = await supabase.rpc('create_dm', { other_user: other.id });
      if (error) throw error;
      router.push(`/dm/${data}`);
    } catch (e) {
      showAlert('Chat unavailable', e instanceof Error ? e.message : 'Could not open this chat.');
    } finally {
      setOpenning(null);
    }
  };

  const renderMember = ({ item }: { item: Profile }) => {
    const online = onlineIds.has(item.id);
    const isMe = item.id === session?.user.id;
    return (
      <Pressable
        onPress={() => (isMe ? router.push('/edit-profile') : void openDm(item))}
        disabled={opening === item.id}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Avatar url={item.avatar_url} name={item.display_name} size="m" online={online} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15.5 }}>
              {item.display_name}
            </Text>
            <RoleBadge role={item.role} size="s" />
          </View>
          <Text style={{ color: C.textFaint, fontSize: 12.5, marginTop: 2 }}>
            @{item.username} · {online ? 'Online' : lastSeenLabel(item.last_seen)}
          </Text>
        </View>
        {isMe ? (
          <Ionicons name="settings-outline" size={20} color={C.textFaint} />
        ) : (
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={C.textFaint} />
        )}
      </Pressable>
    );
  };

  const onlineCount = members.filter((m) => onlineIds.has(m.id)).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, backgroundColor: C.bgElevated, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12 }}>
        <Text style={{ color: C.red, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>
          UCHIHA CLAN
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <Text style={{ color: C.text, fontSize: 26, fontWeight: '900' }}>Members</Text>
          <View
            style={{
              backgroundColor: C.redSoft,
              borderWidth: 1,
              borderColor: C.redBorder,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: C.red, fontSize: 11.5, fontWeight: '800' }}>
              {onlineCount} online
            </Text>
          </View>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search members…"
          placeholderTextColor={C.textFaint}
          style={{
            marginTop: 12,
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: R.m,
            paddingHorizontal: 12,
            paddingVertical: 9,
            color: C.text,
            fontSize: 14.5,
          }}
        />
      </View>

      {loading ? (
        <Spinner />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          renderItem={renderMember}
          contentContainerStyle={{ paddingBottom: 24 }}
          onRefresh={() => void refresh()}
          refreshing={loading}
          ListEmptyComponent={<EmptyState icon="🥷" title="No members found" />}
        />
      )}
    </View>
  );
}
