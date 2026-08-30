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
    comment: '今日は特別な日だね！\n大切なきみのために\n一生懸命つくったよ!',
  },
  {
    id: 'tshirt-white',
    label: '並盛りほわいと',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-white.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: 'ぐぅぅぅ～\nおなか空いちゃったなあ\nたくさんごはん食べたいかも',
  },
  {
    id: 'tshirt-black',
    label: '焦がしぶらっく',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-black.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: 'くろってなんだか\nかっこいい気がするんだ\nちょっぴりおとなの気分！',
  },
  {
    id: 'tshirt-red',
    label: '完熟れっど',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-red.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '真っ赤な元気カラー！\nトマトさんみたいでしょ？',
  },
  {
    id: 'tshirt-blue',
    label: 'はらぺこぶるー',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-blue.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '青はごはんがいらなくなる\n色だって言うけど関係ない\nごはんはいつだっておいしい！',
  },
  {
    id: 'tshirt-yellow',
    label: 'とろけるいえろー',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-yellow.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '特別な日の朝ごはんは\nトーストにチーズと目玉焼き！\n元気いっぱいの魔法のごはん',
  },
  {
    id: 'tshirt-green',
    label: '採れたてぐりーん',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-green.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: 'お日様浴びたお野菜\n食べたくなってきちゃった\nドレッシングは何がいいかな？',
  },
  {
    id: 'tshirt-pink',
    label: 'ときめきぴんく',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-pink.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '初恋っておいしいのかな？\n甘酸っぱいってことは\nいちごと一緒ってこと？',
  },
  {
    id: 'tshirt-skyblue',
    label: 'ひんやりそーだ',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-skyblue.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '水色じゃないよ。ソーダ色\nだってその方がおいしそう\nかき氷食べたくなってきた',
  },
  {
    id: 'tshirt-orange',
    label: 'ごきげんおれんじ',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-orange.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: 'オレンジと言えば\nやっぱり太陽の元気カラー！\n今日もいい日になりそう！',
  },
  {
    id: 'tshirt-purple',
    label: 'いたずらぱーぷる',
    tier: 'normal',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-purple.png'),
    hasOwnBackground: false,
    ticketCost: 1,
    comment: '今日のごはんはなんだろう？\nちょっとくらいつまみ食い\nしてもいいよね？',
  },
  {
    id: 'tshirt-meat-premium',
    label: 'お肉まっしぐら',
    tier: 'premium',
    series: 'daily',
    image: require('@/assets/images/mascot/costume-tshirt-meat-premium.png'),
    hasOwnBackground: true,
    ticketCost: 1,
    comment: 'じゅるり……。\nこのにおい……お肉っっ！！',
  },
  {
    id: 'dark-fantasy-princess',
    label: '私だけの歌姫',
    tier: 'normal',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-princess.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: '劇場に響き渡る歌姫の声\n私のこと忘れないで\nお昼ごはんは特盛りがいいの',
  },
  {
    id: 'dark-fantasy-mask',
    label: 'わがままプリマドンナ',
    tier: 'normal',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-mask.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: 'ずっとケーキを見つめているわ\nマスクで顔を隠したら\nバレないとでも思ってる？',
  },
  {
    id: 'dark-fantasy-phantom-premium',
    label: 'オペラ座の亡霊',
    tier: 'premium',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-phantom-premium.png'),
    hasOwnBackground: true,
    ticketCost: 1,
    comment: '私の思いは消えないさ\nこのシャンデリアとともに\n本当はみんなと\nごはんを食べたい',
  },
  {
    id: 'dark-fantasy-doll-boy',
    label: 'ファンタジー（おにんぎょう・ボーイ）',
    tier: 'normal',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-doll-boy.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: 'おにんぎょうさんになっちゃった\nカタカタ動くのも\nちょっと楽しいかも？',
  },
  {
    id: 'dark-fantasy-doll-girl',
    label: 'ファンタジー（おにんぎょう・ガール）',
    tier: 'normal',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-doll-girl.png'),
    hasOwnBackground: false,
    ticketCost: 2,
    comment: 'リボンをつけて\nおすまし人形さんに変身\nでもお腹はぺこぺこだよ',
  },
  {
    id: 'dark-fantasy-puppeteer-premium',
    label: 'ファンタジー（あやつり人形師）',
    tier: 'premium',
    series: 'dark-fantasy',
    image: require('@/assets/images/mascot/costume-dark-fantasy-puppeteer-premium.png'),
    hasOwnBackground: true,
    ticketCost: 1,
    comment: '糸を引いてあやつるよ\nみんなの心を動かすのは\nおいしいごはんの魔法かもね',
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
