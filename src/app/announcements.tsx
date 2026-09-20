import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { Button, EmptyState, Input } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { useAnnouncements } from '@/hooks/use-social';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';
import { relativeTime } from '@/lib/time';

const PRIORITY_COLOR = { normal: C.textDim, important: C.gold, critical: C.danger } as const;

export default function AnnouncementsScreen() {
  useRequireAuth();
  const tr = t();
  const { profile } = useSession();
  const canPost = profile ? ['owner', 'leader', 'co_leader'].includes(profile.role) : false;
  const { items, loading, publish } = useAnnouncements(canPost);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'critical'>('normal');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (title.trim().length < 2 || body.trim().length < 1) {
      Alert.alert(tr.common.error, 'Title and body are required.');
      return;
    }
    setBusy(true);
    const err = await publish(title.trim(), body.trim(), priority);
    setBusy(false);
    if (err) {
      Alert.alert(tr.common.error, err.message);
      return;
    }
    setTitle('');
    setBody('');
    setShowForm(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr.admin.announcements,
          headerStyle: { backgroundColor: C.header },
          headerTintColor: C.text,
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        ListHeaderComponent={
          canPost ? (
            <View style={{ gap: 10, marginBottom: 6 }}>
              <Pressable
                onPress={() => setShowForm((v) => !v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: C.bgCard,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: R.m,
                  padding: 12,
                }}
              >
                <Text style={{ color: C.red, fontWeight: '700' }}>📢 {tr.admin.newAnnouncement}</Text>
                <Ionicons name={showForm ? 'chevron-up' : 'chevron-down'} size={18} color={C.textDim} />
              </Pressable>
              {showForm ? (
                <View style={{ gap: 10, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: R.m, padding: 12 }}>
                  <Input label={tr.admin.announcements} value={title} onChangeText={setTitle} placeholder="Clan war results" />
                  <Input label={tr.report.reason} value={body} onChangeText={(v) => setBody(v.slice(0, 4000))} placeholder="Full announcement…" multiline style={{ height: 90, textAlignVertical: 'top' }} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['normal', 'important', 'critical'] as const).map((p) => (
                      <Pressable
                        key={p}
                        onPress={() => setPriority(p)}
                        style={{
                          backgroundColor: priority === p ? `${PRIORITY_COLOR[p]}22` : C.surface,
                          borderWidth: 1,
                          borderColor: priority === p ? `${PRIORITY_COLOR[p]}66` : C.border,
                          borderRadius: 999,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ color: priority === p ? PRIORITY_COLOR[p] : C.textDim, fontWeight: '700', fontSize: 12 }}>
                          {p}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Button label={tr.common.send} onPress={() => void submit()} loading={busy} />
                </View>
              ) : null}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: C.bgCard,
              borderWidth: 1,
              borderColor: item.priority === 'critical' ? `${C.danger}55` : C.border,
              borderRadius: R.m,
              padding: 14,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {item.pinned ? <Text style={{ fontSize: 13 }}>📌</Text> : null}
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, flex: 1 }}>
                {item.title}
              </Text>
              <Text style={{ color: PRIORITY_COLOR[item.priority], fontWeight: '800', fontSize: 11, textTransform: 'uppercase' }}>
                {item.priority}
              </Text>
            </View>
            <Text style={{ color: C.textDim, fontSize: 14, lineHeight: 20 }}>{item.body}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <Avatar url={null} name={item.author_profile?.display_name ?? '?'} size="s" />
              <Text style={{ color: C.textFaint, fontSize: 12 }}>
                {item.author_profile?.display_name ?? '—'} · {relativeTime(item.created_at)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={loading ? null : <EmptyState icon="📢" title={tr.admin.announcements} subtitle={tr.war.emptyHint} />}
      />
    </SafeAreaView>
  );
}
