import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { aggregateMenuIngredients, AggregatedIngredient, DecidedDish } from '@/lib/decided-menus';
import { grantFirstCookingTrioGift } from '@/lib/first-cooking-gifts';
import { addIngredientsToMemo } from '@/lib/shopping-memo';

const CLOSED_BOOK = require('@/assets/images/mascot/wico-book-closed.png');
const OPEN_BOOK_FLAT = require('@/assets/images/mascot/wico-book-open-flat.png');
const OPEN_BOOK_TURNING = require('@/assets/images/mascot/wico-book-turning.png');
const NAV_BACK_IMAGE = require('@/assets/images/ui/nav-back.png');
const NAV_FORWARD_IMAGE = require('@/assets/images/ui/nav-forward.png');

const OPEN_BOOK_ASPECT_RATIO = 1402 / 1122;
const NAV_IMAGE_ASPECT_RATIO = 1536 / 1024;
const NAV_BUTTON_WIDTH = 140;
const NAV_BUTTON_HEIGHT = NAV_BUTTON_WIDTH / NAV_IMAGE_ASPECT_RATIO;
const STEPS_MARKER = '【作り方】';
const PAGE_CHAR_BUDGET = 170;
// Large enough to clear the sheet panel's own max-height (70%) off the bottom of any screen size.
const SHEET_HIDDEN_OFFSET = 700;
const SHEET_ANIM_DURATION = 320;

function paginateText(text: string, budget: number): string[] {
  const lines = text.split('\n');
  const pages: string[] = [];
  let current = '';

  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > budget && current) {
      pages.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) pages.push(current);
  return pages;
}

function splitIntoPages(content: string): string[] {
  const stepsIndex = content.indexOf(STEPS_MARKER);
  if (stepsIndex < 0) return paginateText(content.trim(), PAGE_CHAR_BUDGET);

  const ingredientsText = content.slice(0, stepsIndex).trim();
  const stepsText = content.slice(stepsIndex).trim();
  const pages = [ingredientsText, ...paginateText(stepsText, PAGE_CHAR_BUDGET)].filter(Boolean);
  return pages.length ? pages : [content.trim()];
}

export type RecipeBookProps = {
  content: string;
  dishes?: DecidedDish[];
  onRestart: () => void;
  restartLabel?: string;
};

