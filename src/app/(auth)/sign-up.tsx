import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { C, R } from '@/lib/theme';

export default function SignUpScreen() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [codUid, setCodUid] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameOk = /^[a-zA-Z0-9_]{3,20}$/.test(username);
  const passwordOk = password.length >= 8;
  const codOk = codUid === '' || /^\d{5,12}$/.test(codUid);

  const submit = async () => {
    setError(null);
    if (!usernameOk) return setError('Username: 3–20 letters, numbers or underscores.');
    if (!displayName.trim()) return setError('Display name is required.');
    if (!codOk) return setError('COD Mobile UID must be 5–12 digits.');
    if (!email.trim().includes('@')) return setError('Enter a valid email.');
    if (!passwordOk) return setError('Password must be at least 8 characters.');

    setBusy(true);
    // Check username availability before creating the account.
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

    const { error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          username: username.trim(),
          display_name: displayName.trim(),
          cod_uid: codUid.trim() || null,
        },
        emailRedirectTo: 'uchihaclan://auth',
      },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace('/(auth)/check-email');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#0A0A0B', '#140404']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 24 }}>
            <Text style={{ color: C.textDim, fontSize: 15 }}>← Back</Text>
          </Pressable>

          <Text style={{ color: C.text, fontSize: 30, fontWeight: '900', letterSpacing: 1 }}>
            Join UCHIHA
          </Text>
          <Text style={{ color: C.textDim, fontSize: 14.5, marginTop: 6, marginBottom: 28 }}>
            Create your clan identity.
          </Text>

          <View style={{ gap: 14 }}>
            <Input
              label="Username"
              value={username}
              onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, ''))}
              autoCapitalize="none"
              autoComplete="username"
              placeholder="shadow_uchiha"
              error={
                username.length > 0 && !usernameOk ? '3–20 letters, numbers or underscores' : null
              }
            />
            <Input
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Shadow"
            />
            <Input
              label="COD Mobile UID (optional)"
              value={codUid}
              onChangeText={(t) => setCodUid(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="1234567890"
              error={!codOk ? 'UID must be 5–12 digits' : null}
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@clan.com"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              error={password.length > 0 && !passwordOk ? 'At least 8 characters' : null}
            />
            {error ? <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text> : null}
            <Button label="Create Account" onPress={() => void submit()} loading={busy} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 32 }}>
            <Text style={{ color: C.textFaint, fontSize: 14 }}>Already enlisted?</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={{ color: C.red, fontSize: 14, fontWeight: '700' }}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
