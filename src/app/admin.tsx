import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { useReports, useFriends } from '@/hooks/use-social';
import { supabase } from '@/lib/supabase';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';
import { relativeTime } from '@/lib/time';

export default function AdminScreen() {
  useRequireAuth();
  const tr = t();
  const { profile } = useSession();
  const isMod = profile ? ['owner', 'leader', 'co_leader', 'moderator'].includes(profile.role) : false;
  const { reports, loading, resolve } = useReports(isMod);
  const { friends } = useFriends(profile?.id ?? null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const muteUser = (userId: string) => {
    Alert.prompt?.('Mute (minutes)', '60', (minutes) => {
      void (async () => {
        const mins = parseInt(minutes ?? '60', 10) || 60;
        const { error } = await supabase.rpc('set_user_mute', {
          target: userId,
          until: new Date(Date.now() + mins * 60_000).toISOString(),
        });
        if (error) Alert.alert(tr.common.error, error.message);
      })();
    });
  };

  const banUser = (userId: string) => {
    Alert.alert(
      tr.admin.ban,
      tr.common.confirm,
      [
        { text: tr.common.cancel, style: 'cancel' },
        {
          text: tr.admin.ban,
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const { error } = await supabase.rpc('set_user_ban', { target: userId, banned: true });
              if (error) Alert.alert(tr.common.error, error.message);
            })();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr.admin.title,
          headerStyle: { backgroundColor: C.header },
          headerTintColor: C.text,
        }}
      />
      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 6 }}>
            {tr.admin.reports} {reports.length > 0 ? `(${reports.length})` : ''}
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: C.bgCard,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: R.m,
              padding: 12,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flag" size={16} color={C.gold} />
              <Text style={{ color: C.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                {item.reporter_profile?.display_name ?? '—'} →{' '}
                {item.target_profile?.display_name ?? (item.message_id ? 'message' : 'room')}
              </Text>
              <Text style={{ color: C.textFaint, fontSize: 11 }}>{relativeTime(item.created_at)}</Text>
            </View>
            <Text style={{ color: C.textDim, fontSize: 13.5 }}>{item.reason}</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => {
                  setBusyId(item.id);
                  void resolve(item.id, 'resolved').finally(() => setBusyId(null));
                }}
                disabled={busyId === item.id}
                style={{
                  backgroundColor: C.red,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>
                  {tr.admin.resolve}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void resolve(item.id, 'dismissed')}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: C.textDim, fontWeight: '700', fontSize: 12.5 }}>
                  {tr.admin.dismiss}
                </Text>
              </Pressable>
              {item.target_user ? (
                <>
                  <Pressable
                    onPress={() => muteUser(item.target_user!)}
                    style={{
                      backgroundColor: C.surface,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Ionicons name="volume-mute" size={13} color={C.textDim} />
                    <Text style={{ color: C.textDim, fontWeight: '700', fontSize: 12.5 }}>
                      {tr.admin.mute}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => banUser(item.target_user!)}
                    style={{
                      backgroundColor: 'rgba(239,68,68,0.12)',
                      borderWidth: 1,
                      borderColor: 'rgba(239,68,68,0.4)',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: C.danger, fontWeight: '700', fontSize: 12.5 }}>
                      {tr.admin.ban}
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={loading ? null : <EmptyState icon="🛡️" title={tr.admin.noReports} />}
      />
    </SafeAreaView>
  );
}
