import { Image } from 'expo-image';
import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ENTRY_POINT_OPTIONS } from '@/constants/meal-flow';
import { pickPerokokoLine } from '@/constants/perokoko-lines';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';
import { useHierarchicalBack } from '@/hooks/use-hierarchical-back';
import { CostumeId, getEquippedCostume, getMascotNeutralImage } from '@/lib/costumes';
import { DecidedMenu, listDecidedMenus } from '@/lib/decided-menus';

const BACKGROUND_DAY = require('@/assets/images/menu/decided-menus-bg.jpg');
const BACKGROUND_NIGHT = require('@/assets/images/menu/decided-menus-bg-night.jpg');
const SPEECH_BUBBLE_IMAGE = require('@/assets/images/meal-log/speech-bubble-cloud.png');
const SPEECH_BUBBLE_ASPECT_RATIO = 1398 / 1125;
const SHOPPING_MEMO_BUTTON_IMAGE = require('@/assets/images/menu/shopping-list-button.png');
const SHOPPING_MEMO_BUTTON_ASPECT_RATIO = 1200 / 186;
const PREV_BUTTON_IMAGE = require('@/assets/images/menu/decided-menus-prev-button.png');
const PREV_BUTTON_ASPECT_RATIO = 505 / 237;
const NEXT_BUTTON_IMAGE = require('@/assets/images/menu/decided-menus-next-button.png');
const NEXT_BUTTON_ASPECT_RATIO = 520 / 236;
const ITEM_FRAME_IMAGE = require('@/assets/images/menu/decided-menus-item-frame.png');
const PAGE_SIZE = 3;

const MAIN_DISH_MAX_LENGTH = 18;

function extractMainDish(proposalText: string): string {
  const name = proposalText.match(/・(?:主菜|メイン)：(.+)/)?.[1]?.trim() ?? '（献立）';
  return name.length > MAIN_DISH_MAX_LENGTH ? `${name.slice(0, MAIN_DISH_MAX_LENGTH)}…` : name;
}

function formatDecidedAt(decidedAt: string): string {
  const date = new Date(decidedAt);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function DecidedMenusScreen() {
  const [menus, setMenus] = useState<DecidedMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [mascotLine, setMascotLine] = useState('');
  const [isDay, setIsDay] = useState(true);
  const [equippedCostume, setEquippedCostume] = useState<CostumeId>('default');
  const goBack = useHierarchicalBack();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listDecidedMenus().then((loaded) => {
        if (!cancelled) {
          setMenus(loaded);
          setIsLoading(false);
          setPage(0);
        }
      });
      setMascotLine(pickPerokokoLine());
      setIsDay(isDaytime());
      getEquippedCostume().then(setEquippedCostume);
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const pageCount = Math.ceil(menus.length / PAGE_SIZE);
  const visibleMenus = menus.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const hasPrevPage = page > 0;
  const hasNextPage = page < pageCount - 1;

  return (
    <View style={styles.container}>
      <Image
        source={isDay ? BACKGROUND_DAY : BACKGROUND_NIGHT}
        style={styles.absoluteFill}
        contentFit="cover"
      />
      {isDay && <ThemedView type="background" style={[styles.absoluteFill, { opacity: 0.3 }]} />}
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={goBack} />

        <View style={styles.shoppingMemoRow}>
          <Pressable onPress={() => router.push('/shopping-memo' as Href)}>
            {({ pressed }) => (
              <Image
                source={SHOPPING_MEMO_BUTTON_IMAGE}
                style={[styles.shoppingMemoButton, pressed && styles.pressed]}
                contentFit="cover"
              />
            )}
          </Pressable>
        </View>

        {!isLoading && menus.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              決まった献立は48時間だけここに残るよ。「献立を考える」から決めてみてね。
            </ThemedText>
          </View>
        )}

        <View style={styles.listContent}>
          {visibleMenus.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(`/decided-menus/${item.id}` as Href)}>
              {({ pressed }) => (
                <View style={[styles.row, pressed && styles.pressed]}>
                  <Image source={ITEM_FRAME_IMAGE} style={styles.absoluteFill} contentFit="fill" />
                  <View style={styles.rowHeader}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {ENTRY_POINT_OPTIONS.find((option) => option.value === item.entryPoint)?.label}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDecidedAt(item.decidedAt)}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold">{extractMainDish(item.proposalText)}</ThemedText>
                </View>
              )}
            </Pressable>
          ))}

          {pageCount > 1 && (
            <View style={styles.pageRow}>
              <Pressable onPress={() => setPage((current) => current - 1)} disabled={!hasPrevPage}>
                {({ pressed }) => (
                  <Image
                    source={PREV_BUTTON_IMAGE}
                    style={[styles.pageButton, pressed && styles.pressed, !hasPrevPage && styles.pageButtonDisabled]}
                    contentFit="contain"
                  />
                )}
              </Pressable>
              <Pressable onPress={() => setPage((current) => current + 1)} disabled={!hasNextPage}>
                {({ pressed }) => (
                  <Image
                    source={NEXT_BUTTON_IMAGE}
                    style={[styles.pageButton, pressed && styles.pressed, !hasNextPage && styles.pageButtonDisabled]}
                    contentFit="contain"
                  />
                )}
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.footer} pointerEvents="none">
          <View style={styles.footerBubbleWrap}>
            <Image source={SPEECH_BUBBLE_IMAGE} style={styles.footerBubbleImage} contentFit="contain" />
            <View style={styles.footerBubbleTextArea}>
              <ThemedText style={styles.footerBubbleText}>{mascotLine}</ThemedText>
            </View>
          </View>
          <Image
            source={getMascotNeutralImage(equippedCostume, isDay, { allowBackground: true })}
            style={styles.footerMascotImage}
            contentFit="contain"
          />
        </View>
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
  shoppingMemoRow: {
    paddingHorizontal: Spacing.three,
  },
  shoppingMemoButton: {
    width: '100%',
    aspectRatio: SHOPPING_MEMO_BUTTON_ASPECT_RATIO,
    // The art is trimmed tight to its pill shape (transparent outside the rounded
    // ends); clipping to a stadium radius keeps the soft alpha edge crisp.
    borderRadius: 9999,
    overflow: 'hidden',
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
  pageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  pageButton: {
    width: 80,
    aspectRatio: PREV_BUTTON_ASPECT_RATIO,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  row: {
    padding: Spacing.three,
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  rowHeader: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 75,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerBubbleWrap: {
    width: 285,
    aspectRatio: SPEECH_BUBBLE_ASPECT_RATIO,
    marginLeft: -Spacing.three,
    marginRight: -Spacing.three,
    marginBottom: Spacing.four,
    zIndex: 1,
  },
  footerBubbleImage: {
    width: '100%',
    height: '100%',
  },
  footerBubbleTextArea: {
    position: 'absolute',
    left: '19%',
    top: '24%',
    width: '62%',
    height: '48%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBubbleText: {
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
  },
  footerMascotImage: {
    width: 175,
    aspectRatio: 1,
    marginLeft: -40,
    transform: [{ translateY: 40 }],
  },
});
