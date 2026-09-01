import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { grantFirstCookingTrioGift } from '@/lib/first-cooking-gifts';
import {
  addCustomItem,
  clearCheckedItems,
  getCheckedIngredients,
  listCustomItems,
  listMemoIngredients,
  MemoIngredient,
  removeCustomItem,
  removeCustomItems,
  removeMemoIngredients,
  setIngredientChecked,
} from '@/lib/shopping-memo';

type DisplayItem = { name: string; amounts: string[]; isCustom: boolean };

const BACKGROUND_IMAGE = require('@/assets/images/menu/shopping-memo-bg.jpg');
const INPUT_FRAME_IMAGE = require('@/assets/images/menu/shopping-memo-input-frame-with-text.png');
const INPUT_FRAME_ASPECT_RATIO = 1564 / 302;
const ADD_BUTTON_IMAGE = require('@/assets/images/menu/shopping-memo-add-button.png');
// The art already draws the "メモを追加できるよ！" placeholder text, so this patch only needs to
// appear once the field is focused or has real text, to keep that art from showing through the
// cursor/typed input — otherwise the frame is untouched original art.
const INPUT_TEXT_PATCH_FILL_COLOR = 'rgb(253, 246, 236)';
const INPUT_TEXT_BOX = { top: '19%', left: '13%', width: '82%', height: '66%' } as const;
const ITEM_FRAME_IMAGES = [
  require('@/assets/images/menu/shopping-memo-item-frame-1.png'),
  require('@/assets/images/menu/shopping-memo-item-frame-2.png'),
  require('@/assets/images/menu/shopping-memo-item-frame-3.png'),
  require('@/assets/images/menu/shopping-memo-item-frame-4.png'),
  require('@/assets/images/menu/shopping-memo-item-frame-5.png'),
];

export default function ShoppingMemoScreen() {
  const theme = useTheme();
  const [ingredients, setIngredients] = useState<MemoIngredient[]>([]);
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [freeText, setFreeText] = useState('');
  const [isFreeTextFocused, setIsFreeTextFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([listMemoIngredients(), listCustomItems(), getCheckedIngredients()]).then(
        ([loadedIngredients, loadedCustomItems, loadedChecked]) => {
          if (!cancelled) {
            setIngredients(loadedIngredients);
            setCustomItems(loadedCustomItems);
            setChecked(loadedChecked);
            setIsLoading(false);
          }
        },
      );
      return () => {
        cancelled = true;
      };
    }, []),
  );

  function toggleItem(name: string) {
    setChecked((current) => {
      const next = { ...current, [name]: !current[name] };
      setIngredientChecked(name, next[name]);
      return next;
    });
  }

  async function handleAddCustomItem() {
    const trimmed = freeText.trim();
    if (!trimmed) return;
    setCustomItems(await addCustomItem(trimmed));
    setFreeText('');
    grantFirstCookingTrioGift('shopping-memo').catch((error) => console.error(error));
  }

  async function handleRemoveItem(item: DisplayItem) {
    if (item.isCustom) {
      setCustomItems(await removeCustomItem(item.name));
    } else {
      setIngredients(await removeMemoIngredients([item.name]));
    }
  }

  const displayItems: DisplayItem[] = [
    ...customItems.map((name) => ({ name, amounts: [], isCustom: true })),
    ...ingredients.map((item) => ({ ...item, isCustom: false })),
  ];

  const checkedNames = displayItems.filter((item) => checked[item.name]).map((item) => item.name);

  async function handleCompleteShopping() {
    if (checkedNames.length === 0) return;

    const customItemNameSet = new Set(customItems);
    const checkedCustomNames = checkedNames.filter((name) => customItemNameSet.has(name));
    const checkedIngredientNames = checkedNames.filter((name) => !customItemNameSet.has(name));

    const [nextCustomItems, nextIngredients, nextChecked] = await Promise.all([
      checkedCustomNames.length ? removeCustomItems(checkedCustomNames) : Promise.resolve(customItems),
      checkedIngredientNames.length ? removeMemoIngredients(checkedIngredientNames) : Promise.resolve(ingredients),
      clearCheckedItems(checkedNames),
    ]);

    setCustomItems(nextCustomItems);
    setIngredients(nextIngredients);
    setChecked(nextChecked);
  }

  return (
    <View style={styles.container}>
      <Image source={BACKGROUND_IMAGE} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => router.replace('/decided-menus')} />

        <View style={styles.inputRow}>
          <View style={styles.textInputWrapper}>
            <Image source={INPUT_FRAME_IMAGE} style={styles.absoluteFill} contentFit="fill" />
            <View
              style={[
                styles.inputPatch,
                INPUT_TEXT_BOX,
                { backgroundColor: freeText || isFreeTextFocused ? INPUT_TEXT_PATCH_FILL_COLOR : 'transparent' },
              ]}>
              <TextInput
                value={freeText}
                onChangeText={setFreeText}
                onFocus={() => setIsFreeTextFocused(true)}
                onBlur={() => setIsFreeTextFocused(false)}
                onSubmitEditing={handleAddCustomItem}
                style={[styles.textInput, { color: theme.text }]}
              />
            </View>
          </View>
          <Pressable style={styles.addButtonPressable} onPress={handleAddCustomItem} disabled={!freeText.trim()}>
            {({ pressed }) => (
              <Image
                source={ADD_BUTTON_IMAGE}
                style={[styles.addButton, (pressed || !freeText.trim()) && styles.pressed]}
                contentFit="contain"
              />
            )}
          </Pressable>
        </View>

        {!isLoading && displayItems.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              まだ何もないよ。献立が決まったらレシピ画面の「お買い物ノートに追加する」から追加してね。
            </ThemedText>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.listContent}>
          {displayItems.map((item, index) => (
            <Pressable key={`${item.isCustom ? 'custom' : 'menu'}:${item.name}`} onPress={() => toggleItem(item.name)}>
              {({ pressed }) => (
                <View style={[styles.row, pressed && styles.pressed]}>
                  <Image
                    source={ITEM_FRAME_IMAGES[index % ITEM_FRAME_IMAGES.length]}
                    style={styles.absoluteFill}
                    contentFit="fill"
                  />
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: checked[item.name] ? theme.accent : theme.textSecondary },
                      checked[item.name] && { backgroundColor: theme.accent },
                    ]}>
                    {checked[item.name] && (
                      <ThemedText type="smallBold" themeColor="background" style={styles.checkboxMark}>
                        ✓
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="small" style={styles.itemName}>
                    {item.name}
                  </ThemedText>
                  {item.amounts.length > 0 && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.amounts.join('、')}
                    </ThemedText>
                  )}
                  <Pressable hitSlop={Spacing.two} onPress={() => handleRemoveItem(item)}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      ×
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </Pressable>
          ))}

          {displayItems.length > 0 && (
            <Pressable onPress={handleCompleteShopping} disabled={checkedNames.length === 0}>
              {({ pressed }) => (
                <ThemedView
                  type="accent"
                  style={[
                    styles.completeButton,
                    checkedNames.length === 0 && styles.completeButtonDisabled,
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" themeColor="background">
                    お買い物完了
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  textInputWrapper: {
    flex: 1,
    aspectRatio: INPUT_FRAME_ASPECT_RATIO,
  },
  inputPatch: {
    position: 'absolute',
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
  },
  addButtonPressable: {
    width: 64,
  },
  addButton: {
    ...StyleSheet.absoluteFillObject,
  },
  completeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  completeButtonDisabled: {
    opacity: 0.4,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
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
  itemName: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
