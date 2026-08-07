import { Href, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

function HubButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <ThemedView type="backgroundElement" style={[styles.button, pressed && styles.pressed]}>
          <ThemedText type="subtitle">{label}</ThemedText>
        </ThemedView>
      )}
    </Pressable>
  );
}

export default function MenuHubScreen() {
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="献立を考える" />

        <ScrollView contentContainerStyle={styles.content}>
          <HubButton label="献立を考える" onPress={() => router.push('/menu-chat')} />
          <HubButton label="献立ノート" onPress={() => router.push('/decided-menus' as Href)} />
          <HubButton label="苦手・アレルギー登録" onPress={() => router.push('/food-preferences' as Href)} />
        </ScrollView>
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  button: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    minWidth: 220,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
