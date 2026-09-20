import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolate } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SharinganEye } from '@/components/sharingan-eye';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';

/**
 * First-launch onboarding: 4 swipeable pages with dots, Skip, Next/Get Started.
 * Dismissal (any path) writes uchiha.onboarding.seen.v1 = '1' so it never shows
 * again — including after logout.
 */

const SEEN_KEY = 'uchiha.onboarding.seen.v1';
const PAGES = 4;

export default function OnboardingScreen() {
  const tr = t();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const finishing = useRef(false);

  const translateX = useSharedValue(0);

  const finish = useCallback(
    (target: '/(auth)/welcome' | '/(auth)/login') => {
      if (finishing.current) return;
      finishing.current = true;
      void AsyncStorage.setItem(SEEN_KEY, '1').catch(() => undefined);
      router.replace(target);
    },
    [router],
  );

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const threshold = 60;
      const dir = e.translationX < -threshold ? 1 : e.translationX > threshold ? -1 : 0;
      const next = Math.min(PAGES - 1, Math.max(0, page + dir));
      translateX.value = withTiming(0, { duration: 180 });
      if (next !== page) runOnJS(setPage)(next);
    });

  const pagerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 0.25 }],
  }));

  // subtle parallax fade for content on page change
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(translateX.value), [0, 90], [1, 0.55], 'clamp'),
  }));

  useEffect(() => {
    translateX.value = withTiming(0, { duration: 160 });
  }, [page, translateX]);

  const copy = [
    {
      title: tr.onboarding.p1Title,
      body: tr.onboarding.p1Body,
      visual: <SharinganEye size={Platform.OS === 'web' ? 190 : 230} />,
    },
    {
      title: tr.onboarding.p2Title,
      body: tr.onboarding.p2Body,
      visual: <ChatVisual />,
    },
    {
      title: tr.onboarding.p3Title,
      body: tr.onboarding.p3Body,
      visual: <WarVisual />,
    },
    {
      title: tr.onboarding.p4Title,
      body: tr.onboarding.p4Body,
      visual: <EmblemVisual />,
    },
  ];

  const cur = copy[page];
  const isLast = page === PAGES - 1;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#2A0507', '#12020A', '#050203']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.stage, pagerStyle]}>
          <Animated.View style={[styles.visual, contentStyle]}>{cur.visual}</Animated.View>
          <Animated.View style={[styles.copyBlock, contentStyle]}>
            <Text style={styles.title}>{cur.title}</Text>
            <Text style={styles.body}>{cur.body}</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* dots */}
      <View style={styles.dots}>
        {Array.from({ length: PAGES }, (_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      {/* skip */}
      <Pressable hitSlop={12} style={styles.skip} onPress={() => finish('/(auth)/welcome')}>
        <Text style={styles.skipText}>{tr.onboarding.skip}</Text>
      </Pressable>

      {/* actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}
          onPress={() => (isLast ? finish('/(auth)/welcome') : setPage(page + 1))}
        >
          <LinearGlow>
            <Text style={styles.primaryText}>
              {isLast ? tr.onboarding.getStarted : tr.onboarding.next}
            </Text>
            <Ionicons name="arrow-forward" size={17} color="#fff" />
          </LinearGlow>
        </Pressable>
        <Pressable onPress={() => finish('/(auth)/login')} hitSlop={8}>
          <Text style={styles.loginText}>
            {tr.onboarding.haveAccount} <Text style={styles.loginLink}>{tr.onboarding.logIn}</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Decorative clan-symbol glow ring used behind buttons. */
function LinearGlow({ children }: { children: React.ReactNode }) {
  return <View style={styles.glowWrap}>{children}</View>;
}

/** Page 2 visual: stylized chat bubbles. */
function ChatVisual() {
  const rows = [
    { w: '72%', label: 'Itachi', text: 'We move at 8 PM 🔥', mine: false },
    { w: '58%', label: 'Sasuke', text: "Let's gooo!", mine: false },
    { w: '52%', label: 'You', text: 'War room. Now.', mine: true },
  ] as const;
  return (
    <View style={styles.chatCard}>
      {rows.map((r) => (
        <View key={r.label} style={[styles.bubbleRow, r.mine && { justifyContent: 'flex-end' }]}>
          <View style={[styles.bubble, { width: r.w as `${number}%` }, r.mine ? styles.bubbleMine : styles.bubbleOther]}>
            <Text style={styles.bubbleName}>{r.label}</Text>
            <Text style={styles.bubbleText}>{r.text}</Text>
          </View>
        </View>
      ))}
      <View style={styles.typingRow}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDot} />
          <View style={[styles.typingDot, { opacity: 0.6 }]} />
          <View style={[styles.typingDot, { opacity: 0.3 }]} />
        </View>
      </View>
    </View>
  );
}

/** Page 3 visual: war-room atmosphere (ranks + timer motif). */
function WarVisual() {
  return (
    <View style={styles.warCard}>
      <View style={styles.warHeader}>
        <Ionicons name="flame" size={18} color={C.red} />
        <Text style={styles.warTitle}>WAR ROOM</Text>
      </View>
      {[
        { rank: 'OPPONENT', name: 'TEAM KAGE', score: '5v5' },
        { rank: 'MODE', name: 'RANKED · SEARCH', score: '8:00 PM' },
        { rank: 'SQUAD', name: 'ITACHI · SASUKE · OBITO', score: 'READY' },
      ].map((row) => (
        <View key={row.rank} style={styles.warRow}>
          <Text style={styles.warRank}>{row.rank}</Text>
          <Text style={styles.warName}>{row.name}</Text>
          <Text style={styles.warScore}>{row.score}</Text>
        </View>
      ))}
    </View>
  );
}

/** Page 4 visual: premium emblem with energy rings. */
function EmblemVisual() {
  return (
    <View style={styles.emblemWrap}>
      <View style={styles.emblemRing1} />
      <View style={styles.emblemRing2} />
      <View style={styles.emblemCore}>
        <Text style={styles.emblemGlyph}>団</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050203' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 30 },
  visual: { alignItems: 'center', justifyContent: 'center', minHeight: 250 },
  copyBlock: { alignItems: 'center', gap: 12 },
  title: { color: C.text, fontSize: 27, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  body: {
    color: C.textDim,
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.borderStrong },
  dotActive: { backgroundColor: C.red, width: 20 },
  skip: { position: 'absolute', top: 54, right: 24 },
  skipText: { color: C.textFaint, fontSize: 14, fontWeight: '600' },
  actions: { paddingHorizontal: 28, paddingBottom: 42, gap: 16 },
  primaryBtn: { borderRadius: R.l, overflow: 'hidden' },
  glowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.red,
    paddingVertical: 16,
    borderRadius: R.l,
    shadowColor: C.red,
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15.5 },
  loginText: { color: C.textDim, fontSize: 14, textAlign: 'center' },
  loginLink: { color: C.red, fontWeight: '800' },
  // chat visual
  chatCard: {
    width: '86%',
    maxWidth: 330,
    backgroundColor: 'rgba(19,19,22,0.85)',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: R.xl,
    padding: 16,
    gap: 10,
  },
  bubbleRow: { flexDirection: 'row' },
  bubble: { borderRadius: R.l, padding: 10, gap: 2 },
  bubbleOther: { backgroundColor: C.surface, borderTopLeftRadius: 4 },
  bubbleMine: { backgroundColor: C.bubbleMine, borderTopRightRadius: 4 },
  bubbleName: { color: C.red, fontSize: 10.5, fontWeight: '800' },
  bubbleText: { color: C.text, fontSize: 13 },
  typingRow: { flexDirection: 'row' },
  typingBubble: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: C.surface,
    borderRadius: R.m,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.textDim },
  // war visual
  warCard: {
    width: '86%',
    maxWidth: 330,
    backgroundColor: 'rgba(19,19,22,0.85)',
    borderColor: 'rgba(220,38,38,0.3)',
    borderWidth: 1,
    borderRadius: R.xl,
    padding: 16,
    gap: 12,
  },
  warHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warTitle: { color: C.text, fontWeight: '900', letterSpacing: 3, fontSize: 13 },
  warRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(220,38,38,0.07)',
    borderRadius: R.m,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warRank: { color: C.textFaint, fontSize: 9.5, fontWeight: '800', letterSpacing: 1, width: 70 },
  warName: { color: C.text, fontSize: 11.5, fontWeight: '700', flex: 1 },
  warScore: { color: C.red, fontSize: 11, fontWeight: '800' },
  // emblem visual
  emblemWrap: { alignItems: 'center', justifyContent: 'center', width: 230, height: 230 },
  emblemRing1: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1.5,
    borderColor: 'rgba(220,38,38,0.35)',
  },
  emblemRing2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.55)',
  },
  emblemCore: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: C.redSoft,
    borderWidth: 1.5,
    borderColor: C.redBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.red,
    shadowOpacity: 0.55,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  emblemGlyph: { fontSize: 48, color: C.red, fontWeight: '900' },
});
