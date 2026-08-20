import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
  getEquippedCostume,
  getMascotNeutralImage,
  setEquippedCostume,
} from '@/lib/costumes';

const BACKGROUND_DAY = require('@/assets/images/perokoko-room/room-bg-day.jpg');
const BACKGROUND_NIGHT = require('@/assets/images/perokoko-room/room-bg-night.jpg');

const TIER_LABEL: Record<CostumeTier, string> = {
  normal: 'ノーマル',
  premium: 'プレミアム',
};

type CostumeOption = { id: CostumeId; label: string; tierLabel: string | null; thumbImage: number };

export default function CostumeScreen() {
  const [isDay, setIsDay] = useState(true);
  const [equipped, setEquipped] = useState<CostumeId>('default');

  useFocusEffect(
    useCallback(() => {
      setIsDay(isDaytime());
      getEquippedCostume().then(setEquipped);
    }, []),
  );

  async function handleEquip(id: CostumeId) {
    setEquipped(id);
    await setEquippedCostume(id);
  }

  const options: CostumeOption[] = [
    { id: 'default', label: 'デフォルト', tierLabel: null, thumbImage: getMascotNeutralImage('default', isDay) },
    ...COSTUMES.map((costume) => ({
      id: costume.id,
      label: costume.label,
      tierLabel: TIER_LABEL[costume.tier],
      thumbImage: costume.image,
    })),
  ];
  const selectedOption = options.find((option) => option.id === equipped) ?? options[0];

  return (
    <View style={styles.container}>
      <Image source={isDay ? BACKGROUND_DAY : BACKGROUND_NIGHT} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="着替える" onBack={() => router.back()} />

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
                onPress={() => handleEquip(option.id)}
              />
            ))}
          </ScrollView>
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
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <ThemedView
          type={selected ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.thumbCard, pressed && styles.pressed]}>
          <Image source={option.thumbImage} style={styles.thumbImage} contentFit="contain" />
          <ThemedText type="small" themeColor={selected ? 'accent' : 'textSecondary'} numberOfLines={1}>
            {selected ? '装着中' : option.label}
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
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  previewImage: {
    width: '75%',
    aspectRatio: 1,
    marginBottom: Spacing.two,
  },
  pickerArea: {
    flex: 1,
    justifyContent: 'center',
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
  pressed: {
    opacity: 0.7,
  },
});
