import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useVisualSharinganRinneganAnimation } from './use-visual-sharingan-rinnegan';
import { SharinganSvg, RinneganSvg } from '../eyes/svg';
import type { SharinganState, EyeType, UchihaEyeProps } from '../eyes/types';

const VW = 200;
const VH = 124;

function EyeInner({ size, type, anim }: { size: number; type: EyeType; anim: ReturnType<typeof useVisualSharinganRinneganAnimation> }) {
  return type === 'sharingan' ? (
    <SharinganSvg size={size} anim={anim} />
  ) : (
    <RinneganSvg size={size} anim={anim} />
  );
}

export function VisualSharinganRinnegan({
  type = 'sharingan',
  state = 'idle',
  size = 96,
  animated = true,
  intensity = 1,
  style,
}: UchihaEyeProps) {
  const anim = useVisualSharinganRinneganAnimation(state, type, intensity);

  const aspect = VH / VW;
  const containerStyle = useMemo<ViewStyle>(() => {
    return {
      width: size,
      height: Math.round(size * aspect),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      ...style,
    };
  }, [size, style]);

  return (
    <Animated.View style={containerStyle}>
      {animated ? (
        <EyeInner size={size} type={type} anim={anim} />
      ) : (
        <View
          style={{
            width: size,
            height: Math.round(size * aspect),
            backgroundColor:
              type === 'sharingan' ? '#1a0004' : '#1c0d3a',
          }}
        />
      )}
    </Animated.View>
  );
}

export { VisualSharinganRinnegan as SharinganEyeVisual };
