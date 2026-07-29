import OpenAI from 'openai';

import { Answers, ENTRY_POINT_OPTIONS } from '@/constants/meal-flow';

const MODEL = 'gpt-5.6-terra';

const PROPOSAL_SYSTEM_PROMPT = `あなたは家庭料理の献立を提案するアプリ「WiCO」のマスコット「ペロココ」です。
ユーザーは日々の食事作りに追われ、時間や心に余裕がない人です。フレンドリーで明るい、タメ口（だ・よ調）で応答してください。「です」「ます」「ください」「でしょう」などの丁寧語・敬語は一切使わず、「〜だよ」「〜だね」「〜しよう」「〜かな」のような話し言葉の文末にしてください。「ありがとうございます」のような同じ相槌を毎回繰り返さないでください。

提案する献立は、実際に家庭で作られている自然な組み合わせにしてください。食材や調味料の組み合わせが不自然な、いわゆる「謎料理」は絶対に避けてください。

献立は必ずしも主菜・副菜・汁物・主食をすべて揃える必要はありません。料理の種類に応じて自然な構成にしてください。

ラーメン・丼・カレー・パスタ・サンドイッチ・チャーハン・鍋物など、1品で主食・主菜・汁物のうち複数の役割を兼ねる料理を提案する場合は、項目名を「主菜」ではなく「メイン」にしてください。焼き魚や生姜焼きのように、はっきり主菜だけの料理の場合は「主菜」のままにしてください。
副菜・汁物・主食は、実際に追加で提案したい料理がある場合のみ記載してください。追加する品がない項目は行ごと丸々省略してください。「なし」「特になし」のように書いて空欄を埋めることは絶対にしないでください。

以下のフォーマットのみで応答してください。前置きや説明文、マークダウンの太字(**)などの記法は使わないでください。

(導入の一言)

🍽️ 献立
・(主菜 または メイン)：〇〇
・副菜：〇〇(追加する場合のみ)
・汁物：〇〇(追加する場合のみ)
・主食：〇〇(追加する場合のみ)

(所要時間や味わい・魅力について、その献立の内容に合わせて毎回自分で考えた一文。言い回しを使い回さないこと)

別料理の候補
・〇〇

気になる食材や、用意できなさそうなものはある？`;

const REVISION_SYSTEM_PROMPT = `あなたは家庭料理の献立を提案するアプリ「WiCO」のマスコット「ペロココ」です。
直前に提案した献立に対して、ユーザーから変更希望が届きます。ユーザーが指摘した食材・料理に関係する項目だけを更新してください。それ以外の項目は絶対に変更しないでください。

フレンドリーで明るい、タメ口（だ・よ調）で応答してください。「です」「ます」「ください」「でしょう」などの丁寧語・敬語は一切使わず、「〜だよ」「〜だね」「〜しよう」「〜かな」のような話し言葉の文末にしてください。「ありがとうございます」のような同じ相槌を毎回繰り返さないでください。

変更後の献立も、実際に家庭で作られている自然な組み合わせにしてください。食材や調味料の組み合わせが不自然な、いわゆる「謎料理」は絶対に避けてください。

副菜・汁物・主食は、実際に追加で提案したい料理がある場合のみ値を入れてください。「なし」「特になし」のような値は絶対に使わず、追加する品がなければ必ずnullにしてください。

指定されたJSON形式で応答してください。
・intro: 変更点を踏まえた導入の一言
・closing: 所要時間や味わい・魅力について、その献立の内容に合わせて毎回自分で考えた一文(言い回しを使い回さないこと)
・updatedMain / updatedSide / updatedSoup / updatedStaple / updatedAlternative: ユーザーの変更希望によって内容が変わる項目のみ新しい値を入れてください。変更が不要な項目は必ずnullにしてください(直前の提案の値をコード側でそのまま使うため、ここで書き写す必要はありません)。`;

type MenuFields = {
  mainLabel: '主菜' | 'メイン';
  main: string;
  side?: string;
  soup?: string;
  staple?: string;
  alternative?: string;
};

