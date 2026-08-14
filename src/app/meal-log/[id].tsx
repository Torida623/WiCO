import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionMeter } from '@/components/nutrition-meter';
import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMealRecord, MealRecord, updateMealRecord } from '@/lib/meal-records';
import { fetchRecipeTags, saveAiRecipe } from '@/lib/recipes';

const KITCHEN_BACKGROUND = require('@/assets/images/meal-log/kitchen-bg.jpg');

const FOOD_GROUP_COLORS = {
  energy: '#F0B84B',
  protein: '#E27058',
  vegetable: '#7FA65C',
} as const;

export default function MealRecordDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<MealRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkedTitles, setCheckedTitles] = useState<Set<string>>(new Set());
  const [isSavingRecipes, setIsSavingRecipes] = useState(false);

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

  const savedTitles = new Set(record?.savedRecipeTitles ?? []);

  function toggleRecipeChecked(title: string) {
    if (savedTitles.has(title)) return;
    setCheckedTitles((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  async function handleSaveCheckedRecipes() {
    if (!record || !record.linkedRecipes || checkedTitles.size === 0) return;
    setIsSavingRecipes(true);
    try {
      for (const recipe of record.linkedRecipes) {
        if (!checkedTitles.has(recipe.title)) continue;
        const tags = await fetchRecipeTags(recipe.title, recipe.bookContent);
        await saveAiRecipe({ title: recipe.title, bookContent: recipe.bookContent, course: recipe.course, ...tags });
      }
      const updatedTitles = [...savedTitles, ...checkedTitles];
      const updated = await updateMealRecord(record.id, { savedRecipeTitles: updatedTitles });
      setRecord(updated);
      setCheckedTitles(new Set());
    } finally {
      setIsSavingRecipes(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={KITCHEN_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => router.back()} />

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
                  研究所にレシピを保存する
                </ThemedText>
                <View style={styles.checklist}>
                  {record.linkedRecipes.map((recipe, index) => {
                    const saved = savedTitles.has(recipe.title);
                    const checked = saved || checkedTitles.has(recipe.title);
                    return (
                      <Pressable
                        key={`${recipe.title}-${index}`}
                        onPress={() => toggleRecipeChecked(recipe.title)}
                        disabled={saved}
                      >
                        {({ pressed }) => (
                          <View style={[styles.checklistRow, pressed && styles.pressed]}>
                            <View
                              style={[
                                styles.checkbox,
                                { borderColor: checked ? theme.accent : theme.textSecondary },
                                checked && { backgroundColor: theme.accent },
                              ]}
                            >
                              {checked && (
                                <ThemedText type="smallBold" themeColor="background" style={styles.checkboxMark}>
                                  ✓
                                </ThemedText>
                              )}
                            </View>
                            <ThemedText type="small">
                              {recipe.course ? `${recipe.course}：` : ''}
                              {recipe.title}
                              {saved ? '（保存済み）' : ''}
                            </ThemedText>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={handleSaveCheckedRecipes} disabled={isSavingRecipes || checkedTitles.size === 0}>
                  {({ pressed }) => (
                    <ThemedView
                      type="accent"
                      style={[
                        styles.saveButton,
                        (pressed || isSavingRecipes || checkedTitles.size === 0) && styles.pressed,
                      ]}
                    >
                      <ThemedText type="smallBold" themeColor="background">
                        {isSavingRecipes ? '保存中…' : '保存する'}
                      </ThemedText>
                    </ThemedView>
                  )}
                </Pressable>
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
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: Spacing.half,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    fontSize: 13,
    lineHeight: 15,
  },
  saveButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
