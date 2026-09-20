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

/**
 * Original, glowing Sharingan-inspired eye.
 * Layers: ambient glow rings -> crimson iris -> black pupil -> 3 tomoe (rotating)
 *         -> eye outline -> slow breathing zoom + rising ember particles.
 * Pure views + Reanimated transforms (no images) => light enough for iPhone 13
 * class hardware, runs on web too (transform-based, RN-web safe).
 */

const EYE = 240; // base size
const EMBER_COUNT = 7;

export function SharinganEye({ size = EYE }: { size?: number }) {
  const scale = (v: number) => (size / EYE) * v;

  // --- continuous animations -------------------------------------------------
  const breathe = useSharedValue(1); // subtle zoom 1 -> 1.03
  const glow = useSharedValue(0.55); // glow opacity pulse
  const spin = useSharedValue(0); // tomoe rotation (continuous)
  const shimmer = useSharedValue(0); // iris highlight sweep

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.5, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    spin.value = withRepeat(
      withTiming(360, { duration: 14000, easing: Easing.linear }),
      -1,
      false,
    );
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [breathe, glow, spin, shimmer]);

  // --- animated styles -------------------------------------------------------
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
    opacity: 0.10 + shimmer.value * 0.22,
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-scale(60), scale(60)]) }],
  }));

  // embers: deterministic pseudo-random particles rising around the eye
  const embers = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, (_, i) => ({
        left: 8 + ((i * 37) % 84), // % across width
        delay: i * 700,
        dur: 4200 + ((i * 313) % 1800),
        drift: ((i % 2 === 0 ? 1 : -1) * (6 + (i % 3) * 4)),
        size: 2.5 + (i % 3),
      })),
    [],
  );

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* ambient glow halo (pulsing) */}
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
      {/* embers */}
      {embers.map((e, i) => (
        <Ember key={i} {...e} scale={scale} />
      ))}
      {/* breathing body */}
      <Animated.View style={[styles.body, { width: size, height: size }, rootStyle]}>
        {/* outer sclera ring */}
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
        {/* crimson iris */}
        <View
          style={{
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
          }}
        />
        {/* radial depth: darker rim inside iris */}
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
        {/* rotating highlight shimmer across iris */}
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
        {/* pupil */}
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
        {/* pupil core glow */}
        <View
          style={{
            position: 'absolute',
            width: scale(18),
            height: scale(18),
            borderRadius: scale(9),
            backgroundColor: 'rgba(255,60,60,0.85)',
          }}
        />
        {/* tomoe — 3 comma-shaped marks rotating around pupil */}
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
              {/* tomoe anchored above center */}
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
                {/* comma tail */}
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

/** One rising ember particle (fade in, drift, fade out, repeat). */
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

/** Size preset for inline use (headers, welcome hero). */
export function SharinganEyeSmall({ size = 96 }: { size?: number }) {
  return <SharinganEye size={size} />;
}
