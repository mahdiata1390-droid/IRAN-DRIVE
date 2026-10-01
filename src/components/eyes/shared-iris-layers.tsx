import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Stop,
  Ellipse,
  Rect,
  LinearGradient,
  Use,
  ClipPath,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export const SHARINGAN_GRADIENT_ID = 'sharinganGradient';
export const RINNEGAN_GRADIENT_ID = 'rinneganGradient';

export function EyeDefs() {
  return (
    <Defs>
      <RadialGradient id={SHARINGAN_GRADIENT_ID} cx="50%" cy="42%" rx="58%" ry="58%">
        <Stop offset="0%" stopColor="#ff7b7b" />
        <Stop offset="32%" stopColor="#ff2d2d" />
        <Stop offset="58%" stopColor="#c4142f" />
        <Stop offset="82%" stopColor="#780014" />
        <Stop offset="100%" stopColor="#1a0004" />
      </RadialGradient>
      <RadialGradient id={RINNEGAN_GRADIENT_ID} cx="50%" cy="44%" rx="60%" ry="60%">
        <Stop offset="0%" stopColor="#c6b2ff" />
        <Stop offset="28%" stopColor="#b088ff" />
        <Stop offset="54%" stopColor="#7d4be8" />
        <Stop offset="78%" stopColor="#4a248a" />
        <Stop offset="100%" stopColor="#1c0d3a" />
      </RadialGradient>
      <RadialGradient id="scleraGradient" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#fff6f2" />
        <Stop offset="60%" stopColor="#fdf3ef" />
        <Stop offset="100%" stopColor="#e9d8da" />
      </RadialGradient>
      <RadialGradient id="pupilShadowGradient" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#0a0003" stopOpacity="0.55" />
        <Stop offset="100%" stopColor="#0a0003" stopOpacity="0" />
      </RadialGradient>
    </Defs>
  );
}

export interface EyePrimitiveProps {
  cx?: number;
  cy?: number;
  size?: number;
}

const CENTER = 100;
const BASE = 100;

export function EyeSclera({ size = 200 }: { size?: number }) {
  const viewBox = CENTER;
  return (
    <Svg
      width={size}
      height={size * 0.62}
      viewBox={`0 0 ${viewBox * 2} ${viewBox * 1.24}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible' }}
    >
      <Path
        d={`
          M 28 115
          C 28 70, 100 52, 100 52
          C 100 52, 172 70, 172 115
          C 172 160, 100 178, 100 178
          C 100 178, 28 160, 28 115 Z
        `}
        fill="url(#scleraGradient)"
        stroke="#4a3a3f"
        strokeWidth={1.5}
      />
      {/* upper eyelid shadow */}
      <Path
        d={`
          M 28 115
          C 28 70, 100 52, 100 52
          L 100 178
          C 100 178, 28 160, 28 115 Z
        `}
        fill="rgba(70,40,45,0.22)"
        opacity={0.6}
      />
      {/* subtle red rim of eye */}
      <Path
        d={`
          M 28 115
          C 28 70, 100 52, 100 52
          C 100 52, 172 70, 172 115
          C 172 160, 100 178, 100 178
          C 100 178, 28 160, 28 115 Z
        `}
        fill="none"
        stroke="rgba(120,8,10,0.45)"
        strokeWidth={2.2}
      />
      {/* tiny sclera highlight */}
      <Ellipse
        cx={74}
        cy={86}
        rx={7}
        ry={4.5}
        fill="#FFFFFF"
        opacity={0.85}
      />
      <Ellipse
        cx={126}
        cy={90}
        rx={3.6}
        ry={2.2}
        fill="#FFFFFF"
        opacity={0.6}
      />
    </Svg>
  );
}

export function EyeFrame({
  size = 200,
  fillColor = '#120205',
  strokeColor = '#3D0A0E',
}: {
  size?: number;
  fillColor?: string;
  strokeColor?: string;
}) {
  return (
    <Svg
      width={size}
      height={size * 0.62}
      viewBox={`0 0 ${CENTER * 2} ${CENTER * 1.24}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Path
        d={`
          M 28 115
          C 28 70, 100 52, 100 52
          C 100 52, 172 70, 172 115
          C 172 160, 100 178, 100 178
          C 100 178, 28 160, 28 115 Z
        `}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2.2}
      />
    </Svg>
  );
}

