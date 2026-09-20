import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { RoleBadge } from '@/components/role-badge';
import { Button } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSession } from '@/providers/session';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';
import { roleLabel } from '@/lib/roles';

export default function ProfileScreen() {
  const gated = useRequireAuth();
  const { session, profile, signOut, refreshProfile } = useSession();
  const insets = useSafeAreaInsets();
  const [claiming, setClaiming] = useState(false);

  if (gated || !profile) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const claimOwnership = () => {
    Alert.alert(
      'Claim Ownership',
      'Become the clan Owner? This can only be done once — the first member to claim it leads UCHIHA.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim',
          onPress: () => {
            setClaiming(true);
            void (async () => {
              try {
                const { error } = await supabase.rpc('claim_ownership');
                if (error) {
                  Alert.alert('Unavailable', error.message);
                } else {
                  await refreshProfile();
                  Alert.alert('⚡ You are the Owner', 'You now lead the UCHIHA clan.');
                }
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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: C.red, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>
            UCHIHA CLAN
          </Text>
          <Text style={{ color: C.text, fontSize: 26, fontWeight: '900', marginTop: 2 }}>
            Profile
          </Text>
        </View>

        {/* Identity card */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 18,
            backgroundColor: C.bgElevated,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: R.xl,
            padding: 20,
            alignItems: 'center',
          }}
        >
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
        </View>

        {/* Actions */}
        <View style={{ marginTop: 16, gap: 10, paddingHorizontal: 16 }}>
          <Button
            label="Edit Profile"
            variant="subtle"
            onPress={() => router.push('/edit-profile')}
          />
          {profile.role === 'member' ? (
            <Button label="Claim Ownership" variant="ghost" loading={claiming} onPress={claimOwnership} />
          ) : null}
          <Button
            label="Sign Out"
            variant="danger"
            onPress={() => {
              Alert.alert('Sign out', 'Really leave the clan chat?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
              ]);
            }}
          />
        </View>

        {/* Details */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 20,
            backgroundColor: C.bgElevated,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: R.xl,
            paddingHorizontal: 16,
          }}
        >
          {row('at', 'Username', `@${profile.username}`)}
          {row('shield-checkmark', 'Clan role', roleLabel(profile.role))}
          {row('game-controller', 'COD Mobile UID', profile.cod_uid ?? 'Not set')}
          {row('calendar', 'Joined', new Date(profile.created_at).toLocaleDateString())}
        </View>

        <Text style={{ color: C.textFaint, fontSize: 11.5, textAlign: 'center', marginTop: 28, letterSpacing: 1 }}>
          UCHIHA CLAN · CALL OF DUTY MOBILE
        </Text>
      </ScrollView>
    </View>
  );
}
