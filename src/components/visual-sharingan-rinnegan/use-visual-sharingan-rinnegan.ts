import { useEffect, useRef, useMemo } from 'react';
import {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharinganState, EyeType } from '../eyes/types';

const IDLE_ROTATION_DURATION = 20000;
const IDLE_ORBIT_DURATION = 4800;
const IDLE_BREATH_DURATION = 1600;

export function useVisualSharinganRinneganAnimation(
  state: SharinganState,
  type: EyeType,
  intensity: number
) {
  const irisRotate = useSharedValue(0);
  const irisOrbit = useSharedValue(0);
  const pupilScale = useSharedValue(1);
  const irisScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const highlightOffset = useSharedValue({ x: 0, y: 0 });
  const rippleScale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0);
  const tomoeTipOffset = useSharedValue({ x: 0, y: 0 });
  const transitionMix = useSharedValue(type === 'rinnegan' ? 1 : 0);

  const wasTransient = useRef(false);
  const isAlwaysAlive = state === 'idle' || state === 'active';

  useEffect(() => {
    if (state === 'idle' || state === 'active') {
      const breathTarget = state === 'active' ? 1.03 : 1.015;
      const breathDuration = state === 'active' ? 700 : 1600;
      pupilScale.value = withRepeat(
        withSequence(
          withTiming(1 + (state === 'active' ? 0.05 : 0.025), {
            duration: breathDuration,
            easing: Easing.inOut(Easing.quad)
          }),
          withTiming(1, {
            duration: breathDuration,
            easing: Easing.inOut(Easing.quad)
          })
        ),
        -1,
        false
      );
      irisScale.value = withRepeat(
        withSequence(
          withTiming(1 + (state === 'active' ? 0.02 : 0.012), {
            duration: 1400,
            easing: Easing.inOut(Easing.quad)
          }),
          withTiming(1, {
            duration: 1400,
            easing: Easing.inOut(Easing.quad)
          })
        ),
        -1,
        false
      );
      irisRotate.value = withRepeat(
        withTiming(360, {
          duration: state === 'active' ? 6000 : IDLE_ROTATION_DURATION,
          easing: Easing.linear
        }),
        -1,
        false
      );
      irisOrbit.value = withRepeat(
        withSequence(
          withTiming(state === 'active' ? 5 : 2, {
            duration: IDLE_ORBIT_DURATION,
            easing: Easing.inOut(Easing.quad)
          }),
          withTiming(state === 'active' ? -5 : 2, {
            duration: IDLE_ORBIT_DURATION,
            easing: Easing.inOut(Easing.quad)
          })
        ),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(state === 'active' ? 0.7 : 0.45, {
            duration: state === 'active' ? 700 : 1200,
            easing: Easing.inOut(Easing.quad)
          }),
          withTiming(state === 'active' ? 0.4 : 0.25, {
            duration: state === 'active' ? 1100 : 1400,
            easing: Easing.inOut(Easing.quad)
          })
        ),
        -1,
        false
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1 + (state === 'active' ? 0.12 : 0.06), {
            duration: state === 'active' ? 700 : 1200,
            easing: Easing.inOut(Easing.quad)
          }),
          withTiming(1, {
            duration: state === 'active' ? 1100 : 1400,
            easing: Easing.inOut(Easing.quad)
          })
        ),
        -1,
        false
      );
      highlightOffset.value = {
        x: withRepeat(
          withSequence(
            withTiming(intensity * 4, {
              duration: 3000,
              easing: Easing.inOut(Easing.quad)
            }),
            withTiming(intensity * -4, {
              duration: 3000,
              easing: Easing.inOut(Easing.quad)
            })
          ),
          -1,
          false
        ),
        y: withRepeat(
          withSequence(
            withTiming(intensity * -3, {
              duration: 2800,
              easing: Easing.inOut(Easing.quad)
            }),
            withTiming(intensity * 2, {
              duration: 2800,
              easing: Easing.inOut(Easing.quad)
            })
          ),
          -1,
          false
        )
      };
      return;
    }

    const durations = {
      sent: 420,
      received: 420,
      notification: 580,
      loading: 480,
      recording: 520
    } as const;
    const dur = durations[state] ?? 420;
    const isTransient = state === 'sent' || state === 'received' || state === 'notification';
    const isStrong = state === 'notification';

    irisRotate.value = withSequence(
      withTiming(isStrong ? 60 : 45, { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 120, easing: Easing.linear })
    );
    irisOrbit.value = withSequence(
      withTiming(isStrong ? 10 : 5, { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: dur + 80, easing: Easing.inOut(Easing.quad) })
    );
    pupilScale.value = withSequence(
      withTiming(1 + (isStrong ? 0.07 : 0.045), { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: dur + 120, easing: Easing.inOut(Easing.quad) })
    );
    irisScale.value = withSequence(
      withTiming(1 + (isStrong ? 0.045 : 0.028), { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: dur + 140, easing: Easing.inOut(Easing.quad) })
    );
    glowOpacity.value = withSequence(
      withTiming(isStrong ? 0.95 : 0.75, { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(0.28, { duration: dur + 200, easing: Easing.inOut(Easing.quad) })
    );
    glowScale.value = withSequence(
      withTiming(1 + (isStrong ? 0.16 : 0.1), { duration: dur, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: dur + 220, easing: Easing.inOut(Easing.quad) })
    );
    highlightOffset.value = {
      x: withSequence(
        withTiming(intensity * 12, { duration: dur, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: dur + 180, easing: Easing.inOut(Easing.quad) })
      ),
      y: withSequence(
        withTiming(-intensity * 9, { duration: dur, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: dur + 180, easing: Easing.inOut(Easing.quad) })
      )
    };
    if (type === 'rinnegan') {
      rippleScale.value = withSequence(
        withTiming(1.25, { duration: dur + 60, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: dur + 220, easing: Easing.inOut(Easing.quad) })
      );
      rippleOpacity.value = withSequence(
        withTiming(0.7, { duration: dur, easing: Easing.out(Easing.cubic) }),
        withTiming(0.04, { duration: dur + 240, easing: Easing.inOut(Easing.quad) })
      );
    }
    wasTransient.current = false;
  }, [state, type, intensity, irisRotate, irisOrbit, pupilScale, irisScale, glowOpacity, glowScale, highlightOffset, rippleScale, rippleOpacity]);

  return {
    irisRotate,
    irisOrbit,
    pupilScale,
    irisScale,
    glowOpacity,
    glowScale,
    highlightOffset,
    rippleScale,
    rippleOpacity,
    tomoeTipOffset,
    transitionMix
  };
}
