import { useCallback, useEffect } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// A single page-curl "curtain" is mounted once per stack (in its _layout),
// on top of every screen. To navigate with the dissolve effect: fade the
// curtain in (opaque JPG, so it fully hides whatever's currently on
// screen) → run the navigation while completely hidden behind it → fade
// the curtain back out, revealing whatever screen is now active.
//
// Nothing about this needs per-screen state: the curtain always starts and
// ends at opacity 0, so there's no stale "still dissolved" state left
// behind on a screen to forget to reset — the same curtain instance and
// the same playPageDissolve() call handle both forward navigation and
// going back.
const FADE_MS = 220;
const HOLD_MS = 90;

let activePlay: ((action: () => void) => void) | null = null;

/** Runs `action` (typically a router.push/back call) behind the page-curl dissolve. Falls back to calling it directly if no curtain is mounted. */
export function playPageDissolve(action: () => void) {
  if (activePlay) {
    activePlay(action);
  } else {
    action();
  }
}

/** Mount once per stack layout; render the returned `curlStyle` on a full-bleed page-curl image absolutely positioned above the Stack. */
export function usePageDissolveCurtain() {
  const curlOpacity = useSharedValue(0);
  const curlStyle = useAnimatedStyle(() => ({ opacity: curlOpacity.value }));

  const play = useCallback(
    (action: () => void) => {
      curlOpacity.value = withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.quad) }, (finished) => {
        if (!finished) return;
        scheduleOnRN(action);
        curlOpacity.value = withDelay(HOLD_MS, withTiming(0, { duration: FADE_MS, easing: Easing.in(Easing.quad) }));
      });
    },
    [curlOpacity],
  );

  useEffect(() => {
    activePlay = play;
    return () => {
      if (activePlay === play) activePlay = null;
    };
  }, [play]);

  return { curlStyle };
}
