import { Image } from 'expo-image';
import { Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionMeter } from '@/components/nutrition-meter';
import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getMealRecord, MealRecord } from '@/lib/meal-records';
import { LinkedRecipeSnapshot, splitBookContent } from '@/lib/recipes';

const KITCHEN_BACKGROUND = require('@/assets/images/meal-log/kitchen-bg.jpg');

const FOOD_GROUP_COLORS = {
  energy: '#F0B84B',
  protein: '#E27058',
  vegetable: '#7FA65C',
} as const;

export default function MealRecordDetailScreen() {
  const { id, fromCrossTab } = useLocalSearchParams<{ id: string; fromCrossTab?: string }>();
  const [record, setRecord] = useState<MealRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
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
    }, [id]),
  );

  const savedTitles = new Set(record?.savedRecipeTitles ?? []);

  function handlePostRecipe(recipe: LinkedRecipeSnapshot) {
    if (!record) return;
    const { ingredientsText, stepsText } = splitBookContent(recipe.bookContent);
    router.push({
      pathname: '/recipe-lab/new',
      params: {
        title: recipe.title,
        ingredientsText,
        stepsText,
        course: recipe.course ?? '',
        photoUri: record.photoUri ?? '',
        mealRecordId: record.id,
      },
    } as Href);
  }

  return (
    <View style={styles.container}>
      <Image source={KITCHEN_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => (fromCrossTab ? router.replace('/meal-log' as Href) : router.back())} />

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

            <ThemedView type="background" style={styles.formCard}>
              <ThemedText type="default" style={styles.dishTitle}>
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
            </ThemedView>

            {record.linkedRecipes && record.linkedRecipes.length > 0 && (
              <ThemedView type="background" style={styles.formCard}>
                <ThemedText type="smallBold" themeColor="accent" style={styles.heading}>
                  レシピ研究所に投稿する
                </ThemedText>
                <View style={styles.checklist}>
                  {record.linkedRecipes.map((recipe, index) => {
                    const saved = savedTitles.has(recipe.title);
                    return (
                      <Pressable
                        key={`${recipe.title}-${index}`}
                        onPress={() => handlePostRecipe(recipe)}
                        disabled={saved}
                      >
                        {({ pressed }) => (
                          <View style={[styles.recipeRow, pressed && !saved && styles.pressed]}>
                            <ThemedText type="small" style={styles.recipeRowText}>
                              {recipe.course ? `${recipe.course}：` : ''}
                              {recipe.title}
                              {saved ? '（投稿済み）' : ''}
                            </ThemedText>
                            {!saved && (
                              <ThemedText type="small" themeColor="accent">
                                投稿する ›
                              </ThemedText>
                            )}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </ThemedView>
            )}
          </ScrollView>
        )}
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
  dishTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  section: {
    gap: Spacing.two,
  },
  commentBubble: {
    marginTop: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  formCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  heading: {
    fontSize: 17,
  },
  checklist: {
    gap: Spacing.two,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  recipeRowText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
