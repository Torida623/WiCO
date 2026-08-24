import AsyncStorage from '@react-native-async-storage/async-storage';

const USERNAME_KEY = 'wico:username';
const BIRTHDAY_KEY = 'wico:birthday'; // "MM-DD" — 年は聞かない（プライバシー配慮・誕生日プレゼント判定には月日で十分）
const ONBOARDED_KEY = 'wico:onboarded';
const BGM_VOLUME_KEY = 'wico:bgm-volume';

const DEFAULT_BGM_VOLUME = 0.3;

export type Birthday = { month: number; day: number };

/** レシピ研究所の投稿者表示とお問い合わせメールの署名に使う、端末共通のユーザー名。 */
export async function getUsername(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(USERNAME_KEY);
  return raw?.trim() || null;
}

export async function setUsername(name: string): Promise<void> {
  await AsyncStorage.setItem(USERNAME_KEY, name.trim());
}

export async function getBirthday(): Promise<Birthday | null> {
  const raw = await AsyncStorage.getItem(BIRTHDAY_KEY);
  if (!raw) return null;
  const [month, day] = raw.split('-').map(Number);
  return Number.isInteger(month) && Number.isInteger(day) ? { month, day } : null;
}

export async function setBirthday(birthday: Birthday): Promise<void> {
  const month = String(birthday.month).padStart(2, '0');
  const day = String(birthday.day).padStart(2, '0');
  await AsyncStorage.setItem(BIRTHDAY_KEY, `${month}-${day}`);
}

/** 起動時オンボーディング（お名前・誕生日入力）を済ませたかどうか。 */
export async function hasOnboarded(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1';
}

export async function markOnboarded(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDED_KEY, '1');
}

/** 各画面のBGM音量（@/app/_layout.tsxの*_VOLUME定数）に掛け合わせる、0〜1の倍率。 */
export async function getBgmVolume(): Promise<number> {
  const raw = await AsyncStorage.getItem(BGM_VOLUME_KEY);
  const value = raw ? Number(raw) : DEFAULT_BGM_VOLUME;
  return Number.isFinite(value) ? value : DEFAULT_BGM_VOLUME;
}

export async function setBgmVolume(volume: number): Promise<void> {
  await AsyncStorage.setItem(BGM_VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
}

/** お名前・誕生日・オンボーディング済みフラグを消して、次回ドアをタップした時にオンボーディングを
 * やり直せるようにする。動作確認用。BGM音量はユーザーの好みなので消さない。 */
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.multiRemove([USERNAME_KEY, BIRTHDAY_KEY, ONBOARDED_KEY]);
}
