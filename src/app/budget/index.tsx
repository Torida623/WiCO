import { Image } from 'expo-image';
import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { DimensionValue, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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
const SUMMARY_CARD_IMAGE = require('@/assets/images/budget/summary-card.png');
const RECENT_TITLE_IMAGE = require('@/assets/images/budget/recent-title.png');
const STICKY_BUTTONS_IMAGE = require('@/assets/images/budget/sticky-buttons.png');

const SUMMARY_CARD_ASPECT_RATIO = 1536 / 1024;
const STICKY_BUTTONS_ASPECT_RATIO = 1536 / 1024;
const RECENT_TITLE_ASPECT_RATIO = 1004 / 215;

function formatEntryDate(createdAt: string): string {
  const date = new Date(createdAt);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function StickyNavButton({
  top,
  height,
  left,
  right,
  onPress,
}: {
  top: DimensionValue;
  height: DimensionValue;
  left: DimensionValue;
  right: DimensionValue;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.stickyButtonZone, { top, height, left, right }]}>
      {({ pressed }) => pressed && <View style={styles.stickyButtonPressedOverlay} />}
    </Pressable>
  );
}

export default function BudgetScreen() {
  const theme = useTheme();
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
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="お買い物ノート" onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content}>
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
          </View>

          {summary && summary.totalSpent > 0 && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <ThemedText type="small" themeColor="textSecondary">
                  食費
                </ThemedText>
                <ThemedText type="smallBold">{formatYen(summary.foodTotal)}</ThemedText>
              </View>
              <View style={styles.summaryStat}>
                <ThemedText type="small" themeColor="textSecondary">
                  食費以外
                </ThemedText>
                <ThemedText type="smallBold">{formatYen(summary.otherTotal)}</ThemedText>
              </View>
              <View style={styles.summaryStat}>
                <ThemedText type="small" themeColor="textSecondary">
                  生活費
                </ThemedText>
                <ThemedText type="smallBold">{formatYen(summary.livingCostTotal)}</ThemedText>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <ThemedText type="smallBold">支出を記録する</ThemedText>
            <View style={styles.categoryRow}>
              {(['food', 'other'] as ExpenseCategory[]).map((value) => {
                const selected = category === value;
                return (
                  <Pressable key={value} onPress={() => setCategory(value)} style={styles.flex}>
                    {({ pressed }) => (
                      <ThemedView
                        type={selected ? 'accent' : 'backgroundElement'}
                        style={[styles.categoryButton, pressed && styles.pressed]}>
                        <ThemedText type="smallBold" themeColor={selected ? 'background' : 'text'}>
                          {value === 'food' ? '食費' : '食費以外'}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.inputRow}>
              <ThemedView type="backgroundElement" style={styles.amountInputWrapper}>
                <TextInput
                  value={amountValue}
                  onChangeText={setAmountValue}
                  onSubmitEditing={handleAdd}
                  keyboardType="number-pad"
                  placeholder="金額"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.amountInput, { color: theme.text }]}
                />
              </ThemedView>
              <Pressable onPress={handleAdd} disabled={!amountValue.trim()}>
                {({ pressed }) => (
                  <ThemedView
                    type="accent"
                    style={[styles.addButton, (pressed || !amountValue.trim()) && styles.pressed]}>
                    <ThemedText type="smallBold" themeColor="background">
                      記録
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            </View>
            <Pressable onPress={() => router.push('/budget/receipt-scan' as Href)} style={styles.receiptLink}>
              {({ pressed }) => (
                <ThemedText type="link" themeColor="accent" style={pressed && styles.pressed}>
                  📷 レシートから記録する
                </ThemedText>
              )}
            </Pressable>
          </View>

          {entries.length > 0 && (
            <View style={styles.section}>
              <Image source={RECENT_TITLE_IMAGE} style={styles.recentTitleImage} contentFit="contain" />
              <View style={styles.entryList}>
                {entries.map((entry) => (
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

          <View style={styles.stickyButtonsWrapper}>
            <Image source={STICKY_BUTTONS_IMAGE} style={styles.stickyButtonsImage} contentFit="contain" />
            <StickyNavButton
              top="11.1%"
              height="41.1%"
              left="11.2%"
              right="10.7%"
              onPress={() => router.push('/budget/living-costs' as Href)}
            />
            <StickyNavButton
              top="56.3%"
              height="34.2%"
              left="11.9%"
              right="11.4%"
              onPress={() => router.push('/budget/summary' as Href)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  section: {
    gap: Spacing.two,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  categoryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  amountInputWrapper: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  amountInput: {
    fontSize: 16,
  },
  addButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  receiptLink: {
    alignItems: 'center',
    paddingTop: Spacing.one,
  },
  recentTitleImage: {
    width: 160,
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
  stickyButtonsWrapper: {
    width: '100%',
    aspectRatio: STICKY_BUTTONS_ASPECT_RATIO,
  },
  stickyButtonsImage: {
    width: '100%',
    height: '100%',
  },
  stickyButtonZone: {
    position: 'absolute',
  },
  stickyButtonPressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
