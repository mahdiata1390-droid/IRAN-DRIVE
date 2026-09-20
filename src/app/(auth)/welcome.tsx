import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SharinganEye } from '@/components/sharingan-eye';
import { LinearGradient } from 'expo-linear-gradient';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';

/**
 * Auth landing: animated Sharingan + UCHIHA CLAN identity, tagline, and the
 * two entry actions (Get Started / Log in). Shown after onboarding or on
 * subsequent launches without a session.
 */
export default function WelcomeScreen() {
  const tr = t();
  const eyeOpacity = useSharedValue(0);
  const eyeScale = useSharedValue(0.7);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(16);
  const actionsOpacity = useSharedValue(0);

  useEffect(() => {
    eyeOpacity.value = withTiming(1, { duration: 600 });
    eyeScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.4)) });
    textOpacity.value = withDelay(350, withTiming(1, { duration: 550 }));
    textY.value = withDelay(350, withTiming(0, { duration: 550, easing: Easing.out(Easing.cubic) }));
    actionsOpacity.value = withDelay(700, withTiming(1, { duration: 550 }));
  }, [eyeOpacity, eyeScale, textOpacity, textY, actionsOpacity]);

  const eyeStyle = useAnimatedStyle(() => ({
    opacity: eyeOpacity.value,
    transform: [{ scale: eyeScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));
  const actionsStyle = useAnimatedStyle(() => ({ opacity: actionsOpacity.value }));

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#2A0507', '#12020A', '#050203']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.hero, eyeStyle]}>
          <SharinganEye size={190} />
        </Animated.View>

        <Animated.View style={[styles.titleBlock, textStyle]}>
          <Text style={styles.title}>UCHIHA CLAN</Text>
          <Text style={styles.tagline1}>{tr.onboarding.tagline1}</Text>
          <Text style={styles.tagline2}>{tr.onboarding.tagline2}</Text>
        </Animated.View>

        <Animated.View style={[styles.actions, actionsStyle]}>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}>
              <Text style={styles.primaryText}>{tr.onboarding.getStarted}</Text>
            </Pressable>
          </Link>
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={8}>
              <Text style={styles.loginText}>
                {tr.onboarding.haveAccount} <Text style={styles.loginLink}>{tr.onboarding.logIn}</Text>
              </Text>
            </Pressable>
          </Link>
        </Animated.View>

        <Text style={styles.footer}>UCHIHA Clan · Call of Duty Mobile</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050203' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 28, paddingTop: 70, paddingBottom: 40 },
  hero: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  titleBlock: { alignItems: 'center', marginBottom: 34 },
  title: {
    color: C.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 7,
    textAlign: 'center',
    textShadowColor: 'rgba(220,38,38,0.5)',
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  tagline1: { color: C.text, fontSize: 15, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  tagline2: { color: C.textDim, fontSize: 14, lineHeight: 21, marginTop: 4, textAlign: 'center' },
  actions: { alignItems: 'center', gap: 16, alignSelf: 'stretch' },
  primaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: C.red,
    borderRadius: R.l,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: C.red,
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15.5, letterSpacing: 0.5 },
  loginText: { color: C.textDim, fontSize: 14 },
  loginLink: { color: C.red, fontWeight: '800' },
  footer: {
    color: C.textFaint,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 44,
    letterSpacing: 1,
  },
});
