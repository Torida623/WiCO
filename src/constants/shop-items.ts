export type ShopPack = {
  id: string;
  label: string;
  price: string;
  note?: string;
  /** 交換で付与されるお着替え券の枚数。定義済みのパックのみ実際に付与される（IAP未接続の間のテスト用）。 */
  amount?: number;
};

/** 星クッキー = 音声案内チケットのマスコット向け呼び名。パック数・価格は暫定（要ローンチ後見直し）。 */
export const STAR_COOKIE_PACKS: ShopPack[] = [
  { id: 'star-cookie-1', label: '星クッキー 1個', price: '¥160', amount: 1 },
  { id: 'star-cookie-10', label: '星クッキー 10個', price: '¥1,400', amount: 10 },
  { id: 'star-cookie-30', label: '星クッキー 30個', price: '¥3,000', amount: 30 },
];

export const NORMAL_TICKET_PACKS: ShopPack[] = [
  { id: 'normal-ticket-1', label: 'おきがえ券', price: '¥100', amount: 1 },
  { id: 'normal-ticket-10', label: 'おきがえ券 10枚', price: '¥1,000', amount: 10 },
];

export const PREMIUM_TICKET_PACKS: ShopPack[] = [
  { id: 'premium-ticket-1', label: 'とっておき券', price: '¥500', amount: 1 },
  { id: 'premium-ticket-5', label: 'とっておき券 5枚', price: '¥2,500', amount: 5 },
];
