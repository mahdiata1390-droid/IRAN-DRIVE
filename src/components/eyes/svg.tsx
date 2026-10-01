import React, { useRef, useEffect } from 'react';
import {StyleSheet, View, Platform} from 'react-native';
import Svg, {Circle, Defs, G, Path, RadialGradient, Stop, Ellipse, Text as SvgText, ClipPath} from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import type {SharinganState, EyeType} from './types';

const VW = 200;
const VH = 124;
const CX = VW / 2;
const CY = VH / 2;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

export function EyeDefs() {
  return (
    <Defs>
      <RadialGradient id="scleraShade" cx="50%" cy="40%" rx="45%" ry="55%">
        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.00"/>
        <Stop offset="55%" stopColor="rgba(255,240,235,0.15)"/>
        <Stop offset="100%" stopColor="rgba(40,20,25,0.25)"/>
      </RadialGradient>
      <RadialGradient id="vignette" cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="70%" stopColor="#000000" stopOpacity="0"/>
        <Stop offset="100%" stopColor="#000000" stopOpacity="0.35"/>
      </RadialGradient>
      <RadialGradient id="depthRing" cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0%" stopColor="#000000" stopOpacity="0.0"/>
        <Stop offset="100%" stopColor="#000000" stopOpacity="0.45"/>
      </RadialGradient>
    </Defs>
  );
}

const EyeBody = ({size, bodyColor, rimColor, eyelidShadowColor}: {
  size: number;
  bodyColor: string;
  rimColor?: string;
  eyelidShadowColor?: string;
}) => {
  const scale = size / VW;
  const shadowPath = `M 10 ${CY - 46} C 10 ${CY - 58}, ${CX - 12} ${CY - 60}, ${CX} ${CY - 60} C ${CX + 12} ${CY - 60}, ${VW - 10} ${CY - 58}, ${VW - 10} ${CY - 46} L ${CX} ${CY + 8} C ${CX} ${CY + 4}, 10 ${CY + 4}, 10 ${CY} Z`;
  return (
    <Svg width={size} height={size * (VH / VW)} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
      {/* eye outline */}
      <Path
        d={`M 10 ${CY} C 10 ${CY - 56}, ${CX - 12} ${CY - 60}, ${CX} ${CY - 60} C ${CX + 12} ${CY - 60}, ${VW - 10} ${CY - 56}, ${VW - 10} ${CY} C ${VW - 10} ${CY + 34}, ${CX + 12} ${CY + 38}, ${CX} ${CY + 38} C ${CX - 12} ${CY + 38}, 10 ${CY + 34}, 10 ${CY} Z`}
        fill={bodyColor}
        stroke={rimColor ?? '#2e0a0c'}
        strokeWidth={1.6}
      />
      {/* upper eyelid shadow */}
      <Path
        d={shadowPath}
        fill={eyelidShadowColor ?? 'rgba(50,18,22,0.25)'}
        opacity={0.8}
      />
      {/* subtle inner highlight edge */}
      <Path
        d={`M 14 ${CY - 1} C 14 ${CY - 54}, ${CX - 14} ${CY - 58}, ${CX} ${CY - 58} C ${CX + 14} ${CY - 58}, ${VW - 14} ${CY - 54}, ${VW - 14} ${CY - 1} L ${CX} ${CY + 2} C ${CX} ${CY + 1}, 14 ${CY + 1}, 14 ${CY - 1} Z`}
        fill="rgba(255,220,210,0.08)"
      />
      {/* limbal ring shadow */}
      <Circle cx={CX} cy={CY} r={46} fill="rgba(20,4,8,0.30)" />
    </Svg>
  );
};

const Pupil = ({size, anim, animType, radius, innerGlowColor}: {
  size: number;
  anim: any;
  animType: 'sharingan' | 'rinnegan';
  radius: number;
  innerGlowColor: string;
}) => {
  const scale = size / VW;
  const pupilR = useSharedValue(radius * 0.55);
  const innerGlow = useSharedValue(0.55);
  useEffect(() => {
    pupilR.value = withTiming(radius * 0.55, {duration: 220, easing: Easing.out(Easing.cubic)});
    innerGlow.value = withTiming(0.55, {duration: 160, easing: Easing.out(Easing.cubic)});
  }, [radius]);
  const rAnimated = useAnimatedProps(() => ({r: pupilR.value * scale}));
  const glowAnimated = useAnimatedProps(() => ({opacity: innerGlow.value}));
  return (
    <AnimatedG>
      <AnimatedCircle cx={CX * scale} cy={CY * scale} r={0.2 * scale} fill={innerGlowColor} animatedProps={glowAnimated} />
      <Circle cx={CX * scale} cy={CY * scale} r={radius * 0.55 * scale} fill="#000000" />
      <Circle cx={CX * scale} cy={CY * scale} r={radius * 0.55 * scale} fill="url(#depthRing)" opacity={0.8} />
      <Circle cx={CX * scale - 2 * scale} cy={CY * scale - 2 * scale} r={1.4 * scale} fill="white" opacity={0.95} />
      <Circle cx={CX * scale + 2 * scale} cy={CY * scale + 1.5 * scale} r={0.7 * scale} fill="white" opacity={0.4} />
    </AnimatedG>
  );
};

