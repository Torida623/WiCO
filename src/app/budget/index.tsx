import { Image } from 'expo-image';
import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { DimensionValue, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { usePageDissolveOut } from '@/hooks/use-page-dissolve';
import { useTheme } from '@/hooks/use-theme';
import {
  addExpenseEntry,
  deleteExpenseEntry,
  ExpenseCategory,
  ExpenseEntry,
  getMonthKey,
  getMonthSummary,
  formatYen,
  listExpenseEntries,
  MonthSummary,
} from '@/lib/household-budget';

const NOTEBOOK_BACKGROUND = require('@/assets/images/budget/notebook-bg.jpg');
const PAGE_CURL_IMAGE = require('@/assets/images/budget/page-curl.jpg');
const SUMMARY_CARD_IMAGE = require('@/assets/images/budget/summary-card.png');
const RECENT_TITLE_IMAGE = require('@/assets/images/budget/recent-title.png');
const STICKY_BUTTON_LIVING_COSTS_IMAGE = require('@/assets/images/budget/sticky-button-living-costs.png');
const STICKY_BUTTON_SUMMARY_IMAGE = require('@/assets/images/budget/sticky-button-summary.png');
const INPUT_CARD_FOOD_IMAGE = require('@/assets/images/budget/input-card-food.png');
const INPUT_CARD_OTHER_IMAGE = require('@/assets/images/budget/input-card-other.png');

const SUMMARY_CARD_ASPECT_RATIO = 1536 / 1024;
const STICKY_BUTTON_LIVING_COSTS_ASPECT_RATIO = 1211 / 433;
const STICKY_BUTTON_SUMMARY_ASPECT_RATIO = 1190 / 362;
const INPUT_CARD_ASPECT_RATIO = 1360 / 741;
const RECENT_TITLE_ASPECT_RATIO = 1004 / 215;

// The amount field shows live typed digits over baked-in "金額" placeholder
// art, so that patch of the card needs an opaque cover in the pill's own
// fill color (sampled from the source art) before the real text can sit on
// top of it cleanly.
const AMOUNT_PILL_FILL_COLOR = 'rgb(249, 234, 203)';

function formatEntryDate(createdAt: string): string {
  const date = new Date(createdAt);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** An invisible tap zone positioned over a hand-drawn button baked into a background image. */
function CardZone({
  top,
  height,
  left,
  right,
  onPress,
  disabled,
}: {
  top: DimensionValue;
  height: DimensionValue;
  left: DimensionValue;
  right: DimensionValue;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.cardZone, { top, height, left, right }]}>
      {({ pressed }) => pressed && !disabled && <View style={styles.cardZonePressedOverlay} />}
    </Pressable>
  );
}

