import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function MealLogHubScreen() {
  return (
    <ThemedView style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="料理の思い出" />

        <View style={styles.content}>
          <Pressable onPress={() => router.push('/meal-log/new')} style={styles.choicePressable}>
            {({ pressed }) => (
              <ThemedView type="accent" style={[styles.choiceButton, pressed && styles.pressed]}>
                <ThemedText type="subtitle" themeColor="background">
                  記録する
                </ThemedText>
                <ThemedText type="small" themeColor="background">
                  食べたものを撮影して残すよ
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/meal-log/history')} style={styles.choicePressable}>
            {({ pressed }) => (
              <ThemedView type="backgroundElement" style={[styles.choiceButton, pressed && styles.pressed]}>
                <ThemedText type="subtitle">記録を見る</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  これまでの記録を振り返るよ
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>
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
  choiceButton: {
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
