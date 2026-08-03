import { Image } from 'expo-image';
import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TagChips, TagChipOption } from '@/components/chat/tag-chips';
import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { MealRecord, MealType, searchMealRecords } from '@/lib/meal-records';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝ごはん',
  lunch: '昼ごはん',
  dinner: '夜ごはん',
  snack: 'おやつ',
};

const PERIOD_OPTIONS: TagChipOption[] = [
  { value: '1w', label: '1週間' },
  { value: '1m', label: '1ヶ月' },
  { value: '2m', label: '2ヶ月' },
  { value: 'all', label: 'すべて' },
];

const PERIOD_DAYS: Record<string, number> = { '1w': 7, '1m': 30, '2m': 60 };

function periodToFromDate(period: string | null): string | undefined {
  const days = period ? PERIOD_DAYS[period] : undefined;
  if (!days) return undefined;
  const from = new Date();
  from.setDate(from.getDate() - days);
  return from.toISOString();
}

function formatEatenAt(eatenAt: string): string {
  const date = new Date(eatenAt);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function MealLogHistoryScreen() {
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [period, setPeriod] = useState<string | null>('all');

  const reload = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    searchMealRecords({ keyword: keyword.trim() || undefined, from: periodToFromDate(period) }).then((loaded) => {
      if (!cancelled) {
        setRecords(loaded);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [keyword, period]);

  useEffect(reload, [reload]);
  useFocusEffect(reload);

  return (
    <ThemedView style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="記録を見る" onBack={() => router.back()} />

        <View style={styles.filters}>
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="料理名やメモで検索"
            style={styles.searchInput}
          />
          <TagChips options={PERIOD_OPTIONS} selected={period} onSelect={setPeriod} />
        </View>

        {!isLoading && records.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              {keyword.trim() || period !== 'all'
                ? '条件に合う記録が見つからなかったよ。'
                : 'まだ記録がないよ。「記録する」から始めてみてね。'}
            </ThemedText>
          </View>
        )}

        <FlatList
          data={records}
          keyExtractor={(record) => record.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/meal-log/${item.id}` as Href)}>
              {({ pressed }) => (
                <ThemedView type="backgroundElement" style={[styles.row, pressed && styles.pressed]}>
                  <Image source={{ uri: item.photoUri }} style={styles.thumbnail} contentFit="cover" />
                  <View style={styles.rowText}>
                    <View style={styles.rowHeader}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatEatenAt(item.eatenAt)}
                      </ThemedText>
                      {item.mealType && (
                        <ThemedText type="small" themeColor="textSecondary">
                          {MEAL_TYPE_LABELS[item.mealType]}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText type="smallBold" numberOfLines={2}>
                      {item.dishes.length > 0 ? item.dishes.join('、') : '（料理名なし）'}
                    </ThemedText>
                  </View>
                </ThemedView>
              )}
            </Pressable>
          )}
        />
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
  filters: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchInput: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
  },
  rowText: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.one,
  },
  rowHeader: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
