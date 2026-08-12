import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ENTRY_POINT_OPTIONS } from '@/constants/meal-flow';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { DecidedDish, DecidedMenu, getDecidedMenu } from '@/lib/decided-menus';
import { saveAiRecipe } from '@/lib/recipes';

const BACKGROUND = require('@/assets/images/menu/decided-menus-detail-bg.jpg');

const STEPS_MARKER = '【作り方】';

function extractBookContent(text: string): string {
  const splitIndex = text.indexOf('【材料】');
  return splitIndex >= 0 ? text.slice(splitIndex) : text;
}

function splitBookContent(content: string): { ingredientsText: string; stepsText: string } {
  const stepsIndex = content.indexOf(STEPS_MARKER);
  if (stepsIndex < 0) return { ingredientsText: content.replace('【材料】', '').trim(), stepsText: '' };
  return {
    ingredientsText: content.slice(0, stepsIndex).replace('【材料】', '').trim(),
    stepsText: content.slice(stepsIndex + STEPS_MARKER.length).trim(),
  };
}

function extractMainDish(proposalText: string): string {
  return proposalText.match(/・(?:主菜|メイン)：(.+)/)?.[1]?.trim() ?? '（レシピ）';
}

function buildDishBookContent(dish: DecidedDish): string {
  const lines = ['【材料】(指定された人数分)'];
  dish.ingredients.forEach((i) => lines.push(`・${i.name} ${i.amount}`));
  lines.push('', '【作り方】');
  dish.steps.forEach((s, idx) => lines.push(`${idx + 1}. ${s}`));
  return lines.join('\n');
}

export default function DecidedMenuDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [menu, setMenu] = useState<DecidedMenu | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedToRecipeLab, setSavedToRecipeLab] = useState(false);
  const [savedDishIndices, setSavedDishIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getDecidedMenu(id).then((loaded) => {
      if (!cancelled) {
        setMenu(loaded ?? null);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSaveToRecipeLab() {
    if (!menu) return;
    await saveAiRecipe({
      title: extractMainDish(menu.proposalText),
      bookContent: extractBookContent(menu.recipeText),
    });
    setSavedToRecipeLab(true);
  }

  async function handleSaveDish(index: number) {
    if (!menu || !menu.dishes[index]) return;
    const dish = menu.dishes[index];
    await saveAiRecipe({ title: dish.title, bookContent: buildDishBookContent(dish), course: dish.course });
    setSavedDishIndices((current) => new Set(current).add(index));
  }

  const { ingredientsText, stepsText } = menu
    ? splitBookContent(extractBookContent(menu.recipeText))
    : { ingredientsText: '', stepsText: '' };

  return (
    <View style={styles.container}>
      <Image source={BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader
          title={menu ? ENTRY_POINT_OPTIONS.find((option) => option.value === menu.entryPoint)?.label : '献立'}
          onBack={() => router.back()}
        />

        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        )}

        {!isLoading && !menu && (
          <View style={styles.centered}>
            <ThemedText type="small" themeColor="textSecondary">
              この献立はもう見られないみたい。48時間を過ぎると消えるよ。
            </ThemedText>
          </View>
        )}

        {menu && (
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedView type="background" style={styles.formCard}>
              <ThemedText type="title">{extractMainDish(menu.proposalText)}</ThemedText>
            </ThemedView>

            {ingredientsText && (
              <ThemedView type="background" style={styles.formCard}>
                <ThemedText type="smallBold" style={styles.heading}>
                  材料
                </ThemedText>
                <ThemedText style={styles.bodyText}>{ingredientsText}</ThemedText>
              </ThemedView>
            )}
            {stepsText && (
              <ThemedView type="background" style={styles.formCard}>
                <ThemedText type="smallBold" style={styles.heading}>
                  作り方
                </ThemedText>
                <ThemedText style={styles.bodyText}>{stepsText}</ThemedText>
              </ThemedView>
            )}

            {menu.dishes && menu.dishes.length > 0 ? (
              <View style={styles.saveList}>
                {menu.dishes.map((dish, index) => (
                  <Pressable
                    key={`${dish.course}-${index}`}
                    onPress={() => handleSaveDish(index)}
                    disabled={savedDishIndices.has(index)}
                    style={styles.saveToLabRow}
                  >
                    {({ pressed }) => (
                      <ThemedText type="link" themeColor="accent" style={pressed && styles.pressed}>
                        {savedDishIndices.has(index)
                          ? `${dish.course}：${dish.title}を保存したよ！`
                          : `${dish.course}：${dish.title}をレシピ研究所に保存する`}
                      </ThemedText>
                    )}
                  </Pressable>
                ))}
              </View>
            ) : (
              <Pressable onPress={handleSaveToRecipeLab} disabled={savedToRecipeLab} style={styles.saveToLabRow}>
                {({ pressed }) => (
                  <ThemedText type="link" themeColor="accent" style={pressed && styles.pressed}>
                    {savedToRecipeLab ? 'レシピ研究所に保存したよ！' : 'レシピ研究所に保存する'}
                  </ThemedText>
                )}
              </Pressable>
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
    gap: Spacing.three,
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
    fontSize: 15,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  saveList: {
    gap: Spacing.one,
  },
  saveToLabRow: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
