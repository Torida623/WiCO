import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LIVING_COST_ITEMS } from '@/constants/living-cost-items';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  formatYen,
  formatYenDiff,
  getLivingCostRecord,
  getMonthKey,
  getMonthSummary,
  getPreviousMonthKey,
  MonthSummary,
} from '@/lib/household-budget';

function CompareLine({ label, current, previous }: { label: string; current: number; previous: number }) {
  return (
    <View style={styles.compareRow}>
      <ThemedText type="small" style={styles.compareLabel}>
        {label}
      </ThemedText>
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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const monthKey = getMonthKey();
      const previousMonthKey = getPreviousMonthKey(monthKey);
      Promise.all([
        getMonthSummary(monthKey),
        getMonthSummary(previousMonthKey),
        getLivingCostRecord(monthKey),
        getLivingCostRecord(previousMonthKey),
      ]).then(([current, previous, currentRecord, previousRecord]) => {
        if (cancelled) return;
        setCurrentSummary(current);
        setPreviousSummary(previous);
        setCurrentLivingCosts(currentRecord?.amounts ?? {});
        setPreviousLivingCosts(previousRecord?.amounts ?? {});
        setHasPreviousData(previous.totalSpent > 0);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const currentEngelPercent = currentSummary?.engelRatio != null ? Math.round(currentSummary.engelRatio * 100) : null;
  const previousEngelPercent =
    previousSummary?.engelRatio != null ? Math.round(previousSummary.engelRatio * 100) : null;

  const livingCostItemsToShow = LIVING_COST_ITEMS.filter(
    (item) => (currentLivingCosts[item.id] ?? 0) !== 0 || (previousLivingCosts[item.id] ?? 0) !== 0,
  );

  return (
    <ThemedView style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="先月と比べる" onBack={() => router.back()} />

        {!hasPreviousData ? (
          <View style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              先月分の記録がまだないよ。来月になったら比べられるようになるよ。
            </ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {currentEngelPercent !== null && previousEngelPercent !== null && (
              <ThemedView type="backgroundElement" style={styles.engelCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  食費の割合
                </ThemedText>
                <ThemedText type="title" style={styles.engelValue}>
                  {currentEngelPercent}%
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  先月比 {formatDiffPercent(currentEngelPercent - previousEngelPercent)}
                </ThemedText>
              </ThemedView>
            )}

            <View style={styles.section}>
              <ThemedText type="smallBold">支出の内訳</ThemedText>
              <CompareLine label="食費" current={currentSummary!.foodTotal} previous={previousSummary!.foodTotal} />
              <CompareLine
                label="食費以外"
                current={currentSummary!.otherTotal}
                previous={previousSummary!.otherTotal}
              />
            </View>

            {livingCostItemsToShow.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="smallBold">生活費</ThemedText>
                {livingCostItemsToShow.map((item) => (
                  <CompareLine
                    key={item.id}
                    label={item.label}
                    current={currentLivingCosts[item.id] ?? 0}
                    previous={previousLivingCosts[item.id] ?? 0}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
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
    padding: Spacing.three,
    gap: Spacing.four,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  engelCard: {
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
  engelValue: {
    fontSize: 40,
    lineHeight: 46,
  },
  section: {
    gap: Spacing.two,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  compareLabel: {
    flex: 1,
  },
});
