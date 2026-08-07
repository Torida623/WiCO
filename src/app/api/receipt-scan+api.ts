import OpenAI from 'openai';

import { JAPANESE_CHAT_MODEL, createJapaneseChatCompletion } from '@/lib/openai-japanese';

const SYSTEM_PROMPT = `あなたはレシートの写真から購入内容を読み取るアシスタントです。

・レシートに印字されている商品名と、それぞれの金額（税込の実際の支払額）を読み取ってください。
・商品名は短く分かりやすい一般的な名前に変換してください（例: "ｷｬﾍﾞﾂ" → "キャベツ"）。
・各商品を「food」（食品・飲料・お菓子など）か「other」（日用品・雑誌・化粧品など食品以外）のどちらかに分類してください。
・小計、合計、消費税、割引、ポイント、お預かり、お釣りの行は商品として含めないでください。
・値引きが特定の商品に紐づいている場合は、その商品の金額から引いた後の金額にしてください。
・店名が読み取れる場合はstoreNameに入れてください。読み取れない場合はnullにしてください。
・レシートに印字されている購入日を読み取り、purchaseDateにYYYY-MM-DD形式で入れてください。西暦2桁表記(例: 26.8.7)は20xxとして補完し、令和などの和暦表記は西暦に変換してください。日付が読み取れない場合はnullにしてください。
・レシートから商品がまったく読み取れない場合は、空の配列を返してください。

指定されたJSON形式でのみ応答してください。`;

const RECEIPT_SCAN_SCHEMA = {
  type: 'object' as const,
  properties: {
    storeName: { type: ['string', 'null'] },
    purchaseDate: { type: ['string', 'null'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'number' },
          category: { type: 'string', enum: ['food', 'other'] },
        },
        required: ['name', 'amount', 'category'],
        additionalProperties: false,
      },
    },
  },
  required: ['storeName', 'purchaseDate', 'items'],
  additionalProperties: false,
};

const PURCHASE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type ReceiptItem = { name: string; amount: number; category: 'food' | 'other' };

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { message: 'サーバーにAPIキーが設定されていません。.envファイルを確認してください。' },
      { status: 500 },
    );
  }

  const body = await request.json();
  const base64: string | undefined = body.photo?.base64;
  const mimeType: string = body.photo?.mimeType ?? 'image/jpeg';

  if (!base64) {
    return Response.json({ message: '写真がありません。' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await createJapaneseChatCompletion(openai, {
      model: JAPANESE_CHAT_MODEL,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'receipt_scan', strict: true, schema: RECEIPT_SCAN_SCHEMA },
      },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }],
        },
      ],
    });

    const raw = response.choices[0]?.message.content ?? '{}';
    const parsed = JSON.parse(raw);
    const items: ReceiptItem[] = Array.isArray(parsed.items)
      ? parsed.items.filter(
          (item: unknown): item is ReceiptItem =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as ReceiptItem).name === 'string' &&
            typeof (item as ReceiptItem).amount === 'number' &&
            ((item as ReceiptItem).category === 'food' || (item as ReceiptItem).category === 'other'),
        )
      : [];
    const storeName: string | null = typeof parsed.storeName === 'string' ? parsed.storeName : null;
    const purchaseDate: string | null =
      typeof parsed.purchaseDate === 'string' && PURCHASE_DATE_PATTERN.test(parsed.purchaseDate)
        ? parsed.purchaseDate
        : null;

    return Response.json({ storeName, purchaseDate, items });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'AIとの通信でエラーが発生しました。しばらくしてからもう一度お試しください。' }, { status: 500 });
  }
}
