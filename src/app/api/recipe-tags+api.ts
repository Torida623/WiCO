import OpenAI from 'openai';

import { FORMAT_TAG_OPTIONS, GENRE_TAG_OPTIONS, TASTE_TAG_OPTIONS, TEMPERATURE_TAG_OPTIONS } from '@/constants/meal-flow';
import { createJapaneseChatCompletion, JAPANESE_CHAT_MODEL } from '@/lib/openai-japanese';

const GENRE_VALUES = GENRE_TAG_OPTIONS.map((option) => option.value);
const FORMAT_VALUES = FORMAT_TAG_OPTIONS.map((option) => option.value);
const TASTE_VALUES = TASTE_TAG_OPTIONS.map((option) => option.value);
const TEMPERATURE_VALUES = TEMPERATURE_TAG_OPTIONS.map((option) => option.value);

const SYSTEM_PROMPT = `あなたは家庭料理レシピに検索用タグを付ける専門家です。渡されたレシピ名・材料・作り方の内容から、以下の4カテゴリーそれぞれについて最も当てはまるタグを1つ選んでください。

・ジャンル: ${GENRE_VALUES.join(' / ')}
・形式: ${FORMAT_VALUES.join(' / ')}
・味わい: ${TASTE_VALUES.join(' / ')}
・温度: ${TEMPERATURE_VALUES.join(' / ')}

どのカテゴリーも無理に当てはめないでください。レシピの内容にはっきり合うものがなければ、そのカテゴリーは必ずnullにしてください。`;

const RESPONSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    genreTag: { type: ['string', 'null'] as const, enum: [...GENRE_VALUES, null] },
    formatTag: { type: ['string', 'null'] as const, enum: [...FORMAT_VALUES, null] },
    tasteTag: { type: ['string', 'null'] as const, enum: [...TASTE_VALUES, null] },
    temperatureTag: { type: ['string', 'null'] as const, enum: [...TEMPERATURE_VALUES, null] },
  },
  required: ['genreTag', 'formatTag', 'tasteTag', 'temperatureTag'],
  additionalProperties: false,
};

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
  const bookContent: string = body.bookContent ?? '';

  const openai = new OpenAI({ apiKey });

  try {
    const response = await createJapaneseChatCompletion(openai, {
      model: JAPANESE_CHAT_MODEL,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'recipe_tags', strict: true, schema: RESPONSE_SCHEMA },
      },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `レシピ名: ${title}\n\n${bookContent}` },
      ],
    });
    const raw = response.choices[0]?.message.content ?? '{}';
    const parsed = JSON.parse(raw);
    return Response.json({
      genreTag: parsed.genreTag ?? null,
      formatTag: parsed.formatTag ?? null,
      tasteTag: parsed.tasteTag ?? null,
      temperatureTag: parsed.temperatureTag ?? null,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: 'AIとの通信でエラーが発生しました。しばらくしてからもう一度お試しください。' },
      { status: 500 },
    );
  }
}
