import React, { useEffect, useRef, useMemo } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
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
import {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Stop,
  Svg,
  Text as SvgText,
} from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ---------------------------------------------------------------------------
// Geometry (100-unit viewBox; we render at exact viewBox size for crispness)
// ---------------------------------------------------------------------------
const VW = 200;
const VH = 124;
const CX = VW / 2;
const CY = VH / 2;

// ---------------------------------------------------------------------------
// Reusable Tomoe path (comma / magara shape)
// ---------------------------------------------------------------------------
const TOMOE_PATH =
  'M 0 0 C 4 -9 15 -8 18 0 C 19 8 10 14 4 10 C 9 7 10 2 6 0 C 4 -1 1 -1 0 0 Z';

// ---------------------------------------------------------------------------
// Animated helpers
// ---------------------------------------------------------------------------
function animatedCircleProps(ref: SharedValue<number>, getR: (v: number) => number) {
  return useAnimatedProps(() => ({
    r: getR(ref.value),
  }));
}

// ---------------------------------------------------------------------------
// Shared SVG defs (gradients)
// ---------------------------------------------------------------------------
function EyeDefs() {
  return (
    <Defs>
      <RadialGradient id="sharinganIris" cx="50%" cy="44%" rx="58%" ry="58%">
        <Stop offset="0%" stopColor="#ff7b7b" />
        <Stop offset="28%" stopColor="#ff2d2d" />
        <Stop offset="52%" stopColor="#c4142f" />
        <Stop offset="78%" stopColor="#780014" />
        <Stop offset="100%" stopColor="#1a0004" />
      </RadialGradient>
      <RadialGradient id="rinneganIris" cx="50%" cy="44%" rx="58%" ry="58%">
        <Stop offset="0%" stopColor="#d6c2ff" />
        <Stop offset="26%" stopColor="#b088ff" />
        <Stop offset="50%" stopColor="#7d4be8" />
        <Stop offset="74%" stopColor="#4a248a" />
        <Stop offset="100%" stopColor="#1c0d3a" />
      </RadialGradient>
      <RadialGradient id="rinneganGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#b088ff" stopOpacity="0.9" />
        <Stop offset="60%" stopColor="#7d4be8" stopOpacity="0.35" />
        <Stop offset="100%" stopColor="#4a248a" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="sharinganGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#ff3a1a" stopOpacity="0.8" />
        <Stop offset="60%" stopColor="#ff2200" stopOpacity="0.3" />
        <Stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="pupilShadowSharingan" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#000" stopOpacity="0.55" />
        <Stop offset="100%" stopColor="#000" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="pupilShadowRinnegan" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#0a0318" stopOpacity="0.55" />
        <Stop offset="100%" stopColor="#0a0318" stopOpacity="0" />
      </RadialGradient>
    </Defs>
  );
}

// ---------------------------------------------------------------------------
// Eye outline (almond shape + eyelids + shadow + sclera highlights)
// ---------------------------------------------------------------------------
function EyeOutline({ size }: { size: number }) {
  const scale = size / VW;
  return (
    <G>
      {/* Sclera / eyelid fill */}
      <Path
        d={`
          M 18 62
          C 18 20, 100 8, 100 8
          C 100 8, 182 20, 182 62
          C 182 104, 100 116, 100 116
          C 100 116, 18 104, 18 62 Z
        `}
        fill="#f7ece9"
        stroke="#3a2a2e"
        strokeWidth={1.4}
      />
      {/* Upper eyelid shadow */}
      <Path
        d={`
          M 18 62
          C 18 20, 100 8, 100 8
          C 100 8, 182 20, 182 62
          L 100 116
          C 100 116, 18 104, 18 62 Z
        `}
        fill="rgba(60,30,35,0.18)"
        opacity={0.7}
      />
      {/* subtle rim */}
      <Path
        d={`
          M 10 62
          C 10 14, 100 4, 100 4
          C 100 4, 190 14, 190 62
          C 190 110, 100 122, 100 122
          C 100 122, 10 110, 10 62 Z
        `}
        fill="none"
        stroke="rgba(90,20,25,0.35)"
        strokeWidth={2.4}
      />
      {/* sclera highlights */}
      <Ellipse cx={74} cy={56} rx={6} ry={3.8} fill="#FFFFFF" opacity={0.9} />
      <Ellipse cx={126} cy={60} rx={3.2} ry={2} fill="#FFFFFF" opacity={0.55} />
    </G>
  );
}

