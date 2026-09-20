import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { EmptyState, Spinner } from '@/components/ui';
import { useChats } from '@/hooks/use-chats';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { C, R } from '@/lib/theme';
import { shortTime } from '@/lib/time';
import type { DmListItem, Room } from '@/lib/types';

type Filter = 'all' | 'clan' | 'dms';

export default function ChatsScreen() {
  const gated = useRequireAuth();
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const { rooms, dms, unreadByChat, loading, refresh } = useChats();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const filteredRooms = useMemo(() => {
    let list = rooms.filter((r) => (filter === 'dms' ? false : filter === 'clan' ? r.kind === 'clan' : true));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    return list;
  }, [rooms, filter, query]);

  const filteredDms = useMemo(() => {
    if (filter === 'clan') return [] as DmListItem[];
    if (!query.trim()) return dms;
    const q = query.toLowerCase();
    return dms.filter(
      (d) =>
        d.other_display_name.toLowerCase().includes(q) ||
        d.other_username.toLowerCase().includes(q),
    );
  }, [dms, filter, query]);

  if (gated) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const lastActivity = (roomId: string): string | null => null; // rooms list uses unread + name only

  const renderRoom = ({ item }: { item: Room }) => {
    const unread = unreadByChat[item.id] ?? 0;
    return (
      <Pressable
        onPress={() => router.push(`/room/${item.id}`)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            backgroundColor: item.kind === 'clan' ? C.redSoft : C.bgCard,
            borderWidth: 1,
            borderColor: item.kind === 'clan' ? C.redBorder : C.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={item.kind === 'clan' ? 'shield' : 'chatbubbles-outline'}
            size={22}
            color={item.kind === 'clan' ? C.red : C.textDim}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 15.5 }}>
            {item.name}
          </Text>
          <Text style={{ color: C.textFaint, fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>
            {item.description || 'Group chat'}
          </Text>
        </View>
        {unread > 0 ? (
          <View
            style={{
              backgroundColor: C.red,
              minWidth: 22,
              height: 22,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 7,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '800' }}>{unread}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderDm = ({ item }: { item: DmListItem }) => {
    const unread = unreadByChat[item.conversation_id] ?? 0;
    return (
      <Pressable
        onPress={() => router.push(`/dm/${item.conversation_id}`)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Avatar url={item.other_avatar} name={item.other_display_name} size="m" online />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 15.5 }}>
            {item.other_display_name}
          </Text>
          <Text
            style={{ color: C.textFaint, fontSize: 12.5, marginTop: 2 }}
            numberOfLines={1}
          >
            {item.last_message ?? 'No messages yet'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: C.textFaint, fontSize: 11.5 }}>
            {item.last_at ? shortTime(item.last_at) : ''}
          </Text>
          {unread > 0 ? (
            <View
              style={{
                backgroundColor: C.red,
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 7,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '800' }}>{unread}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, backgroundColor: C.bgElevated, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: C.red, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>
              UCHIHA CLAN
            </Text>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '900', marginTop: 2 }}>
              Chats
            </Text>
          </View>
          <Link href="/new-room" asChild>
            <Pressable
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C.redSoft,
                borderWidth: 1,
                borderColor: C.redBorder,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="add" size={24} color={C.red} />
            </Pressable>
          </Link>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats…"
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

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {(['all', 'clan', 'dms'] as Filter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={({ pressed }) => ({
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: filter === f ? C.redSoft : 'transparent',
                borderWidth: 1,
                borderColor: filter === f ? C.redBorder : C.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: filter === f ? C.red : C.textDim,
                  fontSize: 12.5,
                  fontWeight: '700',
                  textTransform: 'capitalize',
                }}
              >
                {f === 'dms' ? 'Direct' : f === 'clan' ? 'Clan' : 'All'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <Spinner />
      ) : (
        <FlatList
          data={[...filteredRooms, ...filteredDms]}
          keyExtractor={(item) => ('slug' in item ? `room-${item.id}` : `dm-${item.conversation_id}`)}
          renderItem={(info) =>
            'slug' in info.item ? renderRoom({ item: info.item as Room }) : renderDm({ item: info.item as DmListItem })
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          onRefresh={() => void refresh()}
          refreshing={loading}
          ListEmptyComponent={
            <EmptyState
              icon="💬"
              title="No conversations"
              subtitle="Open a clan room or message a member from the Members tab."
            />
          }
        />
      )}
    </View>
  );
}