export default function BudgetScreen() {
  const theme = useTheme();
  const { contentStyle: dissolveContentStyle, curlStyle: dissolveCurlStyle, dissolveOut } = usePageDissolveOut();
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [amountValue, setAmountValue] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');

  const load = useCallback(() => {
    const monthKey = getMonthKey();
    Promise.all([listExpenseEntries(monthKey), getMonthSummary(monthKey)]).then(([loadedEntries, loadedSummary]) => {
      setEntries(loadedEntries);
      setSummary(loadedSummary);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleAdd() {
    const amount = Number(amountValue);
    if (!amount || amount <= 0) return;
    await addExpenseEntry({ amount, category });
    setAmountValue('');
    load();
  }

  async function handleDelete(id: string) {
    await deleteExpenseEntry(id);
    load();
  }

  const engelPercent = summary?.engelRatio != null ? Math.round(summary.engelRatio * 100) : null;

  return (
    <View style={styles.flex}>
      <Image source={NOTEBOOK_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <Animated.View style={[styles.flex, dissolveContentStyle]}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content} scrollEnabled={false}>
          <View style={styles.summaryCardWrapper}>
            <Image source={SUMMARY_CARD_IMAGE} style={styles.summaryCardImage} contentFit="contain" />
            <View style={styles.summaryCardOverlay} pointerEvents="none">
              {engelPercent !== null ? (
                <ThemedText type="title" themeColor="text" style={styles.engelValue}>
                  {engelPercent}%
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.engelEmptyText}>
                  支出を記録すると、ここに割合が出るようになるよ
                </ThemedText>
              )}
            </View>

            {summary && summary.totalSpent > 0 && (
              <>
                <View style={styles.summaryValueFood} pointerEvents="none">
                  <ThemedText
                    type="smallBold"
                    themeColor="text"
                    style={styles.summaryValueText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}>
                    {formatYen(summary.foodTotal)}
                  </ThemedText>
                </View>
                <View style={styles.summaryValueOther} pointerEvents="none">
                  <ThemedText
                    type="smallBold"
                    themeColor="text"
                    style={styles.summaryValueText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}>
                    {formatYen(summary.otherTotal)}
                  </ThemedText>
                </View>
                <View style={styles.summaryValueLiving} pointerEvents="none">
                  <ThemedText
                    type="smallBold"
                    themeColor="text"
                    style={styles.summaryValueText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}>
                    {formatYen(summary.livingCostTotal)}
                  </ThemedText>
                </View>
              </>
            )}
          </View>

          <View style={styles.inputCardWrapper}>
            <Image
              source={category === 'food' ? INPUT_CARD_FOOD_IMAGE : INPUT_CARD_OTHER_IMAGE}
              style={styles.inputCardImage}
              contentFit="contain"
            />
            <CardZone top="18.6%" height="23.5%" left="3.6%" right="51.6%" onPress={() => setCategory('food')} />
            <CardZone top="18.6%" height="23.5%" left="50.8%" right="4.9%" onPress={() => setCategory('other')} />
            <View style={[styles.cardZone, styles.amountPatch, { top: '42.7%', height: '23.5%', left: '2.2%', right: '23.8%' }]}>
              <TextInput
                value={amountValue}
                onChangeText={setAmountValue}
                onSubmitEditing={handleAdd}
                keyboardType="number-pad"
                placeholder="金額"
                placeholderTextColor={theme.textSecondary}
                style={[styles.amountInput, { color: theme.text }]}
              />
            </View>
            <CardZone
              top="42.7%"
              height="23.5%"
              left="78.1%"
              right="4.9%"
              onPress={handleAdd}
              disabled={!amountValue.trim()}
            />
            <CardZone
              top="75.2%"
              height="11.1%"
              left="25.1%"
              right="27.8%"
              onPress={() => router.push('/budget/receipt-scan' as Href)}
            />
          </View>

          {entries.length > 0 && (
            <View style={styles.section}>
              <Image source={RECENT_TITLE_IMAGE} style={styles.recentTitleImage} contentFit="contain" />
              <View style={styles.entryList}>
                {entries.slice(0, 2).map((entry) => (
                  <ThemedView key={entry.id} type="backgroundElement" style={styles.entryRow}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.entryDate}>
                      {formatEntryDate(entry.createdAt)}
                    </ThemedText>
                    <ThemedText type="small" style={styles.entryCategory}>
                      {entry.category === 'food' ? '食費' : '食費以外'}
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.entryAmount}>
                      {formatYen(entry.amount)}
                    </ThemedText>
                    <Pressable onPress={() => handleDelete(entry.id)} hitSlop={8}>
                      <ThemedText type="small" themeColor="textSecondary">
                        ×
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                ))}
              </View>
            </View>
          )}

          <View style={styles.stickyButtonsRow}>
            <Pressable
              style={styles.stickyButtonHalf}
              onPress={() => dissolveOut(() => router.push('/budget/living-costs' as Href))}>
              {({ pressed }) => (
                <Image
                  source={STICKY_BUTTON_LIVING_COSTS_IMAGE}
                  style={[styles.stickyButtonImageLivingCosts, pressed && styles.stickyButtonPressed]}
                  contentFit="contain"
                />
              )}
            </Pressable>
            <Pressable
              style={styles.stickyButtonHalf}
              onPress={() => dissolveOut(() => router.push('/budget/summary' as Href))}>
              {({ pressed }) => (
                <Image
                  source={STICKY_BUTTON_SUMMARY_IMAGE}
                  style={[styles.stickyButtonImageSummary, pressed && styles.stickyButtonPressed]}
                  contentFit="contain"
                />
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
      </Animated.View>
      <Animated.View style={[styles.absoluteFill, dissolveCurlStyle]} pointerEvents="none">
        <Image source={PAGE_CURL_IMAGE} style={styles.absoluteFill} contentFit="cover" />
      </Animated.View>
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
    // Left padding is wider than the other sides so cards clear the
    // spiral-bound rings drawn into the notebook background art.
    paddingLeft: Spacing.five + Spacing.one,
    paddingRight: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.five,
  },
  summaryCardWrapper: {
    width: '100%',
    aspectRatio: SUMMARY_CARD_ASPECT_RATIO,
  },
  summaryCardImage: {
    width: '100%',
    height: '100%',
  },
  summaryCardOverlay: {
    position: 'absolute',
    top: '25%',
    left: '8%',
    right: '8%',
    height: '30%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  engelValue: {
    fontSize: 44,
    lineHeight: 50,
  },
  engelEmptyText: {
    textAlign: 'center',
  },
  summaryValueFood: {
    position: 'absolute',
    top: '73%',
    left: '20.8%',
    transform: [{ translateX: '-50%' }],
  },
  summaryValueOther: {
    position: 'absolute',
    top: '73%',
    left: '49.9%',
    transform: [{ translateX: '-50%' }],
  },
  summaryValueLiving: {
    position: 'absolute',
    top: '73%',
    left: '76.8%',
    transform: [{ translateX: '-50%' }, { translateX: 8 }],
  },
  summaryValueText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  section: {
    gap: Spacing.two,
    marginTop: -20,
  },
  inputCardWrapper: {
    width: '100%',
    aspectRatio: INPUT_CARD_ASPECT_RATIO,
    marginTop: -(Spacing.three + 20),
  },
  inputCardImage: {
    width: '100%',
    height: '100%',
  },
  amountPatch: {
    backgroundColor: AMOUNT_PILL_FILL_COLOR,
    borderRadius: Spacing.three,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  amountInput: {
    fontSize: 14,
  },
  recentTitleImage: {
    width: 128,
    aspectRatio: RECENT_TITLE_ASPECT_RATIO,
  },
  entryList: {
    gap: Spacing.one,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  entryDate: {
    width: 40,
  },
  entryCategory: {
    flex: 1,
  },
  entryAmount: {
    marginRight: Spacing.one,
  },
  stickyButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stickyButtonHalf: {
    flex: 1,
  },
  stickyButtonImageLivingCosts: {
    width: '100%',
    aspectRatio: STICKY_BUTTON_LIVING_COSTS_ASPECT_RATIO,
  },
  stickyButtonImageSummary: {
    width: '100%',
    aspectRatio: STICKY_BUTTON_SUMMARY_ASPECT_RATIO,
  },
  stickyButtonPressed: {
    opacity: 0.7,
  },
  cardZone: {
    position: 'absolute',
  },
  cardZonePressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: Spacing.three,
  },
});
