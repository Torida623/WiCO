import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FoodGroupLevel } from '@/lib/meal-records';

const LEVEL_INDEX: Record<FoodGroupLevel, number> = {
  low: 0,
  slightlyLow: 1,
  adequate: 2,
  slightlyHigh: 3,
  high: 4,
};
const LEVEL_LABEL: Record<FoodGroupLevel, string> = {
  low: '少なめ',
  slightlyLow: 'ちょっと少なめ',
  adequate: 'ちょうどいい',
  slightlyHigh: 'ちょっと多め',
  high: '多め',
};
const LEVEL_COUNT = 5;

export type NutritionMeterProps = {
  label: string;
  level: FoodGroupLevel;
  color: string;
  compact?: boolean;
};

export function NutritionMeter({ label, level, color, compact }: NutritionMeterProps) {
  const theme = useTheme();
  const fillPercent = ((LEVEL_INDEX[level] + 1) / LEVEL_COUNT) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <ThemedText type="smallBold" style={compact && styles.compactText}>
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={compact && styles.compactText}>
          {LEVEL_LABEL[level]}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.fill, { width: `${fillPercent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compactText: {
    fontSize: 12,
    lineHeight: 16,
  },
  track: {
    height: 10,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Spacing.two,
  },
});
