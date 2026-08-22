import AsyncStorage from '@react-native-async-storage/async-storage';

import { CostumeId, markCostumeOwned } from '@/lib/costumes';
import { announceGift } from '@/lib/gift-reveal-store';
import { getBirthday } from '@/lib/user-profile';

const KEY_LAST_GRANTED_YEAR = 'wico:birthday-gift-last-year';

// 受け取り猶予: 誕生日当日から7日後まで。先出しはしない（前倒しでは渡さない）— 特別感を保ちつつ、
// 当日にアプリを開き忘れても取りこぼさないための後方猶予。
const GRACE_DAYS_AFTER = 7;

/** 今年の誕生日衣装。[[COSTUMES]]の'birthday-cake-premium'。 */
const THIS_YEARS_BIRTHDAY_COSTUME: CostumeId | null = 'birthday-cake-premium';

function daysBetween(from: Date, to: Date): number {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / oneDayMs);
}

/**
 * 今日が「誕生日〜+7日」の窓の中にいれば、その窓を識別する年（起点の誕生日の年）を返す。
 * 12月生まれなど年をまたぐケースにも対応するため、今年と去年どちらを起点にした窓かも両方調べる。
 */
function giftCycleYear(month: number, day: number, today: Date): number | null {
  const thisYear = today.getFullYear();
  for (const birthdayYear of [thisYear, thisYear - 1]) {
    const birthday = new Date(birthdayYear, month - 1, day);
    const diff = daysBetween(birthday, today);
    if (diff >= 0 && diff <= GRACE_DAYS_AFTER) return birthdayYear;
  }
  return null;
}

/**
 * アプリ起動時に呼ぶ想定。誕生日が登録済みで、当日〜+7日以内に開いていて、その年のぶんをまだ
 * 受け取っていなければ衣装をプレゼントする。年1回だけ・[[first-cooking-gifts]]と同じ「一度切り」の作り。
 */
export async function grantBirthdayGiftIfEligible(): Promise<void> {
  if (!THIS_YEARS_BIRTHDAY_COSTUME) return;

  const birthday = await getBirthday();
  if (!birthday) return;

  const cycleYear = giftCycleYear(birthday.month, birthday.day, new Date());
  if (cycleYear === null) return;

  const lastGrantedYear = await AsyncStorage.getItem(KEY_LAST_GRANTED_YEAR);
  if (lastGrantedYear === String(cycleYear)) return;

  await markCostumeOwned(THIS_YEARS_BIRTHDAY_COSTUME);
  await AsyncStorage.setItem(KEY_LAST_GRANTED_YEAR, String(cycleYear));

  announceGift(THIS_YEARS_BIRTHDAY_COSTUME);
}
