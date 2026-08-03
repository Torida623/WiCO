import { Image, ImageSource } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

const RECORD_BUTTON_IMAGE = require('@/assets/images/meal-log/record-button.jpg');
const RECORD_BUTTON_ASPECT_RATIO = 1416 / 792;
const HISTORY_BUTTON_IMAGE = require('@/assets/images/meal-log/history-button.jpg');
const HISTORY_BUTTON_ASPECT_RATIO = 1380 / 832;

// The source art's own rounded corners leave a thin white sliver outside
// their curve that cropping alone can't remove without cutting into the
// artwork. Masking each button to a corner radius proportional to its
// rendered width (measured via onLayout, since a flat Spacing constant
// would be too small on wide screens and too large on narrow ones) clips
// that sliver away regardless of device width.
const CORNER_RADIUS_FRACTION = 0.08;

function CardButton({
  source,
  aspectRatio,
  onPress,
}: {
  source: ImageSource;
  aspectRatio: number;
  onPress: () => void;
}) {
  const [radius, setRadius] = useState(Spacing.four);

  function handleLayout(event: LayoutChangeEvent) {
    setRadius(event.nativeEvent.layout.width * CORNER_RADIUS_FRACTION);
  }

  return (
    <Pressable onPress={onPress} onLayout={handleLayout} style={styles.choicePressable}>
      {({ pressed }) => (
        <View style={[styles.choiceButtonClip, { aspectRatio, borderRadius: radius }, pressed && styles.pressed]}>
          <Image source={source} style={styles.choiceButton} contentFit="contain" />
        </View>
      )}
    </Pressable>
  );
}

export default function MealLogHubScreen() {
  return (
    <ThemedView style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="料理の思い出" />

        <View style={styles.content}>
          <CardButton
            source={RECORD_BUTTON_IMAGE}
            aspectRatio={RECORD_BUTTON_ASPECT_RATIO}
            onPress={() => router.push('/meal-log/new')}
          />
          <CardButton
            source={HISTORY_BUTTON_IMAGE}
            aspectRatio={HISTORY_BUTTON_ASPECT_RATIO}
            onPress={() => router.push('/meal-log/history')}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  choicePressable: {
    width: '100%',
  },
  choiceButtonClip: {
    width: '100%',
    overflow: 'hidden',
  },
  choiceButton: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.7,
  },
});
