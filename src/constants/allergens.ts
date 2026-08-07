// 消費者庁「食品表示基準」アレルギー表示対象品目（2026年4月1日施行、計29品目）。
// 特定原材料(義務表示)9品目＋特定原材料に準ずるもの(推奨表示)20品目。
// カシューナッツは経過措置期間中(〜2028年3月)で、完全義務化は2028年4月1日から。
export type AllergenCategory = 'mandatory' | 'recommended';

export type Allergen = {
  id: string;
  label: string;
  category: AllergenCategory;
};

export const ALLERGENS: Allergen[] = [
  // 特定原材料（義務表示）9品目
  { id: 'egg', label: '卵', category: 'mandatory' },
  { id: 'milk', label: '乳', category: 'mandatory' },
  { id: 'wheat', label: '小麦', category: 'mandatory' },
  { id: 'shrimp', label: 'えび', category: 'mandatory' },
  { id: 'crab', label: 'かに', category: 'mandatory' },
  { id: 'buckwheat', label: 'そば', category: 'mandatory' },
  { id: 'peanut', label: '落花生（ピーナッツ）', category: 'mandatory' },
  { id: 'walnut', label: 'くるみ', category: 'mandatory' },
  { id: 'cashewNut', label: 'カシューナッツ', category: 'mandatory' },
  // 特定原材料に準ずるもの（推奨表示）20品目
  { id: 'abalone', label: 'あわび', category: 'recommended' },
  { id: 'squid', label: 'いか', category: 'recommended' },
  { id: 'salmonRoe', label: 'いくら', category: 'recommended' },
  { id: 'orange', label: 'オレンジ', category: 'recommended' },
  { id: 'kiwiFruit', label: 'キウイフルーツ', category: 'recommended' },
  { id: 'beef', label: '牛肉', category: 'recommended' },
  { id: 'salmon', label: 'さけ', category: 'recommended' },
  { id: 'mackerel', label: 'さば', category: 'recommended' },
  { id: 'soybean', label: '大豆', category: 'recommended' },
  { id: 'chicken', label: '鶏肉', category: 'recommended' },
  { id: 'banana', label: 'バナナ', category: 'recommended' },
  { id: 'pork', label: '豚肉', category: 'recommended' },
  { id: 'peach', label: 'もも', category: 'recommended' },
  { id: 'yam', label: 'やまいも', category: 'recommended' },
  { id: 'apple', label: 'りんご', category: 'recommended' },
  { id: 'gelatin', label: 'ゼラチン', category: 'recommended' },
  { id: 'sesame', label: 'ごま', category: 'recommended' },
  { id: 'almond', label: 'アーモンド', category: 'recommended' },
  { id: 'macadamiaNut', label: 'マカダミアナッツ', category: 'recommended' },
  { id: 'pistachio', label: 'ピスタチオ', category: 'recommended' },
];
