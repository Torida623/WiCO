import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { EntranceScreen } from '@/components/entrance-screen';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const [entered, setEntered] = useState(false);
  const fadeOpacity = useSharedValue(0);

  function handleEnter() {
    fadeOpacity.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }, (finished) => {
      'worklet';
      if (finished) {
        scheduleOnRN(setEntered, true);
        fadeOpacity.value = withTiming(0, { duration: 1600, easing: Easing.in(Easing.quad) });
      }
    });
  }

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));

  return (
    <ThemeProvider value={DefaultTheme}>
      <AnimatedSplashOverlay />
      {entered ? <AppTabs /> : <EntranceScreen onEnter={handleEnter} />}
      <Animated.View pointerEvents="none" style={[styles.fadeOverlay, fadeStyle]} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  fadeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
});
