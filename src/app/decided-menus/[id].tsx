import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Course, ENTRY_POINT_OPTIONS, seasoningLabel } from '@/constants/meal-flow';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchWithTimeout, getApiUrl } from '@/lib/api';
import { DecidedDish, DecidedMenu, getDecidedMenu } from '@/lib/decided-menus';
import { saveAiRecipe } from '@/lib/recipes';

const BACKGROUND = require('@/assets/images/menu/decided-menus-detail-bg.jpg');

const STEPS_MARKER = '【作り方】';
const RECIPE_TAGS_FETCH_TIMEOUT_MS = 30_000;

type RecipeTags = { genreTag: string | null; formatTag: string | null; tasteTag: string | null; temperatureTag: string | null };

const EMPTY_RECIPE_TAGS: RecipeTags = { genreTag: null, formatTag: null, tasteTag: null, temperatureTag: null };

/** Runs at save-to-lab time (not at menu-generation time) since these tags are only ever needed if the
 * dish actually gets saved. Best-effort: a failure here shouldn't block the save itself. */
async function fetchRecipeTags(title: string, bookContent: string): Promise<RecipeTags> {
  try {
    const res = await fetchWithTimeout(
      getApiUrl('/api/recipe-tags'),
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, bookContent }) },
      RECIPE_TAGS_FETCH_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error('recipe-tags request failed');
    const data = await res.json();
    return {
      genreTag: data.genreTag ?? null,
      formatTag: data.formatTag ?? null,
      tasteTag: data.tasteTag ?? null,
      temperatureTag: data.temperatureTag ?? null,
    };
  } catch (error) {
    console.error('タグの生成に失敗:', error);
    return EMPTY_RECIPE_TAGS;
  }
}

function extractBookContent(text: string): string {
  const splitIndex = text.indexOf('【材料】');
  return splitIndex >= 0 ? text.slice(splitIndex) : text;
}

function stripServingsLabel(text: string): string {
  return text.replace(/^\([^)]*\)\s*/, '').trim();
}

function splitBookContent(content: string): { ingredientsText: string; stepsText: string } {
  const stepsIndex = content.indexOf(STEPS_MARKER);
  if (stepsIndex < 0) {
    return { ingredientsText: stripServingsLabel(content.replace('【材料】', '').trim()), stepsText: '' };
  }
  return {
    ingredientsText: stripServingsLabel(content.slice(0, stepsIndex).replace('【材料】', '').trim()),
    stepsText: content.slice(stepsIndex + STEPS_MARKER.length).trim(),
  };
}

function extractMainDish(proposalText: string): string {
  return proposalText.match(/・(?:主菜|メイン)：(.+)/)?.[1]?.trim() ?? '（レシピ）';
}

const COURSE_ORDER: Course[] = ['主菜', '主食', '副菜', '汁物'];

function sortDishesByCourse(dishes: DecidedDish[]): DecidedDish[] {
  return [...dishes].sort((a, b) => COURSE_ORDER.indexOf(a.course) - COURSE_ORDER.indexOf(b.course));
}

function buildDishIngredientsText(dish: DecidedDish): string {
  const blocks: string[] = [];
  const basicIngredients = dish.basicIngredients ?? [];
  const seasoningGroups = dish.seasoningGroups ?? [];
  if (basicIngredients.length) {
    blocks.push(basicIngredients.map((i) => `・${i.name} ${i.amount}`).join('\n'));
  }
  seasoningGroups.forEach((group, index) => {
    if (!group.items.length) return;
    blocks.push(
      `〈調味料${seasoningLabel(index)}・合わせ調味料〉\n${group.items.map((i) => `・${i.name} ${i.amount}`).join('\n')}`,
    );
  });
  return blocks.join('\n\n');
}

function buildDishBookContent(dish: DecidedDish, people?: string): string {
  const servingsLabel = people ? `(${people}人分)` : '(指定された人数分)';
  const lines = [`【材料】${servingsLabel}`, buildDishIngredientsText(dish), '', '【作り方】'];
  dish.steps.forEach((s, idx) => lines.push(`${idx + 1}. ${s}`));
  return lines.join('\n');
}

