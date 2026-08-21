import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wico:equipped-costume';
const OWNED_STORAGE_KEY = 'wico:owned-costumes';

const TICKET_STORAGE_KEY: Record<CostumeTier, string> = {
  normal: 'wico:tickets-normal',
  premium: 'wico:tickets-premium',
};

export const TICKET_LABEL: Record<CostumeTier, string> = {
  normal: 'おきがえ券',
  premium: 'とっておき券',
};

const DEFAULT_NEUTRAL_DAY = require('@/assets/images/mascot/perokoko-neutral.png');
const DEFAULT_NEUTRAL_NIGHT = require('@/assets/images/mascot/perokoko-neutral-night.png');

export type CostumeId = 'default' | (typeof COSTUMES)[number]['id'];

export type CostumeTier = 'normal' | 'premium';

export type CostumeDef = {
  id: string;
  label: string;
  tier: CostumeTier;
  image: number;
  /**
   * True when the art bakes in its own scene (not just a transparent character cutout) — e.g.
   * the premium 初回プレゼント skin, drawn as a full kitchen vignette. Those only look right in
   * large display slots (ペロココの部屋 / 献立ノート's footer mascot); small ones (the chat
   * avatar icon) should fall back to the default look rather than cramming a whole scene into
   * a 36px icon — see [[getMascotNeutralImage]].
   */
  hasOwnBackground: boolean;
  /**
   * 交換に必要なチケット枚数（tierに応じておきがえ券／とっておき券）。プレミアムは常に1枚。
   * ノーマルは今作ってある分は2枚 — 今後もっとシンプルな衣装を追加したときにそちらを1枚にして差をつける想定。
   * null は「チケット交換不可・プレゼント限定」— 「はじめての料理」シリーズがこれで、
   * [[first-cooking-gifts]] の初回達成プレゼントでしか手に入らない。
   */
  ticketCost: number | null;
};

export const COSTUMES = [
  {
    id: 'first-cooking-apron',
    label: 'はじめての料理（エプロン）',
    tier: 'normal',
    image: require('@/assets/images/mascot/costume-first-cooking-apron.png'),
    hasOwnBackground: false,
    ticketCost: null,
  },
  {
    id: 'first-cooking-whisk',
    label: 'はじめての料理（あわ立て器）',
    tier: 'normal',
    image: require('@/assets/images/mascot/costume-first-cooking-whisk.png'),
    hasOwnBackground: false,
    ticketCost: null,
  },
  {
    id: 'first-cooking-chef-premium',
    label: 'はじめての料理（シェフコート）',
    tier: 'premium',
    image: require('@/assets/images/mascot/costume-first-cooking-premium.png'),
    hasOwnBackground: true,
    ticketCost: null,
  },
  {
    id: 'first-cooking-plate-premium',
    label: 'はじめての料理（お子様プレート）',
    tier: 'premium',
    image: require('@/assets/images/mascot/costume-first-cooking-plate-premium.png'),
    hasOwnBackground: true,
    ticketCost: null,
  },
  {
    id: 'sleepy-pajama-blue',
    label: 'おやすみ（パジャマ・ブルー）',
    tier: 'normal',
    image: require('@/assets/images/mascot/costume-sleepy-pajama-blue.png'),
    hasOwnBackground: false,
    ticketCost: 2,
  },
  {
    id: 'sleepy-pajama-yellow',
    label: 'おやすみ（パジャマ・イエロー）',
    tier: 'normal',
    image: require('@/assets/images/mascot/costume-sleepy-pajama-yellow.png'),
    hasOwnBackground: false,
    ticketCost: 2,
  },
  {
    id: 'sleepy-sheep-premium',
    label: 'おやすみ（ひつじさん）',
    tier: 'premium',
    image: require('@/assets/images/mascot/costume-sleepy-sheep-premium.png'),
    hasOwnBackground: true,
    ticketCost: 1,
  },
] as const satisfies readonly CostumeDef[];

export function findCostume(id: CostumeId): CostumeDef | undefined {
  return COSTUMES.find((costume) => costume.id === id);
}

export async function getEquippedCostume(): Promise<CostumeId> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return 'default';
  return findCostume(raw as CostumeId) ? (raw as CostumeId) : 'default';
}

export async function setEquippedCostume(id: CostumeId): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, id);
}

/**
 * ノーマルは「おきがえ券」、プレミアムは「とっておき券」でショップから交換して所持リストに
 * 入るまで未所持 — 交換フローは [[exchangeCostumeForTicket]] が担う。
 */
export async function getOwnedCostumeIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(OWNED_STORAGE_KEY);
  return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
}

export async function markCostumeOwned(id: string): Promise<void> {
  const owned = await getOwnedCostumeIds();
  owned.add(id);
  await AsyncStorage.setItem(OWNED_STORAGE_KEY, JSON.stringify(Array.from(owned)));
}

export async function getTicketBalance(tier: CostumeTier): Promise<number> {
  const raw = await AsyncStorage.getItem(TICKET_STORAGE_KEY[tier]);
  return raw ? Number(raw) : 0;
}

/**
 * ショップでの「おきがえ券／とっておき券」購入成功時に呼ぶ想定。IAPがまだ繋がっていない間は
 * ショップ画面がここを直接呼んでテスト用に付与している — see [[NORMAL_TICKET_PACKS]] / [[PREMIUM_TICKET_PACKS]].
 */
export async function addTickets(tier: CostumeTier, amount: number): Promise<number> {
  const next = (await getTicketBalance(tier)) + amount;
  await AsyncStorage.setItem(TICKET_STORAGE_KEY[tier], String(next));
  return next;
}

/**
 * 衣装のtierに応じたチケットを、その衣装の ticketCost 枚だけ消費して所持リストに追加する。
 * 残数不足なら何もせず false を返す。
 */
export async function exchangeCostumeForTicket(id: CostumeId): Promise<boolean> {
  const costume = findCostume(id);
  if (!costume || costume.ticketCost === null) return false;
  const balance = await getTicketBalance(costume.tier);
  if (balance < costume.ticketCost) return false;
  await AsyncStorage.setItem(TICKET_STORAGE_KEY[costume.tier], String(balance - costume.ticketCost));
  await markCostumeOwned(id);
  return true;
}

/**
 * Resolves which "neutral pose" mascot image to show for the given equipped costume. Pass
 * `allowBackground: false` for small/icon-sized display slots so a `hasOwnBackground` costume
 * falls back to the plain default look instead of squeezing a whole scene into a tiny icon.
 */
export function getMascotNeutralImage(
  costumeId: CostumeId,
  isDay: boolean,
  options?: { allowBackground?: boolean },
): number {
  const defaultImage = isDay ? DEFAULT_NEUTRAL_DAY : DEFAULT_NEUTRAL_NIGHT;
  if (costumeId === 'default') return defaultImage;

  const costume = findCostume(costumeId);
  if (!costume) return defaultImage;
  if (costume.hasOwnBackground && options?.allowBackground === false) return defaultImage;
  return costume.image;
}
