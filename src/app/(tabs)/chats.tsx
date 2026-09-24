import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { EmptyState, GlassIconButton, GlassPill, GlassSurface, Spinner } from '@/components/ui';
import { useChats } from '@/hooks/use-chats';
import { useNotifications } from '@/hooks/use-notifications';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useChatSettings, scopeKey } from '@/hooks/use-chat-settings';
import { useSession } from '@/providers/session';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';
import { shortTime } from '@/lib/time';
import type { DmListItem, Room } from '@/lib/types';

type Filter = 'all' | 'clan' | 'dms' | 'favorites' | 'archived';

export default function ChatsScreen() {
  const gated = useRequireAuth();
  const tr = t();
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const { rooms, dms, unreadByChat, loading, refresh } = useChats();
  const { unreadCount: notifUnread } = useNotifications(session?.user.id ?? null, { live: false });
  const { get, update } = useChatSettings(session?.user.id ?? null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const roomSettings = (r: Room) => get('room', r.id);
  const dmSettings = (d: DmListItem) => get('dm', d.conversation_id);

  const filteredRooms = useMemo(() => {
    let list: Room[];
    if (filter === 'favorites') list = rooms.filter((r) => roomSettings(r).favorite);
    else if (filter === 'archived') list = rooms.filter((r) => roomSettings(r).archived);
    else if (filter === 'clan') list = rooms.filter((r) => r.kind === 'clan');
    else if (filter === 'dms') list = [];
    else list = rooms.filter((r) => !roomSettings(r).archived);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const pa = roomSettings(a).pinned ? 0 : 1;
      const pb = roomSettings(b).pinned ? 0 : 1;
      return pa - pb;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, filter, query, get]);

  const filteredDms = useMemo(() => {
    if (filter === 'clan') return [] as DmListItem[];
    let list = dms;
    if (filter === 'favorites') list = dms.filter((d) => dmSettings(d).favorite);
    else if (filter === 'archived') list = dms.filter((d) => dmSettings(d).archived);
    else list = dms.filter((d) => !dmSettings(d).archived);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (d) =>
          d.other_display_name.toLowerCase().includes(q) ||
          d.other_username.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const pa = dmSettings(a).pinned ? 0 : 1;
      const pb = dmSettings(b).pinned ? 0 : 1;
      return pa - pb;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dms, filter, query, get]);

  if (gated) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const chatActions = (kind: 'room' | 'dm', id: string, name: string) => {
    const s = get(kind, id);
    const opts: {
      label: string;
      destructive?: boolean;
      onPress: () => void;
    }[] = [
      {
        label: s.pinned ? tr.chats.unpinChat : tr.chats.pinChat,
        onPress: () => void update(kind, id, { pinned: !s.pinned }),
      },
      {
        label: s.muted ? tr.chats.unmuteChat : tr.chats.muteChat,
        onPress: () => void update(kind, id, { muted: !s.muted }),
      },
      {
        label: s.favorite ? tr.chats.unfavorite : tr.chats.favorite,
        onPress: () => void update(kind, id, { favorite: !s.favorite }),
      },
      {
        label: s.archived ? tr.chats.unarchive : tr.chats.archive,
        onPress: () => void update(kind, id, { archived: !s.archived }),
      },
      {
        label: `${tr.chats.clearHistory} (${name})`,
        destructive: true,
        onPress: () =>
          Alert.alert(tr.chats.clearHistory, tr.common.confirm, [
            { text: tr.common.cancel, style: 'cancel' },
            {
              text: tr.common.ok,
              style: 'destructive',
              onPress: () => {
                void (async () => {
                  // Soft-delete is server-restricted to senders; here we only
                  // clear the local draft + mark read as a lightweight reset.
                  await update(kind, id, { draft: '' });
                  const field = kind === 'room' ? 'room_id' : 'conversation_id';
                  await supabaseMarkRead(kind, id);
                  void field;
                })();
              },
            },
          ]),
      },
    ];
    return opts;
  };

  const supabaseMarkRead = async (kind: 'room' | 'dm', id: string) => {
    if (kind === 'room') await import('@/lib/supabase').then(({ supabase }) => supabase.rpc('mark_room_read', { p_room_id: id }));
    else await import('@/lib/supabase').then(({ supabase }) => supabase.rpc('mark_dm_read', { p_conversation_id: id }));
  };

  const renderRoom = ({ item }: { item: Room }) => {
    const s = roomSettings(item);
    const unread = unreadByChat[item.id] ?? 0;
    return (
      <Pressable
        onPress={() => router.push(`/room/${item.id}`)}
        onLongPress={() => {
          const actions = chatActions('room', item.id, item.name);
          Alert.alert(item.name, undefined, [
            ...actions.map((a) => ({ text: a.label, style: 'default' as const, onPress: a.onPress })),
            { text: tr.common.cancel, style: 'cancel' as const },
          ]);
        }}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {s.pinned ? <Ionicons name="pin" size={12} color={C.gold} /> : null}
            {s.muted ? <Ionicons name="volume-mute" size={13} color={C.textFaint} /> : null}
            {s.favorite ? <Ionicons name="star" size={12} color={C.gold} /> : null}
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15.5 }}>{item.name}</Text>
          </View>
          <Text style={{ color: C.textFaint, fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>
            {s.draft ? `✏️ ${tr.chat.draftBadge}: ${s.draft}` : item.description || 'Group chat'}
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
    const s = dmSettings(item);
    const unread = unreadByChat[item.conversation_id] ?? 0;
    return (
      <Pressable
        onPress={() => router.push(`/dm/${item.conversation_id}`)}
        onLongPress={() => {
          const actions = chatActions('dm', item.conversation_id, item.other_display_name);
          Alert.alert(item.other_display_name, undefined, [
            ...actions.map((a) => ({ text: a.label, style: 'default' as const, onPress: a.onPress })),
            { text: tr.common.cancel, style: 'cancel' as const },
          ]);
        }}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {s.pinned ? <Ionicons name="pin" size={12} color={C.gold} /> : null}
            {s.muted ? <Ionicons name="volume-mute" size={13} color={C.textFaint} /> : null}
            {s.favorite ? <Ionicons name="star" size={12} color={C.gold} /> : null}
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15.5 }}>
              {item.other_display_name}
            </Text>
          </View>
          <Text style={{ color: C.textFaint, fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>
            {s.draft ? `✏️ ${tr.chat.draftBadge}: ${s.draft}` : (item.last_message ?? '…')}
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

  const filterLabel: Record<Filter, string> = {
    all: tr.common.search === 'Search' ? 'All' : 'همه',
    clan: tr.tabs.members === 'Members' ? 'Clan' : 'قبیله',
    dms: tr.tabs.members === 'Members' ? 'Direct' : 'خصوصی',
    favorites: tr.chats.favorites,
    archived: tr.chats.archived,
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, backgroundColor: C.bgElevated, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: C.red, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>
              UCHIHA CLAN
            </Text>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '900', marginTop: 2 }}>
              {tr.chats.title}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Link href="/notifications" asChild>
              <GlassIconButton icon="🔔" onPress={() => router.push('/notifications')} />
            </Link>
            <Link href="/search" asChild>
              <GlassIconButton icon="⌕" onPress={() => router.push('/search')} />
            </Link>
            <Link href="/announcements" asChild>
              <GlassIconButton icon="📣" onPress={() => router.push('/announcements')} />
            </Link>
            <Link href="/new-room" asChild>
              <GlassIconButton icon="＋" onPress={() => router.push('/new-room')} tint="red" />
            </Link>
          </View>
        </View>

        <GlassSurface style={{ marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.m }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: C.textFaint, fontSize: 16 }}>⌕</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={tr.chats.searchPlaceholder}
              placeholderTextColor={C.textFaint}
              style={{ flex: 1, color: C.text, fontSize: 14.5, paddingVertical: 6 }}
            />
            {notifUnread > 0 ? (
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: C.red,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 5,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '800' }}>{notifUnread}</Text>
              </View>
            ) : null}
          </View>
        </GlassSurface>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {(['all', 'clan', 'dms', 'favorites', 'archived'] as Filter[]).map((f) => (
            <GlassPill key={f} label={filterLabel[f]} active={filter === f} onPress={() => setFilter(f)} />
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
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24, gap: 10 }}
          onRefresh={() => void refresh()}
          refreshing={loading}
          ListEmptyComponent={
            <EmptyState icon="💬" title={tr.chats.empty} subtitle={tr.chats.emptyHint} />
          }
        />
      )}
    </View>
  );
}
