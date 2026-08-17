import { router } from 'expo-router';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/constants/subscription-plans';
import { MaxContentWidth, Spacing } from '@/constants/theme';

// OSの購読管理画面を直接開くURL。iOS/Androidどちらも、解約処理自体はアプリ側では行えず
// ストア側の画面で行う仕様のため、アプリは「そこへ誘導する」以上のことをしない。
const SUBSCRIPTION_MANAGEMENT_URL = Platform.select({
  ios: 'itms-apps://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
  default: 'https://apps.apple.com/account/subscriptions',
});

// TODO: RevenueCat導入後、実際の契約状態から取得するように差し替える。
const CURRENT_PLAN_ID: SubscriptionPlan['id'] = 'free';

function handleSelectPlan(plan: SubscriptionPlan) {
  Alert.alert('準備中だよ', `${plan.label}プランへの変更機能はもう少し待っててね。`);
}

function handleOpenSubscriptionManagement() {
  Linking.openURL(SUBSCRIPTION_MANAGEMENT_URL).catch(() => {
    Alert.alert('開けなかったよ', '端末の設定アプリからサブスクリプション管理を開いてみてね。');
  });
}

function PlanCard({ plan }: { plan: SubscriptionPlan }) {
  const isCurrent = plan.id === CURRENT_PLAN_ID;

  return (
    <ThemedView type={isCurrent ? 'backgroundSelected' : 'backgroundElement'} style={styles.planCard}>
      <View style={styles.planHeader}>
        <ThemedText type="smallBold" style={styles.planLabel}>
          {plan.label}
        </ThemedText>
        {isCurrent && (
          <ThemedText type="small" themeColor="accent">
            現在のプラン
          </ThemedText>
        )}
      </View>
      <ThemedText type="smallBold">{plan.price}</ThemedText>
      <View style={styles.featureList}>
        {plan.features.map((feature) => (
          <ThemedText key={feature} type="small" themeColor="textSecondary">
            ・{feature}
          </ThemedText>
        ))}
      </View>
      {!isCurrent && (
        <Pressable onPress={() => handleSelectPlan(plan)}>
          {({ pressed }) => (
            <ThemedView type="accent" style={[styles.selectButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="background">
                このプランにする
              </ThemedText>
            </ThemedView>
          )}
        </Pressable>
      )}
    </ThemedView>
  );
}

export default function SubscriptionShopScreen() {
  const isSubscribed = CURRENT_PLAN_ID !== 'free';

  return (
    <View style={styles.container}>
      <ThemedView type="background" style={styles.absoluteFill} />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="会員プラン" onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content}>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}

          {isSubscribed && (
            <Pressable onPress={handleOpenSubscriptionManagement}>
              {({ pressed }) => (
                <ThemedView type="background" style={[styles.cancelButton, pressed && styles.pressed]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    解約・購読の管理はこちら（端末の設定を開きます）
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          )}
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
    gap: Spacing.three,
  },
  planCard: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planLabel: {
    fontSize: 18,
  },
  featureList: {
    gap: Spacing.half,
  },
  selectButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
