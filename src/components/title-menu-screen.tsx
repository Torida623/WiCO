import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DissolveBackground } from '@/components/dissolve-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, Spacing } from '@/constants/theme';

const MENU_BACKGROUNDS = [
  require('@/assets/images/menu/menu-bg-hallway.jpg'),
  require('@/assets/images/menu/menu-bg-bread.jpg'),
  require('@/assets/images/menu/menu-bg-stove.jpg'),
  require('@/assets/images/menu/menu-bg-rug.jpg'),
];

export type TitleMenuScreenProps = {
  onSelectMenuProposal: () => void;
};

export function TitleMenuScreen({ onSelectMenuProposal }: TitleMenuScreenProps) {
  return (
    <View style={styles.flex}>
      <DissolveBackground images={MENU_BACKGROUNDS} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Pressable onPress={onSelectMenuProposal}>
          {({ pressed }) => (
            <ThemedView type="backgroundElement" style={[styles.button, pressed && styles.pressed]}>
              <ThemedText type="subtitle">献立を考える</ThemedText>
            </ThemedView>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: BottomTabInset + Spacing.four,
  },
  button: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
