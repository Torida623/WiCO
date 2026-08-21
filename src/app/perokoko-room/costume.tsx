import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';
import {
  COSTUMES,
  CostumeId,
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

const TIER_LABEL: Record<CostumeTier, string> = {
  normal: 'ノーマル',
  premium: 'プレミアム',
};

type FilterId = 'all' | 'normal' | 'premium' | 'owned' | 'unowned';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'normal', label: 'ノーマル' },
  { id: 'premium', label: 'プレミアム' },
  { id: 'owned', label: '交換済み' },
  { id: 'unowned', label: '未所持' },
];

type CostumeOption = {
  id: CostumeId;
  label: string;
  tierLabel: string | null;
  thumbImage: number;
  tier: CostumeTier | null;
  owned: boolean;
  ticketCost: number | null;
};

export default function CostumeScreen() {
  const [isDay, setIsDay] = useState(true);
  const [equipped, setEquipped] = useState<CostumeId>('default');
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterId>('all');

  useFocusEffect(
    useCallback(() => {
      setIsDay(isDaytime());
      getEquippedCostume().then(setEquipped);
      getOwnedCostumeIds().then(setOwnedIds);
    }, []),
  );

  async function handleEquip(id: CostumeId) {
    setEquipped(id);
    await setEquippedCostume(id);
  }

  function handlePressCostume(option: CostumeOption) {
    if (option.owned || !option.tier) {
      handleEquip(option.id);
      return;
    }
    if (option.ticketCost === null) {
      Alert.alert(
        'プレゼント限定の衣装だよ',
        `${option.label}はチケット交換じゃなくて、アプリを進めるともらえるプレゼント衣装だよ。`,
      );
      return;
    }
    const ticketLabel = TICKET_LABEL[option.tier];
    Alert.alert(`${ticketLabel}と交換する？`, `${option.label}を${ticketLabel}${option.ticketCost}枚と交換して装備するよ。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '交換する',
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
      owned: true,
      ticketCost: 0,
    },
    ...COSTUMES.map((costume) => ({
      id: costume.id,
      label: costume.label,
      tierLabel: TIER_LABEL[costume.tier],
      thumbImage: costume.image,
      tier: costume.tier,
      owned: ownedIds.has(costume.id),
      ticketCost: costume.ticketCost,
    })),
  ];
  // デフォルトはどのフィルターでも常に選べるようにしておく（衣装扱いではないので）。
  const options = allOptions.filter((option) => {
    if (option.id === 'default') return true;
    switch (filter) {
      case 'normal':
        return option.tier === 'normal';
      case 'premium':
        return option.tier === 'premium';
      case 'owned':
        return option.owned;
      case 'unowned':
        return !option.owned;
      default:
        return true;
    }
  });
  const selectedOption = allOptions.find((option) => option.id === equipped) ?? allOptions[0];

  return (
    <View style={styles.container}>
      <Image source={isDay ? BACKGROUND_DAY : BACKGROUND_NIGHT} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => router.back()} />

        <View style={styles.bottomContent}>
          <View style={styles.previewArea}>
            <Image
              source={getMascotNeutralImage(equipped, isDay, { allowBackground: true })}
              style={styles.previewImage}
              contentFit="contain"
            />
            <ThemedText type="smallBold">{selectedOption.label}</ThemedText>
            {selectedOption.tierLabel && (
              <ThemedText type="small" themeColor="accent">
                {selectedOption.tierLabel}
              </ThemedText>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
            style={styles.filterArea}>
            {FILTERS.map((f) => (
              <Pressable key={f.id} onPress={() => setFilter(f.id)}>
                {({ pressed }) => (
                  <ThemedView
                    type={filter === f.id ? 'accent' : 'backgroundElement'}
                    style={[styles.filterChip, pressed && styles.pressed]}>
                    <ThemedText type="small" themeColor={filter === f.id ? 'background' : 'textSecondary'}>
                      {f.label}
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            ))}
          </ScrollView>

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
                  onPress={() => handlePressCostume(option)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

type CostumeThumbProps = {
  option: CostumeOption;
  selected: boolean;
  onPress: () => void;
};

function CostumeThumb({ option, selected, onPress }: CostumeThumbProps) {
  const locked = !option.owned;
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <ThemedView
          type={selected ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.thumbCard, pressed && styles.pressed]}>
          <Image
            source={option.thumbImage}
            style={[styles.thumbImage, locked && styles.thumbImageLocked]}
            contentFit="contain"
          />
          <ThemedText type="small" themeColor={selected ? 'accent' : 'textSecondary'} numberOfLines={1}>
            {selected ? '装着中' : locked ? (option.ticketCost === null ? 'プレゼント限定' : '未所持') : option.label}
          </ThemedText>
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
    width: '75%',
    aspectRatio: 1,
    marginBottom: Spacing.two,
  },
  filterArea: {
    flexGrow: 0,
  },
  filterContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 9999,
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
    alignItems: 'center',
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
  pressed: {
    opacity: 0.7,
  },
});
