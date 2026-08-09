import OpenAI from 'openai';

import { createJapaneseChatCompletion, JAPANESE_CHAT_MODEL } from '@/lib/openai-japanese';

const SYSTEM_PROMPT = `あなたは家庭料理のレシピを整えるライターです。ユーザーが投稿しようとしているレシピの下書き（レシピ名・基本の材料・添え物や飾りの食材・調味料グループ・作り方）を受け取り、実際のレシピ本に書かれているような統一フォーマットに書き直してください。

材料はそれぞれのセクション（基本の材料／添え物や飾りの食材／各調味料グループ）ごとに、名前と分量に分けてください。分量が書かれていない材料は amount を空文字にしてください。セクションをまたいで材料を移動させたり、まとめ直したりしないでください。

調味料グループには「合わせ調味料（先に混ぜておく）」か「順番に加える（ひとつずつ加える）」かのモードが指定されていますが、これはユーザーが決めるものなので、あなたはモードを判断したり書き換えたりしないでください。各グループの中の材料の名前・分量を整えるだけにしてください。

作り方は「〜を切る。」「〜を加えて炒める。」のように動詞の言い切り（辞書形）で簡潔に書いてください。「〜だよ」「〜してね」のような話しかける言い方や、「です」「ます」などの敬語は一切使わないでください。作り方を書く際は、基本の材料・添え物・すべての調味料グループを踏まえた、レシピ全体として自然な手順にしてください。

下書きの材料や作り方が雑・簡潔すぎる、または作り方がほとんど書かれていない場合は、レシピ名と材料から常識的な家庭料理の手順を自然に補って書いてください。逆に下書きに書かれている内容と矛盾する材料や手順を勝手に付け足さないでください。

レシピ名は書き換えないでください（渡された内容の整形だけを行ってください）。

指定されたJSON形式で応答してください。
・basic: 基本の材料の配列（nameには材料名のみ、amountには分量）
・garnish: 添え物や飾りの食材の配列（下書きが空なら空配列にしてください）
・seasoningGroups: 調味料グループごとの配列。渡された調味料グループの数・順序に必ず合わせてください（1番目の下書きグループの結果は1番目に、というように対応させること）。各要素は items（材料の配列）だけを持ちます。
・steps: 作り方の配列。1手順につき1つの文字列にしてください。`;

const INGREDIENT_ITEM_SCHEMA = {
  type: 'object' as const,
  properties: { name: { type: 'string' }, amount: { type: 'string' } },
  required: ['name', 'amount'],
  additionalProperties: false,
};

const RESPONSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    basic: { type: 'array' as const, items: INGREDIENT_ITEM_SCHEMA },
    garnish: { type: 'array' as const, items: INGREDIENT_ITEM_SCHEMA },
    seasoningGroups: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: { items: { type: 'array' as const, items: INGREDIENT_ITEM_SCHEMA } },
        required: ['items'],
        additionalProperties: false,
      },
    },
    steps: { type: 'array' as const, items: { type: 'string' } },
  },
  required: ['basic', 'garnish', 'seasoningGroups', 'steps'],
  additionalProperties: false,
};

type SeasoningGroupDraft = { mode: 'combined' | 'sequential'; text: string };

function summarizeDraft(
  title: string,
  basicText: string,
  garnishText: string,
  seasoningGroups: SeasoningGroupDraft[],
  stepsText: string,
): string {
  const lines = [`レシピ名: ${title}`];
  lines.push('', '基本の材料の下書き:', basicText.trim() || '（未入力）');
  lines.push('', '添え物や飾りの食材の下書き:', garnishText.trim() || '（未入力）');
  seasoningGroups.forEach((group, index) => {
    const label = String.fromCharCode(65 + index);
    const modeLabel = group.mode === 'combined' ? '合わせ調味料' : '順番に加える';
    lines.push('', `調味料${label}（${modeLabel}）の下書き:`, group.text.trim() || '（未入力）');
  });
  lines.push('', '作り方の下書き:', stepsText.trim() || '（未入力）');
  return lines.join('\n');
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
  const title: string = body.title ?? '';
  const basicText: string = body.basicText ?? '';
  const garnishText: string = body.garnishText ?? '';
  const seasoningGroups: SeasoningGroupDraft[] = body.seasoningGroups ?? [];
  const stepsText: string = body.stepsText ?? '';

  const openai = new OpenAI({ apiKey });

  try {
    const response = await createJapaneseChatCompletion(openai, {
      model: JAPANESE_CHAT_MODEL,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'recipe_format', strict: true, schema: RESPONSE_SCHEMA },
      },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: summarizeDraft(title, basicText, garnishText, seasoningGroups, stepsText) },
      ],
    });
    const raw = response.choices[0]?.message.content ?? '{}';
    const parsed = JSON.parse(raw);
    return Response.json({
      basic: parsed.basic ?? [],
      garnish: parsed.garnish ?? [],
      seasoningGroups: parsed.seasoningGroups ?? [],
      steps: parsed.steps ?? [],
    });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'AIとの通信でエラーが発生しました。しばらくしてからもう一度お試しください。' }, { status: 500 });
  }
}
