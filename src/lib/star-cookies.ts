import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wico:star-cookies';

export async function getStarCookieBalance(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? Number(raw) : 0;
}

/**
 * ショップでの「星クッキー」購入成功時に呼ぶ想定。IAPがまだ繋がっていない間は
 * ショップ画面がここを直接呼んでテスト用に付与している — see [[STAR_COOKIE_PACKS]].
 */
export async function addStarCookies(amount: number): Promise<number> {
  const next = (await getStarCookieBalance()) + amount;
  await AsyncStorage.setItem(STORAGE_KEY, String(next));
  return next;
}
