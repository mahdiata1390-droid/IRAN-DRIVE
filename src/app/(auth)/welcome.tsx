import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C, R } from '@/lib/theme';

export default function WelcomeScreen() {
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#0A0A0B', '#1A0505', '#2A0808']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.emblem}>
            <Text style={styles.emblemGlyph}>⚔</Text>
          </View>
          <Text style={styles.title}>UCHIHA</Text>
          <Text style={styles.subtitle}>CLAN MESSENGER</Text>
          <Text style={styles.tagline}>
            Private comms for the UCHIHA Call of Duty Mobile clan. Real-time chat, war room
            strategy, and direct lines to every member.
          </Text>
        </View>

        <View style={styles.features}>
          {[
            { icon: 'shield-checkmark', text: 'Invite-only clan network' },
            { icon: 'chatbubbles', text: 'Real-time clan & direct messages' },
            { icon: 'people', text: 'Roles, ranks and war coordination' },
          ].map((f) => (
            <View key={f.icon} style={styles.featureRow}>
              <Ionicons name={f.icon as never} size={18} color={C.red} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>
              <Text style={styles.primaryText}>Create Account</Text>
            </Pressable>
          </Link>
          <Link href="/(auth)/login" asChild>
            <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.85 }]}>
              <Text style={styles.ghostText}>I Already Have an Account</Text>
            </Pressable>
          </Link>
        </View>

        <Text style={styles.footer}>UCHIHA Clan · Call of Duty Mobile</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 28, paddingTop: 80, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 36 },
  emblem: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.redSoft,
    borderWidth: 1.5,
    borderColor: C.redBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: C.red,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  emblemGlyph: { fontSize: 44, color: C.red },
  title: {
    color: C.text,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 6,
  },
  subtitle: {
    color: C.red,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 4,
  },
  tagline: {
    color: C.textDim,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 8,
  },
  features: { gap: 10, marginBottom: 36, alignSelf: 'stretch' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: C.textDim, fontSize: 13.5 },
  actions: { gap: 12 },
  primaryBtn: {
    backgroundColor: C.red,
    borderRadius: R.m,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15.5 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderRadius: R.m,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ghostText: { color: C.text, fontWeight: '700', fontSize: 15.5 },
  footer: {
    color: C.textFaint,
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 40,
    letterSpacing: 1,
  },
});
