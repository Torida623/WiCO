import { Image, ImageSource } from 'expo-image';
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
import { playPageDissolve } from '@/hooks/use-page-dissolve';
import { useTheme } from '@/hooks/use-theme';
import { formatYen, getLivingCostRecord, getMonthKey, getPreviousMonthKey, setLivingCostAmount } from '@/lib/household-budget';

const NOTEBOOK_BACKGROUND = require('@/assets/images/budget/notebook-bg.jpg');
const TITLE_IMAGE = require('@/assets/images/budget/living-cost-title.png');
const LABEL_HOUSING = require('@/assets/images/budget/living-cost-label-housing.png');
const LABEL_ELECTRICITY = require('@/assets/images/budget/living-cost-label-electricity.png');
const LABEL_GAS = require('@/assets/images/budget/living-cost-label-gas.png');
const LABEL_WATER = require('@/assets/images/budget/living-cost-label-water.png');
const LABEL_COMMUNICATION = require('@/assets/images/budget/living-cost-label-communication.png');
const LABEL_INSURANCE = require('@/assets/images/budget/living-cost-label-insurance.png');
const LABEL_CAR = require('@/assets/images/budget/living-cost-label-car.png');
const LABEL_SUBSCRIPTION = require('@/assets/images/budget/living-cost-label-subscription.png');
const LABEL_OTHER = require('@/assets/images/budget/living-cost-label-other.png');

const TITLE_ASPECT_RATIO = 742 / 124;
const LABEL_IMAGE_HEIGHT = 22;

const LIVING_COST_LABEL_ART: Record<string, { source: ImageSource; aspectRatio: number }> = {
  rent: { source: LABEL_HOUSING, aspectRatio: 379 / 103 },
  electricity: { source: LABEL_ELECTRICITY, aspectRatio: 196 / 106 },
  gas: { source: LABEL_GAS, aspectRatio: 175 / 90 },
  water: { source: LABEL_WATER, aspectRatio: 198 / 99 },
  communication: { source: LABEL_COMMUNICATION, aspectRatio: 528 / 94 },
  insurance: { source: LABEL_INSURANCE, aspectRatio: 197 / 98 },
  car: { source: LABEL_CAR, aspectRatio: 290 / 106 },
  subscription: { source: LABEL_SUBSCRIPTION, aspectRatio: 302 / 97 },
  other: { source: LABEL_OTHER, aspectRatio: 254 / 89 },
};

function ItemLabel({ itemId }: { itemId: string }) {
  const art = LIVING_COST_LABEL_ART[itemId];
  return <Image source={art.source} style={{ height: LABEL_IMAGE_HEIGHT, aspectRatio: art.aspectRatio }} contentFit="contain" />;
}

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
        <ScreenHeader onBack={() => playPageDissolve(() => router.back())} />

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
          <Image source={TITLE_IMAGE} style={styles.titleImage} contentFit="contain" />

          <View style={styles.rows}>
            {LIVING_COST_ITEMS.map((item) => {
              const previous = previousAmounts[item.id];
              return (
                <View key={item.id} style={styles.row}>
                  <View style={styles.labelColumn}>
                    <ItemLabel itemId={item.id} />
                  </View>
                  <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                    {!!amounts[item.id] && (
                      <ThemedText type="small" themeColor="textSecondary">
                        ¥
                      </ThemedText>
                    )}
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
    flexGrow: 1,
    // Left padding is wider than the other sides so the label column clears
    // the spiral-bound rings drawn into the notebook background art.
    paddingLeft: Spacing.five + Spacing.one,
    paddingRight: Spacing.three,
    paddingVertical: Spacing.four,
  },
  titleImage: {
    width: 260,
    aspectRatio: TITLE_ASPECT_RATIO,
    alignSelf: 'center',
    marginBottom: Spacing.four,
  },
  rows: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: Spacing.five,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  labelColumn: {
    width: 150,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  input: {
    flex: 1,
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
