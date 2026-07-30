import { Image, ImageSource } from 'expo-image';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const HOLD_MS = 2500;
const CROSSFADE_MS = 5000;
const VISIBLE_OPACITY = 0.5;

export type DissolveBackgroundProps = {
  images: ImageSource[];
};

// Picks a random index in [0, count) that isn't `current`, so every rotation
// visibly changes the image instead of occasionally crossfading to itself.
function pickNextIndex(current: number, count: number): number {
  if (count <= 1) return current;
  const next = Math.floor(Math.random() * (count - 1));
  return next >= current ? next + 1 : next;
}

export function DissolveBackground({ images }: DissolveBackgroundProps) {
  const initialIndexRef = useRef<number | null>(null);
  if (initialIndexRef.current === null) {
    initialIndexRef.current = Math.floor(Math.random() * images.length);
  }
  const initialIndex = initialIndexRef.current;
  const opacities = useSharedValue<number[]>(images.map((_, i) => (i === initialIndex ? VISIBLE_OPACITY : 0)));

  useEffect(() => {
    let active = initialIndex;
    let cancelled = false;

    function fadeToNext() {
      if (cancelled) return;
      const target = pickNextIndex(active, images.length);
      opacities.value = withDelay(
        HOLD_MS,
        withTiming(
          images.map((_, i) => (i === target ? VISIBLE_OPACITY : 0)),
          { duration: CROSSFADE_MS, easing: Easing.inOut(Easing.quad) },
          (finished) => {
            if (finished) {
              scheduleOnRN(advance, target);
            }
          },
        ),
      );
    }

    function advance(nextActive: number) {
      if (cancelled) return;
      active = nextActive;
      fadeToNext();
    }

    fadeToNext();

    return () => {
      cancelled = true;
      cancelAnimation(opacities);
    };
  }, [images.length, opacities, initialIndex]);

  return (
    <>
      {images.map((source, i) => (
        <DissolveLayer key={i} index={i} source={source} opacities={opacities} />
      ))}
    </>
  );
}

type DissolveLayerProps = {
  index: number;
  source: ImageSource;
  opacities: SharedValue<number[]>;
};

function DissolveLayer({ index, source, opacities }: DissolveLayerProps) {
  const style = useAnimatedStyle(() => ({ opacity: opacities.value[index] }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, style]}
      pointerEvents="none"
      renderToHardwareTextureAndroid
      shouldRasterizeIOS>
      <Image source={source} style={StyleSheet.absoluteFillObject} contentFit="cover" cachePolicy="memory-disk" />
    </Animated.View>
  );
}
