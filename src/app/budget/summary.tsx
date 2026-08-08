import { Image, ImageSource } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { LIVING_COST_ITEMS } from '@/constants/living-cost-items';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { playPageDissolve } from '@/hooks/use-page-dissolve';
import {
  formatYen,
  formatYenDiff,
  getLivingCostRecord,
  getMonthKey,
  getMonthSummary,
  getPreviousMonthKey,
  MonthSummary,
  seedDemoComparisonData,
} from '@/lib/household-budget';

const NOTEBOOK_BACKGROUND = require('@/assets/images/budget/notebook-bg.jpg');
const ENGEL_CARD_IMAGE = require('@/assets/images/budget/engel-ratio-card.png');
const TITLE_BREAKDOWN_IMAGE = require('@/assets/images/budget/summary-title-breakdown.png');
const TITLE_LIVING_COSTS_IMAGE = require('@/assets/images/budget/summary-title-living-costs.png');
const LABEL_FOOD = require('@/assets/images/budget/summary-label-food.png');
const LABEL_FOOD_OTHER = require('@/assets/images/budget/summary-label-food-other.png');
const LABEL_RENT = require('@/assets/images/budget/summary-label-rent.png');
const LABEL_COMMUNICATION = require('@/assets/images/budget/summary-label-communication.png');
const LABEL_INSURANCE = require('@/assets/images/budget/summary-label-insurance.png');
const LABEL_CAR = require('@/assets/images/budget/summary-label-car.png');
const LABEL_SUBSCRIPTION = require('@/assets/images/budget/summary-label-subscription.png');
const LABEL_OTHER = require('@/assets/images/budget/summary-label-other.png');

const ENGEL_CARD_ASPECT_RATIO = 1672 / 941;
const TITLE_BREAKDOWN_ASPECT_RATIO = 787 / 203;
const TITLE_LIVING_COSTS_ASPECT_RATIO = 476 / 194;
const LABEL_IMAGE_HEIGHT = 18;
const TITLE_IMAGE_HEIGHT = 22;

// Only the living-cost items the hand-drawn word sheet actually covered so
// far (電気/水道 aren't drawn yet) — everything else falls back to plain text.
const LIVING_COST_LABEL_ART: Record<string, { source: ImageSource; aspectRatio: number }> = {
  rent: { source: LABEL_RENT, aspectRatio: 367 / 101 },
  communication: { source: LABEL_COMMUNICATION, aspectRatio: 485 / 91 },
  insurance: { source: LABEL_INSURANCE, aspectRatio: 197 / 96 },
  car: { source: LABEL_CAR, aspectRatio: 278 / 100 },
  subscription: { source: LABEL_SUBSCRIPTION, aspectRatio: 296 / 93 },
  other: { source: LABEL_OTHER, aspectRatio: 248 / 87 },
};

