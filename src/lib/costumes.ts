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

export type CostumeSeries = 'cooking' | 'daily' | 'animal' | 'dark-fantasy';

export type CostumeDef = {
  id: string;
  label: string;
  tier: CostumeTier;
  series: CostumeSeries;
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
  /**
   * 衣装画面の木の看板に表示する一言コメント。空文字なら看板は無地のまま表示される。
   * 中身のセリフは未着手 — [[getMascotNeutralImage]] 側の絵と違ってテキストは今のところ全部プレースホルダー。
   */
  comment: string;
};

export const COSTUMES = [
  {
    id: 'first-cooking-apron',
    label: 'はじめてのエプロン',
    tier: 'normal',
    series: 'cooking',
    image: require('@/assets/images/mascot/costume-first-cooking-apron.png'),
    hasOwnBackground: false,
    ticketCost: null,
    comment: 'はじめてのお手伝いって\nなんだったかな～？\nエプロンってドキドキするね',
  },
  {
    id: 'first-cooking-whisk',
    label: 'はじめてのお手伝い',
    tier: 'normal',
    series: 'cooking',
    image: require('@/assets/images/mascot/costume-first-cooking-whisk.png'),
    hasOwnBackground: false,
    ticketCost: null,
    comment: 'ぐるぐるぐるぐる\nとろとろたまごおいしくな～れ',
  },
  {
    id: 'first-cooking-chef-premium',
    label: 'はじめての料理長',
    tier: 'premium',
    series: 'cooking',
    image: require('@/assets/images/mascot/costume-first-cooking-premium.png'),
    hasOwnBackground: true,
    ticketCost: null,
    comment: 'いらっしゃいま…\nってうわわ！！\nちょっと大きすぎるかも…',
  },
  {
    id: 'first-cooking-plate-premium',
    label: 'いただきます！！',
    tier: 'premium',
    series: 'cooking',
    image: require('@/assets/images/mascot/costume-first-cooking-plate-premium.png'),
    hasOwnBackground: true,
    ticketCost: null,
    comment: '見て見て！\nたこさんにハンバーグ！\nプリンもあるよ！',
  },
  {
    id: 'sleepy-pajama-blue',
    label: 'うとうとGood Night',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-sleepy-pajama-blue.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: 'いっぱい寝たら\nもっともっと大きくなれる？',
  },
  {
    id: 'sleepy-pajama-yellow',
    label: 'よふかしLady Fight!',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-sleepy-pajama-yellow.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: '枕は持った？\n夜はこれからだよ！\nせーの！！',
  },
  {
    id: 'sleepy-sheep-premium',
    label: 'ゆめみるMidnight',
    tier: 'premium',
    series: 'animal',
    image: require('@/assets/images/mascot/costume-sleepy-sheep-premium.png'),
    hasOwnBackground: true,
    ticketCost: 1,
    comment: 'ひつじが一匹…ひつじが二匹…\nあれれ～？\nわたがしに変身しちゃった！',
  },
  {
    id: 'dino-triceratops',
    label: 'おっきくても怖くない',
    tier: 'normal',
    series: 'animal',
    image: require('@/assets/images/mascot/costume-animal-dino-green.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: 'のんびりまったり\nおいしいものを食べられるなら\nそれでいいよね',
  },
  {
    id: 'dino-tyrannosaurus',
    label: '最強のつもり',
    tier: 'normal',
    series: 'animal',
    image: require('@/assets/images/mascot/costume-animal-dino-orange.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: 'がおーっ！！\nおいしそうなお肉にケーキ\n全部食べちゃうぞー！',
  },
  {
    id: 'dino-friends-premium',
    label: '発見！小さな探検隊！',
    tier: 'premium',
    series: 'animal',
    image: require('@/assets/images/mascot/costume-animal-dino-premium.png'),
    hasOwnBackground: true,
    ticketCost: 1,
    comment: 'わあ！仲良くしてくれるの？\nお友達とわけっこする\n星クッキーはおいしいね',
  },
  {
    id: 'outing-strawhat',
    label: 'ちょっとそこまで',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-outing-strawhat.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: 'あったかい日は\nいっぱいお花が咲くんだよ\nかんむりにしよ～',
  },
  {
    id: 'outing-hoodie',
    label: 'タウンウォーカー',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-outing-hoodie.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: 'お気に入りの歌を聴けば\n街に行く電車なんて\nあーっという間！',
  },
  {
    id: 'outing-rainy-premium',
    label: 'あまつぶ、きらり',
    tier: 'premium',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-outing-rainy-premium.png'),
    hasOwnBackground: true,
    ticketCost: 1,
    comment: 'ぽつぽつ雨粒\n青や緑や紫や\nいろんな色の宝石みたい',
  },
  {
    id: 'birthday-cake-premium',
    label: 'Happy!Happy!Birthday!!',
    tier: 'premium',
    series: 'cooking',
    image: require('@/assets/images/mascot/costume-birthday-cake-premium.png'),
    hasOwnBackground: true,
    ticketCost: null,
    comment: '',
  },
  {
    id: 'tshirt-white',
    label: 'きがるTシャツ（ホワイト）',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-white.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'tshirt-black',
    label: 'きがるTシャツ（ブラック）',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-black.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'tshirt-red',
    label: 'きがるTシャツ（レッド）',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-red.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'tshirt-blue',
    label: 'きがるTシャツ（ブルー）',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-blue.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'tshirt-yellow',
    label: 'きがるTシャツ（イエロー）',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-yellow.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'tshirt-green',
    label: 'きがるTシャツ（グリーン）',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-green.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'tshirt-pink',
    label: 'きがるTシャツ（ピンク）',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-pink.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'tshirt-skyblue',
    label: 'きがるTシャツ（サックス）',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-skyblue.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'tshirt-orange',
    label: 'きがるTシャツ（オレンジ）',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-orange.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'tshirt-purple',
    label: 'きがるTシャツ（パープル）',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-purple.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'tshirt-meat-premium',
    label: 'きがるTシャツ（I♥肉）',
    tier: 'premium',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-meat-premium.png'),
    hasOwnBackground: true,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'dark-fantasy-princess',
    label: 'ダークファンタジー（プリンセスドレス）',
    tier: 'normal',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-princess.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: '',
  },
  {
    id: 'dark-fantasy-mask',
    label: 'ダークファンタジー（マスカレードドレス）',
    tier: 'normal',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-mask.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: '',
  },
  {
    id: 'dark-fantasy-phantom-premium',
    label: 'ダークファンタジー（オペラ座の怪人）',
    tier: 'premium',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-phantom-premium.png'),
    hasOwnBackground: true,
    ticketCost: 1,
    comment: '',
  },
  {
    id: 'dark-fantasy-doll-boy',
    label: 'ダークファンタジー（おにんぎょう・ボーイ）',
    tier: 'normal',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-doll-boy.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: '',
  },
  {
    id: 'dark-fantasy-doll-girl',
    label: 'ダークファンタジー（おにんぎょう・ガール）',
    tier: 'normal',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-doll-girl.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: '',
  },
  {
    id: 'dark-fantasy-puppeteer-premium',
    label: 'ダークファンタジー（あやつり人形師）',
    tier: 'premium',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-puppeteer-premium.png'),
    hasOwnBackground: true,
    ticketCost: 1,
    comment: '',
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
