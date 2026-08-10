import OpenAI from 'openai';

import { JAPANESE_CHAT_MODEL, createJapaneseChatCompletion } from '@/lib/openai-japanese';

const NUTRITION_SYSTEM_PROMPT = `あなたは栄養士のアシスタントです。三色食品群の考え方を使って、渡された料理・食品のリストから、その食事の栄養バランスを判定してください。

三色食品群:
・protein(赤): 血や肉をつくる食品。肉・魚・卵・大豆製品・乳製品など。
・energy(黄): エネルギーになる食品。ごはん・パン・麺・いも類・油・砂糖など。
・vegetable(緑): 体の調子を整える食品。野菜・きのこ・海藻・果物など。

まず渡された料理・食品それぞれがどの食品群に該当するか判断してください。1つの料理が複数の食品群にまたがってもかまいません。

次に、それぞれの食品群について、一般的な1食分の食事として見たときの量を次の5段階で判定してください。判定に迷ったときに無難な"ちょうどいい"へ逃げず、下記の目安に照らして具体的に判断してください。

・energy(主食・ごはん/パン/麺/いも類の量の目安)
  low: ほとんどない、またはごはん茶碗半分以下(〜75g)
  slightlyLow: 茶碗軽め1杯(〜100g)
  adequate: 茶碗1杯程度(150g前後)、食パン1枚、うどん・パスタ1人前など
  slightlyHigh: どんぶり・大盛り1杯(200〜250g程度)、または主食が2種類
  high: 大盛り+おかわり相当、主食を複数品しっかり食べているなど、明らかに多い

・protein(肉/魚/卵/大豆製品/乳製品の量の目安)
  low: ほとんどない、豆腐少量など気持ち程度
  slightlyLow: 卵1個分、豆腐1/4丁程度の少量
  adequate: 肉・魚を手のひら1枚分程度(80〜100g)、豆腐1/2丁、卵1〜2個相当
  slightlyHigh: 肉・魚料理が2品ある、または1品の量が多め
  high: 肉・魚料理を2品以上しっかり、量も多い、明らかに多い

・vegetable(野菜/きのこ/海藻/果物の量の目安)
  low: ほとんどない、彩り程度のごく少量
  slightlyLow: 付け合わせ程度、片手に乗るくらいの少量
  adequate: 両手のひらに乗るくらい、小鉢1皿分程度
  slightlyHigh: 野菜料理が2品ある、サラダと汁物の具の両方にしっかり入っているなど
  high: 野菜が主役級にたっぷり、明らかに多い

いずれの食品群も、上記の目安と比べて明確に少ない/多いと言える場合は、遠慮せずlowやhigh側の判定を選んでください。"adequate"は本当に目安通りの量のときだけ使ってください。

写真が添付されている場合は、渡された料理名だけに引っ張られず、写真に写っている皿全体（ご飯・汁物・副菜など主要な構成）を見て、上記の目安と照らし合わせて量感を判定してください。ただし調味料・薬味・ソースなど細かい付け合わせまで厳密に数える必要はありません。写真がない場合は、料理名から一般的に想定される分量で判定してください。

最後に、その判定結果を踏まえて、ユーザーが「今日も料理してよかったな」と前向きな気持ちになれる一言コメントを作ってください。栄養士としてコメントしてください。幼稚な言い回しは避け、大人向けの落ち着いた言葉選びにしてください。
・具体的な料理名を挙げて、良かった点を褒める
・どこかの食品群がlowでも、指摘・注意するような言い方は避ける。触れるとしても軽く前向きに（「次はこれを足すともっといいかも」程度）留めるか、あるいは無理に触れなくてよい
・主語は常にユーザーと料理そのもの。ペロココを主語にした一人称の発言や感情表現は禁止（「ペロココもうれしいな」「見てて楽しい」「僕も食べたくなっちゃった」のような文は不可）
・「うれしい」「楽しい」「楽しみ」「幸せ」「テンション」など、話し手側の感情・気分を表す言葉は一切使わない。あくまでユーザーの料理の内容や工夫そのものを客観的に褒める
・「ペロココだよ。」のような名乗り・自己紹介から始めない。前置きなしで内容から始める
・迷ったら「素材の組み合わせがいいね」「彩りがきれいだね」のように、料理そのものへの評価だけで完結させる
・1〜2文、絵文字なし、語尾は親しみやすいタメ口（だね・かも、など）

直近の食事一覧が渡されている場合は、それも踏まえてください。同じような料理が続いている、特定の食品群（特にvegetable）がlow/slightlyLowで続いている、といった偏りが見られたら、コメントの最後にさりげなく一言添えてもかまいません（例:「野菜ジュースやサラダを一品足すのもいいかも」）。指摘・注意する言い方は避け、軽い提案に留めてください。偏りが見られない、または直近の食事情報がない場合は、無理に触れなくてよい。

直近の食事でvegetableがlow/slightlyLow続きだった中、今回の料理・食品リストに野菜ジュース・サラダ・スープの具など「その食品群を補おうとした様子」が新しく含まれている場合は、今回の判定がまだlow/slightlyLowだったとしても、その工夫・行動を見つけてコメントで拾ってください（例:「野菜ジュースをプラスしたのはいい心がけだね」）。判定の数値を甘くする必要はありませんが、コメントでは「量がまだ足りない」という否定的な角度ではなく、「補おうとしたこと」自体を主役にして褒めてください。

指定されたJSON形式でのみ応答してください。
・energy / protein / vegetable: それぞれ "low" "slightlyLow" "adequate" "slightlyHigh" "high" のいずれか
・breakdown: 各料理がどの食品群に該当するかの内訳
・comment: 上記の一言コメント`;

