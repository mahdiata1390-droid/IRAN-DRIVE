import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/theme';

export default function CheckEmailScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#0A0A0B', '#140404']} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: C.redSoft,
            borderWidth: 1.5,
            borderColor: C.redBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="mail" size={36} color={C.red} />
        </View>
        <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', textAlign: 'center' }}>
          Verify your email
        </Text>
        <Text style={{ color: C.textDim, fontSize: 14.5, textAlign: 'center', lineHeight: 21 }}>
          We sent a confirmation link to your inbox. Tap it to activate your account, then sign in.
        </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={{ marginTop: 12 }}>
            <Text style={{ color: C.red, fontWeight: '700', fontSize: 15 }}>Go to sign in →</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
