import { Image } from 'expo-image';
import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';
import { useHierarchicalBack } from '@/hooks/use-hierarchical-back';

const BACKGROUND_DAY = require('@/assets/images/perokoko-room/room-bg-day.jpg');
const BACKGROUND_NIGHT = require('@/assets/images/perokoko-room/room-bg-night.jpg');

const LINKS = [
  { label: '利用規約', route: '/perokoko-room/terms/service' as Href },
  { label: 'プライバシーポリシー', route: '/perokoko-room/terms/privacy' as Href },
  { label: '特定商取引法に基づく表示', route: '/perokoko-room/terms/tokushoho' as Href },
];

export default function TermsHubScreen() {
  const goBack = useHierarchicalBack();
  const [isDay, setIsDay] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsDay(isDaytime());
    }, []),
  );

  return (
    <View style={styles.container}>
      <Image source={isDay ? BACKGROUND_DAY : BACKGROUND_NIGHT} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="利用規約・法的情報" onBack={goBack} />

        <View style={styles.content}>
          {LINKS.map((link) => (
            <Pressable key={link.label} onPress={() => router.push(link.route)}>
              {({ pressed }) => (
                <ThemedView type="backgroundElement" style={[styles.row, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">{link.label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    ›
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
