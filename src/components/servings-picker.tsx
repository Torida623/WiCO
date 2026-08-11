import { useCallback } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ServingsValue = '1' | '2' | '3' | '4' | '4+';

// wheelLabelはホイールの中で回転する短い数字表記、fullLabelは保存する材料テキストに使う
// 「〜人前」までの完全な表記(単位の「人前」はホイールの外に固定表示するので短くしてある)。
export const SERVINGS_OPTIONS: { value: ServingsValue; wheelLabel: string; fullLabel: string }[] = [
  { value: '1', wheelLabel: '1', fullLabel: '1人前' },
  { value: '2', wheelLabel: '2', fullLabel: '2人前' },
  { value: '3', wheelLabel: '3', fullLabel: '3人前' },
  { value: '4', wheelLabel: '4', fullLabel: '4人前' },
  { value: '4+', wheelLabel: '4+', fullLabel: '4人前以上' },
];

const SERVINGS_FULL_LABELS: Record<ServingsValue, string> = Object.fromEntries(
  SERVINGS_OPTIONS.map((o) => [o.value, o.fullLabel]),
) as Record<ServingsValue, string>;

export function servingsLabel(value: ServingsValue): string {
  return SERVINGS_FULL_LABELS[value];
}

// 自由入力だと荒らし対策にならないので、固定の選択肢だけを選べる縦ロール式ピッカーにしている。
// @expo/uiのネイティブPickerはExpo Goで動かず(dev client必須)、expo-routerがアプリ起動時に
// 全ルートを読み込む都合でアプリ全体がクラッシュしてしまったため、RN標準コンポーネントだけで
// 組んだスナップスクロール式ホイールに作り直した。中央の枠に重なった項目が選択中の値。
// 単位の「人前」はホイールの外側に固定テキストとして置く(ScreenHeaderの見出しは廃止し、
// 「基本の材料」見出しの右側にインラインで収まる幅に絞っている)。
const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 3;
const PADDING_COUNT = Math.floor(VISIBLE_ITEMS / 2);
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const WHEEL_WIDTH = 40;

export type ServingsPickerProps = {
  value: ServingsValue;
  onChange: (value: ServingsValue) => void;
};

export function ServingsPicker({ value, onChange }: ServingsPickerProps) {
  const theme = useTheme();
  const selectedIndex = SERVINGS_OPTIONS.findIndex((o) => o.value === value);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(SERVINGS_OPTIONS.length - 1, index));
      onChange(SERVINGS_OPTIONS[clamped].value);
    },
    [onChange],
  );

  return (
    <View style={styles.row}>
      <View style={[styles.wheel, { height: WHEEL_HEIGHT, width: WHEEL_WIDTH }]}>
        <View
          pointerEvents="none"
          style={[
            styles.highlight,
            { top: ITEM_HEIGHT * PADDING_COUNT, height: ITEM_HEIGHT, backgroundColor: theme.backgroundElement },
          ]}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentOffset={{ x: 0, y: Math.max(0, selectedIndex) * ITEM_HEIGHT }}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PADDING_COUNT }}
          onMomentumScrollEnd={handleMomentumEnd}>
          {SERVINGS_OPTIONS.map((option, index) => (
            <View key={option.value} style={[styles.item, { height: ITEM_HEIGHT }]}>
              <ThemedText
                type={index === selectedIndex ? 'smallBold' : 'small'}
                themeColor={index === selectedIndex ? 'text' : 'textSecondary'}>
                {option.wheelLabel}
              </ThemedText>
            </View>
          ))}
        </ScrollView>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        人前
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  wheel: {
    position: 'relative',
    justifyContent: 'center',
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: Spacing.one,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
