import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { COSTUME_TICKET_PACKS, ShopPack, STAR_COOKIE_PACKS } from '@/constants/shop-items';
import { MaxContentWidth, Spacing } from '@/constants/theme';

function handleBuy(pack: ShopPack) {
  Alert.alert('準備中だよ', `${pack.label}の購入機能はもう少し待っててね。`);
}

function PackRow({ pack }: { pack: ShopPack }) {
  return (
    <ThemedView type="backgroundElement" style={styles.packRow}>
      <View style={styles.packInfo}>
        <ThemedText type="smallBold">{pack.label}</ThemedText>
        {pack.note && (
          <ThemedText type="small" themeColor="textSecondary">
            {pack.note}
          </ThemedText>
        )}
      </View>
      <ThemedText type="smallBold">{pack.price}</ThemedText>
      <Pressable onPress={() => handleBuy(pack)}>
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
  return (
    <View style={styles.container}>
      <ThemedView type="background" style={styles.absoluteFill} />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="ショップ" onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionHeading}>
              星クッキー
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ペロココとの音声会話で使えるチケットだよ。
            </ThemedText>
            {STAR_COOKIE_PACKS.map((pack) => (
              <PackRow key={pack.id} pack={pack} />
            ))}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionHeading}>
              お着替え券
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ペロココの衣装と交換できるチケットだよ。
            </ThemedText>
            {COSTUME_TICKET_PACKS.map((pack) => (
              <PackRow key={pack.id} pack={pack} />
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
  content: {
    padding: Spacing.three,
    gap: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeading: {
    fontSize: 20,
    lineHeight: 26,
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
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
