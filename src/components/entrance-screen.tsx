import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BottomTabInset, Spacing } from '@/constants/theme';

const DOOR = require('@/assets/images/entrance-door.jpg');
const DOOR_WITH_NOTICE = require('@/assets/images/entrance-door-notice.jpg');
const TAP_BUTTON = require('@/assets/images/tap-plate-button.png');
const TAP_BUTTON_ASPECT_RATIO = 1536 / 1024;

export type EntranceScreenProps = {
  hasNotification?: boolean;
  onEnter: () => void;
};

export function EntranceScreen({ hasNotification = false, onEnter }: EntranceScreenProps) {
  const tapOpacity = useSharedValue(1);

  useEffect(() => {
    tapOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 225 }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 225 }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(tapOpacity);
    };
  }, [tapOpacity]);

  const tapStyle = useAnimatedStyle(() => ({ opacity: tapOpacity.value }));

  return (
    <Pressable style={styles.flex} onPress={onEnter}>
      <Image
        source={hasNotification ? DOOR_WITH_NOTICE : DOOR}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Animated.View style={tapStyle}>
          <Image source={TAP_BUTTON} style={styles.tapButton} contentFit="contain" />
        </Animated.View>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: BottomTabInset + Spacing.four,
  },
  tapButton: {
    width: 240,
    height: undefined,
    aspectRatio: TAP_BUTTON_ASPECT_RATIO,
  },
});
