import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LIVING_COST_ITEMS } from '@/constants/living-cost-items';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatYen, getLivingCostRecord, getMonthKey, getPreviousMonthKey, setLivingCostAmount } from '@/lib/household-budget';

const NOTEBOOK_BACKGROUND = require('@/assets/images/budget/notebook-bg.jpg');
const LIVING_COST_LABELS_IMAGE = require('@/assets/images/budget/living-cost-labels.png');

const LABEL_COLUMN_FRACTION = 0.45;
const ROW_WRAPPER_ASPECT_RATIO = 941 / (LABEL_COLUMN_FRACTION * 1672);

// Vertical bands (as % of the label image's own height) where each item's
// hand-lettered label sits — measured from the source art so the amount
// inputs on the right line up with the matching row on the left.
const LIVING_COST_ROW_BANDS: [number, number][] = [
  [17.1, 22.8], // 家賃
  [26.1, 31.3], // 住居関連
  [34.7, 40.0], // 電気
  [43.0, 47.4], // ガス
  [50.5, 55.5], // 水道
  [58.5, 63.1], // スマホネット代
  [66.1, 71.1], // 保険
  [74.0, 79.3], // 車関連
  [81.9, 86.7], // サブスク
  [90.1, 94.4], // その他
];

const ACCESSORY_BAR_HEIGHT = 52;
const SCREEN_HEIGHT = Dimensions.get('window').height;

/** Tracks the live keyboard height so a "完了" bar can float just above it — number-pad has no built-in done key. */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event: KeyboardEvent) => setHeight(event.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

export default function LivingCostsScreen() {
  const theme = useTheme();
  const keyboardHeight = useKeyboardHeight();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [previousAmounts, setPreviousAmounts] = useState<Record<string, number>>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const focusedItemIdRef = useRef<string | null>(null);
  const scrollOffsetRef = useRef(0);

  /** Rows near the bottom of the list can end up hidden behind the keyboard + 完了 bar, since neither is a real system keyboard the OS knows to scroll around — so do it ourselves. */
  function scrollItemIntoView(itemId: string, currentKeyboardHeight: number) {
    if (currentKeyboardHeight <= 0) return;
    const input = inputRefs.current[itemId];
    if (!input) return;
    input.measureInWindow((x, y, width, height) => {
      const visibleBottom = SCREEN_HEIGHT - currentKeyboardHeight - ACCESSORY_BAR_HEIGHT - Spacing.three;
      const overflow = y + height - visibleBottom;
      if (overflow > 0) {
        scrollViewRef.current?.scrollTo({ y: scrollOffsetRef.current + overflow, animated: true });
      }
    });
  }

  useEffect(() => {
    if (focusedItemIdRef.current) scrollItemIntoView(focusedItemIdRef.current, keyboardHeight);
  }, [keyboardHeight]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const monthKey = getMonthKey();
      const previousMonthKey = getPreviousMonthKey(monthKey);
      Promise.all([getLivingCostRecord(monthKey), getLivingCostRecord(previousMonthKey)]).then(
        ([current, previous]) => {
          if (cancelled) return;
          setAmounts(
            Object.fromEntries(
              LIVING_COST_ITEMS.map((item) => [item.id, current?.amounts[item.id]?.toString() ?? '']),
            ),
          );
          setPreviousAmounts(previous?.amounts ?? {});
        },
      );
      return () => {
        cancelled = true;
      };
    }, []),
  );

  function handleChangeText(itemId: string, value: string) {
    setAmounts((current) => ({ ...current, [itemId]: value }));
  }

  function handleSave(itemId: string) {
    const raw = amounts[itemId];
    const amount = Number(raw);
    if (!raw || Number.isNaN(amount)) return;
    setLivingCostAmount(getMonthKey(), itemId, amount).catch((error) => console.error('生活費の保存に失敗:', error));
  }

  return (
    <View style={styles.flex}>
      <Image source={NOTEBOOK_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => router.back()} />

        <ScrollView
          ref={scrollViewRef}
          onScroll={(event) => {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.content,
            keyboardHeight > 0 && { paddingBottom: keyboardHeight + ACCESSORY_BAR_HEIGHT },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.rowsWrapper}>
            <Image source={LIVING_COST_LABELS_IMAGE} style={styles.labelsImage} contentFit="contain" />
            <View style={styles.inputColumn}>
              {LIVING_COST_ITEMS.map((item, index) => {
                const [top, bottom] = LIVING_COST_ROW_BANDS[index];
                const previous = previousAmounts[item.id];
                return (
                  <View
                    key={item.id}
                    style={[styles.inputRowAbsolute, { top: `${top}%`, height: `${bottom - top}%` }]}>
                    <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                      <TextInput
                        ref={(ref) => {
                          inputRefs.current[item.id] = ref;
                        }}
                        value={amounts[item.id] ?? ''}
                        onChangeText={(value) => handleChangeText(item.id, value)}
                        onFocus={() => {
                          focusedItemIdRef.current = item.id;
                          scrollItemIntoView(item.id, keyboardHeight);
                        }}
                        onEndEditing={() => handleSave(item.id)}
                        keyboardType="number-pad"
                        placeholder={previous !== undefined ? `前月：${formatYen(previous)}` : '金額'}
                        placeholderTextColor={theme.textSecondary}
                        style={[styles.input, { color: theme.text }]}
                      />
                    </ThemedView>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {keyboardHeight > 0 && (
        <View style={[styles.accessoryBarWrapper, { bottom: keyboardHeight }]} pointerEvents="box-none">
          <ThemedView type="background" style={[styles.accessoryBar, { borderTopColor: theme.backgroundElement }]}>
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8}>
              {({ pressed }) => (
                <ThemedText type="smallBold" themeColor="accent" style={pressed && styles.pressed}>
                  完了
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
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
  content: {
    padding: Spacing.three,
  },
  rowsWrapper: {
    width: '100%',
    aspectRatio: ROW_WRAPPER_ASPECT_RATIO,
    flexDirection: 'row',
  },
  labelsImage: {
    width: `${LABEL_COLUMN_FRACTION * 100}%`,
    height: '100%',
  },
  inputColumn: {
    flex: 1,
  },
  inputRowAbsolute: {
    position: 'absolute',
    left: Spacing.one,
    right: Spacing.three,
    justifyContent: 'center',
  },
  inputWrapper: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  input: {
    fontSize: 15,
  },
  accessoryBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  accessoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: ACCESSORY_BAR_HEIGHT,
    paddingHorizontal: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  pressed: {
    opacity: 0.7,
  },
});
