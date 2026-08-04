import OpenAI from 'openai';

import { JAPANESE_CHAT_MODEL, createJapaneseChatCompletion } from '@/lib/openai-japanese';

const SYSTEM_PROMPT = `あなたは冷蔵庫の写真から食材を読み取るアシスタントです。渡された写真（冷蔵室・ドアポケット・野菜室など）に写っている食材を読み取ってください。

・食材は一般的な名前で簡潔に書いてください（例: にんじん、卵、豚こま肉、牛乳）。個数や分量は書かないでください。
・タッパーや保存容器など、中身が見えず判別できないものはリストに含めないでください。
・お菓子、ペットボトルや缶・パックの飲み物など、料理の食材として使わないものは含めないでください。
・もやしやカット野菜のように袋に入っていて中身が推測できるものは、推測でリストに含めてください。
・同じ食材が複数の写真に写っていても、リストには1回だけ載せてください。
・写真に写っているものだけをリストにしてください。写っていないものを想像で足さないでください。
・写真から食材がまったく読み取れない場合は、空の配列を返してください。

指定されたJSON形式でのみ応答してください。`;

const FRIDGE_SCAN_SCHEMA = {
  type: 'object' as const,
  properties: {
    ingredients: { type: 'array', items: { type: 'string' } },
  },
  required: ['ingredients'],
  additionalProperties: false,
};

type PhotoInput = { base64: string; mimeType: string; label: string };

function isPhotoInput(value: unknown): value is PhotoInput {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PhotoInput).base64 === 'string' &&
    typeof (value as PhotoInput).mimeType === 'string' &&
    typeof (value as PhotoInput).label === 'string'
  );
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
  const photos: PhotoInput[] = Array.isArray(body.photos) ? body.photos.filter(isPhotoInput) : [];

  if (photos.length === 0) {
    return Response.json({ message: '写真がありません。' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = photos.flatMap((photo) => [
      { type: 'text' as const, text: `写真: ${photo.label}` },
      { type: 'image_url' as const, image_url: { url: `data:${photo.mimeType};base64,${photo.base64}` } },
    ]);

    const response = await createJapaneseChatCompletion(openai, {
      model: JAPANESE_CHAT_MODEL,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'fridge_scan', strict: true, schema: FRIDGE_SCAN_SCHEMA },
      },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    const raw = response.choices[0]?.message.content ?? '{}';
    const parsed = JSON.parse(raw);
    const ingredients = Array.isArray(parsed.ingredients)
      ? parsed.ingredients.filter(
          (item: unknown): item is string => typeof item === 'string' && item.trim().length > 0,
        )
      : [];

    return Response.json({ ingredients });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'AIとの通信でエラーが発生しました。しばらくしてからもう一度お試しください。' }, { status: 500 });
  }
}
