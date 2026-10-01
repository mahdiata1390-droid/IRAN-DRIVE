import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Stop,
  Svg,
} from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const VW = 200;
const VH = 124;
const CX = VW / 2;
const CY = VH / 2;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedG = Animated.createAnimatedComponent(G);

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export type SharinganState =
  | 'idle'
  | 'loading'
  | 'sent'
  | 'received'
  | 'notification'
  | 'recording'
  | 'active';

export type EyeType = 'sharingan' | 'rinnegan';

export interface UchihaEyeProps {
  type?: EyeType;
  state?: SharinganState;
  size?: number;
  animated?: boolean;
  intensity?: number;
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Backward compatible public API surface from lib/uchiha-eyes is preserved by
// src/components/sharingan-eye.tsx barrel file.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared SVG defs
// ---------------------------------------------------------------------------
function EyeDefs() {
  return (
    <Defs>
      <RadialGradient id="sharinganIrisGrad" cx="50%" cy="44%" rx="58%" ry="58%">
        <Stop offset="0%" stopColor="#ff7b7b" />
        <Stop offset="28%" stopColor="#ff2d2d" />
        <Stop offset="52%" stopColor="#c4142f" />
        <Stop offset="78%" stopColor="#780014" />
        <Stop offset="100%" stopColor="#1a0004" />
      </RadialGradient>
      <RadialGradient id="rinneganIrisGrad" cx="50%" cy="44%" rx="58%" ry="58%">
        <Stop offset="0%" stopColor="#d6c2ff" />
        <Stop offset="26%" stopColor="#b088ff" />
        <Stop offset="50%" stopColor="#7d4be8" />
        <Stop offset="74%" stopColor="#4a248a" />
        <Stop offset="100%" stopColor="#1c0d3a" />
      </RadialGradient>
      <RadialGradient id="rinneganGlowGrad" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#b088ff" stopOpacity={0.9} />
        <Stop offset="60%" stopColor="#7d4be8" stopOpacity={0.35} />
        <Stop offset="100%" stopColor="#4a248a" stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id="sharinganGlowGrad" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#ff3a1a" stopOpacity={0.8} />
        <Stop offset="60%" stopColor="#ff2200" stopOpacity={0.3} />
        <Stop offset="100%" stopColor="#ff0000" stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id="pupilShadowSharinganGrad" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#000" stopOpacity={0.55} />
        <Stop offset="100%" stopColor="#000" stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id="pupilShadowRinneganGrad" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#0a0318" stopOpacity={0.55} />
        <Stop offset="100%" stopColor="#0a0318" stopOpacity={0} />
      </RadialGradient>
    </Defs>
  );
}

// ---------------------------------------------------------------------------
// Eye outline
// ---------------------------------------------------------------------------
function EyeOutline({ bodyColor = '#f7ece9', rimColor = '#3a2a2e', shadowColor = '#3a2a2e' }: {
  bodyColor?: string;
  rimColor?: string;
  shadowColor?: string;
}) {
  return (
    <G>
      <Path
        d={`
          M 18 ${CY}
          C 18 20, ${CX - 12} 8, ${CX} 8
          C ${CX + 12} 8, ${VW - 18} 20, ${VW - 18} ${CY}
          C ${VW - 18} ${CY + 34}, ${CX + 12} ${CY + 38}, ${CX} ${CY + 38}
          C ${CX - 12} ${CY + 38}, 18 ${CY + 34}, 18 ${CY} Z
        `}
        fill={bodyColor}
        stroke={rimColor}
        strokeWidth={1.4}
      />
      <Path
        d={`
          M 10 ${CY}
          C 10 ${CY - 54}, ${CX - 14} 4, ${CX} 4
          C ${CX + 14} 4, ${VW - 10} ${CY - 54}, ${VW - 10} ${CY}
          C ${VW - 10} ${CY + 36}, ${CX + 14} ${CY + 40}, ${CX} ${CY + 40}
          C ${CX - 14} ${CY + 40}, 10 ${CY + 36}, 10 ${CY} Z
        `}
        fill="none"
        stroke={shadowColor}
        strokeWidth={3.2}
        opacity={0.4}
      />
      <Path
        d={`
          M 18 ${CY}
          C 18 20, ${CX - 12} 8, ${CX} 8
          C ${CX + 12} 8, ${VW - 18} 20, ${VW - 18} ${CY}
          L ${CX} ${CY + 38}
          C ${CX - 12} ${CY + 38}, 18 ${CY + 34}, 18 ${CY} Z
        `}
        fill="rgba(60,30,35,0.18)"
        opacity={0.7}
      />
      <Ellipse cx={74} cy={56} rx={6} ry={3.8} fill="#FFFFFF" opacity={0.9} />
      <Ellipse cx={126} cy={60} rx={3.2} ry={2} fill="#FFFFFF" opacity={0.55} />
    </G>
  );
}

// ---------------------------------------------------------------------------
// Tomoe
// ---------------------------------------------------------------------------
const TOMOE_PATH =
  'M 0 0 C 4 -9, 15 -8, 18 0 C 19 8, 10 14, 4 10 C 9 7, 10 2, 6 0 C 4 -1, 1 -1, 0 0 Z';

interface TomoeProps {
  cx: number;
  cy: number;
  rotation: number;
  scale: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

function Tomoe({ cx, cy, rotation, scale, fillColor, strokeColor, strokeWidth }: TomoeProps) {
  return (
    <G transform={`translate(${cx} ${cy}) rotate(${rotation}) scale(${scale})`}>
      <Path
        d={TOMOE_PATH}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fillRule="nonzero"
      />
      <Ellipse cx={0} cy={-4} rx={3.2} ry={1.6} fill={fillColor} stroke={strokeColor} strokeWidth={0.6} />
    </G>
  );
}

// ---------------------------------------------------------------------------
// Sharingan renderer
// ---------------------------------------------------------------------------
export function SharinganRenderer({
  size,
  anim,
  intensity = 1,
}: {
  size: number;
  anim: SharinganAnimValues;
  intensity?: number;
}) {
  const scale = size / VW;
  const {
    irisRotate,
    irisOrbit,
    eyeBreath,
    pupilR,
    glowOpacity,
    glowRadius,
    highlightX,
    highlightY,
    tomoeStroke,
    tomoeFill,
  } = anim;

  const eyeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: eyeBreath.value }],
  }));
  const irisRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${irisRotate.value}deg` }],
  }));
  const tomoeOrbitStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: irisOrbit.value }, { rotate: `${irisRotate.value * 0.6}deg` }],
  }));
  const glowAnimatedProps = useAnimatedProps(() => ({
    opacity: glowOpacity.value,
  }));
  const glowScaleAnimatedProps = useAnimatedProps(() => ({
    r: glowRadius.value * scale,
  }));
  const pupilAnimatedProps = useAnimatedProps(() => ({
    r: interpolate(pupilR.value, [MIN_PUPIL_R - 1, MAX_PUPIL_R + 2], [MIN_PUPIL_R - 1, MAX_PUPIL_R + 2]),
  }));
  const highlightAnimatedProps = useAnimatedProps(() => ({
    cx: CX + (highlightX.value) * scale,
    cy: CY + (highlightY.value) * scale,
    opacity: interpolate(highlightY.value, [-18, -7], [0.75, 0.3]),
  }));

  return (
    <Animated.View style={eyeAnimStyle}>
      <Svg width={size} height={size * (VH / VW)} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        <EyeDefs />
        <EyeOutline />

        {/* glow halo */}
        <AnimatedCircle
          cx={CX}
          cy={CY}
          r={1}
          fill="url(#sharinganGlowGrad)"
          animatedProps={glowScaleAnimatedProps}
          style={{ filter: 'drop-shadow(0 0 16px #ff2a00)' }}
        />

        {/* rotating iris group */}
        <AnimatedG style={irisRotateStyle}>
          <Circle cx={CX} cy={CY} r={49} fill="none" stroke="rgba(40,5,8,0.85)" strokeWidth={4} />
          <Circle cx={CX} cy={CY} r={44} fill="url(#sharinganIrisGrad)" stroke="rgba(20,2,6,0.5)" strokeWidth={1.6} />
          <Circle cx={CX} cy={CY} r={40} fill="none" stroke="rgba(10,0,4,0.7)" strokeWidth={3.5} />
          <Circle cx={CX} cy={CY} r={32} fill="none" stroke="rgba(255,80,80,0.28)" strokeWidth={2.2} />
          <Circle cx={CX} cy={CY} r={28} fill="rgba(6,0,3,0.3)" />
          {radialLines(CX, CY, 12, 24, 40, 'rgba(255,110,110,0.42)')}
          {radialLines(CX, CY, 6, 18, 24, 'rgba(255,160,160,0.25)')}
          <AnimatedCircle cx={CX} cy={CY} r={1} fill="#050505" animatedProps={pupilAnimatedProps} />
          <Circle cx={CX} cy={CY} r={12} fill="url(#pupilShadowSharinganGrad)" opacity={0.6} />
          <Circle cx={CX - 3} cy={CY - 3} r={2.2} fill="rgba(255,255,255,0.9)" />
          <Circle cx={CX + 2} cy={CY - 1.5} r={1.1} fill="rgba(255,255,255,0.5)" />
        </AnimatedG>

        {/* tomoe group */}
        <AnimatedG style={tomoeOrbitStyle}>
          {TOMOE_ANGLES.map((deg) => (
            <G key={deg} transform={`rotate(${deg})`}>
              <Tomoe
                cx={CX}
                cy={CY - 34}
                rotation={deg}
                scale={1}
                fillColor={`rgba(30,5,8,${interpolate(tomoeFill.value, [0.5, 1], [0.4, 1])})`}
                strokeColor={`rgba(255,110,110,${interpolate(tomoeStroke.value, [0.8, 1.8], [0.35, 0.65])})`}
                strokeWidth={interpolate(tomoeStroke.value, [0.8, 1.8], [1.6, 2.6])}
              />
            </G>
          ))}
        </AnimatedG>

        {/* animated highlight */}
        <AnimatedEllipse
          rx={7 * scale}
          ry={3.2 * scale}
          fill="rgba(255,255,255,0.85)"
          animatedProps={highlightAnimatedProps}
        />
      </Svg>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Rinnegan renderer
// ---------------------------------------------------------------------------
export function RinneganRenderer({
  size,
  anim,
  intensity = 1,
}: {
  size: number;
  anim: SharinganAnimValues;
  intensity?: number;
}) {
  const scale = size / VW;
  const {
    irisRotate,
    irisOrbit,
    eyeBreath,
    pupilR,
    glowOpacity,
    glowRadius,
    highlightX,
    highlightY,
    rippleR,
    rippleOpacity,
    rippleScale,
  } = anim;

  const eyeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: eyeBreath.value }],
  }));
  const irisRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${irisRotate.value}deg` }],
  }));
  const glowAnimatedProps = useAnimatedProps(() => ({
    opacity: glowOpacity.value,
  }));
  const glowScaleAnimatedProps = useAnimatedProps(() => ({
    r: glowRadius.value * scale,
  }));
  const rippleAnimatedProps = useAnimatedProps(() => ({
    r: rippleR.value * scale,
    opacity: interpolate(rippleOpacity.value, [0.02, 0.7], [0.02, 0.7]),
    transform: [{ scale: rippleScale.value }],
  }));
  const pupilAnimatedProps = useAnimatedProps(() => ({
    r: interpolate(pupilR.value, [MIN_PUPIL_R - 1, MAX_PUPIL_R + 2], [MIN_PUPIL_R - 1, MAX_PUPIL_R + 2]),
  }));
  const highlightAnimatedProps = useAnimatedProps(() => ({
    cx: CX + (highlightX.value) * scale,
    cy: CY + (highlightY.value) * scale,
    opacity: interpolate(highlightY.value, [-18, -7], [0.75, 0.3]),
  }));

  return (
    <Animated.View style={eyeAnimStyle}>
      <Svg width={size} height={size * (VH / VW)} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        <EyeDefs />
        <EyeOutline bodyColor="#fdf3ef" rimColor="#3a2a2e" shadowColor="#3a2a2e" />

        {/* purple glow halo */}
        <AnimatedCircle
          cx={CX}
          cy={CY}
          r={1}
          fill="url(#rinneganGlowGrad)"
          animatedProps={glowScaleAnimatedProps}
          style={{ filter: 'drop-shadow(0 0 16px #7d4be8)' }}
        />

        {/* rotating iris group */}
        <AnimatedG style={irisRotateStyle}>
          <Circle cx={CX} cy={CY} r={50} fill="none" stroke="rgba(20,5,40,0.9)" strokeWidth={4} />
          <Circle cx={CX} cy={CY} r={46} fill="url(#rinneganIrisGrad)" stroke="rgba(20,5,40,0.4)" strokeWidth={1.6} />
          <Circle cx={CX} cy={CY} r={40} fill="none" stroke="rgba(50,20,110,0.8)" strokeWidth={4} />
          <Circle cx={CX} cy={CY} r={34} fill="none" stroke="rgba(90,50,180,0.7)" strokeWidth={3.2} />
          <Circle cx={CX} cy={CY} r={28} fill="none" stroke="rgba(130,90,220,0.55)" strokeWidth={2.6} />
          <Circle cx={CX} cy={CY} r={22} fill="none" stroke="rgba(170,140,255,0.4)" strokeWidth={2} />
          <Circle cx={CX} cy={CY} r={20} fill="rgba(20,5,50,0.4)" />
          <Circle cx={CX - 4} cy={CY - 4} r={12} fill="rgba(220,200,255,0.08)" />
          <AnimatedCircle cx={CX} cy={CY} r={32} fill="none" stroke="rgba(170,140,255,0.5)" strokeWidth={2.4} animatedProps={rippleAnimatedProps} />
          <AnimatedCircle cx={CX} cy={CY} r={1} fill="#090512" animatedProps={pupilAnimatedProps} />
          <Circle cx={CX} cy={CY} r={12} fill="url(#pupilShadowRinneganGrad)" opacity={0.55} />
          <Circle cx={CX - 3} cy={CY - 3} r={2.2} fill="rgba(220,210,255,0.9)" />
          <Circle cx={CX + 2} cy={CY - 1.5} r={1.1} fill="rgba(220,210,255,0.5)" />
        </AnimatedG>

        {/* slow moving highlight */}
        <AnimatedEllipse
          rx={7 * scale}
          ry={3.2 * scale}
          fill="rgba(255,255,255,0.85)"
          animatedProps={highlightAnimatedProps}
        />
      </Svg>
    </Animated.View>
  );
}

