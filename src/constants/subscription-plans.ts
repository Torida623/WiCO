export type SubscriptionPlan = {
  id: 'free' | 'normal' | 'premium';
  label: string;
  price: string;
  features: string[];
};

/** ティア構成・価格は暫定（2026-08-04時点の計画）。ローンチ後の実データで見直す前提。 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    label: '無料',
    price: '¥0 / 月',
    features: ['献立提案（基本）', '食費管理（家計簿）', 'レシピ研究室：保存5〜10件・投稿週3回'],
  },
  {
    id: 'normal',
    label: '有料ノーマル',
    price: '¥1,000 / 月',
    features: [
      '無料プランの内容すべて',
      'AI連携の献立提案（食事記録の履歴を反映）',
      'レシピ研究室：保存30〜50件・投稿週7回・検索あり',
    ],
  },
  {
    id: 'premium',
    label: '有料プレミアム',
    price: '¥2,000 / 月',
    features: [
      'ノーマルプランの内容すべて',
      'レシピ研究室：保存/投稿無制限・タグ検索あり',
      '調理の音声案内：月12〜15回込み（星クッキーで追加購入も可能）',
    ],
  },
];
