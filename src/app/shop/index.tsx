import { Image } from 'expo-image';
import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NORMAL_TICKET_PACKS, PREMIUM_TICKET_PACKS, ShopPack, STAR_COOKIE_PACKS } from '@/constants/shop-items';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useHierarchicalBack } from '@/hooks/use-hierarchical-back';
import { addTickets, CostumeTier, getTicketBalance, TICKET_LABEL } from '@/lib/costumes';
import { addStarCookies, getStarCookieBalance } from '@/lib/star-cookies';

const TICKET_IMAGE: Record<string, number> = {
  'normal-ticket-1': require('@/assets/images/shop/ticket-normal.png'),
  'normal-ticket-10': require('@/assets/images/shop/ticket-normal-multi.png'),
  'premium-ticket-1': require('@/assets/images/shop/ticket-premium.png'),
  'premium-ticket-5': require('@/assets/images/shop/ticket-premium-multi.png'),
};

const STAR_COOKIE_IMAGE: Record<string, number> = {
  'star-cookie-1': require('@/assets/images/shop/star-cookie.png'),
  'star-cookie-10': require('@/assets/images/shop/star-cookie-10.png'),
  'star-cookie-30': require('@/assets/images/shop/star-cookie-30.png'),
};

const BACKGROUND = require('@/assets/images/shop/shop-bg.jpg');

function PackRow({ pack, icon, onBuy }: { pack: ShopPack; icon?: number; onBuy: (pack: ShopPack) => void }) {
  return (
    <ThemedView type="backgroundElement" style={styles.packRow}>
      {icon && <Image source={icon} style={styles.packIcon} contentFit="contain" />}
      <View style={styles.packInfo}>
        <ThemedText type="smallBold">{pack.label}</ThemedText>
        {pack.note && (
          <ThemedText type="small" themeColor="textSecondary">
            {pack.note}
          </ThemedText>
        )}
        <ThemedText type="smallBold">{pack.price}</ThemedText>
      </View>
      <Pressable onPress={() => onBuy(pack)}>
        {({ pressed }) => (
          <ThemedView type="accent" style={[styles.buyButton, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="background">
              購入
            </ThemedText>
          </ThemedView>
        )}
      </Pressable>
    </ThemedView>
  );
}

export default function ShopScreen() {
  const goBack = useHierarchicalBack();
  const [starCookieBalance, setStarCookieBalance] = useState(0);
  const [normalBalance, setNormalBalance] = useState(0);
  const [premiumBalance, setPremiumBalance] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getStarCookieBalance().then(setStarCookieBalance);
      getTicketBalance('normal').then(setNormalBalance);
      getTicketBalance('premium').then(setPremiumBalance);
    }, []),
  );

  async function handleStarCookieBuy(pack: ShopPack) {
    if (!pack.amount) {
      Alert.alert('準備中だよ', `${pack.label}の購入機能はもう少し待っててね。`);
      return;
    }
    // TODO(運営者): 実際の課金(IAP)がまだ繋がっていないため、購入ボタンを押すとテスト用に
    // その場で星クッキーを付与している。EAS dev clientでのIAP接続後に差し替える。
    const next = await addStarCookies(pack.amount);
    setStarCookieBalance(next);
    Alert.alert('交換できるよ', `${pack.label}を追加したよ（テスト付与・現在${next}個）。`);
  }

  async function handleTicketBuy(tier: CostumeTier, pack: ShopPack) {
    if (!pack.amount) {
      Alert.alert('準備中だよ', `${pack.label}の購入機能はもう少し待っててね。`);
      return;
    }
    // TODO(運営者): 実際の課金(IAP)がまだ繋がっていないため、購入ボタンを押すとテスト用に
    // その場でチケットを付与している。EAS dev clientでのIAP接続後に差し替える。
    const next = await addTickets(tier, pack.amount);
    if (tier === 'normal') setNormalBalance(next);
    else setPremiumBalance(next);
    Alert.alert('交換できるよ', `${pack.label}を${pack.amount}枚追加したよ（テスト付与・現在${next}枚）。`);
  }

  return (
    <View style={styles.container}>
      <Image source={BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={goBack} />

        <ScrollView style={styles.cardArea} contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <ThemedText type="smallBold" style={[styles.sectionHeading, styles.firstHeadingSpacing]}>
              会員プラン
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ごはん・ごちそうプランなら、WiCOでできることがもっと広がる！
            </ThemedText>
            <Pressable onPress={() => router.push('/shop/subscription' as Href)}>
              {({ pressed }) => (
                <ThemedView type="accent" style={[styles.subscriptionButton, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" themeColor="background">
                    プランを見る
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.headingRow}>
              <ThemedText type="smallBold" style={styles.sectionHeading}>
                星クッキー
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                （所持数{starCookieBalance}個）
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {'ペロココの大好物。\n一緒にお料理したい時に必要になるよ！'}
            </ThemedText>
            {STAR_COOKIE_PACKS.map((pack) => (
              <PackRow key={pack.id} pack={pack} icon={STAR_COOKIE_IMAGE[pack.id]} onBuy={handleStarCookieBuy} />
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.headingRow}>
              <ThemedText type="smallBold" style={styles.sectionHeading}>
                {TICKET_LABEL.normal}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                （所持数{normalBalance}枚）
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {'ペロココのお着替えチケット。\n今日は何を着ようかな？'}
            </ThemedText>
            {NORMAL_TICKET_PACKS.map((pack) => (
              <PackRow
                key={pack.id}
                pack={pack}
                icon={TICKET_IMAGE[pack.id]}
                onBuy={(p) => handleTicketBuy('normal', p)}
              />
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.headingRow}>
              <ThemedText type="smallBold" style={styles.sectionHeading}>
                {TICKET_LABEL.premium}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                （所持数{premiumBalance}枚）
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {'ペロココの特別なおめかしチケット。\nとっておきの一着を選ぼう！'}
            </ThemedText>
            {PREMIUM_TICKET_PACKS.map((pack) => (
              <PackRow
                key={pack.id}
                pack={pack}
                icon={TICKET_IMAGE[pack.id]}
                onBuy={(p) => handleTicketBuy('premium', p)}
              />
            ))}
          </View>
        </ScrollView>
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
  // 背景アート（assets/images/shop/shop-bg.jpg）に描き込まれた、棚の下の一枚カード部分の
  // 範囲だけにスクロール領域を収める。数値は背景アート上でのカード枠の実測比率。
  cardArea: {
    position: 'absolute',
    top: '34%',
    bottom: '12%',
    left: '7%',
    right: '6%',
  },
  content: {
    padding: Spacing.two,
    gap: Spacing.five,
  },
  firstHeadingSpacing: {
    marginTop: 20,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeading: {
    fontSize: 20,
    lineHeight: 26,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  subscriptionButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  packIcon: {
    width: 40,
    height: 40,
  },
  packInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  buyButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
