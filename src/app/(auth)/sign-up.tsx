import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { useSession } from '@/providers/session';
import { t } from '@/i18n';
import { C } from '@/lib/theme';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function SignUpScreen() {
  const tr = t();
  const { session, profile } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameOk = USERNAME_RE.test(username);
  const passwordOk = password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
  const confirmOk = confirm.length > 0 && confirm === password;

  // An already-signed-in user (e.g. reload right after signup) is forwarded
  // into the app instead of being stranded on this screen.
  useEffect(() => {
    if (session && profile) router.replace('/(tabs)/chats');
  }, [session, profile]);

  const submit = async () => {
    setError(null);
    if (!usernameOk) return setError(tr.auth.usernameHint);
    if (!displayName.trim()) return setError(`${tr.auth.displayName} is required.`);
    if (!passwordOk) return setError(tr.auth.passwordHint);
    if (!confirmOk) return setError(tr.auth.mismatch);

    setBusy(true);
    // Username availability check.
    const { data: taken } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username.trim())
      .maybeSingle();
    if (taken) {
      setBusy(false);
      setError('That username is already taken.');
      return;
    }

    // Username-only accounts use a synthetic Supabase email: <username>@users.uchiha-messenger.com
    const email = `${username.trim().toLowerCase()}@users.uchiha-messenger.com`;
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim(), display_name: displayName.trim() } },
    });
    if (err) {
      setBusy(false);
      setError(friendly(err.message));
      return;
    }
    // Auto-login when email confirmation is disabled (default here).
    if (data.session) {
      router.replace('/(tabs)/chats');
      return;
    }
    setBusy(false);
    setError('Account created. Please log in.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#0A0A0B', '#140404']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 24 }}>
            <Text style={{ color: C.textDim, fontSize: 15 }}>← {tr.common.back}</Text>
          </Pressable>

          <Text style={{ color: C.text, fontSize: 30, fontWeight: '900', letterSpacing: 1 }}>
            {tr.auth.createAccount}
          </Text>
          <Text style={{ color: C.textDim, fontSize: 14.5, marginTop: 6, marginBottom: 28 }}>
            {tr.auth.tagline}
          </Text>

          <View style={{ gap: 14 }}>
            <Input
              label={tr.auth.username}
              value={username}
              onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, ''))}
              autoCapitalize="none"
              autoComplete="username"
              placeholder="shadow_uchiha"
              error={username.length > 0 && !usernameOk ? tr.auth.usernameHint : null}
            />
            <Input
              label={tr.auth.displayName}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Shadow"
            />
            <Input
              label={tr.auth.password}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder="••••••••"
              error={password.length > 0 && !passwordOk ? tr.auth.passwordHint : null}
            />
            <Input
              label={tr.auth.confirmPassword}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
              placeholder="••••••••"
              error={confirm.length > 0 && !confirmOk ? tr.auth.mismatch : null}
            />
            {error ? <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text> : null}
            <Button label={tr.auth.register} onPress={() => void submit()} loading={busy} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 32 }}>
            <Text style={{ color: C.textFaint, fontSize: 14 }}>{tr.auth.haveOne}</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={{ color: C.red, fontSize: 14, fontWeight: '700' }}>{tr.auth.login}</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (message.includes('already registered')) return 'That username is already taken.';
  if (m.includes('password')) return 'Password: at least 8 characters with a letter and a number.';
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('over_')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (m.includes('timeout') || m.includes('failed to fetch') || m.includes('network')) {
    return 'Network problem. Check your connection and try again.';
  }
  return message;
}
