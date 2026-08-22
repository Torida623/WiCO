import { Image } from 'expo-image';
import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';
import {
  COSTUMES,
  CostumeId,
  CostumeSeries,
  CostumeTier,
  exchangeCostumeForTicket,
  getEquippedCostume,
  getMascotNeutralImage,
  getOwnedCostumeIds,
  setEquippedCostume,
  TICKET_LABEL,
} from '@/lib/costumes';

const BACKGROUND_DAY = require('@/assets/images/perokoko-room/room-bg-day.jpg');
const BACKGROUND_NIGHT = require('@/assets/images/perokoko-room/room-bg-night.jpg');
const NAME_PLATE_IMAGE = require('@/assets/images/perokoko-room/costume-name-plate.png');
const NAME_PLATE_ASPECT_RATIO = 1536 / 1024;

const TICKET_ICON: Record<CostumeTier, number> = {
  normal: require('@/assets/images/shop/ticket-normal.png'),
  premium: require('@/assets/images/shop/ticket-premium.png'),
};

const TIER_LABEL: Record<CostumeTier, string> = {
  normal: 'ノーマル',
  premium: 'プレミアム',
};

type OwnershipFilter = 'owned' | 'unowned';

const TIER_FILTERS: { id: CostumeTier; label: string }[] = [
  { id: 'normal', label: 'ノーマル' },
  { id: 'premium', label: 'プレミアム' },
];

const OWNERSHIP_FILTERS: { id: OwnershipFilter; label: string }[] = [
  { id: 'owned', label: '交換済み' },
  { id: 'unowned', label: '未所持' },
];

const SERIES_FILTERS: { id: CostumeSeries; label: string }[] = [
  { id: 'cooking', label: 'お料理' },
  { id: 'daily', label: '日常' },
  { id: 'animal', label: 'アニマル' },
];

const FILTER_PANEL_WIDTH = 220;

type CostumeOption = {
  id: CostumeId;
  label: string;
  tierLabel: string | null;
  thumbImage: number;
  tier: CostumeTier | null;
  series: CostumeSeries | null;
  owned: boolean;
  ticketCost: number | null;
};

