export type ShopPack = {
  id: string;
  label: string;
  price: string;
  note?: string;
};

/** 星クッキー = 音声案内チケットのマスコット向け呼び名。パック数・価格は暫定（要ローンチ後見直し）。 */
export const STAR_COOKIE_PACKS: ShopPack[] = [
  { id: 'star-cookie-10', label: '星クッキー 10個', price: '¥1,400' },
  { id: 'star-cookie-30', label: '星クッキー 30個', price: '¥3,000', note: '実質月パス相当' },
];

/**
 * TODO(運営者): お着替え券のパック数・価格は未確定。星クッキーと同じ「パック購入→交換」方式だけ
 * 決まっていて、具体的な数字はまだ決めていないため仮の値を入れている。
 */
export const COSTUME_TICKET_PACKS: ShopPack[] = [{ id: 'costume-ticket-1', label: 'お着替え券', price: '[価格未定]' }];