export function RecipeBook({ content, dishes = [], onRestart, restartLabel = 'もう一度考える' }: RecipeBookProps) {
  const theme = useTheme();
  const pages = splitIntoPages(content);
  const menuIngredients: AggregatedIngredient[] = dishes.length > 0 ? aggregateMenuIngredients(dishes) : [];

  const [opened, setOpened] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [shoppingMemoAdded, setShoppingMemoAdded] = useState(false);
  const [showShoppingMemoSheet, setShowShoppingMemoSheet] = useState(false);
  const [checkedIngredientNames, setCheckedIngredientNames] = useState<Set<string>>(new Set());
  const pageScrollRef = useRef<ScrollView>(null);
  const sheetTranslateY = useSharedValue(SHEET_HIDDEN_OFFSET);

  function openShoppingMemoSheet() {
    setCheckedIngredientNames(new Set(menuIngredients.map((ingredient) => ingredient.name)));
    setShowShoppingMemoSheet(true);
    sheetTranslateY.value = withTiming(0, { duration: SHEET_ANIM_DURATION, easing: Easing.out(Easing.quad) });
  }

  function closeShoppingMemoSheet() {
    sheetTranslateY.value = withTiming(SHEET_HIDDEN_OFFSET, {
      duration: SHEET_ANIM_DURATION,
      easing: Easing.in(Easing.quad),
    });
    setTimeout(() => setShowShoppingMemoSheet(false), SHEET_ANIM_DURATION);
  }

  function toggleIngredientChecked(name: string) {
    setCheckedIngredientNames((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleCreateShoppingMemo() {
    const checked = menuIngredients.filter((ingredient) => checkedIngredientNames.has(ingredient.name));
    if (checked.length > 0) {
      await addIngredientsToMemo(checked);
      setShoppingMemoAdded(true);
      grantFirstCookingTrioGift('shopping-memo').catch((error) => console.error(error));
    }
    closeShoppingMemoSheet();
  }

  const closedOpacity = useSharedValue(0);
  const closedScale = useSharedValue(1);
  const openOpacity = useSharedValue(0);
  const openScale = useSharedValue(0.92);
  const pageContentOpacity = useSharedValue(0);
  const turnOpacity = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    closedOpacity.value = withDelay(500, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
    hintOpacity.value = withDelay(500, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
  }, [closedOpacity, hintOpacity]);

  function handleOpen() {
    if (opened) return;
    setOpened(true);

    closedOpacity.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) });
    closedScale.value = withTiming(1.1, { duration: 700, easing: Easing.out(Easing.quad) });

    openOpacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) });
    openScale.value = withSequence(
      withTiming(1.04, { duration: 550, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 420 }),
    );

    pageContentOpacity.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) });
  }

  function goToNextPage() {
    if (transitioning || pageIndex >= pages.length - 1) return;
    setTransitioning(true);

    pageContentOpacity.value = withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) });
    turnOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) });

    setTimeout(() => {
      setPageIndex((i) => i + 1);
      pageScrollRef.current?.scrollTo({ y: 0, animated: false });
      turnOpacity.value = withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) });
      pageContentOpacity.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) });
      setTransitioning(false);
    }, 600);
  }

  function goToPreviousPage() {
    if (transitioning || pageIndex <= 0) return;
    setTransitioning(true);

    pageContentOpacity.value = withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) });
    turnOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) });

    setTimeout(() => {
      setPageIndex((i) => i - 1);
      pageScrollRef.current?.scrollTo({ y: 0, animated: false });
      turnOpacity.value = withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) });
      pageContentOpacity.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) });
      setTransitioning(false);
    }, 600);
  }

  const closedStyle = useAnimatedStyle(() => ({
    opacity: closedOpacity.value,
    transform: [{ scale: closedScale.value }],
  }));
  const openStyle = useAnimatedStyle(() => ({
    opacity: openOpacity.value,
    transform: [{ scale: openScale.value }],
  }));
  const pageContentStyle = useAnimatedStyle(() => ({
    opacity: pageContentOpacity.value,
  }));
  const turnStyle = useAnimatedStyle(() => ({
    opacity: turnOpacity.value,
  }));
  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const hasMorePages = pageIndex < pages.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.bookArea}>
        <View style={styles.stack}>
          <Animated.View style={[styles.layer, openStyle]}>
            <Image source={OPEN_BOOK_FLAT} style={styles.bookImage} contentFit="contain" />
            <Animated.View style={[styles.textOverlay, pageContentStyle]}>
              <ScrollView ref={pageScrollRef} contentContainerStyle={styles.textScrollContent}>
                <ThemedText style={styles.recipeText}>{pages[pageIndex]}</ThemedText>
              </ScrollView>
            </Animated.View>
            <Animated.View style={[styles.layer, turnStyle]} pointerEvents="none">
              <Image source={OPEN_BOOK_TURNING} style={styles.bookImage} contentFit="contain" />
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.layer, closedStyle]} pointerEvents={opened ? 'none' : 'auto'}>
            <Pressable onPress={handleOpen} style={styles.layer}>
              <Image source={CLOSED_BOOK} style={styles.bookImage} contentFit="contain" />
            </Pressable>
          </Animated.View>
        </View>

        {!opened && (
          <Animated.View style={hintStyle}>
            <ThemedText type="small" themeColor="text" style={styles.hint}>
              タップして開く
            </ThemedText>
          </Animated.View>
        )}

        {opened && (
          <View style={styles.pageNavRow}>
            <View style={styles.pageNavSlot}>
              {pageIndex > 0 && (
                <Pressable onPress={goToPreviousPage} disabled={transitioning}>
                  {({ pressed }) => (
                    <Image
                      source={NAV_BACK_IMAGE}
                      style={[styles.pageNavImage, pressed && styles.pressed]}
                      contentFit="contain"
                    />
                  )}
                </Pressable>
              )}
            </View>
            <View style={styles.pageNavSlot}>
              {hasMorePages && (
                <Pressable onPress={goToNextPage} disabled={transitioning}>
                  {({ pressed }) => (
                    <Image
                      source={NAV_FORWARD_IMAGE}
                      style={[styles.pageNavImage, pressed && styles.pressed]}
                      contentFit="contain"
                    />
                  )}
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>

      {opened && pageIndex === 0 && dishes.length > 0 && (
        <View style={styles.shoppingMemoOverlay}>
          <Pressable onPress={openShoppingMemoSheet} disabled={shoppingMemoAdded}>
            {({ pressed }) => (
              <ThemedView
                type="accent"
                style={[styles.restartButton, (pressed || shoppingMemoAdded) && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="background">
                  {shoppingMemoAdded ? 'お買い物メモに追加したよ' : 'お買い物メモを作成する'}
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>
        </View>
      )}

      {showShoppingMemoSheet && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={closeShoppingMemoSheet} />
      )}
      <View style={styles.shoppingMemoSheetOverlay} pointerEvents="box-none">
        <Animated.View style={sheetStyle}>
          <ThemedView type="background" style={styles.shoppingMemoSheetPanel}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="smallBold">お買い物メモに追加する</ThemedText>
              <Pressable onPress={closeShoppingMemoSheet} hitSlop={8}>
                <ThemedText type="link" themeColor="accent">
                  閉じる
                </ThemedText>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.shoppingMemoSheetContent}>
              <View style={styles.checklist}>
                {menuIngredients.map((ingredient) => {
                  const checked = checkedIngredientNames.has(ingredient.name);
                  return (
                    <Pressable key={ingredient.name} onPress={() => toggleIngredientChecked(ingredient.name)}>
                      {({ pressed }) => (
                        <View style={[styles.checklistRow, pressed && styles.pressed]}>
                          <View
                            style={[
                              styles.checkbox,
                              { borderColor: checked ? theme.accent : theme.textSecondary },
                              checked && { backgroundColor: theme.accent },
                            ]}>
                            {checked && (
                              <ThemedText type="smallBold" themeColor="background" style={styles.checkboxMark}>
                                ✓
                              </ThemedText>
                            )}
                          </View>
                          <ThemedText style={styles.bodyText}>
                            {ingredient.name}
                            {ingredient.amounts.length > 0 ? `　${ingredient.amounts.join('、')}` : ''}
                          </ThemedText>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <Pressable onPress={handleCreateShoppingMemo} disabled={checkedIngredientNames.size === 0}>
              {({ pressed }) => (
                <ThemedView
                  type="accent"
                  style={[styles.saveButton, (pressed || checkedIngredientNames.size === 0) && styles.pressed]}>
                  <ThemedText type="smallBold" themeColor="background">
                    作成
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          </ThemedView>
        </Animated.View>
      </View>

      {opened && !hasMorePages && (
        <View style={styles.restartButtonsOverlay}>
          <Pressable onPress={() => {}}>
            {({ pressed }) => (
              <ThemedView type="accent" style={[styles.restartButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="background">
                  一緒につくる
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>

          <Pressable onPress={onRestart}>
            {({ pressed }) => (
              <ThemedView type="accent" style={[styles.restartButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="background">
                  {restartLabel}
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  bookArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    width: '100%',
  },
  stack: {
    width: '100%',
    aspectRatio: OPEN_BOOK_ASPECT_RATIO,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  bookImage: {
    width: '100%',
    height: '100%',
  },
  textOverlay: {
    position: 'absolute',
    top: '15%',
    left: '14%',
    right: '14%',
    bottom: '17%',
  },
  textScrollContent: {
    flexGrow: 1,
  },
  recipeText: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    lineHeight: 19,
    color: '#5B4636',
  },
  hint: {
    fontWeight: '700',
  },
  pageNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: -Spacing.four,
  },
  pageNavSlot: {
    minWidth: 1,
  },
  pageNavImage: {
    width: NAV_BUTTON_WIDTH,
    height: NAV_BUTTON_HEIGHT,
  },
  restartButtonsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  shoppingMemoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.six,
    alignItems: 'center',
  },
  shoppingMemoSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: Spacing.three,
  },
  shoppingMemoSheetPanel: {
    maxHeight: '70%',
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  shoppingMemoSheetContent: {
    paddingBottom: Spacing.three,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  saveButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  restartButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