export default function DecidedMenuDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [menu, setMenu] = useState<DecidedMenu | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedToRecipeLab, setSavedToRecipeLab] = useState(false);
  const [checkedDishIndices, setCheckedDishIndices] = useState<Set<number>>(new Set());
  const [savedDishIndices, setSavedDishIndices] = useState<Set<number>>(new Set());
  const [isSavingDishes, setIsSavingDishes] = useState(false);

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
    const title = extractMainDish(menu.proposalText);
    const bookContent = extractBookContent(menu.recipeText);
    const tags = await fetchRecipeTags(title, bookContent);
    await saveAiRecipe({ title, bookContent, ...tags });
    setSavedToRecipeLab(true);
  }

  function toggleDishChecked(index: number) {
    if (savedDishIndices.has(index)) return;
    setCheckedDishIndices((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleSaveCheckedDishes() {
    if (!menu || checkedDishIndices.size === 0) return;
    setIsSavingDishes(true);
    try {
      for (const index of checkedDishIndices) {
        const dish = menu.dishes[index];
        if (!dish) continue;
        const bookContent = buildDishBookContent(dish, menu.people);
        const tags = await fetchRecipeTags(dish.title, bookContent);
        await saveAiRecipe({ title: dish.title, bookContent, course: dish.course, ...tags });
      }
      setSavedDishIndices((current) => new Set([...current, ...checkedDishIndices]));
      setCheckedDishIndices(new Set());
    } finally {
      setIsSavingDishes(false);
    }
  }

  const { ingredientsText, stepsText } = menu
    ? splitBookContent(extractBookContent(menu.recipeText))
    : { ingredientsText: '', stepsText: '' };
  const hasStructuredDishes = Boolean(menu?.dishes?.length);

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
              <ThemedText type="smallBold" style={styles.heading}>
                献立
              </ThemedText>
              {menu.dishes && menu.dishes.length > 0 ? (
                sortDishesByCourse(menu.dishes).map((dish, index) => (
                  <ThemedText key={`${dish.course}-${index}`} style={styles.bodyText}>
                    ○ {dish.title}
                  </ThemedText>
                ))
              ) : (
                <ThemedText style={styles.bodyText}>○ {extractMainDish(menu.proposalText)}</ThemedText>
              )}
            </ThemedView>

            {(hasStructuredDishes || ingredientsText) && (
              <ThemedView type="background" style={styles.formCard}>
                <ThemedText type="smallBold" style={styles.heading}>
                  材料{menu.people ? `（${menu.people}人分）` : ''}
                </ThemedText>
                {hasStructuredDishes ? (
                  sortDishesByCourse(menu.dishes).map((dish, index) => (
                    <View
                      key={`${dish.course}-${index}`}
                      style={[styles.dishSection, index > 0 && styles.dishSectionSpacing]}
                    >
                      <ThemedText type="smallBold">
                        ◆{dish.course}：{dish.title}
                      </ThemedText>
                      <ThemedText style={styles.bodyText}>{buildDishIngredientsText(dish)}</ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText style={styles.bodyText}>{ingredientsText}</ThemedText>
                )}
              </ThemedView>
            )}
            {(hasStructuredDishes || stepsText) && (
              <ThemedView type="background" style={styles.formCard}>
                <ThemedText type="smallBold" style={styles.heading}>
                  作り方
                </ThemedText>
                {hasStructuredDishes ? (
                  sortDishesByCourse(menu.dishes).map((dish, index) => (
                    <View
                      key={`${dish.course}-${index}`}
                      style={[styles.dishSection, index > 0 && styles.dishSectionSpacing]}
                    >
                      <ThemedText type="smallBold">
                        ◆{dish.course}：{dish.title}
                      </ThemedText>
                      <ThemedText style={styles.bodyText}>
                        {dish.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText style={styles.bodyText}>{stepsText}</ThemedText>
                )}
              </ThemedView>
            )}

            {menu.dishes && menu.dishes.length > 0 ? (
              <ThemedView type="background" style={styles.formCard}>
                <ThemedText type="smallBold" themeColor="accent" style={styles.heading}>
                  研究所にレシピを保存する
                </ThemedText>
                <View style={styles.checklist}>
                  {menu.dishes.map((dish, index) => {
                    const saved = savedDishIndices.has(index);
                    const checked = saved || checkedDishIndices.has(index);
                    return (
                      <Pressable key={`${dish.course}-${index}`} onPress={() => toggleDishChecked(index)} disabled={saved}>
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
                            <ThemedText style={styles.bodyText}>
                              {dish.course}：{dish.title}
                              {saved ? '（保存済み）' : ''}
                            </ThemedText>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={handleSaveCheckedDishes} disabled={isSavingDishes || checkedDishIndices.size === 0}>
                  {({ pressed }) => (
                    <ThemedView
                      type="accent"
                      style={[
                        styles.saveButton,
                        (pressed || isSavingDishes || checkedDishIndices.size === 0) && styles.pressed,
                      ]}
                    >
                      <ThemedText type="smallBold" themeColor="background">
                        {isSavingDishes ? '保存中…' : '保存する'}
                      </ThemedText>
                    </ThemedView>
                  )}
                </Pressable>
              </ThemedView>
            ) : (
              <ThemedView type="background" style={styles.formCard}>
                <ThemedText type="smallBold" themeColor="accent" style={styles.heading}>
                  研究所にレシピを保存する
                </ThemedText>
                <Pressable onPress={handleSaveToRecipeLab} disabled={savedToRecipeLab}>
                  {({ pressed }) => (
                    <ThemedView type="accent" style={[styles.saveButton, (pressed || savedToRecipeLab) && styles.pressed]}>
                      <ThemedText type="smallBold" themeColor="background">
                        {savedToRecipeLab ? '保存したよ！' : '保存する'}
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
    fontSize: 17,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  dishSection: {
    gap: Spacing.one,
  },
  dishSectionSpacing: {
    marginTop: Spacing.four,
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