const TOMOE_ANGLES = [0, 120, 240] as const;
const MIN_PUPIL_R = 12;
const MAX_PUPIL_R = 18;

// ---------------------------------------------------------------------------
// Radial lines helper
// ---------------------------------------------------------------------------
function radialLines(cx: number, cy: number, count: number, innerR: number, outerR: number, stroke: string) {
  const lines: React.ReactNode[] = [];
  const step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const a = step * i;
    const x1 = cx + innerR * Math.cos(a);
    const y1 = cy + innerR * Math.sin(a);
    const x2 = cx + outerR * Math.cos(a);
    const y2 = cy + outerR * Math.sin(a);
    lines.push(
      <Path
        key={i}
        d={`M ${x1} ${y1} L ${x2} ${y2}`}
        stroke={stroke}
        strokeWidth={1.5}
        fill="none"
      />
    );
  }
  return <G>{lines}</G>;
}

// ---------------------------------------------------------------------------
// Animation value types
// ---------------------------------------------------------------------------
export type SharinganAnimValues = {
  irisRotate: SharedValue<number>;
  irisOrbit: SharedValue<number>;
  eyeBreath: SharedValue<number>;
  pupilR: SharedValue<number>;
  glowOpacity: SharedValue<number>;
  glowRadius: SharedValue<number>;
  highlightX: SharedValue<number>;
  highlightY: SharedValue<number>;
  tomoeStroke: SharedValue<number>;
  tomoeFill: SharedValue<number>;
  rippleR: SharedValue<number>;
  rippleOpacity: SharedValue<number>;
  rippleScale: SharedValue<number>;
};

// ---------------------------------------------------------------------------
// Public wrapper
// ---------------------------------------------------------------------------
export function UchihaEye({
  type = 'sharingan',
  state = 'idle',
  size = 96,
  animated = true,
  intensity = 1,
  style,
}: UchihaEyeProps) {
  const anim = useIrisAnimation(type, state, intensity);

  return (
    <View style={[styles.wrap, { width: size, height: size * (VH / VW) }, style]}>
      {animated ? (
        type === 'sharingan' ? (
          <SharinganRenderer size={size} anim={anim} intensity={intensity} />
        ) : (
          <RinneganRenderer size={size} anim={anim} intensity={intensity} />
        )
      ) : (
        <View
          style={{
            width: size,
            height: size * (VH / VW),
            backgroundColor: type === 'sharingan' ? '#1a0004' : '#1c0d3a',
            borderRadius: size / 2,
          }}
        />
      )}
    </View>
  );
}

// Backward-compatible export for existing callers.
export { UchihaEye as SharinganEye };

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

import { useIrisAnimation } from './iris-renderers';
