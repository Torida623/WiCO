import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeBook } from '@/components/chat/recipe-book';
import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ENTRY_POINT_OPTIONS } from '@/constants/meal-flow';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { DecidedDish, DecidedMenu, getDecidedMenu } from '@/lib/decided-menus';
import { saveAiRecipe } from '@/lib/recipes';

function extractBookContent(text: string): string {
  const splitIndex = text.indexOf('【材料】');
  return splitIndex >= 0 ? text.slice(splitIndex) : text;
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

  return (
    <ThemedView style={styles.container}>
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
          <>
            <View style={styles.bookArea}>
              <RecipeBook content={extractBookContent(menu.recipeText)} onRestart={() => router.push('/menu-chat')} />
            </View>
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
          </>
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
  bookArea: {
    flex: 1,
  },
  saveList: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  saveToLabRow: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
