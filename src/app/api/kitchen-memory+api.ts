import OpenAI from 'openai';

import { JAPANESE_CHAT_MODEL, createJapaneseChatCompletion } from '@/lib/openai-japanese';

const KITCHEN_MEMORY_SYSTEM_PROMPT = `あなたは家庭料理アプリ「WiCO」の裏側で、各家庭の食の傾向を静かに記録するアシスタントです。

渡されるのは、この家庭の食事記録に書かれたメモの一覧（古い順）です。この実際の記録だけを根拠にして、「台所メモリー」（この家庭の食の傾向まとめ）を一から作り直してください。

重要: あなた自身が過去にこの家庭についてどう推測したかは一切考慮しないでください。今回渡された記録の内容だけを根拠に、ゼロから判断してください。

ルール:
・断定せず、「〜っぽい」「〜の傾向がある」のような、あくまで推測・傾向として書いてください。1件の記録だけで判断がつく内容は弱く（「〜かも」程度に）、複数の記録で繰り返し裏付けられている内容はややはっきりめに書いてかまいません。
・新しい記録の内容が、それより前の記録から想像できる傾向と矛盾する場合は、新しい記録を優先してください。古い傾向は弱める・書き換える・省く、のいずれかにしてください（例: 以前ピーマンを残した記録があっても、直近で「ピーマン完食した」という記録があれば、苦手傾向は書かない、または弱めてください）。
・食材の好き嫌い、味付けの濃さ、食感や切り方の好み、量の好みなど、今後の献立提案に活かせる情報を優先してください。天気や体調などその日限りの一時的な話題は含めないでください。
・箇条書きで、合計5行程度までに収めてください。裏付けが薄い・古くなった内容より、直近で繰り返し裏付けられている内容を優先してください。
・渡された記録全体から特に何も言えない場合は、空文字列を返してください。

指定されたJSON形式でのみ応答してください。
・summary: 台所メモリー全文（箇条書き、5行以内、書けることがなければ空文字列）`;

const KITCHEN_MEMORY_SCHEMA = {
  type: 'object' as const,
  properties: {
    summary: { type: 'string' as const },
  },
  required: ['summary'],
  additionalProperties: false,
};

type MealEvidence = { eatenAt: string; dishes: string[]; memo: string };

function isMealEvidence(value: unknown): value is MealEvidence {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as MealEvidence).eatenAt === 'string' &&
    typeof (value as MealEvidence).memo === 'string' &&
    Array.isArray((value as MealEvidence).dishes)
  );
}

function formatDate(eatenAt: string): string {
  const date = new Date(eatenAt);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildUserContent(evidence: MealEvidence[]): string {
  const lines = evidence.map((entry) => {
    const dishLabel = entry.dishes.length > 0 ? entry.dishes.join('、') : '（料理名未記入）';
    return `・${formatDate(entry.eatenAt)} ${dishLabel}: ${entry.memo}`;
  });
  return `食事記録のメモ一覧（古い順）:\n${lines.join('\n')}`;
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
  const evidence: MealEvidence[] = Array.isArray(body.evidence) ? body.evidence.filter(isMealEvidence) : [];

  if (evidence.length === 0) {
    return Response.json({ summary: '' });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await createJapaneseChatCompletion(openai, {
      model: JAPANESE_CHAT_MODEL,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'kitchen_memory', strict: true, schema: KITCHEN_MEMORY_SCHEMA },
      },
      messages: [
        { role: 'system', content: KITCHEN_MEMORY_SYSTEM_PROMPT },
        { role: 'user', content: buildUserContent(evidence) },
      ],
    });
    const raw = response.choices[0]?.message.content ?? '{}';
    const parsed = JSON.parse(raw);
    return Response.json({ summary: typeof parsed.summary === 'string' ? parsed.summary : '' });
  } catch (error) {
    console.error(error);
    return Response.json({ summary: '' }, { status: 500 });
  }
}
