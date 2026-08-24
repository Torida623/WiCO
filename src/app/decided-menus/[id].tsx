import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';
import { useTheme } from '@/hooks/use-theme';
import {
  aggregateMenuIngredients,
  buildDishIngredientsText,
  COURSE_PRIORITY_ORDER,
  DecidedDish,
  DecidedMenu,
  extractBookContent,
  extractMainDish,
  getDecidedMenu,
  splitBookContent,
} from '@/lib/decided-menus';
import { grantFirstCookingTrioGift } from '@/lib/first-cooking-gifts';
import { addIngredientsToMemo } from '@/lib/shopping-memo';

const BACKGROUND_DAY = require('@/assets/images/menu/decided-menus-detail-bg.jpg');
const BACKGROUND_NIGHT = require('@/assets/images/menu/decided-menus-detail-bg-night.jpg');

function sortDishesByCourse(dishes: DecidedDish[]): DecidedDish[] {
  return [...dishes].sort((a, b) => COURSE_PRIORITY_ORDER.indexOf(a.course) - COURSE_PRIORITY_ORDER.indexOf(b.course));
}

export default function DecidedMenuDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [menu, setMenu] = useState<DecidedMenu | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkedIngredientNames, setCheckedIngredientNames] = useState<Set<string>>(new Set());
  const [addedIngredientNames, setAddedIngredientNames] = useState<Set<string>>(new Set());
  const [checkedMemoryDishIndices, setCheckedMemoryDishIndices] = useState<Set<number>>(new Set());
  const [isDay] = useState(() => isDaytime());

  useEffect(() => {
    let cancelled = false;
    getDecidedMenu(id).then((loaded) => {
      if (!cancelled) {
        setMenu(loaded ?? null);
        setIsLoading(false);
        if (loaded) {
          setCheckedIngredientNames(new Set(aggregateMenuIngredients(loaded.dishes).map((i) => i.name)));
          // 実際に作った皿は決めた献立と食い違うこともある(汁物を変えた、副菜を省いた等)ので、
          // デフォルトは全部チェック済みにしつつ、記録前に外せるようにしておく。
          setCheckedMemoryDishIndices(new Set((loaded.dishes ?? []).map((_, index) => index)));
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function toggleMemoryDishChecked(index: number) {
    setCheckedMemoryDishIndices((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleRecordAsMemory() {
    if (!menu) return;
    if (hasStructuredDishes) {
      router.push({
        pathname: '/meal-log/new',
        params: { menuId: menu.id, dishIndices: [...checkedMemoryDishIndices].join(',') },
      });
    } else {
      router.push({ pathname: '/meal-log/new', params: { menuId: menu.id } });
    }
  }

  function toggleIngredientChecked(name: string) {
    if (addedIngredientNames.has(name)) return;
    setCheckedIngredientNames((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleAllIngredients() {
    setCheckedIngredientNames(allIngredientsChecked ? new Set() : new Set(availableIngredientNames));
  }

  async function handleAddToShoppingMemo() {
    if (pendingIngredients.length === 0) return;
    await addIngredientsToMemo(pendingIngredients);
    setAddedIngredientNames((current) => new Set([...current, ...pendingIngredients.map((i) => i.name)]));
    grantFirstCookingTrioGift('shopping-memo').catch((error) => console.error(error));
  }

  const { ingredientsText, stepsText } = menu
    ? splitBookContent(extractBookContent(menu.recipeText))
    : { ingredientsText: '', stepsText: '' };
  const hasStructuredDishes = Boolean(menu?.dishes?.length);
  const menuIngredients = menu ? aggregateMenuIngredients(menu.dishes) : [];
  const availableIngredientNames = menuIngredients.map((i) => i.name).filter((name) => !addedIngredientNames.has(name));
  const allIngredientsChecked =
    availableIngredientNames.length > 0 && availableIngredientNames.every((name) => checkedIngredientNames.has(name));
  const pendingIngredients = menuIngredients.filter(
    (i) => checkedIngredientNames.has(i.name) && !addedIngredientNames.has(i.name),
  );

  return (
    <View style={styles.container}>
      <Image
        source={isDay ? BACKGROUND_DAY : BACKGROUND_NIGHT}
        style={styles.absoluteFill}
        contentFit="cover"
      />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => router.back()} />

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

            {menuIngredients.length > 0 && (
              <ThemedView type="background" style={styles.formCard}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText type="smallBold" themeColor="accent" style={styles.heading}>
                    買うものリストに追加する
                  </ThemedText>
                  <Pressable onPress={toggleAllIngredients}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {allIngredientsChecked ? '一括解除' : '一括選択'}
                    </ThemedText>
                  </Pressable>
                </View>
                <View style={styles.checklist}>
                  {menuIngredients.map((ingredient) => {
                    const added = addedIngredientNames.has(ingredient.name);
                    const checked = added || checkedIngredientNames.has(ingredient.name);
                    return (
                      <Pressable
                        key={ingredient.name}
                        onPress={() => toggleIngredientChecked(ingredient.name)}
                        disabled={added}
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
                            <ThemedText style={styles.bodyText}>
                              {ingredient.name}
                              {ingredient.amounts.length > 0 ? `　${ingredient.amounts.join('、')}` : ''}
                              {added ? '（追加済み）' : ''}
                            </ThemedText>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={handleAddToShoppingMemo} disabled={pendingIngredients.length === 0}>
                  {({ pressed }) => (
                    <ThemedView
                      type="accent"
                      style={[styles.saveButton, (pressed || pendingIngredients.length === 0) && styles.pressed]}
                    >
                      <ThemedText type="smallBold" themeColor="background">
                        買うものリストに追加する
                      </ThemedText>
                    </ThemedView>
                  )}
                </Pressable>
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

            <ThemedView type="background" style={styles.formCard}>
              <ThemedText type="smallBold" themeColor="accent" style={styles.heading}>
                料理の思い出に記録する
              </ThemedText>
              {hasStructuredDishes && (
                <View style={styles.checklist}>
                  {menu.dishes.map((dish, index) => {
                    const checked = checkedMemoryDishIndices.has(index);
                    return (
                      <Pressable key={`${dish.course}-${index}`} onPress={() => toggleMemoryDishChecked(index)}>
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
                            </ThemedText>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <Pressable
                onPress={handleRecordAsMemory}
                disabled={hasStructuredDishes && checkedMemoryDishIndices.size === 0}
              >
                {({ pressed }) => (
                  <ThemedView
                    type="accent"
                    style={[
                      styles.saveButton,
                      (pressed || (hasStructuredDishes && checkedMemoryDishIndices.size === 0)) && styles.pressed,
                    ]}
                  >
                    <ThemedText type="smallBold" themeColor="background">
                      記録する
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            </ThemedView>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
