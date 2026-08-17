import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';

const BACKGROUND_DAY = require('@/assets/images/perokoko-room/room-bg-day.jpg');
const BACKGROUND_NIGHT = require('@/assets/images/perokoko-room/room-bg-night.jpg');

export type LegalDocumentSection = {
  heading: string;
  body: string;
};

/** Shared shell for ペロココの部屋's条文形式の法的文書画面 (利用規約・プライバシーポリシー) — same
 * background/header/scroll-card shell, only the title and section content differ. */
export function LegalDocumentScreen({
  title,
  sections,
  lastUpdated,
}: {
  title: string;
  sections: LegalDocumentSection[];
  lastUpdated: string;
}) {
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
        <ScreenHeader title={title} onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView type="backgroundElement" style={styles.card}>
            {sections.map((section) => (
              <View key={section.heading} style={styles.section}>
                <ThemedText type="smallBold" style={styles.sectionHeading}>
                  {section.heading}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {section.body}
                </ThemedText>
              </View>
            ))}
            <ThemedText type="small" themeColor="textSecondary" style={styles.lastUpdated}>
              制定日：{lastUpdated}
            </ThemedText>
          </ThemedView>
        </ScrollView>
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
    paddingBottom: Spacing.six,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.one,
  },
  sectionHeading: {
    fontSize: 15,
  },
  lastUpdated: {
    textAlign: 'right',
  },
});
