import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

import { CostumeId, findCostume, markCostumeOwned } from '@/lib/costumes';

const KEY_MENU_DECIDED = 'wico:gift-menu-decided';
const KEY_TRIO_PROGRESS = 'wico:gift-trio-progress';

type TrioActivity = 'meal-record' | 'recipe-post' | 'shopping-memo';

const TRIO_KEYS: Record<TrioActivity, string> = {
  'meal-record': 'wico:gift-trio-meal-record',
  'recipe-post': 'wico:gift-trio-recipe-post',
  'shopping-memo': 'wico:gift-trio-shopping-memo',
};

// 「思い出の記録・レシピ投稿・お買い物ノート入力」を初めて完了した順番で決まるプレゼント。
// どの活動を先にやってもいいので、活動の種類ではなく「何番目に完了したか」で対応させている。
const TRIO_ORDER_REWARDS: readonly CostumeId[] = [
  'first-cooking-whisk',
  'first-cooking-apron',
  'first-cooking-chef-premium',
];

async function grantCostumeGift(costumeId: CostumeId) {
  await markCostumeOwned(costumeId);
  const costume = findCostume(costumeId);
  Alert.alert(
    'プレゼントが届いたよ！',
    `「はじめての料理」シリーズの${costume?.label ?? 'とくべつな衣装'}をプレゼントするね。着替える画面で受け取れるよ。`,
  );
}

/** 献立を考えるを初めて完了したときに呼ぶ。2回目以降は呼んでも何も起きない。 */
export async function grantFirstMenuDecidedGift(): Promise<void> {
  const done = await AsyncStorage.getItem(KEY_MENU_DECIDED);
  if (done) return;
  await AsyncStorage.setItem(KEY_MENU_DECIDED, '1');
  await grantCostumeGift('first-cooking-plate-premium');
}

/**
 * 思い出の記録・レシピ投稿・お買い物ノート入力を初めて完了したときに呼ぶ。同じ活動を
 * 2回目以降呼んでも何も起きない。3つ全部を初めて完了し終えると打ち止めになる。
 */
export async function grantFirstCookingTrioGift(activity: TrioActivity): Promise<void> {
  const key = TRIO_KEYS[activity];
  const done = await AsyncStorage.getItem(key);
  if (done) return;
  await AsyncStorage.setItem(key, '1');

  const raw = await AsyncStorage.getItem(KEY_TRIO_PROGRESS);
  const progress = raw ? Number(raw) : 0;
  const next = progress + 1;
  await AsyncStorage.setItem(KEY_TRIO_PROGRESS, String(next));

  const reward = TRIO_ORDER_REWARDS[next - 1];
  if (!reward) return;
  await grantCostumeGift(reward);
}
