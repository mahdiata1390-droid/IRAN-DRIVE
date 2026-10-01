import { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Circle,
  G,
  Path,
  RadialGradient,
  Stop,
  Ellipse,
} from 'react-native-svg';

const VW = 200;
const VH = 124;
const CX = VW / 2;
const CY = VH / 2;

const TOMOE_PATH =
  'M 0 0 C 4 -9 15 -8 18 0 C 19 8 10 14 4 10 C 9 7 10 2 6 0 C 4 -1 1 -1 0 0 Z';

export interface EyeTransitionProps {
  progress: number; // 0 = sharingan, 1 = rinnegan
  size?: number;
  style?: ViewStyle;
}

/**
 * Subtle transition overlay. At progress=0 it contributes the Sharingan-style
 * glowing white-ish iris edge and visible tomoe; at progress=1 it contributes
 * the purple concentric rings with a darker center. The underlying renderers
 * keep the pupil and highlight stable.
 */
export function EyeTransition({ progress, size = 96, style }: EyeTransitionProps) {
  const mix = progress;
  const scale = size / VW;

  // We animate ring emergence by interpolating opacity/stroke with `mix`.
  const ring01 = useAnimatedProps(() => ({
    opacity: interpolate(mix, [0, 1], [0, 0.85]),
    strokeWidth: interpolate(mix, [0, 1], [0, 4]),
  }));
  const ring02 = useAnimatedProps(() => ({
    opacity: interpolate(mix, [0, 1], [0, 0.7]),
    strokeWidth: interpolate(mix, [0, 1], [0, 3.2]),
  }));
  const ring03 = useAnimatedProps(() => ({
    opacity: interpolate(mix, [0, 1], [0, 0.55]),
    strokeWidth: interpolate(mix, [0, 1], [0, 2.6]),
  }));
  const ring04 = useAnimatedProps(() => ({
    opacity: interpolate(mix, [0, 1], [0, 0.35]),
    strokeWidth: interpolate(mix, [0, 1], [0, 2]),
  }));
  const centerDark = useAnimatedProps(() => ({
    opacity: interpolate(mix, [0.3, 1], [0, 1]),
    r: interpolate(mix, [0.3, 1], [18, 14]),
  }));
  const irisEdge = useAnimatedProps(() => ({
    opacity: interpolate(mix, [0, 1], [0.45, 0.25]),
    strokeWidth: interpolate(mix, [0, 1], [4, 2.4]),
  }));
  const tomoeGroupOpacity = useAnimatedProps(() => ({
    opacity: interpolate(mix, [0, 0.6, 1], [1, 0.4, 0]),
  }));
  const glowBoost = useAnimatedProps(() => ({
    opacity: interpolate(mix, [0, 0.5, 1], [0.8, 1, 0.35]),
    r: interpolate(mix, [0, 1], [60, 80]),
  }));

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const AnimatedG = Animated.createAnimatedComponent(G);

  return (
    <View style={[styles.wrap, { width: size, height: size * (VH / VW) }, style]}>
      <Animated.View style={{ transform: [{ scale: 1 + interpolate(mix, [0, 1], [0.012, 0.02]) }] }}>
        <svg width={size} height={size * (VH / VW)} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="rinneganIris" cx="50%" cy="44%" rx="58%" ry="58%">
              <stop offset="0%" stopColor="#d6c2ff" />
              <stop offset="26%" stopColor="#b088ff" />
              <stop offset="50%" stopColor="#7d4be8" />
              <stop offset="74%" stopColor="#4a248a" />
              <stop offset="100%" stopColor="#1c0d3a" />
            </radialGradient>
            <radialGradient id="transitionGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#b088ff" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#7d4be8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4a248a" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g>
            <circle cx={CX} cy={CY} r={18} fill="#090512" opacity={0} />
            <AnimatedCircle cx={CX} cy={CY} r={14} fill="#090512" animatedProps={centerDark} />
            <ellipse cx={CX} cy={CY} rx={46} ry={28} fill="url(#rinneganIris)" opacity={mix} />

            <AnimatedCircle cx={CX} cy={CY} r={40} fill="none" stroke="rgba(50,20,110,0.8)" animatedProps={ring01} />
            <AnimatedCircle cx={CX} cy={CY} r={34} fill="none" stroke="rgba(90,50,180,0.7)" animatedProps={ring02} />
            <AnimatedCircle cx={CX} cy={CY} r={28} fill="none" stroke="rgba(130,90,220,0.55)" animatedProps={ring03} />
            <AnimatedCircle cx={CX} cy={CY} r={22} fill="none" stroke="rgba(170,140,255,0.4)" animatedProps={ring04} />

            <circle cx={CX} cy={CY} r={49} fill="none" stroke="rgba(40,5,8,0.85)" strokeWidth={4} />
            <circle cx={CX} cy={CY} r={44} fill="url(#transitionGlow)" opacity={0.0} />
            <AnimatedCircle cx={CX} cy={CY} r={44} fill="url(#transitionGlow)" animatedProps={irisEdge} />

            <AnimatedG opacity={1} style={{ transform: [{ rotate: '0deg' }] }}>
              {[0, 120, 240].map((deg) => (
                <G key={deg} transform={`rotate(${deg})`}>
                  <Path
                    d={TOMOE_PATH}
                    fill="rgba(30,5,8,0.96)"
                    stroke="rgba(255,110,110,0.5)"
                    strokeWidth={2.2}
                    opacity={1}
                  />
                </G>
              ))}
            </AnimatedG>

            <ellipse cx={CX + 8} cy={CY - 10} rx={7} ry={3.2} fill="rgba(255,255,255,0.8)" opacity={0.6} />
          </g>
        </svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
