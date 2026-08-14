import { Image } from 'expo-image';
import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { MealRecord, MealType, searchMealRecords } from '@/lib/meal-records';

const KITCHEN_BACKGROUND = require('@/assets/images/meal-log/kitchen-bg.jpg');

// ひなた作の検索バー。元絵は虫眼鏡アイコン＋「料理名で検索」の文字が両方描き込まれて
// いるが、文字部分は実際の入力/プレースホルダーと二重表示になるので、naming-form-card
// と同じ方式(絵に焼き込まれた文字を、枠内の塗り色をサンプリングした不透明パッチで隠し、
// その上に実際のTextInputを重ねる)で隠している。パッチは絵の枠線のすぐ内側までしか
// 広げず、枠線自体は覆わない。
const SEARCH_BAR_IMAGE = require('@/assets/images/meal-log/search-bar.png');
const SEARCH_BAR_ASPECT_RATIO = 1666 / 237;
const SEARCH_BAR_FILL_COLOR = 'rgb(253, 245, 230)';
const SEARCH_BAR_TEXT_PATCH = { left: '14.17%', top: '11.06%', width: '32.41%', height: '80.61%' } as const;
const SEARCH_BAR_ICON_CLEARANCE = '16%';

// ひなた作の記録カード用フレーム。6種類をrecord.idベースの疑似ランダムで割り当てる
// (規則正しく順番に並べると柄の周期が目について不自然に見えるため)。6枚とも同じ木枠に
// コーナーのお菓子アイコンだけが違い、実測サイズはほぼ同じなので1つの比率で扱う。
const RECORD_FRAME_IMAGES = [
  require('@/assets/images/meal-log/record-frame-donut.png'),
  require('@/assets/images/meal-log/record-frame-cookie.png'),
  require('@/assets/images/meal-log/record-frame-cupcake.png'),
  require('@/assets/images/meal-log/record-frame-macaron.png'),
  require('@/assets/images/meal-log/record-frame-daifuku.png'),
  require('@/assets/images/meal-log/record-frame-taiyaki.png'),
];
const RECORD_FRAME_ASPECT_RATIO = 1828 / 540;
// 枠画像の透明処理された「窓」部分(木枠の内側)を実測してパーセント化した安全領域。
// ここに写真とテキストを収める。上下の余白は画像そのものを実測bboxでトリミング済み
// (トリミング前は画像の上下に大きな透明マージンがあり、行間がスカスカに見えていた)。
const RECORD_FRAME_CONTENT_BOX = { top: '26.48%', bottom: '15.93%', left: '5.53%', right: '4.65%' } as const;

function frameIndexForId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % RECORD_FRAME_IMAGES.length;
}

// id単体のハッシュだけだと隣り合う記録が偶然同じ枠になることがあるので、リスト順に
// 割り当てながら直前と被ったら次の柄にずらす。
function assignFrameIndexes(records: MealRecord[]): Map<string, number> {
  const assignments = new Map<string, number>();
  let previous = -1;
  for (const record of records) {
    let index = frameIndexForId(record.id);
    if (index === previous) {
      index = (index + 1) % RECORD_FRAME_IMAGES.length;
    }
    assignments.set(record.id, index);
    previous = index;
  }
  return assignments;
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝ごはん',
  lunch: '昼ごはん',
  dinner: '夜ごはん',
  snack: 'おやつ',
};

// ひなた作の期間フィルターボタン。未選択(クリーム)/選択中(オレンジ)で丸ごと絵が違うため、
// record-frameと同様に状態ごとの画像をソース切り替えする方式。ボタンごとに実測アスペクト比が
// 微妙に違うので、未選択画像の比率を基準に固定枠を作り、選択中画像はcontain指定でその枠に収める
// (枠を固定することでトグル時のガタつきを防ぐ)。
const PERIOD_PILL_IMAGES = {
  '1w': { off: require('@/assets/images/meal-log/period-pill-1w-off.png'), on: require('@/assets/images/meal-log/period-pill-1w-on.png'), aspectRatio: 308 / 158 },
  '1m': { off: require('@/assets/images/meal-log/period-pill-1m-off.png'), on: require('@/assets/images/meal-log/period-pill-1m-on.png'), aspectRatio: 300 / 158 },
  '2m': { off: require('@/assets/images/meal-log/period-pill-2m-off.png'), on: require('@/assets/images/meal-log/period-pill-2m-on.png'), aspectRatio: 301 / 158 },
  all: { off: require('@/assets/images/meal-log/period-pill-all-off.png'), on: require('@/assets/images/meal-log/period-pill-all-on.png'), aspectRatio: 304 / 159 },
};

