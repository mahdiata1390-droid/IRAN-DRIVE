import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { supabase } from '@/lib/supabase';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';
import type { Profile, Room } from '@/lib/types';
export type { Profile, Room };

interface SearchHit {
  kind: string;
  id: string;
  title: string;
  subtitle: string | null;
  avatar_url: string | null;
  username: string | null;
}

export default function SearchScreen() {
  useRequireAuth();
  const tr = t();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState('');

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setBusy(true);
    const { data } = await supabase.rpc('global_search', { q: q.trim() });
    setHits((data as SearchHit[]) ?? []);
    setSearched(q.trim());
    setBusy(false);
  }, []);

  // Simple trailing debounce without an extra dependency.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounced = useCallback(
    (v: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void runSearch(v), 350);
    },
    [runSearch],
  );

  const openHit = (hit: SearchHit) => {
    void (async () => {
      if (hit.kind === 'user') {
        router.push(`/member/${hit.id}`);
      } else if (hit.kind === 'room') {
        router.push(`/room/${hit.id}`);
      } else if (hit.kind === 'message') {
        // Messages land in their room; DM messages are skipped by the RPC.
        router.push(`/room/${hit.id}`);
      }
    })();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr.common.search,
          headerStyle: { backgroundColor: C.header },
          headerTintColor: C.text,
        }}
      />
      <View style={{ padding: 16, gap: 12, flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: R.m,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons name="search" size={18} color={C.textFaint} />
          <TextInput
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              debounced(v);
            }}
            autoFocus
            placeholder={tr.chats.searchPlaceholder}
            placeholderTextColor={C.textFaint}
            style={{ flex: 1, color: C.text, fontSize: 15, paddingVertical: 12 }}
          />
          {busy ? <Ionicons name="ellipsis-horizontal" size={16} color={C.textFaint} /> : null}
        </View>

        <FlatList
          data={hits}
          keyExtractor={(h) => `${h.kind}-${h.id}`}
          contentContainerStyle={{ gap: 8, paddingBottom: 30 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openHit(item)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: pressed ? C.surface : C.bgCard,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: R.m,
                padding: 12,
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: C.redSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={
                    item.kind === 'user'
                      ? 'person'
                      : item.kind === 'room'
                        ? 'people'
                        : 'chatbubble-ellipses'
                  }
                  size={18}
                  color={C.red}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 14.5 }} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text style={{ color: C.textFaint, fontSize: 12.5 }} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: C.textFaint, fontSize: 11, textTransform: 'uppercase' }}>
                {item.kind}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            searched.length >= 2 && !busy ? (
              <Text style={{ color: C.textFaint, textAlign: 'center', marginTop: 30 }}>
                {tr.common.error}
              </Text>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}
