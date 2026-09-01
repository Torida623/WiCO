import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Spacing } from '@/constants/theme';

const SIDE_MENU_BUTTON_IMAGE = require('@/assets/images/ui/menu-button.png');
const SIDE_MENU_PANEL_IMAGE = require('@/assets/images/ui/side-menu-panel.png');
const SIDE_MENU_BUTTON_SIZE = 60;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Row bounds as a fraction of the panel image's own height, hand-measured
// from the artwork (perokoko-room-bg style hand-drawn menu, no separate
// hitbox layer) so each row of the curtain image gets a tappable zone.
const SIDE_MENU_ROWS = [
  { label: '献立を考える', top: '20.1%', height: '6.5%', left: '0%', right: '0%', route: '/' as Href },
  { label: '料理の思い出', top: '30.1%', height: '7.3%', left: '0%', right: '0%', route: '/meal-log' as Href },
  { label: 'レシピ研究室', top: '40.7%', height: '7.3%', left: '0%', right: '0%', route: '/recipe-lab' as Href },
  { label: 'お買い物ノート', top: '51.2%', height: '7.4%', left: '0%', right: '0%', route: '/shopping-memo' as Href },
  { label: 'ペロココの部屋', top: '61.8%', height: '7.3%', left: '0%', right: '0%', route: '/perokoko-room' as Href },
  { label: 'お知らせ', top: '74.5%', height: '7%', left: '10%', right: '55%', route: undefined },
  { label: '設定', top: '74.5%', height: '7%', left: '50%', right: '10%', route: '/perokoko-room/settings' as Href },
] as const;

/**
 * Self-contained navigation entry point: a hamburger button pinned to the
 * top-right safe area, plus the sliding drawer it opens. Drop it into any
 * screen to get the app's standard navigation, no shared state required.
 */
export function SideMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const translateY = useSharedValue(-SCREEN_HEIGHT);

  useEffect(() => {
    translateY.value = withTiming(isOpen ? 0 : -SCREEN_HEIGHT, {
      duration: 420,
      easing: Easing.out(Easing.quad),
    });
  }, [isOpen, translateY]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.min(0, event.translationY);
    })
    .onEnd((event) => {
      const shouldClose = event.translationY < -100 || event.velocityY < -600;
      if (shouldClose) {
        translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 320, easing: Easing.in(Easing.quad) });
        scheduleOnRN(setIsOpen, false);
      } else {
        translateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) });
      }
    });

  return (
    <>
      <SafeAreaView style={styles.buttonSafeArea} edges={['top', 'right']} pointerEvents="box-none">
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            setIsOpen(true);
          }}
          style={styles.buttonPressable}>
          {({ pressed }) => (
            <Image
              source={SIDE_MENU_BUTTON_IMAGE}
              style={[styles.buttonImage, pressed && styles.pressed]}
              contentFit="contain"
            />
          )}
        </Pressable>
      </SafeAreaView>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.panel, panelStyle]} pointerEvents={isOpen ? 'box-none' : 'none'}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsOpen(false)}>
            <Image source={SIDE_MENU_PANEL_IMAGE} style={styles.panelImage} contentFit="cover" />
          </Pressable>
          {SIDE_MENU_ROWS.map((row) => (
            <Pressable
              key={row.label}
              onPress={() => {
                setIsOpen(false);
                if (row.route) router.push(row.route);
              }}
              style={[styles.rowZone, { top: row.top, height: row.height, left: row.left, right: row.right }]}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  buttonSafeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  buttonPressable: {
    padding: Spacing.three,
    // Pulls the button's own center (padding 16 + half of the 60px image = 46)
    // up to match ScreenHeader's back button center (paddingVertical 8 + half
    // of its 44px height = 30), so the two sit on the same visual line.
    marginTop: -16,
  },
  buttonImage: {
    width: SIDE_MENU_BUTTON_SIZE,
    height: SIDE_MENU_BUTTON_SIZE,
  },
  panel: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  panelImage: {
    width: '100%',
    height: '100%',
  },
  rowZone: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  pressed: {
    opacity: 0.7,
  },
});