function CompareLine({
  label,
  labelArt,
  current,
  previous,
}: {
  label: string;
  labelArt?: { source: ImageSource; aspectRatio: number };
  current: number;
  previous: number;
}) {
  return (
    <View style={styles.compareRow}>
      <View style={styles.compareLabel}>
        {labelArt ? (
          <Image
            source={labelArt.source}
            style={{ height: LABEL_IMAGE_HEIGHT, aspectRatio: labelArt.aspectRatio }}
            contentFit="contain"
          />
        ) : (
          <ThemedText type="small">{label}</ThemedText>
        )}
      </View>
      <ThemedText type="smallBold">{formatYen(current)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        （{formatYenDiff(current - previous)}）
      </ThemedText>
    </View>
  );
}

function formatDiffPercent(diff: number): string {
  if (diff === 0) return '±0pt';
  const sign = diff > 0 ? '＋' : '−';
  return `${sign}${Math.abs(diff)}pt`;
}

export default function BudgetSummaryScreen() {
  const [currentSummary, setCurrentSummary] = useState<MonthSummary | null>(null);
  const [previousSummary, setPreviousSummary] = useState<MonthSummary | null>(null);
  const [currentLivingCosts, setCurrentLivingCosts] = useState<Record<string, number>>({});
  const [previousLivingCosts, setPreviousLivingCosts] = useState<Record<string, number>>({});
  const [hasPreviousData, setHasPreviousData] = useState(false);

  const load = useCallback(() => {
    const monthKey = getMonthKey();
    const previousMonthKey = getPreviousMonthKey(monthKey);
    return Promise.all([
      getMonthSummary(monthKey),
      getMonthSummary(previousMonthKey),
      getLivingCostRecord(monthKey),
      getLivingCostRecord(previousMonthKey),
    ]).then(([current, previous, currentRecord, previousRecord]) => {
      setCurrentSummary(current);
      setPreviousSummary(previous);
      setCurrentLivingCosts(currentRecord?.amounts ?? {});
      setPreviousLivingCosts(previousRecord?.amounts ?? {});
      setHasPreviousData(previous.totalSpent > 0);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleSeedDemoData() {
    await seedDemoComparisonData();
    load();
  }

  const currentEngelPercent = currentSummary?.engelRatio != null ? Math.round(currentSummary.engelRatio * 100) : null;
  const previousEngelPercent =
    previousSummary?.engelRatio != null ? Math.round(previousSummary.engelRatio * 100) : null;

  const livingCostItemsToShow = LIVING_COST_ITEMS.filter(
    (item) => (currentLivingCosts[item.id] ?? 0) !== 0 || (previousLivingCosts[item.id] ?? 0) !== 0,
  );

  return (
    <View style={styles.flex}>
      <Image source={NOTEBOOK_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => playPageDissolve(() => router.back())} />

        {!hasPreviousData ? (
          <View style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              先月分の記録がまだないよ。来月になったら比べられるようになるよ。
            </ThemedText>
            <Pressable onPress={handleSeedDemoData} hitSlop={8} style={styles.demoButton}>
              {({ pressed }) => (
                <ThemedText type="link" themeColor="accent" style={pressed && styles.pressed}>
                  デモデータで試してみる
                </ThemedText>
              )}
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {currentEngelPercent !== null && previousEngelPercent !== null && (
              <View style={styles.engelCardWrapper}>
                <Image source={ENGEL_CARD_IMAGE} style={styles.engelCardImage} contentFit="contain" />
                <View style={styles.engelCardOverlay} pointerEvents="none">
                  <ThemedText type="title" style={styles.engelValue}>
                    {currentEngelPercent}%
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    先月と比べて{formatDiffPercent(currentEngelPercent - previousEngelPercent)}
                  </ThemedText>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Image
                source={TITLE_BREAKDOWN_IMAGE}
                style={[styles.sectionTitleImage, { aspectRatio: TITLE_BREAKDOWN_ASPECT_RATIO }]}
                contentFit="contain"
              />
              <CompareLine
                label="食費"
                labelArt={{ source: LABEL_FOOD, aspectRatio: 186 / 111 }}
                current={currentSummary!.foodTotal}
                previous={previousSummary!.foodTotal}
              />
              <CompareLine
                label="食費以外"
                labelArt={{ source: LABEL_FOOD_OTHER, aspectRatio: 377 / 109 }}
                current={currentSummary!.otherTotal}
                previous={previousSummary!.otherTotal}
              />
            </View>

            {livingCostItemsToShow.length > 0 && (
              <View style={styles.section}>
                <Image
                  source={TITLE_LIVING_COSTS_IMAGE}
                  style={[styles.sectionTitleImage, { aspectRatio: TITLE_LIVING_COSTS_ASPECT_RATIO }]}
                  contentFit="contain"
                />
                {livingCostItemsToShow.map((item) => (
                  <CompareLine
                    key={item.id}
                    label={item.label}
                    labelArt={LIVING_COST_LABEL_ART[item.id]}
                    current={currentLivingCosts[item.id] ?? 0}
                    previous={previousLivingCosts[item.id] ?? 0}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
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
    gap: Spacing.four,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  demoButton: {
    padding: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  engelCardWrapper: {
    width: '95%',
    alignSelf: 'center',
    marginLeft: Spacing.two,
    aspectRatio: ENGEL_CARD_ASPECT_RATIO,
  },
  engelCardImage: {
    width: '100%',
    height: '100%',
  },
  engelCardOverlay: {
    position: 'absolute',
    top: '32%',
    left: '8%',
    right: '8%',
    height: '55%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  engelValue: {
    fontSize: 40,
    lineHeight: 46,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitleImage: {
    height: TITLE_IMAGE_HEIGHT,
    // Shifted right by the same amount as compareLabel's paddingLeft below,
    // so section titles and item labels line up on the same left edge.
    marginLeft: LABEL_IMAGE_HEIGHT,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  compareLabel: {
    flex: 1,
    // Shifted right by roughly one character's width to match the section titles.
    paddingLeft: LABEL_IMAGE_HEIGHT,
  },
});
