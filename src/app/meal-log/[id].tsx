import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionMeter } from '@/components/nutrition-meter';
import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getMealRecord, MealRecord, MealType } from '@/lib/meal-records';

const FOOD_GROUP_COLORS = {
  energy: '#F0B84B',
  protein: '#E27058',
  vegetable: '#7FA65C',
} as const;

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝ごはん',
  lunch: '昼ごはん',
  dinner: '夜ごはん',
  snack: 'おやつ',
};

function formatEatenAt(eatenAt: string): string {
  const date = new Date(eatenAt);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function MealRecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<MealRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMealRecord(id).then((loaded) => {
      if (!cancelled) {
        setRecord(loaded ?? null);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <ThemedView style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="記録" onBack={() => router.back()} />

        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        )}

        {!isLoading && !record && (
          <View style={styles.centered}>
            <ThemedText type="small" themeColor="textSecondary">
              記録が見つからなかったよ。
            </ThemedText>
          </View>
        )}

        {record && (
          <ScrollView contentContainerStyle={styles.content}>
            <Image source={{ uri: record.photoUri }} style={styles.photo} contentFit="cover" />

            <View style={styles.metaRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {formatEatenAt(record.eatenAt)}
              </ThemedText>
              {record.mealType && (
                <ThemedText type="small" themeColor="textSecondary">
                  {MEAL_TYPE_LABELS[record.mealType]}
                </ThemedText>
              )}
            </View>

            <ThemedText type="subtitle">
              {record.dishes.length > 0 ? record.dishes.join('、') : '（料理名なし）'}
            </ThemedText>

            {record.memo && (
              <View style={styles.section}>
                <ThemedText type="smallBold">メモ</ThemedText>
                <ThemedText type="small">{record.memo}</ThemedText>
              </View>
            )}

            {record.nutritionBalance && (
              <View style={styles.section}>
                <ThemedText type="smallBold">栄養バランス</ThemedText>
                <NutritionMeter
                  label="エネルギーになる食品"
                  level={record.nutritionBalance.energy}
                  color={FOOD_GROUP_COLORS.energy}
                />
                <NutritionMeter
                  label="血や肉をつくる食品"
                  level={record.nutritionBalance.protein}
                  color={FOOD_GROUP_COLORS.protein}
                />
                <NutritionMeter
                  label="体の調子を整える食品"
                  level={record.nutritionBalance.vegetable}
                  color={FOOD_GROUP_COLORS.vegetable}
                />
                {record.nutritionBalance.comment && (
                  <ThemedView type="backgroundElement" style={styles.commentBubble}>
                    <ThemedText type="small">{record.nutritionBalance.comment}</ThemedText>
                  </ThemedView>
                )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  commentBubble: {
    marginTop: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
