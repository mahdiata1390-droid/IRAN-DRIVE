import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function LoginScreen() {
  const tr = t();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!USERNAME_RE.test(username.trim())) {
      setError(tr.auth.usernameHint);
      return;
    }
    if (!password) {
      setError(tr.auth.passwordHint);
      return;
    }
    setBusy(true);
    // Username-only login: derive the synthetic Supabase email from the username.
    const { error: err } = await supabase.auth.signInWithPassword({
      email: `${username.trim().toLowerCase()}@users.uchiha-messenger.com`,
      password,
    });
    setBusy(false);
    if (err) {
      setError(friendly(err.message, tr));
      return;
    }
    router.replace('/(tabs)/chats');
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
            {tr.auth.appName}
          </Text>
          <Text style={{ color: C.textDim, fontSize: 14.5, marginTop: 6, marginBottom: 28 }}>
            {tr.auth.signIn}
          </Text>

          <View style={{ gap: 14 }}>
            <Input
              label={tr.auth.username}
              value={username}
              onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, ''))}
              autoCapitalize="none"
              autoComplete="username"
              placeholder="shadow_uchiha"
            />
            <Input
              label={tr.auth.password}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
            />
            {error ? <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text> : null}
            <Button label={tr.auth.login} onPress={() => void submit()} loading={busy} />

            <Pressable
              onPress={() => setRemember((r) => !r)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  borderWidth: 1.5,
                  borderColor: remember ? C.red : C.borderStrong,
                  backgroundColor: remember ? C.red : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {remember ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text> : null}
              </View>
              <Text style={{ color: C.textDim, fontSize: 13.5 }}>{tr.auth.remember}</Text>
            </Pressable>
            <Text style={{ color: C.textFaint, fontSize: 11.5, marginTop: -4 }}>{tr.auth.rememberHint}</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 32 }}>
            <Text style={{ color: C.textFaint, fontSize: 14 }}>{tr.auth.newHere}</Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <Text style={{ color: C.red, fontSize: 14, fontWeight: '700' }}>{tr.auth.createAccount}</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function friendly(message: string, tr: ReturnType<typeof t>): string {
  const m = message.toLowerCase();
  if (message.includes('Invalid login credentials')) return 'Wrong username or password.';
  if (m.includes('email not confirmed')) return 'Account not confirmed yet.';
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('over_')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (m.includes('timeout') || m.includes('failed to fetch') || m.includes('network')) {
    return 'Network problem. Check your connection and try again.';
  }
  return message;
}
