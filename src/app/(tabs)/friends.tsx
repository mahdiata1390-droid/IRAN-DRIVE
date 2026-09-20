import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { Button, EmptyState, Input } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { useFriends } from '@/hooks/use-social';
import { supabase } from '@/lib/supabase';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';
import { RoleBadge } from '@/components/role-badge';
import { relativeTime } from '@/lib/time';

export default function FriendsScreen() {
  useRequireAuth();
  const tr = t();
  const { session } = useSession();
  const { friends, requests, loading, sendRequest, respond, removeFriend } = useFriends(
    session?.user.id ?? null,
  );
  const [addUsername, setAddUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const add = useCallback(async () => {
    const uname = addUsername.trim().replace(/^@/, '');
    if (!uname) return;
    setBusy(true);
    setFeedback(null);
    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', uname)
      .maybeSingle();
    if (!target) {
      setFeedback('User not found');
      setBusy(false);
      return;
    }
    const err = await sendRequest(target.id);
    setFeedback(err ? err.message : tr.friends.sent);
    setAddUsername('');
    setBusy(false);
  }, [addUsername, sendRequest, tr]);

  const openChat = (userId: string) => {
    void (async () => {
      const { data: cid } = await supabase.rpc('create_dm', { other_user: userId });
      if (cid) router.push(`/dm/${cid}`);
    })();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={friends}
        keyExtractor={(f) => f.id}
        onRefresh={() => void loading}
        refreshing={loading}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '900' }}>{tr.friends.title}</Text>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={tr.friends.add}
                  value={addUsername}
                  onChangeText={(v) => setAddUsername(v.replace(/[^a-zA-Z0-9_@]/g, ''))}
                  autoCapitalize="none"
                  placeholder="@username"
                />
              </View>
              <Button label="+" onPress={() => void add()} loading={busy} style={{ width: 46, height: 46 }} />
            </View>
            {feedback ? <Text style={{ color: C.textDim, fontSize: 12.5 }}>{feedback}</Text> : null}

            {requests.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: C.textDim, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
                  {tr.friends.incoming} ({requests.length})
                </Text>
                {requests.map((r) => (
                  <View
                    key={r.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: C.bgCard,
                      borderColor: C.border,
                      borderWidth: 1,
                      borderRadius: R.m,
                      padding: 10,
                    }}
                  >
                    <Avatar url={r.avatar_url} name={r.display_name} size="m" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontWeight: '700', fontSize: 14.5 }}>
                        {r.display_name}
                      </Text>
                      <Text style={{ color: C.textFaint, fontSize: 12 }}>@{r.username}</Text>
                    </View>
                    <Pressable
                      onPress={() => void respond(r.id, true)}
                      style={{
                        backgroundColor: C.red,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>
                        {tr.friends.accept}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => void respond(r.id, false)} hitSlop={8}>
                      <Ionicons name="close-circle-outline" size={24} color={C.textFaint} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openChat(item.id)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: pressed ? C.surface : C.bgCard,
              borderColor: C.border,
              borderWidth: 1,
              borderRadius: R.m,
              padding: 12,
            })}
          >
            <Avatar
              url={item.avatar_url}
              name={item.display_name}
              size="m"
              online={Date.now() - new Date(item.last_seen).getTime() < 120_000}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>
                  {item.display_name}
                </Text>
                <RoleBadge role={item.role} size="s" />
              </View>
              <Text style={{ color: C.textFaint, fontSize: 12 }}>
                @{item.username} · {relativeTime(item.last_seen)}
              </Text>
            </View>
            <Pressable
              onPress={() => void removeFriend(item.id)}
              hitSlop={8}
              style={{ padding: 6 }}
            >
              <Ionicons name="person-remove-outline" size={20} color={C.textFaint} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="🤝" title={tr.friends.empty} subtitle={tr.friends.emptyHint} />
          )
        }
      />
    </SafeAreaView>
  );
}
