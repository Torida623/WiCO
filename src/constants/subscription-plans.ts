export type SubscriptionPlan = {
  id: 'free' | 'normal' | 'premium';
  label: string;
  /** ラベル下に添える一言キャッチコピー。 */
  tagline: string;
  /** キャッチコピーに続けて表示する、もう少し具体的な説明文。 */
  description: string;
  price: string;
  features: string[];
};

/** ティア構成・価格は暫定（2026-08-04時点の計画）。ローンチ後の実データで見直す前提。 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    label: 'ひとくち',
    tagline: 'まずはWiCOを、ちょっと味見。',
    description: 'WiCOの基本機能を気軽に楽しめるプラン。',
    price: '¥0 / 月',
    features: [
      '基本の献立提案',
      '献立ノート',
      'お買い物ノート',
      '苦手・アレルギー食材登録',
      '料理の思い出',
      'レシピ研究所（レシピ保存10件、投稿週3回）',
    ],
  },
  {
    id: 'normal',
    label: 'ごはん',
    tagline: '毎日のごはんを、もっと自分らしく。',
    description: '使うほど、いつもの食卓に寄り添ってくれるプラン。',
    price: '¥1,000 / 月',
    features: [
      'ひとくちプランの機能すべて',
      '食事記録を活かした献立提案',
      'レシピ研究所（レシピ保存30件、投稿週7回、レシピ名検索解放）',
      '毎月星クッキー3枚（480円相当）をプレゼント！',
    ],
  },
  {
    id: 'premium',
    label: 'ごちそう',
    tagline: 'WiCOを、まるごと楽しみたい人へ。',
    description: '毎日の料理をもっと楽しく、もっと自由に。',
    price: '¥2,000 / 月',
    features: [
      'ごはんプランの機能すべて',
      'レシピ研究所（レシピ保存/投稿無制限、タグ検索解放）',
      '毎月星クッキー10枚（1400円相当）をプレゼント！',
    ],
  },
];