// ---------------------------------------------------------------------------
// Radial line helper
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
// Single Tomoe
// ---------------------------------------------------------------------------
function Tomoe({
  cx,
  cy,
  rot,
  fillOpacity,
  strokeColor,
  strokeWidth,
}: {
  cx: number;
  cy: number;
  rot: number;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
}) {
  return (
    <G transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <Path
        d={TOMOE_PATH}
        fill={`rgba(30,5,8,${fillOpacity})`}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fillRule="nonzero"
      />
      <Ellipse cx={0} cy={-4} rx={3.2} ry={1.6} fill="rgba(30,5,8,0.9)" stroke={strokeColor} strokeWidth={0.6} />
    </G>
  );
}

// ---------------------------------------------------------------------------
// Glow ring (breathing halo)
// ---------------------------------------------------------------------------
function GlowRing({
  cx,
  cy,
  rRef,
  opacityRef,
  color,
  size,
}: {
  cx: number;
  cy: number;
  rRef: SharedValue<number>;
  opacityRef: SharedValue<number>;
  color: string;
  size: number;
}) {
  const scale = size / VW;
  const circleRef = useRef<SharedValue<number>>(rRef);
  const rAnimated = useAnimatedProps(() => ({
    r: (circleRef.current?.value ?? 0) * scale * 1.1 + 20 * scale,
    opacity: (opacityRef.value) * 0.6,
  }));
  const animatedCircle = Animated.createAnimatedComponent(Circle);
  return (
    <AnimatedCircle
      cx={cx * scale}
      cy={cy * scale}
      r={1}
      fill={color}
      animatedProps={rAnimated}
    />
  );
}

// ---------------------------------------------------------------------------
// Animated highlight ellipse
// ---------------------------------------------------------------------------
function Highlight({
  cx,
  cy,
  xRef,
  yRef,
  opacityRef,
  size,
}: {
  cx: number;
  cy: number;
  xRef: SharedValue<number>;
  yRef: SharedValue<number>;
  opacityRef: SharedValue<number>;
  size: number;
}) {
  const scale = size / VW;
  const xAnim = useAnimatedProps(() => ({
    cx: cx * scale + (xRef.value) * scale,
    cy: cy * scale + (yRef.value) * scale,
    opacity: interpolate(opacityRef.value, [0, 1], [0.2, 0.8]),
  }));
  const AnimatedEllipseComponent = Animated.createAnimatedComponent(Ellipse);
  return (
    <AnimatedEllipseComponent
      rx={7 * scale}
      ry={3.2 * scale}
      fill="rgba(255,255,255,0.85)"
      animatedProps={xAnim}
    />
  );
}