function parseMenuFields(text: string): MenuFields {
  const get = (label: string) => text.match(new RegExp(`・${label}：(.+)`))?.[1]?.trim();
  const alternative = text.match(/別料理の候補\n([\s\S]*?)(?:\n\n|$)/)?.[1]?.trim();
  const mainLabel = text.includes('・メイン：') ? 'メイン' : '主菜';
  return {
    mainLabel,
    main: get(mainLabel) ?? '',
    side: get('副菜'),
    soup: get('汁物'),
    staple: get('主食'),
    alternative,
  };
}

function buildProposalText(intro: string, closing: string, fields: MenuFields): string {
  const lines = [intro, '', '🍽️ 献立', `・${fields.mainLabel}：${fields.main}`];
  if (fields.side) lines.push(`・副菜：${fields.side}`);
  if (fields.soup) lines.push(`・汁物：${fields.soup}`);
  if (fields.staple) lines.push(`・主食：${fields.staple}`);
  lines.push('', closing, '', '別料理の候補', fields.alternative ?? '', '', '気になる食材や、用意できなさそうなものはある？');
  return lines.join('\n');
}

const REVISION_RESPONSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    intro: { type: 'string' },
    closing: { type: 'string' },
    updatedMain: { type: ['string', 'null'] },
    updatedSide: { type: ['string', 'null'] },
    updatedSoup: { type: ['string', 'null'] },
    updatedStaple: { type: ['string', 'null'] },
    updatedAlternative: { type: ['string', 'null'] },
  },
  required: ['intro', 'closing', 'updatedMain', 'updatedSide', 'updatedSoup', 'updatedStaple', 'updatedAlternative'],
  additionalProperties: false,
};

const FINAL_SYSTEM_PROMPT = `あなたは家庭料理の献立を提案するアプリ「WiCO」のマスコット「ペロココ」です。
直前に確定した献立について、材料と作り方を教えてください。

冒頭の一言だけはペロココらしく、フレンドリーで明るいタメ口（だ・よ調）にしてください。
それ以外の【材料】【作り方】の部分はペロココの話し言葉ではなく、実際のレシピ本に書かれているような文体にしてください。「〜だよ」「〜してね」のような話しかける言い方や、「です」「ます」などの敬語は使わず、「〜を切る。」「〜を加えて炒める。」のように動詞の言い切り（辞書形）で簡潔に書いてください。

以下のフォーマットのみで応答してください。前置きや説明文、マークダウンの太字(**)などの記法は使わないでください。

献立が決まりました！

【材料】(指定された人数分)
・材料名 分量
・材料名 分量

【作り方】
1. 手順
2. 手順
3. 手順`;

const FOREIGN_SCRIPT_PATTERN = /[ऀ-ॿЀ-ӿ؀-ۿ가-힣฀-๿]/;

async function createJapaneseChatCompletion(
  openai: OpenAI,
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
  maxAttempts = 3,
): Promise<OpenAI.Chat.ChatCompletion> {
  let response = (await openai.chat.completions.create(params)) as OpenAI.Chat.ChatCompletion;
  for (let attempt = 1; attempt < maxAttempts; attempt++) {
    const content = response.choices[0]?.message.content ?? '';
    if (!FOREIGN_SCRIPT_PATTERN.test(content)) break;
    response = (await openai.chat.completions.create(params)) as OpenAI.Chat.ChatCompletion;
  }
  return response;
}

const CUISINE_STYLES = ['和食', '洋食', '中華', 'エスニック', 'ジャンルにこだわらない自由な発想'];

function buildVarietyHint(): string {
  const isCreative = Math.random() < 0.25;
  const style = CUISINE_STYLES[Math.floor(Math.random() * CUISINE_STYLES.length)];
  const creativityLine = isCreative
    ? '今回は定番から少し外れた、個性的・オリジナリティのある献立を考えてください（ただし家庭で実際に無理なく作れる自然な組み合わせにすること）。'
    : '今回は定番で作りやすい家庭料理にしてください。';
  return `${creativityLine}\n参考ジャンル: ${style}（絶対ではなく、あくまで参考程度）\n同じ条件でも毎回違う献立を考え、同じ料理ばかりを繰り返し提案しないでください。`;
}

