import { Image, ImageSource } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { FoodGroupLevel, searchMealRecords, summarizeNutritionBalance, WeeklyNutritionBalance } from '@/lib/meal-records';

const RECORD_BUTTON_IMAGE = require('@/assets/images/meal-log/record-button.png');
const RECORD_BUTTON_ASPECT_RATIO = 1416 / 792;
const HISTORY_BUTTON_IMAGE = require('@/assets/images/meal-log/history-button.png');
const HISTORY_BUTTON_ASPECT_RATIO = 1380 / 832;

// ひなた作の「今週の栄養バランス」カード素材一式。バーの塗り分と右側のレベル文字
// (「ちょっと多め」など)だけがデータ次第で変わるので、その2箇所だけ元絵から消して
// プログラムで重ねている。座標は元画像 (1593x987) 上の実測値をパーセントに変換したもの。
const NUTRITION_CARD_BG = require('@/assets/images/meal-log/nutrition-card/card-bg.jpg');
const NUTRITION_CARD_ASPECT_RATIO = 1593 / 987;

const NUTRITION_FILL_COLORS = {
  energy: '#F0B84B',
  protein: '#E27058',
  vegetable: '#7FA65C',
} as const;

const NUTRITION_BAR_TRACKS = {
  energy: { top: 37.69, left: 8.29, width: 89.2, height: 5.67 },
  protein: { top: 58.05, left: 8.35, width: 89.01, height: 5.67 },
  vegetable: { top: 78.52, left: 8.41, width: 88.83, height: 5.47 },
} as const;

const NUTRITION_FILL_FRACTION: Record<FoodGroupLevel, number> = {
  low: 0.2,
  slightlyLow: 0.4,
  adequate: 0.6,
  slightlyHigh: 0.8,
  high: 1,
};

const NUTRITION_LEVEL_IMAGES: Record<FoodGroupLevel, { source: ImageSource; ratio: number }> = {
  low: { source: require('@/assets/images/meal-log/nutrition-levels/low.png'), ratio: 279 / 105 },
  slightlyLow: { source: require('@/assets/images/meal-log/nutrition-levels/slightlyLow.png'), ratio: 651 / 107 },
  adequate: { source: require('@/assets/images/meal-log/nutrition-levels/adequate.png'), ratio: 623 / 113 },
  slightlyHigh: { source: require('@/assets/images/meal-log/nutrition-levels/slightlyHigh.png'), ratio: 594 / 119 },
  high: { source: require('@/assets/images/meal-log/nutrition-levels/high.png'), ratio: 218 / 119 },
};

const NUTRITION_LEVEL_TEXT_SLOTS = {
  energy: { top: 29.18, left: 71.06, height: 6.18 },
  protein: { top: 49.04, left: 71.12, height: 6.18 },
  vegetable: { top: 70.01, left: 71.12, height: 5.78 },
} as const;

const NUTRITION_FOOD_GROUPS = ['energy', 'protein', 'vegetable'] as const;

function WeeklyNutritionCard({ balance }: { balance: WeeklyNutritionBalance }) {
  const [cardWidth, setCardWidth] = useState(0);
  const cardHeight = cardWidth / NUTRITION_CARD_ASPECT_RATIO;

  return (
    <View
      style={[styles.nutritionCard, { borderRadius: cardWidth * CORNER_RADIUS_FRACTION, overflow: 'hidden' }]}
      onLayout={(event: LayoutChangeEvent) => setCardWidth(event.nativeEvent.layout.width)}
    >
      <Image source={NUTRITION_CARD_BG} style={StyleSheet.absoluteFill} contentFit="fill" />

      {NUTRITION_FOOD_GROUPS.map((group) => {
        const track = NUTRITION_BAR_TRACKS[group];
        const fillFraction = NUTRITION_FILL_FRACTION[balance[group]];
        const trackHeightPx = (track.height / 100) * cardHeight;
        return (
          <View
            key={group}
            style={{
              position: 'absolute',
              left: `${track.left}%`,
              top: `${track.top}%`,
              width: `${track.width * fillFraction}%`,
              height: `${track.height}%`,
              borderRadius: trackHeightPx / 2,
              backgroundColor: NUTRITION_FILL_COLORS[group],
            }}
          />
        );
      })}

      {NUTRITION_FOOD_GROUPS.map((group) => {
        const slot = NUTRITION_LEVEL_TEXT_SLOTS[group];
        const { source, ratio } = NUTRITION_LEVEL_IMAGES[balance[group]];
        const slotHeightPx = (slot.height / 100) * cardHeight;
        return (
          <Image
            key={group}
            source={source}
            contentFit="contain"
            style={{
              position: 'absolute',
              left: `${slot.left}%`,
              top: `${slot.top}%`,
              height: slotHeightPx,
              aspectRatio: ratio,
            }}
          />
        );
      })}
    </View>
  );
}

function sevenDaysAgoIso(): string {
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return from.toISOString();
}

// The nutrition card's background art is still a plain JPG, so it needs a
// measured corner-radius mask to clip its rectangular edges.
const CORNER_RADIUS_FRACTION = 0.08;

function CardButton({
  source,
  aspectRatio,
  onPress,
}: {
  source: ImageSource;
  aspectRatio: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.choicePressable}>
      {({ pressed }) => (
        <Image
          source={source}
          style={[styles.choiceButton, { aspectRatio }, pressed && styles.pressed]}
          contentFit="contain"
        />
      )}
    </Pressable>
  );
}

export default function MealLogHubScreen() {
  const [weeklyBalance, setWeeklyBalance] = useState<WeeklyNutritionBalance | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      searchMealRecords({ from: sevenDaysAgoIso() }).then((records) => {
        if (!cancelled) setWeeklyBalance(summarizeNutritionBalance(records));
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader />

        <ScrollView contentContainerStyle={styles.content}>
          {weeklyBalance && <WeeklyNutritionCard balance={weeklyBalance} />}

          <CardButton
            source={RECORD_BUTTON_IMAGE}
            aspectRatio={RECORD_BUTTON_ASPECT_RATIO}
            onPress={() => router.push('/meal-log/new')}
          />
          <CardButton
            source={HISTORY_BUTTON_IMAGE}
            aspectRatio={HISTORY_BUTTON_ASPECT_RATIO}
            onPress={() => router.push('/meal-log/history')}
          />
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
    padding: Spacing.four,
    gap: Spacing.three,
  },
  nutritionCard: {
    width: '100%',
    aspectRatio: NUTRITION_CARD_ASPECT_RATIO,
    position: 'relative',
  },
  choicePressable: {
    width: '100%',
  },
  choiceButton: {
    width: '100%',
  },
  pressed: {
    opacity: 0.7,
  },
});