// ---------------------------------------------------------------------------
// Sharingan core SVG (no outer wrapper)
// ---------------------------------------------------------------------------
export function SharinganSvg({ size, anim }: { size: number; anim: SharinganAnimationValues }) {
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

  const glowOpacityAnimated = useAnimatedProps(() => ({
    opacity: glowOpacity.value * 0.9,
  }));
  const glowScaleAnimated = useAnimatedProps(() => ({
    r: glowRadius.value * scale,
  }));

  const pupilAnimatedProps = useAnimatedProps(() => ({
    r: interpolate(pupilR.value, [8, 18], [8, 18]),
  }));

  const highlightAnimatedProps = useAnimatedProps(() => ({
    cx: CX + (highlightX.value) * scale,
    cy: CY + (highlightY.value) * scale,
    opacity: interpolate(highlightY.value, [-18, -7], [0.75, 0.3]),
  }));

  const AnimatedSvg = Animated.createAnimatedComponent(Svg as any);

  return (
    <Animated.View style={eyeAnimStyle}>
      <Svg width={size} height={size * (VH / VW)} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        <EyeDefs />
        <EyeOutline size={size} />

        {/* glow halo */}
        <AnimatedCircle
          cx={CX}
          cy={CY}
          r={1}
          fill="url(#sharinganGlow)"
          animatedProps={glowOpacityAnimated}
          style={{ filter: 'drop-shadow(0 0 12px #ff2a00)' }}
        />
        <AnimatedCircle
          cx={CX}
          cy={CY}
          r={1}
          fill="#ff3a1a" opacity={0}
          animatedProps={glowScaleAnimated}
          style={{ filter: 'drop-shadow(0 0 20px #ff2a00)' }}
        />

        {/* rotating iris group */}
        <AnimatedG style={irisRotateStyle}>
          {/* outer iris rim */}
          <Circle cx={CX} cy={CY} r={49} fill="none" stroke="rgba(40,5,8,0.85)" strokeWidth={4} />
          {/* main iris */}
          <Circle cx={CX} cy={CY} r={44} fill="url(#sharinganIris)" stroke="rgba(20,2,6,0.5)" strokeWidth={1.6} />
          {/* dark edge */}
          <Circle cx={CX} cy={CY} r={40} fill="none" stroke="rgba(10,0,4,0.7)" strokeWidth={3.5} />
          {/* inner iris ring */}
          <Circle cx={CX} cy={CY} r={32} fill="none" stroke="rgba(255,80,80,0.28)" strokeWidth={2.2} />
          {/* depth disc */}
          <Circle cx={CX} cy={CY} r={28} fill="rgba(6,0,3,0.3)" />
          {/* radial lines */}
          {radialLines(CX, CY, 12, 24, 40, 'rgba(255,110,110,0.42)')}
          {radialLines(CX, CY, 6, 18, 24, 'rgba(255,160,160,0.25)')}
          {/* pupil */}
          <AnimatedCircle cx={CX} cy={CY} r={1} fill="#050505" animatedProps={pupilAnimatedProps} />
          <Circle cx={CX} cy={CY} r={12} fill="url(#pupilShadowSharingan)" opacity={0.6} />
          {/* pupil highlights */}
          <Circle cx={CX - 3} cy={CY - 3} r={2.2} fill="rgba(255,255,255,0.9)" />
          <Circle cx={CX + 2} cy={CY - 1.5} r={1.1} fill="rgba(255,255,255,0.5)" />
        </AnimatedG>

        {/* tomoe group */}
        <AnimatedG style={tomoeOrbitStyle}>
          {[0, 120, 240].map((deg) => (
            <G key={deg} transform={`rotate(${deg})`}>
              <Tomoe
                cx={CX}
                cy={CY - 34}
                rot={deg}
                fillOpacity={0.96}
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
// Rinnegan core SVG (no outer wrapper)
// ---------------------------------------------------------------------------
export function RinneganSvg({ size, anim }: { size: number; anim: SharinganAnimationValues }) {
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

  const glowOpacityAnimated = useAnimatedProps(() => ({
    opacity: glowOpacity.value * 0.75,
  }));

  const glowScaleAnimated = useAnimatedProps(() => ({
    r: glowRadius.value * scale,
  }));

  const rippleProps = useAnimatedProps(() => ({
    r: rippleR.value * scale,
    opacity: interpolate(rippleOpacity.value, [0.02, 0.7], [0.02, 0.7]),
    transform: [{ scale: rippleScale.value }],
  }));

  const pupilAnimatedProps = useAnimatedProps(() => ({
    r: interpolate(pupilR.value, [8, 18], [8, 18]),
  }));

  const highlightAnimatedProps = useAnimatedProps(() => ({
    cx: CX + (highlightX.value) * scale,
    cy: CY + (highlightY.value) * scale,
    opacity: interpolate(highlightY.value, [-18, -7], [0.75, 0.3]),
  }));

  const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

  return (
    <Animated.View style={eyeAnimStyle}>
      <Svg width={size} height={size * (VH / VW)} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        <EyeDefs />
        <EyeOutline size={size} />

        {/* purple glow halo */}
        <AnimatedCircle
          cx={CX}
          cy={CY}
          r={1}
          fill="url(#rinneganGlow)"
          animatedProps={glowOpacityAnimated}
          style={{ filter: 'drop-shadow(0 0 12px #7d4be8)' }}
        />
        <AnimatedCircle
          cx={CX}
          cy={CY}
          r={1}
          fill="rgba(140,90,255,0)"
          animatedProps={glowScaleAnimated}
          style={{ filter: 'drop-shadow(0 0 20px #7d4be8)' }}
        />

        {/* rotating iris group */}
        <AnimatedG style={irisRotateStyle}>
          {/* outer rim */}
          <Circle cx={CX} cy={CY} r={50} fill="none" stroke="rgba(20,5,40,0.9)" strokeWidth={4} />
          {/* main iris */}
          <Circle cx={CX} cy={CY} r={46} fill="url(#rinneganIris)" stroke="rgba(20,5,40,0.4)" strokeWidth={1.6} />
          {/* outer ring */}
          <Circle cx={CX} cy={CY} r={40} fill="none" stroke="rgba(50,20,110,0.8)" strokeWidth={4} />
          {/* middle ring */}
          <Circle cx={CX} cy={CY} r={34} fill="none" stroke="rgba(90,50,180,0.7)" strokeWidth={3.2} />
          {/* middle inner ring */}
          <Circle cx={CX} cy={CY} r={28} fill="none" stroke="rgba(130,90,220,0.55)" strokeWidth={2.6} />
          {/* inner ring */}
          <Circle cx={CX} cy={CY} r={22} fill="none" stroke="rgba(170,140,255,0.4)" strokeWidth={2} />
          {/* depth shading */}
          <Circle cx={CX} cy={CY} r={20} fill="rgba(20,5,50,0.4)" />
          <Circle cx={CX - 4} cy={CY - 4} r={12} fill="rgba(220,200,255,0.08)" />
          {/* ripple ring */}
          <AnimatedCircle
            cx={CX}
            cy={CY}
            r={32}
            fill="none"
            stroke="rgba(170,140,255,0.5)"
            strokeWidth={2.4}
            animatedProps={rippleProps}
          />
          {/* pupil */}
          <AnimatedCircle cx={CX} cy={CY} r={1} fill="#090512" animatedProps={pupilAnimatedProps} />
          <Circle cx={CX} cy={CY} r={12} fill="url(#pupilShadowRinnegan)" opacity={0.55} />
          {/* pupil highlights */}
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

// ---------------------------------------------------------------------------
// Animation value types
// ---------------------------------------------------------------------------
export type SharinganAnimationValues = {
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
// Animation driver hook
// ---------------------------------------------------------------------------
export function useIrisAnimation(
  type: 'sharingan' | 'rinnegan',
  state: SharinganState,
  intensity: number
): SharinganAnimationValues {
  const irisRotate = useSharedValue(0);
  const irisOrbit = useSharedValue(0);
  const eyeBreath = useSharedValue(1);
  const pupilR = useSharedValue(12);
  const glowOpacity = useSharedValue(0.35);
  const glowRadius = useSharedValue(60);
  const highlightX = useSharedValue(8);
  const highlightY = useSharedValue(-10);
  const tomoeStroke = useSharedValue(1.2);
  const tomoeFill = useSharedValue(0.85);
  const rippleR = useSharedValue(32);
  const rippleOpacity = useSharedValue(0.1);
  const rippleScale = useSharedValue(0.9);

  const isTransient = state === 'sent' || state === 'received' || state === 'notification';
  const isAlwaysAlive = state === 'idle' || state === 'active';

  useEffect(() => {
    if (state === 'idle') {
      irisRotate.value = withRepeat(
        withTiming(360, { duration: 30000, easing: Easing.linear }),
        -1,
        false
      );
      irisOrbit.value = withRepeat(
        withSequence(
          withTiming(6, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
          withTiming(-6, { duration: 5200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      eyeBreath.value = withRepeat(
        withSequence(
          withTiming(1.012, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      pupilR.value = withRepeat(
        withSequence(
          withTiming(16, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
          withTiming(12, { duration: 3200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.32, { duration: 2400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      glowRadius.value = withRepeat(
        withSequence(
          withTiming(68, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
          withTiming(58, { duration: 2400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      highlightX.value = withRepeat(
        withSequence(
          withTiming(14, { duration: 6000, easing: Easing.inOut(Easing.quad) }),
          withTiming(2, { duration: 6000, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      highlightY.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
          withTiming(-7, { duration: 5200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      tomoeStroke.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 2800, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      if (type === 'rinnegan') {
        rippleR.value = withRepeat(
          withSequence(
            withTiming(40, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
            withTiming(30, { duration: 3200, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          false
        );
        rippleOpacity.value = withRepeat(
          withSequence(
            withTiming(0.35, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
            withTiming(0.05, { duration: 3200, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          false
        );
        rippleScale.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
            withTiming(0.9, { duration: 3200, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          false
        );
      }
      return;
    }

    if (state === 'active') {
      irisRotate.value = withRepeat(
        withTiming(360, { duration: 14000, easing: Easing.linear }),
        -1,
        false
      );
      irisOrbit.value = withRepeat(
        withSequence(
          withTiming(10, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
          withTiming(-6, { duration: 2200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      eyeBreath.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      pupilR.value = withRepeat(
        withSequence(
          withTiming(17, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(11, { duration: 1200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.75, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.45, { duration: 1400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      glowRadius.value = withRepeat(
        withSequence(
          withTiming(80, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
          withTiming(60, { duration: 1400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      highlightX.value = withRepeat(
        withSequence(
          withTiming(16, { duration: 3400, easing: Easing.inOut(Easing.quad) }),
          withTiming(2, { duration: 3400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      highlightY.value = withRepeat(
        withSequence(
          withTiming(-14, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
          withTiming(-8, { duration: 3000, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      tomoeStroke.value = withRepeat(
        withSequence(
          withTiming(1.45, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      if (type === 'rinnegan') {
        rippleR.value = withRepeat(
          withSequence(
            withTiming(46, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
            withTiming(30, { duration: 1800, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          false
        );
        rippleOpacity.value = withRepeat(
          withSequence(
            withTiming(0.55, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
            withTiming(0.05, { duration: 1800, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          false
        );
        rippleScale.value = withRepeat(
          withSequence(
            withTiming(1.1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
            withTiming(0.9, { duration: 1800, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          false
        );
      }
      return;
    }

    // transient states (loading, sent, received, notification, recording)
    const isStrong = state === 'notification';
    const dur = isStrong ? 420 : 320;
    const rise = isStrong ? 1.18 : 1.1;
    const riseGlow = isStrong ? 0.95 : 0.75;
    const settleExtra = state === 'recording' ? 220 : 120;

    irisRotate.value = withSequence(
      withTiming(40, { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: dur + 40, easing: Easing.linear })
    );
    irisOrbit.value = withSequence(
      withTiming(isStrong ? 16 : 8, { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: dur + 20, easing: Easing.inOut(Easing.quad) })
    );
    eyeBreath.value = withSequence(
      withTiming(rise, { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: dur + settleExtra, easing: Easing.inOut(Easing.quad) })
    );
    pupilR.value = withSequence(
      withTiming(17 + (isStrong ? 3 : 1), { duration: dur, easing: Easing.inOut(Easing.quad) }),
      withTiming(12, { duration: dur + settleExtra, easing: Easing.inOut(Easing.quad) })
    );
    glowOpacity.value = withSequence(
      withTiming(riseGlow, { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(0.35, { duration: dur + settleExtra + 60, easing: Easing.inOut(Easing.quad) })
    );
    glowRadius.value = withSequence(
      withTiming(isStrong ? 92 : 78, { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(60, { duration: dur + settleExtra, easing: Easing.inOut(Easing.quad) })
    );
    highlightX.value = withSequence(
      withTiming(22, { duration: dur, easing: Easing.inOut(Easing.quad) }),
      withTiming(8, { duration: dur + settleExtra, easing: Easing.inOut(Easing.quad) })
    );
    highlightY.value = withSequence(
      withTiming(-18, { duration: dur, easing: Easing.inOut(Easing.quad) }),
      withTiming(-10, { duration: dur + settleExtra, easing: Easing.inOut(Easing.quad) })
    );
    tomoeStroke.value = withSequence(
      withTiming(isStrong ? 1.7 : 1.5, { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(0.9, { duration: dur + settleExtra + 20, easing: Easing.inOut(Easing.quad) })
    );

    if (type === 'rinnegan') {
      rippleR.value = withSequence(
        withTiming(52, { duration: dur + 60, easing: Easing.out(Easing.cubic) }),
        withTiming(30, { duration: dur + settleExtra + 60, easing: Easing.inOut(Easing.quad) })
      );
      rippleOpacity.value = withSequence(
        withTiming(0.75, { duration: dur, easing: Easing.out(Easing.cubic) }),
        withTiming(0.05, { duration: dur + settleExtra + 60, easing: Easing.inOut(Easing.quad) })
      );
      rippleScale.value = withSequence(
        withTiming(1.18, { duration: dur, easing: Easing.out(Easing.cubic) }),
        withTiming(0.9, { duration: dur + settleExtra + 60, easing: Easing.inOut(Easing.quad) })
      );
    }
  }, [
    state,
    irisRotate,
    irisOrbit,
    eyeBreath,
    pupilR,
    glowOpacity,
    glowRadius,
    highlightX,
    highlightY,
    tomoeStroke,
    rippleR,
    rippleOpacity,
    rippleScale,
    type,
    intensity,
  ]);

  return {
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
    rippleR,
    rippleOpacity,
    rippleScale,
  };
}

// ---------------------------------------------------------------------------
// Type re-export for consumers
// ---------------------------------------------------------------------------
export type { SharinganState } from './types';

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

  if (!animated) {
    return <View style={[styles.wrap, { width: size, height: size * (VH / VW) }, style]} />;
  }

  return (
    <View style={[styles.wrap, { width: size, height: size * (VH / VW) }, style]}>
      {type === 'sharingan' ? (
        <SharinganSvg size={size} anim={anim} />
      ) : (
        <RinneganSvg size={size} anim={anim} />
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

// tiny placeholder type import used by `useIrisAnimation` usage sites.
import { SharinganState } from './types';