function summarizeAnswers(answers: Answers): string {
  const entryLabel = ENTRY_POINT_OPTIONS.find((o) => o.value === answers.entryPoint)?.label ?? '未指定';
  const lines = [`シーン: ${entryLabel}`, `人数: ${answers.people ?? '未指定'}人`];

  if (answers.cookingTime) {
    lines.push(`調理時間の希望: ${answers.cookingTime === 'relaxed' ? '時間をかけてもよい' : 'ぱぱっと手早く'}`);
  }
  if (answers.mood?.trim()) lines.push(`今の気分: ${answers.mood.trim()}`);
  if (answers.allergy?.trim()) lines.push(`アレルギー・苦手な食材: ${answers.allergy.trim()}`);
  if (answers.ingredients?.trim()) lines.push(`使いたい食材: ${answers.ingredients.trim()}`);
  if (answers.shopping) lines.push(`買い物: ${answers.shopping === 'yes' ? '可能' : '不可'}`);
  if (answers.revisionRequest?.trim()) lines.push(`前回の提案への変更希望: ${answers.revisionRequest.trim()}`);

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
  const mode: 'proposal' | 'final' = body.mode;
  const answers: Answers = body.answers;
  const previousProposal: string | undefined = body.proposalText;

  const openai = new OpenAI({ apiKey });

  try {
    if (mode === 'proposal') {
      const revisionRequest = answers.revisionRequest?.trim();

      if (previousProposal && revisionRequest) {
        const response = await createJapaneseChatCompletion(openai, {
          model: MODEL,
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'menu_revision', strict: true, schema: REVISION_RESPONSE_SCHEMA },
          },
          messages: [
            { role: 'system', content: REVISION_SYSTEM_PROMPT },
            { role: 'user', content: summarizeAnswers({ ...answers, revisionRequest: undefined }) },
            { role: 'assistant', content: previousProposal },
            { role: 'user', content: revisionRequest },
          ],
        });
        const raw = response.choices[0]?.message.content ?? '{}';
        const parsed = JSON.parse(raw);
        const previousFields = parseMenuFields(previousProposal);
        const mergedFields: MenuFields = {
          mainLabel: previousFields.mainLabel,
          main: parsed.updatedMain?.trim() || previousFields.main,
          side: parsed.updatedSide?.trim() || previousFields.side,
          soup: parsed.updatedSoup?.trim() || previousFields.soup,
          staple: parsed.updatedStaple?.trim() || previousFields.staple,
          alternative: parsed.updatedAlternative?.trim() || previousFields.alternative,
        };
        const text = buildProposalText(parsed.intro, parsed.closing, mergedFields);
        return Response.json({ message: text });
      }

      const response = await createJapaneseChatCompletion(openai, {
        model: MODEL,
        messages: [
          { role: 'system', content: PROPOSAL_SYSTEM_PROMPT },
          { role: 'user', content: `${summarizeAnswers(answers)}\n\n${buildVarietyHint()}` },
        ],
      });
      const text = response.choices[0]?.message.content ?? '';
      return Response.json({ message: text });
    }

    const proposalText: string = body.proposalText ?? '';
    const response = await createJapaneseChatCompletion(openai, {
      model: MODEL,
      messages: [
        { role: 'system', content: FINAL_SYSTEM_PROMPT },
        { role: 'user', content: summarizeAnswers(answers) },
        { role: 'assistant', content: proposalText },
        { role: 'user', content: 'この献立で確定しました。材料と作り方を教えてください。' },
      ],
    });
    const text = response.choices[0]?.message.content ?? '';
    return Response.json({ message: text });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'AIとの通信でエラーが発生しました。しばらくしてからもう一度お試しください。' }, { status: 500 });
  }
}
