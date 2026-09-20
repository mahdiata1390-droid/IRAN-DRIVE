import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { C, R } from '@/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace('/(tabs)/chats');
  };

  const sendReset = () => {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your email above, then tap "Forgot password?".');
      return;
    }
    void supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'uchihaclan://reset-password',
    });
    Alert.alert('Check your inbox', 'We sent you a password reset link.');
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
            Welcome back
          </Text>
          <Text style={{ color: C.textDim, fontSize: 14.5, marginTop: 6, marginBottom: 28 }}>
            Sign in to rejoin the clan.
          </Text>

          <View style={{ gap: 14 }}>
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
              autoComplete="password"
              placeholder="••••••••"
            />
            {error ? <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text> : null}
            <Button label="Sign In" onPress={() => void submit()} loading={busy} />
            <Pressable onPress={sendReset}>
              <Text style={{ color: C.red, textAlign: 'center', fontSize: 13.5, fontWeight: '600' }}>
                Forgot password?
              </Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 32 }}>
            <Text style={{ color: C.textFaint, fontSize: 14 }}>New to the clan?</Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <Text style={{ color: C.red, fontSize: 14, fontWeight: '700' }}>Create account</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
