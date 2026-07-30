import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { EntranceScreen } from '@/components/entrance-screen';
import { TitleMenuScreen } from '@/components/title-menu-screen';
import { isDaytime } from '@/constants/time-of-day';
import { useLoopingBgm } from '@/hooks/use-looping-bgm';

SplashScreen.preventAutoHideAsync();

const TITLE_BGM_VOLUME = 0.4;

// fadeStartMs is tuned per track: just before that track's actual runtime,
// so the loop's fade-out lands on the real ending instead of cutting it off.
const DAY_BGM = { source: require('@/assets/audio/title-bgm.mp3'), fadeStartMs: 75_000, fadeInMs: 600 }; // 1:17 track
const NIGHT_BGM = { source: require('@/assets/audio/night-bgm.mp3'), fadeStartMs: 115_000, fadeInMs: 0 }; // 1:57 track

type Stage = 'entrance' | 'menu' | 'app';

export default function TabLayout() {
  const [stage, setStage] = useState<Stage>('entrance');
  const fadeOpacity = useSharedValue(0);
  const daytime = useRef(isDaytime()).current;
  const titleBgm = daytime ? DAY_BGM : NIGHT_BGM;
  useLoopingBgm(titleBgm.source, TITLE_BGM_VOLUME, stage !== 'app', titleBgm.fadeStartMs, titleBgm.fadeInMs);

  function transitionTo(nextStage: Stage) {
    fadeOpacity.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }, (finished) => {
      'worklet';
      if (finished) {
        scheduleOnRN(setStage, nextStage);
        fadeOpacity.value = withTiming(0, { duration: 1600, easing: Easing.in(Easing.quad) });
      }
    });
  }

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeProvider value={DefaultTheme}>
        <AnimatedSplashOverlay />
        {stage === 'entrance' && <EntranceScreen isNight={!daytime} onEnter={() => transitionTo('menu')} />}
        {stage === 'menu' && <TitleMenuScreen onSelectMenuProposal={() => transitionTo('app')} />}
        {stage === 'app' && <AppTabs />}
        <Animated.View pointerEvents="none" style={[styles.fadeOverlay, fadeStyle]} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  fadeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
});