export function IrisLayers({
  irisR,
  innerR,
  pupilR,
  darkEdgeR,
  glow,
  glowScale,
  rotation,
  alpha01,
  alpha02,
  glowColor = '#ff2a00',
  glowColorSecondary = '#ff7b2a',
  irisGradientId = SHARINGAN_GRADIENT_ID,
  pupilColor = '#050505',
  pupilHighlightColor = 'rgba(255,90,90,0.75)',
}: {
  irisR: number;
  innerR: number;
  pupilR: number;
  darkEdgeR: number;
  glow: SharedValue<number>;
  glowScale: SharedValue<number>;
  rotation: SharedValue<number>;
  alpha01: SharedValue<number>;
  alpha02: SharedValue<number>;
  glowColor?: string;
  glowColorSecondary?: string;
  irisGradientId?: string;
  pupilColor?: string;
  pupilHighlightColor?: string;
}) {
  const animatedGlow = useAnimatedProps(() => ({
    opacity: glow.value,
  }));
  const animatedGlowScaleCircle = useAnimatedProps(() => ({
    r: irisR * glowScale.value,
    opacity: glow.value * 0.55,
  }));
  const animatedFloat = useAnimatedProps(() => ({
    opacity: alpha01.value * 0.9,
  }));
  const animatedFloat02 = useAnimatedProps(() => ({
    opacity: alpha02.value * 0.85,
  }));

  const AnimatedGradientCircle = Animated.createAnimatedComponent(Circle);

  return (
    <G>
      {/* outer shadow ring */}
      <Circle cx={CENTER} cy={CENTER} r={irisR + 4} fill="none" stroke="rgba(8,0,3,0.85)" strokeWidth={4} />
      {/* bright radial glow halo */}
      <AnimatedCircle
        cx={CENTER}
        cy={CENTER}
        r={irisR + 2}
        fill={glowColor}
        filter="url(#glowBlur)"
        opacity={0.0}
        style={{ filter: 'drop-shadow(0 0 12px currentColor)' }}
      />
      <circle cx={CENTER} cy={CENTER} r={irisR + 2} fill="none" stroke="rgba(255,40,40,0.55)" strokeWidth={8} opacity={0.0} />
      {/* main iris disc */}
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={irisR}
        fill={`url(#${irisGradientId})`}
        stroke="rgba(20,2,6,0.6)"
        strokeWidth={2}
      />
      {/* dark iris outer rim */}
      <Circle cx={CENTER} cy={CENTER} r={darkEdgeR} fill="none" stroke="#1a0004" strokeWidth={4.5} />
      {/* inner iris ring */}
      <Circle cx={CENTER} cy={CENTER} r={innerR} fill="none" stroke="rgba(255,60,60,0.32)" strokeWidth={2.5} />
      {/* subtle depth disc */}
      <Circle cx={CENTER} cy={CENTER} r={innerR - 4} fill="rgba(8,0,4,0.25)" />
      {/* radial depth lines */}
      <RadialLines count={12} innerR={innerR - 6} outerR={irisR - 4} alpha={alpha01} />
      <RadialLines count={6} innerR={pupilR + 6} outerR={innerR - 6} alpha={alpha02} />
      {/* pupil */}
      <Circle cx={CENTER} cy={CENTER} r={pupilR} fill={pupilColor} />
      {/* pupil inner highlight halo */}
      <Circle cx={CENTER} cy={CENTER} r={pupilR + 6} fill="url(#pupilShadowGradient)" opacity={0.5} />
      {/* tiny highlight dot */}
      <Circle cx={CENTER - 4} cy={CENTER - 4} r={2.6} fill="rgba(255,255,255,0.85)" />
      <Circle cx={CENTER + 3} cy={CENTER - 2} r={1.4} fill="rgba(255,255,255,0.5)" />
    </G>
  );
}

export function RadialLines({
  count,
  innerR,
  outerR,
  alpha,
}: {
  count: number;
  innerR: number;
  outerR: number;
  alpha: SharedValue<number>;
}) {
  const lines = useMemo(() => {
    const arr = [];
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const a = step * i;
      const x1 = CENTER + innerR * Math.cos(a);
      const y1 = CENTER + innerR * Math.sin(a);
      const x2 = CENTER + outerR * Math.cos(a);
      const y2 = CENTER + outerR * Math.sin(a);
      arr.push(
        <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,120,120,0.5)" strokeWidth={1.6} />
      );
    }
    return arr;
  }, [count, innerR, outerR]);
  return <G>{lines}</G>;
}

function Line({
  x1,
  y1,
  x2,
  y2,
  stroke,
  strokeWidth,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}) {
  return (
    <Svg
      width={200}
      height={124}
      viewBox={`0 0 ${CENTER * 2} ${CENTER * 1.24}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={stroke} strokeWidth={strokeWidth} />
    </Svg>
  );
}