const TomoeMark = ({x, y, rot, scale, color, innerColor, stroke}: {
  x: number; y: number; rot: number; scale: number;
  color: string; innerColor: string; stroke: string;
}) => {
  const path = `M 0 0 C 5 -9, 14 -8, 17 0 C 18 7, 9 13, 4 10 C 8 7, 10 3, 7 0 C 5 -2, 2 -2, 0 0 Z`;
  const inner = `M 4 1 C 4 -2, 7 -4, 8 0 C 9 5, 4 7, 1 5 C 3 4, 4 1.5, 4 1 Z`;
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <Path d={path} fill={color} stroke={stroke} strokeWidth={1.2} />
      <Path d={inner} fill={innerColor} stroke="none" />
    </G>
  );
};

const SharinganIris = ({size, irisColor, depthColor, rimColor, highlightColor, irisR, pupilR, glowColor, glowR, glowOpacity, shimmerOpacity, shimmerX, shimmerY, shimmerColor, tomoeColor, tomoeInnerColor, tomoeStroke}: {
  size: number;
  irisColor: string; depthColor: string; rimColor: string; highlightColor: string;
  irisR: number; pupilR: number; glowColor: string; glowR: number;
  glowOpacity: number; shimmerOpacity: number; shimmerX: number; shimmerY: number; shimmerColor: string;
  tomoeColor: string; tomoeInnerColor: string; tomoeStroke: string;
}) => {  return (
    <>
      <Defs>
        <RadialGradient id="irisGrad" cx="50%" cy="45%" rx="56%" ry="54%">
          <Stop offset="0%" stopColor={irisColor} />
          <Stop offset="35%" stopColor={irisColor} />
          <Stop offset="75%" stopColor={depthColor} />
          <Stop offset="100%" stopColor={rimColor} />
        </RadialGradient>
        <RadialGradient id="pupilGrad" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#050505" />
          <Stop offset="80%" stopColor="#050505" />
          <Stop offset="100%" stopColor="#050505" stopOpacity="0"/>
        </RadialGradient>
        <RadialGradient id="highlightGrad" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor={highlightColor} stopOpacity="0.8" />
          <Stop offset="100%" stopColor={highlightColor} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="shimmerGrad" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor={irisColor} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={irisColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={CX} cy={CY} r={irisR} fill="url(#irisGrad)" stroke={rimColor} strokeWidth={2} />
      <Circle cx={CX} cy={CY} r={pupilR} fill="url(#pupilGrad)" stroke="#220507" strokeWidth={2} />
      <Circle cx={CX} cy={CY} r={pupilR * 0.55} fill="#000000" />
      <Circle cx={CX - 2} cy={CY - 2} r={1.5} fill={highlightColor} opacity={0.95} />
      <Circle cx={CX + 2} cy={CY + 1.5} r={0.7} fill={highlightColor} opacity={0.4} />
      <Circle cx={CX} cy={CY} r={glowR} fill={glowColor} opacity={glowOpacity} />
      <Circle cx={CX} cy={CY} r={22} fill={shimmerColor} opacity={shimmerOpacity} />
      <TomoeMark x={CX} y={CY - 34} rot={0} scale={1.1} color={tomoeColor} innerColor={tomoeInnerColor} stroke={tomoeStroke} />
      <TomoeMark x={CX} y={CY - 34} rot={120} scale={1.1} color={tomoeColor} innerColor={tomoeInnerColor} stroke={tomoeStroke} />
      <TomoeMark x={CX} y={CY - 34} rot={240} scale={1.1} color={tomoeColor} innerColor={tomoeInnerColor} stroke={tomoeStroke} />
      <Ellipse cx={CX + shimmerX} cy={CY + shimmerY} rx={12} ry={4} fill="url(#shimmerGrad)" opacity={shimmerOpacity * 0.5} />
    </>
  );
};

const RinneganIris = ({size, irisColor, depthColor, rimColor, glowColor, irisR, pupilR, glowR, glowOpacity, rippleR, rippleOpacity, rippleScale, ring1Color, ring1Width, ring2Color, ring2Width, ring3Color, ring3Width, ring4Color, ring4Width}: {
  size: number;
  irisColor: string; depthColor: string; rimColor: string;
  glowColor: string; irisR: number; pupilR: number;
  glowR: number; glowOpacity: number; rippleR: number; rippleOpacity: number; rippleScale: number;
  ring1Color: string; ring1Width: number; ring2Color: string; ring2Width: number;
  ring3Color: string; ring3Width: number; ring4Color: string; ring4Width: number;
}) => {  return (
    <>
      <Defs>
        <RadialGradient id="rinneganIris" cx="50%" cy="45%" rx="56%" ry="54%">
          <Stop offset="0%" stopColor={irisColor} />
          <Stop offset="35%" stopColor={irisColor} />
          <Stop offset="75%" stopColor={depthColor} />
          <Stop offset="100%" stopColor={rimColor} />
        </RadialGradient>
        <RadialGradient id="rinneganPupil" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#0a0210" />
          <Stop offset="100%" stopColor="#0a0210" stopOpacity="0"/>
        </RadialGradient>
        <RadialGradient id="rinneganGlow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor={glowColor} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={CX} cy={CY} r={irisR} fill="url(#rinneganIris)" stroke={rimColor} strokeWidth={2} />
      <Circle cx={CX} cy={CY} r={irisR * 0.75} fill="none" stroke={ring1Color} strokeWidth={ring1Width} />
      <Circle cx={CX} cy={CY} r={irisR * 0.5} fill="none" stroke={ring2Color} strokeWidth={ring2Width} />
      <Circle cx={CX} cy={CY} r={irisR * 0.27} fill="none" stroke={ring3Color} strokeWidth={ring3Width} />
      <Circle cx={CX} cy={CY} r={irisR * 0.13} fill="none" stroke={ring4Color} strokeWidth={ring4Width} />
      <Circle cx={CX} cy={CY} r={pupilR} fill="url(#rinneganPupil)" stroke="#1a0020" strokeWidth={2} />
      <Circle cx={CX} cy={CY} r={pupilR * 0.55} fill="#000000" />
      <Circle cx={CX - 2} cy={CY - 2} r={1.5} fill="rgba(255,255,255,0.9)" />
      <Circle cx={CX + 2} cy={CY + 1.5} r={0.7} fill="rgba(255,255,255,0.4)" />
      <Circle cx={CX} cy={CY} r={glowR} fill={glowColor} opacity={glowOpacity} />
      <Circle cx={CX} cy={CY} r={rippleR * rippleScale} fill="none" stroke={ring1Color} strokeWidth={2} opacity={rippleOpacity} />
      <Circle cx={CX} cy={CY} r={rippleR * rippleScale * 0.85} fill="none" stroke={ring2Color} strokeWidth={1.6} opacity={rippleOpacity * 0.7} />
    </>
  );
};

export function SharinganSvg({size, anim}: {size: number; anim: any}) {
  const irisWrapStyle = useAnimatedStyle(() => ({
    transform: [{scale: anim.irisScale.value}],
    opacity: Math.min(1, anim.glowOpacity.value + 0.25),
  }));
  return (
    <Animated.View style={irisWrapStyle}>
      <Svg width={size} height={size * (VH / VW)} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
        <SharinganIris
          size={size}
          irisColor="#e5222a" depthColor="#7a0d18" rimColor="#3a0408" highlightColor="#ffffff"
          irisR={44} pupilR={14} glowColor="rgba(255,50,50,0.45)" glowR={28}
          glowOpacity={0.55} shimmerOpacity={0.4}
          shimmerX={0} shimmerY={0} shimmerColor="rgba(255,200,200,0.6)"
          tomoeColor="#1a0408" tomoeInnerColor="#5a141c" tomoeStroke="rgba(255,180,180,0.5)"
        />
      </Svg>
    </Animated.View>
  );
};

export function RinneganSvg({size, anim}: {size: number; anim: any}) {
  const irisWrapStyle = useAnimatedStyle(() => ({
    transform: [{scale: anim.irisScale.value}],
    opacity: Math.min(1, anim.glowOpacity.value + 0.25),
  }));
  return (
    <Animated.View style={irisWrapStyle}>
      <Svg width={size} height={size * (VH / VW)} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
        <RinneganIris
          size={size}
          irisColor="#7f58c8" depthColor="#3f287f" rimColor="#1f1540"
          glowColor="rgba(160,112,255,0.4)" irisR={46} pupilR={13}
          glowR={30} glowOpacity={0.55} rippleR={52} rippleOpacity={0.15} rippleScale={1}
          ring1Color="#502f8c" ring1Width={4} ring2Color="#372062" ring2Width={3.5}
          ring3Color="#5a38a6" ring3Width={3} ring4Color="#9b6fd4" ring4Width={2.5}
        />
      </Svg>
    </Animated.View>
  );
};

// exports are already declared above