const NUTRITION_ANALYSIS_SCHEMA = {
  type: 'object' as const,
  properties: {
    energy: { type: 'string', enum: ['low', 'slightlyLow', 'adequate', 'slightlyHigh', 'high'] },
    protein: { type: 'string', enum: ['low', 'slightlyLow', 'adequate', 'slightlyHigh', 'high'] },
    vegetable: { type: 'string', enum: ['low', 'slightlyLow', 'adequate', 'slightlyHigh', 'high'] },
    breakdown: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dish: { type: 'string' },
          groups: {
            type: 'array',
            items: { type: 'string', enum: ['energy', 'protein', 'vegetable'] },
          },
        },
        required: ['dish', 'groups'],
        additionalProperties: false,
      },
    },
    comment: { type: 'string' },
  },
  required: ['energy', 'protein', 'vegetable', 'breakdown', 'comment'],
  additionalProperties: false,
};

const FOOD_GROUP_LEVELS = ['low', 'slightlyLow', 'adequate', 'slightlyHigh', 'high'];

type RecentMeal = {
  dishes: string[];
  nutritionBalance?: { energy: string; protein: string; vegetable: string };
};

function isRecentMeal(value: unknown): value is RecentMeal {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as RecentMeal).dishes) &&
    (value as RecentMeal).dishes.every((dish) => typeof dish === 'string')
  );
}

function formatRecentMeals(recentMeals: RecentMeal[]): string | null {
  const withDishes = recentMeals.filter((meal) => meal.dishes.length > 0);
  if (withDishes.length === 0) return null;

  const lines = withDishes.map((meal) => {
    const name = meal.dishes.join('、');
    if (!meal.nutritionBalance) return `・${name}`;
    const { energy, protein, vegetable } = meal.nutritionBalance;
    return `・${name}（energy: ${energy}, protein: ${protein}, vegetable: ${vegetable}）`;
  });
  return `直近の食事（新しい順）:\n${lines.join('\n')}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { message: 'サーバーにAPIキーが設定されていません。.envファイルを確認してください。' },
      { status: 500 },
    );
  }

  const body = await request.json();
  const dishes: string[] = Array.isArray(body.dishes)
    ? body.dishes.filter((dish: unknown): dish is string => typeof dish === 'string' && dish.trim().length > 0)
    : [];
  const photoBase64: string | undefined = body.photoBase64;
  const mimeType: string = body.mimeType ?? 'image/jpeg';
  const recentMeals: RecentMeal[] = Array.isArray(body.recentMeals) ? body.recentMeals.filter(isRecentMeal) : [];

  if (dishes.length === 0) {
    return Response.json({ message: '料理名がありません。' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      { type: 'text', text: `料理・食品: ${dishes.join('、')}` },
    ];
    const recentMealsText = formatRecentMeals(recentMeals);
    if (recentMealsText) {
      userContent.push({ type: 'text', text: recentMealsText });
    }
    if (photoBase64) {
      userContent.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${photoBase64}` } });
    }

    const response = await createJapaneseChatCompletion(openai, {
      model: JAPANESE_CHAT_MODEL,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'nutrition_balance', strict: true, schema: NUTRITION_ANALYSIS_SCHEMA },
      },
      messages: [
        { role: 'system', content: NUTRITION_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    const raw = response.choices[0]?.message.content ?? '{}';
    const parsed = JSON.parse(raw);
    const normalizeLevel = (value: unknown) => (FOOD_GROUP_LEVELS.includes(value as string) ? value : 'adequate');

    return Response.json({
      energy: normalizeLevel(parsed.energy),
      protein: normalizeLevel(parsed.protein),
      vegetable: normalizeLevel(parsed.vegetable),
      breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : [],
      comment: typeof parsed.comment === 'string' ? parsed.comment : undefined,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'AIとの通信でエラーが発生しました。しばらくしてからもう一度お試しください。' }, { status: 500 });
  }
}