export default function CostumeScreen() {
  const [isDay, setIsDay] = useState(true);
  const [equipped, setEquipped] = useState<CostumeId>('default');
  const [previewId, setPreviewId] = useState<CostumeId>('default');
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [tierFilter, setTierFilter] = useState<CostumeTier | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter | null>(null);
  const [seriesFilter, setSeriesFilter] = useState<CostumeSeries | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterPanelX = useSharedValue(FILTER_PANEL_WIDTH);

  useEffect(() => {
    filterPanelX.value = withTiming(isFilterOpen ? 0 : FILTER_PANEL_WIDTH, {
      duration: 320,
      easing: Easing.out(Easing.quad),
    });
  }, [isFilterOpen, filterPanelX]);

  const filterPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: filterPanelX.value }],
  }));

  function toggleTierFilter(tier: CostumeTier) {
    setTierFilter((prev) => (prev === tier ? null : tier));
  }

  function toggleOwnershipFilter(value: OwnershipFilter) {
    setOwnershipFilter((prev) => (prev === value ? null : value));
  }

  function toggleSeriesFilter(value: CostumeSeries) {
    setSeriesFilter((prev) => (prev === value ? null : value));
  }

  useFocusEffect(
    useCallback(() => {
      setIsDay(isDaytime());
      getEquippedCostume().then((id) => {
        setEquipped(id);
        setPreviewId(id);
      });
      getOwnedCostumeIds().then(setOwnedIds);
    }, []),
  );

  async function handleEquip(id: CostumeId) {
    setEquipped(id);
    await setEquippedCostume(id);
  }

  function handlePressCostume(option: CostumeOption) {
    setPreviewId(option.id);
    if (option.owned || !option.tier) {
      handleEquip(option.id);
    }
  }

  function handleExchange(option: CostumeOption) {
    if (!option.tier || option.ticketCost === null) return;
    const ticketLabel = TICKET_LABEL[option.tier];
    Alert.alert(`${option.label}を${ticketLabel}${option.ticketCost}枚と交換しますか？`, undefined, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          const success = await exchangeCostumeForTicket(option.id);
          if (!success) {
            Alert.alert(`${ticketLabel}が足りないよ`, 'ショップで交換してからもう一度試してね。');
            return;
          }
          setOwnedIds((prev) => new Set(prev).add(option.id));
          await handleEquip(option.id);
        },
      },
    ]);
  }

  const allOptions: CostumeOption[] = [
    {
      id: 'default',
      label: 'デフォルト',
      tierLabel: null,
      thumbImage: getMascotNeutralImage('default', isDay),
      tier: null,
      series: null,
      owned: true,
      ticketCost: 0,
    },
    ...COSTUMES.map((costume) => ({
      id: costume.id,
      label: costume.label,
      tierLabel: TIER_LABEL[costume.tier],
      thumbImage: costume.image,
      tier: costume.tier,
      series: costume.series,
      owned: ownedIds.has(costume.id),
      ticketCost: costume.ticketCost,
    })),
  ];
  // デフォルトはどのフィルターでも常に選べるようにしておく（衣装扱いではないので）。
  const options = allOptions.filter((option) => {
    if (option.id === 'default') return true;
    // プレゼント限定の未所持衣装はサプライズにしたいので、もらうまでピッカーに出さない。
    if (!option.owned && option.ticketCost === null) return false;
    if (tierFilter && option.tier !== tierFilter) return false;
    if (ownershipFilter === 'owned' && !option.owned) return false;
    if (ownershipFilter === 'unowned' && option.owned) return false;
    if (seriesFilter && option.series !== seriesFilter) return false;
    return true;
  });
  const selectedOption = allOptions.find((option) => option.id === previewId) ?? allOptions[0];

  return (
    <View style={styles.container}>
      <Image source={isDay ? BACKGROUND_DAY : BACKGROUND_NIGHT} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => router.replace('/perokoko-room' as Href)} />

        <View style={styles.bottomContent}>
          <View style={styles.previewArea}>
            <View style={styles.namePlateWrap} pointerEvents="none">
              <Image source={NAME_PLATE_IMAGE} style={styles.namePlateImage} contentFit="contain" />
            </View>
            <Image
              source={getMascotNeutralImage(previewId, isDay, { allowBackground: true })}
              style={styles.previewImage}
              contentFit="contain"
            />
            <View style={styles.nameTextWrap}>
              <ThemedText type="smallBold">{selectedOption.label}</ThemedText>
              <ThemedText
                type="small"
                themeColor="accent"
                style={!selectedOption.tierLabel && styles.tierLabelHidden}>
                {selectedOption.tierLabel || ' '}
              </ThemedText>
            </View>
          </View>

          <View style={styles.filterArea}>
            <Pressable onPress={() => setIsFilterOpen(true)}>
              {({ pressed }) => (
                <ThemedView type="backgroundElement" style={[styles.filterChip, pressed && styles.pressed]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    絞り込み
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          </View>

          <View style={styles.pickerArea}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerContent}>
              {options.map((option) => (
                <CostumeThumb
                  key={option.id}
                  option={option}
                  selected={option.id === equipped}
                  isPreviewed={option.id === previewId}
                  onPress={() => handlePressCostume(option)}
                  onExchange={() => handleExchange(option)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>

      {isFilterOpen && (
        <Pressable style={styles.filterScrim} onPress={() => setIsFilterOpen(false)} />
      )}
      <Animated.View style={[styles.filterPanel, filterPanelStyle]} pointerEvents={isFilterOpen ? 'box-none' : 'none'}>
        <SafeAreaView edges={['top', 'right', 'bottom']} style={styles.filterPanelSafeArea}>
          <ThemedView type="backgroundElement" style={styles.filterPanelCard}>
            <ThemedText type="smallBold" style={styles.filterPanelTitle}>
              絞り込み
            </ThemedText>
            {TIER_FILTERS.map((f) => (
              <FilterRow key={f.id} label={f.label} selected={tierFilter === f.id} onPress={() => toggleTierFilter(f.id)} />
            ))}
            <View style={styles.filterDivider} />
            {OWNERSHIP_FILTERS.map((f) => (
              <FilterRow
                key={f.id}
                label={f.label}
                selected={ownershipFilter === f.id}
                onPress={() => toggleOwnershipFilter(f.id)}
              />
            ))}
            <View style={styles.filterDivider} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.filterSectionHeading}>
              シリーズ
            </ThemedText>
            {SERIES_FILTERS.map((f) => (
              <FilterRow
                key={f.id}
                label={f.label}
                selected={seriesFilter === f.id}
                onPress={() => toggleSeriesFilter(f.id)}
              />
            ))}
          </ThemedView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

function FilterRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <ThemedView
          type={selected ? 'accent' : 'backgroundElement'}
          style={[styles.filterRow, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor={selected ? 'background' : 'textSecondary'}>
            {label}
          </ThemedText>
        </ThemedView>
      )}
    </Pressable>
  );
}

type CostumeThumbProps = {
  option: CostumeOption;
  selected: boolean;
  isPreviewed: boolean;
  onPress: () => void;
  onExchange: () => void;
};

function CostumeThumb({ option, selected, isPreviewed, onPress, onExchange }: CostumeThumbProps) {
  const locked = !option.owned;
  const showExchangeInfo = locked && isPreviewed && option.tier && option.ticketCost !== null;
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <ThemedView
          type={selected ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.thumbCard, pressed && styles.pressed]}>
          {!showExchangeInfo && (
            <Image
              source={option.thumbImage}
              style={[styles.thumbImage, locked && styles.thumbImageLocked]}
              contentFit="contain"
            />
          )}
          {showExchangeInfo ? (
            <View style={styles.thumbExchangeInfo}>
              <View style={styles.thumbExchangeTicketRow}>
                <Image source={TICKET_ICON[option.tier!]} style={styles.thumbExchangeTicketIcon} contentFit="contain" />
                <ThemedText type="small" themeColor="textSecondary">
                  ×{option.ticketCost}
                </ThemedText>
              </View>
              <Pressable onPress={onExchange}>
                {({ pressed: exchangePressed }) => (
                  <ThemedView type="accent" style={[styles.thumbExchangeButton, exchangePressed && styles.pressed]}>
                    <ThemedText type="small" themeColor="background" numberOfLines={1}>
                      交換する
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            </View>
          ) : (
            <ThemedText type="small" themeColor={selected ? 'accent' : 'textSecondary'} numberOfLines={1}>
              {selected ? '装着中' : locked ? '未所持' : option.label}
            </ThemedText>
          )}
        </ThemedView>
      )}
    </Pressable>
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
  bottomContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  previewArea: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  previewImage: {
    width: '65%',
    aspectRatio: 1,
    marginBottom: Spacing.two,
  },
  namePlateWrap: {
    width: '89%',
    aspectRatio: NAME_PLATE_ASPECT_RATIO,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: Spacing.three }],
  },
  namePlateImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  nameTextWrap: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  tierLabelHidden: {
    opacity: 0,
  },
  filterArea: {
    flexGrow: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 9999,
  },
  filterScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 20,
  },
  filterPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: FILTER_PANEL_WIDTH,
    zIndex: 21,
  },
  filterPanelSafeArea: {
    flex: 1,
  },
  filterPanelCard: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  filterPanelTitle: {
    marginBottom: Spacing.one,
  },
  filterSectionHeading: {
    marginTop: Spacing.one,
  },
  filterRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  filterDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: Spacing.one,
  },
  pickerArea: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  pickerContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  thumbCard: {
    width: 108,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.four,
  },
  thumbImage: {
    width: 84,
    height: 84,
  },
  thumbImageLocked: {
    opacity: 0.4,
  },
  thumbExchangeInfo: {
    alignItems: 'center',
    gap: Spacing.half,
    alignSelf: 'stretch',
  },
  thumbExchangeTicketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  thumbExchangeTicketIcon: {
    width: 16,
    height: 16,
  },
  thumbExchangeButton: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
