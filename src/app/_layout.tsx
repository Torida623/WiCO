import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Href, router, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
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

// Same track regardless of time of day; fadeStartMs is tuned to its 1:03 runtime.
const MEAL_BGM = require('@/assets/audio/meal-bgm.mp3');
const MEAL_BGM_VOLUME = 0.4;
const MEAL_BGM_FADE_START_MS = 61_800;

// 2:21 track
const MEAL_LOG_BGM = require('@/assets/audio/meal-log-bgm.mp3');
const MEAL_LOG_BGM_VOLUME = 0.4;
const MEAL_LOG_BGM_FADE_START_MS = 139_000;
const MEAL_LOG_BGM_FADE_IN_MS = 600;

// 1:05 track
const BUDGET_BGM = require('@/assets/audio/budget-bgm.mp3');
const BUDGET_BGM_VOLUME = 0.4;
const BUDGET_BGM_FADE_START_MS = 63_000;
const BUDGET_BGM_FADE_IN_MS = 600;

type Stage = 'entrance' | 'menu' | 'app';

export default function TabLayout() {
  const [stage, setStage] = useState<Stage>('entrance');
  const [pendingRoute, setPendingRoute] = useState<Href | null>(null);
  const fadeOpacity = useSharedValue(0);
  const daytime = useRef(isDaytime()).current;
  const titleBgm = daytime ? DAY_BGM : NIGHT_BGM;
  const pathname = usePathname();

  // All three loops are created once, right here at the root, the moment the
  // app boots — same as the title track always has been. That gives each
  // one the entire entrance/menu-browsing stretch to finish downloading
  // over the Expo Go dev connection before it's ever asked to play, instead
  // of only starting that download the moment its own screen mounts (which
  // is what caused the audible startup delay/silence on meal-log before).
  useLoopingBgm(titleBgm.source, TITLE_BGM_VOLUME, stage !== 'app', titleBgm.fadeStartMs, titleBgm.fadeInMs);
  useLoopingBgm(
    MEAL_BGM,
    MEAL_BGM_VOLUME,
    stage === 'app' && (pathname === '/' || pathname === '/menu-chat'),
    MEAL_BGM_FADE_START_MS,
    0,
  );
  useLoopingBgm(
    MEAL_LOG_BGM,
    MEAL_LOG_BGM_VOLUME,
    stage === 'app' && pathname.startsWith('/meal-log'),
    MEAL_LOG_BGM_FADE_START_MS,
    MEAL_LOG_BGM_FADE_IN_MS,
  );
  useLoopingBgm(
    BUDGET_BGM,
    BUDGET_BGM_VOLUME,
    stage === 'app' && pathname.startsWith('/budget'),
    BUDGET_BGM_FADE_START_MS,
    BUDGET_BGM_FADE_IN_MS,
  );

  useEffect(() => {
    if (stage === 'app' && pendingRoute) {
      router.push(pendingRoute);
      setPendingRoute(null);
    }
  }, [stage, pendingRoute]);

  function transitionTo(nextStage: Stage, route?: Href) {
    fadeOpacity.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }, (finished) => {
      'worklet';
      if (finished) {
        scheduleOnRN(setStage, nextStage);
        if (route) scheduleOnRN(setPendingRoute, route);
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
        {stage === 'menu' && (
          <TitleMenuScreen
            onSelectMenuProposal={() => transitionTo('app')}
            onSelectMealMemories={() => transitionTo('app', '/meal-log' as Href)}
            onSelectShoppingMemo={() => transitionTo('app', '/shopping-memo' as Href)}
            onSelectBudget={() => transitionTo('app', '/budget' as Href)}
          />
        )}
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
