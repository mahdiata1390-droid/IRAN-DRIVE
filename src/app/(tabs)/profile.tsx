import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { RoleBadge } from '@/components/role-badge';
import { SharinganEye } from '@/components/sharingan-eye';
import { Button, GlassCard, GlassHeader } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { supabase } from '@/lib/supabase';
import { t, currentLang, setLang, type Lang } from '@/i18n';
import { themeMode, setTheme } from '@/lib/theme';
import { C, R } from '@/lib/theme';
import { roleLabel } from '@/lib/roles';

export default function ProfileScreen() {
  const gated = useRequireAuth();
  const tr = t();
  const { session, profile, signOut, refreshProfile } = useSession();
  const insets = useSafeAreaInsets();
  const [claiming, setClaiming] = useState(false);
  const [lang, setLangState] = useState<Lang>(currentLang());
  const [mode, setModeState] = useState<'dark' | 'light'>(themeMode());

  if (gated || !profile) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const isMod = ['owner', 'leader', 'co_leader', 'moderator'].includes(profile.role);

  const claimOwnership = () => {
    Alert.alert(
      tr.members.claimOwnership,
      tr.common.confirm,
      [
        { text: tr.common.cancel, style: 'cancel' },
        {
          text: tr.common.ok,
          onPress: () => {
            setClaiming(true);
            void (async () => {
              try {
                const { error } = await supabase.rpc('claim_ownership');
                if (error) throw error;

                await refreshProfile();
                Alert.alert('⚡', tr.members.claimOwnership);
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Ownership transfer failed.';
                Alert.alert(tr.common.error, message);
              } finally {
                setClaiming(false);
              }
            })();
          },
        },
      ],
    );
  };

  const row = (icon: string, label: string, value: string) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      <Ionicons name={icon as never} size={18} color={C.textDim} />
      <Text style={{ color: C.textDim, fontSize: 14, flex: 1 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  const selectorRow = (
    icon: string,
    label: string,
    options: { key: string; label: string }[],
    active: string,
    onPick: (key: string) => void,
  ) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        flexWrap: 'wrap',
      }}
    >
      <Ionicons name={icon as never} size={18} color={C.textDim} />
      <Text style={{ color: C.textDim, fontSize: 14, width: 90 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {options.map((o) => (
          <Pressable
            key={o.key}
            onPress={() => onPick(o.key)}
            style={{
              backgroundColor: active === o.key ? C.redSoft : C.surface,
              borderWidth: 1,
              borderColor: active === o.key ? C.redBorder : C.border,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: active === o.key ? C.red : C.textDim, fontWeight: '700', fontSize: 12.5 }}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: C.red, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>
            UCHIHA CLAN
          </Text>
          <Text style={{ color: C.text, fontSize: 26, fontWeight: '900', marginTop: 2 }}>
            {tr.profile.title}
          </Text>
        </View>

        <GlassCard style={{ marginHorizontal: 16, marginTop: 18, padding: 20, alignItems: 'center' }}>
          <SharinganEye size={104} state={isMod ? 'active' : 'idle'} />
          <Avatar url={profile.avatar_url} name={profile.display_name} size="xl" online />
          <Text style={{ color: C.text, fontSize: 21, fontWeight: '800', marginTop: 12 }}>
            {profile.display_name}
          </Text>
          <Text style={{ color: C.textFaint, fontSize: 13.5, marginTop: 2 }}>@{profile.username}</Text>
          <View style={{ marginTop: 10 }}>
            <RoleBadge role={profile.role} />
          </View>
          {profile.bio ? (
            <Text style={{ color: C.textDim, fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
              {profile.bio}
            </Text>
          ) : null}
        </GlassCard>

        <View style={{ marginTop: 16, gap: 10, paddingHorizontal: 16 }}>
          <Button label={tr.settings.editProfile} variant="subtle" onPress={() => router.push('/edit-profile')} />
          {isMod ? (
            <Button label={`🛡️ ${tr.admin.title}`} variant="subtle" onPress={() => router.push('/admin')} />
          ) : null}
          {profile.role === 'member' ? (
            <Button label={tr.members.claimOwnership} variant="ghost" loading={claiming} onPress={claimOwnership} />
          ) : null}
          <Button
            label={tr.auth.logout}
            variant="danger"
            onPress={() => {
              Alert.alert(tr.auth.logout, tr.common.confirm, [
                { text: tr.common.cancel, style: 'cancel' },
                { text: tr.auth.logout, style: 'destructive', onPress: () => void signOut() },
              ]);
            }}
          />
        </View>

        {/* Settings */}
        <GlassCard style={{ marginHorizontal: 16, marginTop: 20, paddingHorizontal: 16, paddingVertical: 6 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, paddingVertical: 10 }}>
            {tr.settings.title}
          </Text>
          {selectorRow(
            'language',
            tr.settings.language,
            [
              { key: 'fa', label: '🇮🇷 فارسی' },
              { key: 'en', label: '🇬🇧 English' },
            ],
            lang,
            (k) => {
              setLangState(k as Lang);
              void setLang(k as Lang);
            },
          )}
          {selectorRow(
            'contrast',
            tr.settings.theme,
            [
              { key: 'dark', label: `🌙 ${tr.settings.dark}` },
              { key: 'light', label: `☀️ ${tr.settings.light}` },
            ],
            mode,
            (k) => {
              const next = k as 'dark' | 'light';
              setModeState(next);
              setTheme(next);
            },
          )}
        </GlassCard>

        {/* Details */}
        <GlassCard style={{ marginHorizontal: 16, marginTop: 20, paddingHorizontal: 16 }}>
          {row('at', tr.auth.username, `@${profile.username}`)}
          {row('shield-checkmark', tr.profile.role, roleLabel(profile.role))}
          {row('game-controller', tr.profile.uid, profile.cod_uid ?? '—')}
          {row('calendar', tr.profile.joinedOn, new Date(profile.created_at).toLocaleDateString())}
        </GlassCard>

        <Text style={{ color: C.textFaint, fontSize: 11.5, textAlign: 'center', marginTop: 28, letterSpacing: 1 }}>
          UCHIHA CLAN · CALL OF DUTY MOBILE
        </Text>
      </ScrollView>
    </View>
  );
}
