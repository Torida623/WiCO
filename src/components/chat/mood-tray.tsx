import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Dimensions, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { TagChipOption, TagChips } from '@/components/chat/tag-chips';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TRAY_IMAGE = require('@/assets/images/ui/mood-tray.png');
const TRAY_IMAGE_ASPECT_RATIO = 1254 / 1254;
const SCREEN_WIDTH = Dimensions.get('window').width;
const TRAY_WIDTH = 440;
const TRAY_HEIGHT = TRAY_WIDTH / TRAY_IMAGE_ASPECT_RATIO;
const TRAY_LEFT = (SCREEN_WIDTH - TRAY_WIDTH) / 2;
const ANIMATION_MS = 380;
// Positive so the tray is hidden pointing straight up from its right-edge
// pivot, then swings DOWN into place when opening — top-to-bottom, not
// bottom-to-top.
const CLOSED_ROTATION_DEG = 90;

export type MoodTrayProps = {
  visible: boolean;
  genreOptions: TagChipOption[];
  formatOptions: TagChipOption[];
  tasteOptions: TagChipOption[];
  temperatureOptions: TagChipOption[];
  selectedGenre: string | null;
  selectedFormat: string | null;
  selectedTaste: string | null;
  selectedTemperature: string | null;
  onSelectGenre: (value: string | null) => void;
  onSelectFormat: (value: string | null) => void;
  onSelectTaste: (value: string | null) => void;
  onSelectTemperature: (value: string | null) => void;
  freeText: string;
  onChangeFreeText: (value: string) => void;
};

export function MoodTray({
  visible,
  genreOptions,
  formatOptions,
  tasteOptions,
  temperatureOptions,
  selectedGenre,
  selectedFormat,
  selectedTaste,
  selectedTemperature,
  onSelectGenre,
  onSelectFormat,
  onSelectTaste,
  onSelectTemperature,
  freeText,
  onChangeFreeText,
}: MoodTrayProps) {
  const theme = useTheme();
  const rotation = useSharedValue(visible ? 0 : CLOSED_ROTATION_DEG);
  const offscreenX = useSharedValue(visible ? 0 : SCREEN_WIDTH);

  useEffect(() => {
    const config = { duration: ANIMATION_MS, easing: Easing.out(Easing.quad) };
    rotation.value = withTiming(visible ? 0 : CLOSED_ROTATION_DEG, config);
    offscreenX.value = withTiming(visible ? 0 : SCREEN_WIDTH, config);
  }, [visible, rotation, offscreenX]);

  const animatedStyle = useAnimatedStyle(() => ({
    // Push fully past the right edge first, then rotate around that
    // now-offscreen pivot — rotation alone can't hide it since it stays
    // within the same on-screen radius from the (still on-screen) pivot.
    transform: [{ translateX: offscreenX.value }, { rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents={visible ? 'auto' : 'none'}>
      <Image source={TRAY_IMAGE} style={StyleSheet.absoluteFillObject} contentFit="contain" />
      <View style={styles.tagsWrapper}>
        <TagChips options={genreOptions} selected={selectedGenre} onSelect={onSelectGenre} style={styles.groupGap} />
        <TagChips
          options={formatOptions}
          selected={selectedFormat}
          onSelect={onSelectFormat}
          style={styles.groupGap}
        />
        <TagChips options={tasteOptions.slice(0, 2)} selected={selectedTaste} onSelect={onSelectTaste} />
        <TagChips
          options={tasteOptions.slice(2)}
          selected={selectedTaste}
          onSelect={onSelectTaste}
          style={styles.groupGap}
        />
        <TagChips options={temperatureOptions} selected={selectedTemperature} onSelect={onSelectTemperature} />
        <ThemedView type="backgroundElement" style={styles.freeTextWrapper}>
          <TextInput
            value={freeText}
            onChangeText={onChangeFreeText}
            placeholder="自由に入力する"
            placeholderTextColor={theme.textSecondary}
            style={[styles.freeTextInput, { color: theme.text }]}
          />
        </ThemedView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: TRAY_LEFT,
    top: '50%',
    marginTop: -TRAY_HEIGHT / 2,
    width: TRAY_WIDTH,
    height: TRAY_HEIGHT,
    transformOrigin: 'right center',
  },
  tagsWrapper: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  groupGap: {
    marginBottom: Spacing.three,
  },
  freeTextWrapper: {
    alignSelf: 'center',
    width: '50%',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  freeTextInput: {
    fontSize: 16,
    textAlign: 'center',
  },
});
