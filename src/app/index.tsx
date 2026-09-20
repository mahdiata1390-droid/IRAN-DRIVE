import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSession } from '@/providers/session';
import { SharinganEye } from '@/components/sharingan-eye';
import { t } from '@/i18n';
import { C } from '@/lib/theme';

/**
 * Cinematic splash (1.9 s) -> routing decision:
 *   first launch          -> /onboarding
 *   session + profile     -> /(tabs)/chats
 *   session, no profile   -> /(auth)/sign-up (profile setup)
 *   no session            -> /(auth)/welcome
 */
const SPLASH_MS = 1900;
const FADE_MS = 280;
const SEEN_KEY = 'uchiha.onboarding.seen.v1';

export default function Index() {
  const { session, profile, loading } = useSession();
  const [fading, setFading] = useState(false);
  const navigated = useRef(false);
  const destination = useRef<string>('/(auth)/welcome');
  const tr = t();

  useEffect(() => {
    const id = setTimeout(() => setFading(true), SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  // entrance animation values
  const eyeScale = useSharedValue(0.5);
  const eyeOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(14);
  const fadeOut = useSharedValue(1);

  useEffect(() => {
    eyeScale.value = withSequence(
      withTiming(1.06, { duration: 700, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 350, easing: Easing.inOut(Easing.quad) }),
    );
    eyeOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) });
    titleOpacity.value = withDelay(650, withTiming(1, { duration: 600 }));
    titleTranslate.value = withDelay(
      650,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
  }, [eyeScale, eyeOpacity, titleOpacity, titleTranslate]);

  useEffect(() => {
    if (!fading || navigated.current) return;
    navigated.current = true;
    void (async () => {
      let seen = false;
      try {
        seen = (await AsyncStorage.getItem(SEEN_KEY)) === '1';
      } catch {
        seen = false;
      }
      if (!seen) {
        try {
          await AsyncStorage.setItem(SEEN_KEY, '1');
        } catch {
          // non-fatal
        }
        destination.current = '/onboarding';
      } else if (session && profile) {
        destination.current = '/(tabs)/chats';
      } else if (session && !profile) {
        destination.current = '/(auth)/sign-up';
      } else {
        destination.current = '/(auth)/welcome';
      }
      // decision settled — fade out, then navigate
      fadeOut.value = withTiming(0, { duration: FADE_MS });
      setTimeout(() => router.replace(destination.current as never), FADE_MS + 20);
    })();
  }, [fading, session, profile, fadeOut]);

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: eyeScale.value }],
    opacity: eyeOpacity.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: fadeOut.value }));

  return (
    <Animated.View style={[styles.root, rootStyle]}>
      <LinearGradient
        colors={['#2A0507', '#12020A', '#050203']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Animated.View style={eyeStyle}>
        <SharinganEye size={Platform.OS === 'web' ? 220 : 250} />
      </Animated.View>
      <Animated.View style={[styles.titleBlock, titleStyle]}>
        <Text style={styles.title}>UCHIHA</Text>
        <Text style={styles.subtitle}>{tr.auth.appName}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050203', alignItems: 'center', justifyContent: 'center' },
  titleBlock: { alignItems: 'center', marginTop: 34 },
  title: {
    color: C.text,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 10,
    textShadowColor: 'rgba(220,38,38,0.55)',
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: {
    color: C.red,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 5,
    marginTop: 8,
  },
});
