import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, EmptyState, Input } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { useWarEvents } from '@/hooks/use-social';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';
import { dayTime, relativeTime } from '@/lib/time';

export default function WarScreen() {
  useRequireAuth();
  const tr = t();
  const { profile } = useSession();
  const canManage = profile ? ['owner', 'leader', 'co_leader'].includes(profile.role) : false;
  const { events, loading, create, setResult } = useWarEvents(canManage);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !when) {
      Alert.alert(tr.common.error, 'Title and ISO date (YYYY-MM-DD HH:mm) are required.');
      return;
    }
    const ts = new Date(when.replace(' ', 'T')).toISOString();
    if (Number.isNaN(new Date(ts).getTime())) {
      Alert.alert(tr.common.error, 'Invalid date. Use YYYY-MM-DD HH:mm');
      return;
    }
    setBusy(true);
    const err = await create({ title: title.trim(), opponent: opponent.trim(), starts_at: ts });
    setBusy(false);
    if (err) {
      Alert.alert(tr.common.error, err.message);
      return;
    }
    setTitle('');
    setOpponent('');
    setWhen('');
    setShowForm(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: C.text, fontSize: 26, fontWeight: '900' }}>⚔️ {tr.war.title}</Text>
              {canManage ? (
                <Pressable
                  onPress={() => setShowForm((v) => !v)}
                  style={{
                    backgroundColor: C.red,
                    borderRadius: R.m,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                    {showForm ? tr.common.close : '+ ' + tr.war.schedule}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {showForm ? (
              <View style={{ gap: 10, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: R.m, padding: 12 }}>
                <Input label={tr.war.title} value={title} onChangeText={setTitle} placeholder="War vs REBORN" />
                <Input label={tr.war.opponent} value={opponent} onChangeText={setOpponent} placeholder="REBORN" />
                <Input label="YYYY-MM-DD HH:mm" value={when} onChangeText={setWhen} placeholder="2026-09-25 20:00" autoCapitalize="none" />
                <Button label={tr.war.schedule} onPress={() => void submit()} loading={busy} />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: C.bgCard,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: R.m,
              padding: 14,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="trophy" size={16} color={C.gold} />
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 15.5, flex: 1 }}>
                {item.title}
              </Text>
              {item.result ? (
                <Text
                  style={{
                    color: item.result === 'win' ? C.online : item.result === 'loss' ? C.danger : C.gold,
                    fontWeight: '800',
                    fontSize: 12.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.result} {item.score ? `· ${item.score}` : ''}
                </Text>
              ) : null}
            </View>
            <Text style={{ color: C.textDim, fontSize: 13.5 }}>
              {tr.war.opponent}: {item.opponent || '—'} · {dayTime(item.starts_at)} ({relativeTime(item.starts_at)})
            </Text>
            {item.notes ? <Text style={{ color: C.textFaint, fontSize: 12.5 }}>{item.notes}</Text> : null}

            {canManage && !item.result ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {(['win', 'loss', 'draw'] as const).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => void setResult(item.id, r, '')}
                    style={{
                      backgroundColor: C.surface,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 12 }}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={loading ? null : <EmptyState icon="⚔️" title={tr.war.empty} subtitle={tr.war.emptyHint} />}
      />
    </SafeAreaView>
  );
}
