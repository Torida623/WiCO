import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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
const SEGMENT_COUNT = 5;

export type NutritionMeterProps = {
  label: string;
  level: FoodGroupLevel;
  color: string;
};

export function NutritionMeter({ label, level, color }: NutritionMeterProps) {
  const activeIndex = LEVEL_INDEX[level];

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {LEVEL_LABEL[level]}
        </ThemedText>
      </View>
      <View style={styles.track}>
        {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
          <View
            key={index}
            style={[styles.segment, { backgroundColor: index <= activeIndex ? color : 'rgba(0,0,0,0.08)' }]}
          />
        ))}
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
  track: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    height: 10,
    borderRadius: Spacing.one,
  },
});
