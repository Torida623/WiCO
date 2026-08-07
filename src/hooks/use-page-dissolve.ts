import { useEffect } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// A page-curl illustration bridges the outgoing and incoming screens: the
// current page dissolves into it, then it dissolves into the next page —
// two crossfades chained together rather than a literal 3D flip (which
// doesn't render inside Expo Go without a custom dev client).
const FADE_MS = 220;
const HOLD_MS = 90;

export function usePageDissolveOut() {
  const contentOpacity = useSharedValue(1);
  const curlOpacity = useSharedValue(0);

  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const curlStyle = useAnimatedStyle(() => ({ opacity: curlOpacity.value }));

  function dissolveOut(onMidpoint: () => void) {
    contentOpacity.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.quad) });
    curlOpacity.value = withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) scheduleOnRN(onMidpoint);
    });
  }

  return { contentStyle, curlStyle, dissolveOut };
}

export function usePageDissolveIn() {
  const contentOpacity = useSharedValue(0);
  const curlOpacity = useSharedValue(1);

  useEffect(() => {
    curlOpacity.value = withDelay(HOLD_MS, withTiming(0, { duration: FADE_MS, easing: Easing.in(Easing.quad) }));
    contentOpacity.value = withDelay(HOLD_MS, withTiming(1, { duration: FADE_MS, easing: Easing.in(Easing.quad) }));
  }, [contentOpacity, curlOpacity]);

  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const curlStyle = useAnimatedStyle(() => ({ opacity: curlOpacity.value }));

  return { contentStyle, curlStyle };
}
