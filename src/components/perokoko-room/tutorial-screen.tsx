import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';
import { TUTORIAL_CATEGORIES, TutorialFaqItem } from '@/constants/tutorial-content';

const BACKGROUND_DAY = require('@/assets/images/perokoko-room/room-bg-day.jpg');
const BACKGROUND_NIGHT = require('@/assets/images/perokoko-room/room-bg-night.jpg');

export function TutorialScreen() {
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
        <ScreenHeader title="ヘルプ" onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content}>
          {TUTORIAL_CATEGORIES.map((category) => (
            <View key={category.title} style={styles.category}>
              <ThemedText type="smallBold" style={styles.categoryTitle}>
                {category.title}
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.card}>
                {category.items.map((item, index) => (
                  <FaqItem key={item.question} item={item} isLast={index === category.items.length - 1} />
                ))}
              </ThemedView>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function FaqItem({ item, isLast }: { item: TutorialFaqItem; isLast: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Pressable onPress={() => setIsOpen((value) => !value)} style={[styles.item, !isLast && styles.itemDivider]}>
      <View style={styles.itemHeader}>
        <ThemedText type="small" style={styles.question}>
          {item.question}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={[styles.chevron, isOpen && styles.chevronOpen]}>
          ›
        </ThemedText>
      </View>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(150)}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.answer}>
            {item.answer}
          </ThemedText>
        </Animated.View>
      )}
    </Pressable>
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
    gap: Spacing.four,
  },
  category: {
    gap: Spacing.two,
  },
  categoryTitle: {
    paddingHorizontal: Spacing.one,
  },
  card: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  item: {
    paddingVertical: Spacing.three,
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  question: {
    flex: 1,
  },
  chevron: {
    fontSize: 18,
    transform: [{ rotate: '0deg' }],
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  answer: {
    marginTop: Spacing.two,
    lineHeight: 20,
  },
});
