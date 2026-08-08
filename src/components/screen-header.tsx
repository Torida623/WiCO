import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const BACK_BUTTON_IMAGE = require('@/assets/images/ui/nav-back-bread.png');
const BACK_BUTTON_ASPECT_RATIO = 971 / 924;
const BACK_BUTTON_SIZE = 44;

const SIDE_SLOT_WIDTH = Spacing.six + Spacing.four;

export type ScreenHeaderProps = {
  title?: string;
  onBack?: () => void;
};

/**
 * Centered title bar. The left slot optionally holds an explicit back link
 * (swipe-back is disabled on this stack, so this is the only way back);
 * the right slot stays reserved for the SideMenu button, which floats on
 * top of this header in the top-right safe area.
 */
export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.sideSlot}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={8}>
            {({ pressed }) => (
              <Image
                source={BACK_BUTTON_IMAGE}
                style={[
                  styles.backButtonImage,
                  { aspectRatio: BACK_BUTTON_ASPECT_RATIO },
                  pressed && styles.pressed,
                ]}
                contentFit="contain"
              />
            )}
          </Pressable>
        )}
      </View>
      {title && (
        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>
      )}
      <View style={styles.sideSlot} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sideSlot: {
    width: SIDE_SLOT_WIDTH,
  },
  backButtonImage: {
    height: BACK_BUTTON_SIZE,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
