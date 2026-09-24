import { useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, GlassHeader, GlassSurface, Spinner } from '@/components/ui';
import { useNotifications, type AppNotification } from '@/hooks/use-notifications';
import { useSession } from '@/providers/session';
import { t } from '@/i18n';
import { showAlert } from '@/lib/alert';
import { C, R } from '@/lib/theme';
import { shortTime } from '@/lib/time';

export default function NotificationsScreen() {
  const { session } = useSession();
  const { items, loading, unreadCount, markAllRead } = useNotifications(session?.user.id ?? null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tr = t();

  // Mark everything read when the screen opens (feed has been seen).
  useEffect(() => {
    if (!loading) void markAllRead().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const open = (n: AppNotification) => {
    if (n.conversation_id) router.push(`/dm/${n.conversation_id}`);
    else if (n.room_id) router.push(`/room/${n.room_id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <GlassHeader style={{ marginHorizontal: 12, marginTop: 8, paddingHorizontal: 10, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={26} color={C.text} />
          </Pressable>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', flex: 1 }}>
            {tr.settings.notifications}
          </Text>
        </View>
      </GlassHeader>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={tr.settings.notifications}
          subtitle={tr.common.nothingHere}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24, gap: 10 }}
          renderItem={({ item }) => {
            const unread = !item.read_at;
            return (
              <GlassSurface tone={unread ? 'strong' : 'default'} style={{ padding: 14, borderRadius: R.l }}>
                <Pressable
                  onPress={() => open(item)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: unread ? C.redSoft : C.bgCard,
                      borderWidth: 1,
                      borderColor: unread ? C.redBorder : C.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={item.type === 'dm' ? 'chatbubble-ellipses' : 'at'}
                      size={19}
                      color={C.red}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: C.text, fontWeight: '700', fontSize: 14.5 }}>
                      {item.title}
                    </Text>
                    {!!item.body && (
                      <Text numberOfLines={2} style={{ color: C.textDim, fontSize: 13, marginTop: 1 }}>
                        {item.body}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: C.textFaint, fontSize: 11.5 }}>{shortTime(item.created_at)}</Text>
                </Pressable>
              </GlassSurface>
            );
          }}
        />
      )}
      {unreadCount > 0 && !loading ? (
        <Pressable
          onPress={() => void markAllRead().catch((e) => showAlert(tr.common.error, String(e)))}
          style={{ padding: 14, alignItems: 'center' }}
        >
          <Text style={{ color: C.red, fontWeight: '700' }}>{tr.settings.markAllRead}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