const PERIOD_OPTIONS = ['1w', '1m', '2m', 'all'] as const;

const PERIOD_DAYS: Record<string, number> = { '1w': 7, '1m': 30, '2m': 60 };

function PeriodFilterChips({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <View style={styles.periodRow}>
      {PERIOD_OPTIONS.map((value) => {
        const isSelected = value === selected;
        const { off, on, aspectRatio } = PERIOD_PILL_IMAGES[value];
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(isSelected ? null : value)}
            style={({ pressed }) => [styles.periodPill, { aspectRatio }, pressed && styles.pressed]}
          >
            <Image source={off} style={styles.absoluteFill} contentFit="contain" />
            {isSelected && <Image source={on} style={styles.absoluteFill} contentFit="contain" />}
          </Pressable>
        );
      })}
    </View>
  );
}

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

const DISH_NAME_MAX_CHARS = 13;

function truncateDishName(text: string): string {
  if (text.length <= DISH_NAME_MAX_CHARS) return text;
  return `${text.slice(0, DISH_NAME_MAX_CHARS)}…`;
}

export default function MealLogHistoryScreen() {
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [period, setPeriod] = useState<string | null>('all');
  const frameAssignments = useMemo(() => assignFrameIndexes(records), [records]);

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
    <View style={styles.container}>
      <Image source={KITCHEN_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => router.back()} />

        <View style={styles.filters}>
          <View style={styles.searchBar}>
            <Image source={SEARCH_BAR_IMAGE} style={styles.absoluteFill} contentFit="fill" />
            {(isSearchFocused || keyword.length > 0) && (
              <View style={[styles.searchBarTextPatch, SEARCH_BAR_TEXT_PATCH]} />
            )}
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={styles.searchInput}
            />
          </View>
          <PeriodFilterChips selected={period} onSelect={setPeriod} />
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
            <Pressable
              onPress={() => router.push(`/meal-log/${item.id}` as Href)}
              style={[styles.frameCard, { aspectRatio: RECORD_FRAME_ASPECT_RATIO }]}
            >
              {({ pressed }) => (
                <View style={[styles.frameInner, pressed && styles.pressed]}>
                  <ThemedView type="backgroundElement" style={[styles.contentBox, RECORD_FRAME_CONTENT_BOX]} />
                  <View style={[styles.contentBox, styles.row, RECORD_FRAME_CONTENT_BOX]}>
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
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {item.dishes.length > 0 ? truncateDishName(item.dishes.join('、')) : '（料理名なし）'}
                      </ThemedText>
                    </View>
                  </View>
                  <Image
                    source={RECORD_FRAME_IMAGES[frameAssignments.get(item.id) ?? 0]}
                    style={styles.absoluteFill}
                    contentFit="fill"
                  />
                </View>
              )}
            </Pressable>
          )}
        />
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
  filters: {
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  searchBar: {
    width: '100%',
    aspectRatio: SEARCH_BAR_ASPECT_RATIO,
  },
  searchBarTextPatch: {
    position: 'absolute',
    backgroundColor: SEARCH_BAR_FILL_COLOR,
  },
  searchInput: {
    ...StyleSheet.absoluteFillObject,
    paddingLeft: SEARCH_BAR_ICON_CLEARANCE,
    paddingRight: Spacing.four,
    textAlignVertical: 'center',
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  periodPill: {
    height: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.half,
  },
  frameCard: {
    width: '100%',
  },
  frameInner: {
    flex: 1,
  },
  contentBox: {
    position: 'absolute',
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  thumbnail: {
    height: '78%',
    aspectRatio: 1,
    borderRadius: Spacing.one,
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
