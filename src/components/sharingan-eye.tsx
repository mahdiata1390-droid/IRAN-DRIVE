import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const EYE = 240;
const EMBER_COUNT = 7;
export type SharinganState = 'idle' | 'loading' | 'sent' | 'received' | 'notification' | 'recording' | 'active';

export function SharinganEye({ size = EYE, state = 'idle' }: { size?: number; state?: SharinganState }) {
  const scale = (v: number) => (size / EYE) * v;

  const breathe = useSharedValue(1);
  const glow = useSharedValue(0.55);
  const spin = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const irisShift = useSharedValue(0);

  useEffect(() => {
    const isTransient = state === 'sent' || state === 'received' || state === 'notification';

    if (state === 'idle') {
      breathe.value = withRepeat(
        withSequence(
          withTiming(1.025, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.55, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      spin.value = withRepeat(
        withTiming(360, { duration: 26000, easing: Easing.linear }),
        -1,
        false,
      );
      shimmer.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      irisShift.value = withRepeat(
        withSequence(
          withTiming(2.5, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
          withTiming(-2.5, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      return;
    }

    if (state === 'loading') {
      breathe.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      spin.value = withRepeat(
        withTiming(360, { duration: 12000, easing: Easing.linear }),
        -1,
        false,
      );
      shimmer.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      irisShift.value = withRepeat(
        withSequence(
          withTiming(6, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(-5, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      return;
    }

    if (state === 'recording') {
      breathe.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.98, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.78, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      spin.value = withRepeat(
        withTiming(180, { duration: 5000, easing: Easing.linear }),
        -1,
        false,
      );
      shimmer.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.15, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      irisShift.value = withRepeat(
        withSequence(
          withTiming(8, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(-8, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      return;
    }

    if (state === 'active') {
      breathe.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 850, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.85, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      spin.value = withRepeat(
        withTiming(360, { duration: 8500, easing: Easing.linear }),
        -1,
        false,
      );
      shimmer.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.3, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      irisShift.value = withRepeat(
        withSequence(
          withTiming(6, { duration: 1100 }),
          withTiming(-4, { duration: 1100 }),
        ),
        -1,
        false,
      );
      return;
    }

    const transientGlow = isTransient ? 1.35 : 1.1;
    const transientScale = isTransient ? 1.14 : 1.07;
    const transientDuration = isTransient ? 360 : 520;

    breathe.value = withSequence(
      withTiming(transientScale, { duration: transientDuration, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: transientDuration + 120, easing: Easing.out(Easing.quad) }),
    );
    glow.value = withSequence(
      withTiming(transientGlow, { duration: transientDuration, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.7, { duration: transientDuration + 180, easing: Easing.inOut(Easing.quad) }),
    );
    spin.value = withSequence(
      withTiming(120, { duration: transientDuration + 70, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 120, easing: Easing.linear }),
    );
    shimmer.value = withSequence(
      withTiming(1, { duration: transientDuration, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: transientDuration + 220, easing: Easing.inOut(Easing.quad) }),
    );
    irisShift.value = withSequence(
      withTiming(10, { duration: transientDuration, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: transientDuration + 200, easing: Easing.out(Easing.quad) }),
    );
  }, [breathe, glow, irisShift, shimmer, spin, state]);

  const rootStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 1 + glow.value * 0.12 }],
  }));

  const tomoeWrapStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + shimmer.value * 0.26,
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-scale(60), scale(60)]) },
      { translateY: interpolate(shimmer.value, [0, 1], [0, scale(6)]) },
    ],
  }));

  const irisStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: irisShift.value }, { scale: 1 + glow.value * 0.04 }],
  }));

  const embers = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, (_, i) => ({
        left: 8 + ((i * 37) % 84),
        delay: i * 700,
        dur: 4200 + ((i * 313) % 1800),
        drift: (i % 2 === 0 ? 1 : -1) * (6 + (i % 3) * 4),
        size: 2.5 + (i % 3),
      })),
    [],
  );

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: scale(300),
            height: scale(300),
            borderRadius: scale(150),
            shadowRadius: scale(60),
            elevation: 12,
          },
          glowStyle,
        ]}
      />
      {embers.map((e, i) => (
        <Ember key={i} {...e} scale={scale} />
      ))}
      <Animated.View style={[styles.body, { width: size, height: size }, rootStyle]}>
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#120205',
            borderWidth: scale(3),
            borderColor: '#3D0A0E',
          }}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: scale(196),
              height: scale(196),
              borderRadius: scale(98),
              backgroundColor: '#B00F16',
              shadowColor: '#FF2A2A',
              shadowOpacity: 0.9,
              shadowRadius: scale(28),
              shadowOffset: { width: 0, height: 0 },
              elevation: 10,
            },
            irisStyle,
          ]}
        />
        <View
          style={{
            position: 'absolute',
            width: scale(196),
            height: scale(196),
            borderRadius: scale(98),
            borderWidth: scale(10),
            borderColor: 'rgba(60,4,8,0.55)',
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: scale(150),
              height: scale(10),
              borderRadius: scale(5),
              backgroundColor: '#FF6B6B',
            },
            shimmerStyle,
          ]}
        />
        <View
          style={{
            position: 'absolute',
            width: scale(58),
            height: scale(58),
            borderRadius: scale(29),
            backgroundColor: '#0B0203',
            shadowColor: '#000',
            shadowOpacity: 1,
            shadowRadius: scale(12),
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: scale(18),
            height: scale(18),
            borderRadius: scale(9),
            backgroundColor: 'rgba(255,60,60,0.85)',
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              alignItems: 'center',
              justifyContent: 'center',
            },
            tomoeWrapStyle,
          ]}
        >
          {[0, 120, 240].map((deg) => (
            <View
              key={deg}
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: size,
                height: size,
                alignItems: 'center',
                transform: [{ rotate: `${deg}deg` }],
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: scale(46),
                  width: scale(44),
                  height: scale(44),
                  borderRadius: scale(22),
                  backgroundColor: '#14030A',
                  borderWidth: scale(3),
                  borderColor: 'rgba(255,120,120,0.35)',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    right: -scale(6),
                    bottom: -scale(6),
                    width: scale(16),
                    height: scale(16),
                    borderRadius: scale(8),
                    backgroundColor: '#14030A',
                  }}
                />
              </View>
            </View>
          ))}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Ember({
  left,
  delay,
  dur,
  drift,
  size: sz,
  scale,
}: {
  left: number;
  delay: number;
  dur: number;
  drift: number;
  size: number;
  scale: (v: number) => number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.quad) }),
        -1,
        false,
      ),
    );
  }, [p, delay, dur]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.15, 0.85, 1], [0, 0.9, 0.7, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(p.value, [0, 1], [scale(90), -scale(150)]) },
      { translateX: drift * p.value },
      { scale: interpolate(p.value, [0, 0.5, 1], [0.6, 1, 0.5]) },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: `${left}%` as `${number}%`,
          bottom: 0,
          width: sz,
          height: sz,
          borderRadius: sz / 2,
          backgroundColor: '#FF4A3D',
          shadowColor: '#FF2A2A',
          shadowOpacity: 0.9,
          shadowRadius: 4,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    backgroundColor: 'rgba(220,38,38,0.22)',
    shadowColor: '#DC2626',
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
  },
  body: { alignItems: 'center', justifyContent: 'center' },
});

export function SharinganEyeSmall({ size = 96, state = 'idle' }: { size?: number; state?: SharinganState }) {
  return <SharinganEye size={size} state={state} />;
}
