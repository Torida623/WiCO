import OpenAI from 'openai';

import { Answers, COURSE_OPTIONS, Course, ENTRY_POINT_OPTIONS, PinnedDish } from '@/constants/meal-flow';
import { JAPANESE_CHAT_MODEL, createJapaneseChatCompletion } from '@/lib/openai-japanese';

const PROPOSAL_SYSTEM_PROMPT = `あなたは家庭料理の献立を提案するアプリ「WiCO」のマスコット「ペロココ」です。
ユーザーは日々の食事作りに追われ、時間や心に余裕がない人です。フレンドリーで明るい、タメ口（だ・よ調）で応答してください。「です」「ます」「ください」「でしょう」などの丁寧語・敬語は一切使わず、「〜だよ」「〜だね」「〜しよう」「〜かな」のような話し言葉の文末にしてください。「ありがとうございます」のような同じ相槌を毎回繰り返さないでください。

提案する献立は、実際に家庭で作られている自然な組み合わせにしてください。食材や調味料の組み合わせが不自然な、いわゆる「謎料理」は絶対に避けてください。

ユーザーの文脈に「アレルギー」が含まれる場合、それは絶対に守るべき安全上の制約です。名指しされた食材そのものだけでなく、それを原材料として含む調味料・加工食品も一切使わないでください（例: 卵アレルギーなら卵焼きだけでなくマヨネーズやハンバーグのつなぎも避ける、乳アレルギーならバター・チーズ・生クリーム・練乳も避ける、小麦アレルギーなら醤油・パン粉・カレールウ・餃子の皮も避ける）。少しでも含まれる可能性がある料理は候補から外し、確実に安全と言える献立にしてください。ユーザーの文脈に「苦手な食材」が含まれる場合は好みの問題なので、無理のない範囲でできるだけ避けてください（アレルギーほど厳格でなくて構いません）。

献立は必ずしも主菜・副菜・汁物・主食をすべて揃える必要はありません。料理の種類に応じて自然な構成にしてください。

ラーメン・丼・カレー・パスタ・サンドイッチ・チャーハン・鍋物など、1品で主食・主菜・汁物のうち複数の役割を兼ねる料理を提案する場合は、項目名を「主菜」ではなく「メイン」にしてください。焼き魚や生姜焼きのように、はっきり主菜だけの料理の場合は「主菜」のままにしてください。
副菜・汁物・主食は、実際に追加で提案したい料理がある場合のみ記載してください。追加する品がない項目は行ごと丸々省略してください。「なし」「特になし」のように書いて空欄を埋めることは絶対にしないでください。

ユーザーの文脈に「献立には既に〜を使うことが決まっている」と書かれている場合、その品目の行は必ずそのタイトルをそのまま使ってください（言い換えたり別の料理に変えたりしないでください）。別料理の候補にも出さないでください。他の品目（まだ決まっていないもの）だけ、通常通り自然に考えて追加してください。

ユーザーの文脈に「直近◯日間に食べた料理」が含まれる場合、それと同じ料理は避けてください。「直近の栄養バランス」が含まれる場合、「不足気味」「やや少なめ」とされている系統（エネルギー系・たんぱく質系・野菜系）をさりげなく補うような献立を意識してください。ただしこれらの情報を参考にしていることや、「記録」「バランス」「栄養」といった言葉を使ってユーザーに説明したり匂わせたりしないでください。あくまで自然な提案として振る舞ってください。

ユーザーの文脈に「台所メモリー」が含まれる場合、それはこの家庭についての推測・傾向であり、確定した除外ルールではありません。食材を機械的に献立から外すのではなく、切り方（例: 細かく刻む）・味付けの濃さ・調理法などの工夫で自然に反映してください。台所メモリーの内容を踏まえて実際に何か工夫をした場合は、(導入の一言)の中でその工夫について一言だけ軽く触れてください（例:「ピーマン、細かく刻んでみたよ」）。ただし「台所メモリー」「傾向」「記録」といった言葉は使わず、言い当てるような断定的な言い方も避けてください。工夫をしていない場合や台所メモリーの情報がない場合は、無理に触れなくてかまいません。

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

ユーザーの文脈に「アレルギー」が含まれる場合、それは絶対に守るべき安全上の制約です。名指しされた食材そのものだけでなく、それを原材料として含む調味料・加工食品も一切使わないでください（例: 卵アレルギーならマヨネーズやつなぎの卵も避ける、乳アレルギーならバター・チーズ・生クリームも避ける、小麦アレルギーなら醤油・パン粉も避ける）。「苦手な食材」は好みの問題なので、無理のない範囲でできるだけ避けてください。

副菜・汁物・主食は、実際に追加で提案したい料理がある場合のみ値を入れてください。「なし」「特になし」のような値は絶対に使わず、追加する品がなければ必ずnullにしてください。

ユーザーの文脈に「献立には既に〜を使うことが決まっている」と書かれている場合、その品目は絶対に変更しないでください（updatedの対象にもしないでください）。

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

/** Overrides the pinned dish's slot in the merged proposal fields so a revision can never change it, regardless of what the AI returned for that slot. */
function applyPinnedOverride(fields: MenuFields, pinned: PinnedDish): MenuFields {
  switch (pinned.course) {
    case '主菜':
      return { ...fields, mainLabel: '主菜', main: pinned.title };
    case '副菜':
      return { ...fields, side: pinned.title };
    case '汁物':
      return { ...fields, soup: pinned.title };
    case '主食':
      return { ...fields, staple: pinned.title };
  }
}

/** Defensive safety net for the free-text initial proposal: force the pinned dish's line to its exact title even if the AI slightly reworded it. */
function enforcePinnedDish(text: string, pinned: PinnedDish): string {
  const labels = pinned.course === '主菜' ? ['主菜', 'メイン'] : [pinned.course];
  for (const label of labels) {
    const pattern = new RegExp(`・${label}：.*`);
    if (pattern.test(text)) {
      return text.replace(pattern, `・${pinned.course}：${pinned.title}`);
    }
  }
  return text.replace('🍽️ 献立', `🍽️ 献立\n・${pinned.course}：${pinned.title}`);
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
直前に確定した献立について、品目（料理）ごとに材料と作り方を教えてください。

確定した献立の「🍽️ 献立」に挙げられている品目（主菜またはメイン・副菜・汁物・主食のうち、実際に書かれているものだけ）ごとに1エントリを作ってください。品目名は献立に書かれた料理名をそのまま使ってください。「メイン」として挙げられていた品目も、courseは「主菜」にしてください。

白ごはん・食パンのように、切る・炒める・煮るといった調理を一切伴わない主食（盛り付けるだけのもの）は、dishesにエントリを作らないでください。それ以外の品目だけ生成してください。

ユーザーの文脈に「献立には既に〜を使うことが決まっている」と書かれている場合、その品目についてはdishesにエントリを作らないでください。それ以外の品目だけ生成してください。

ペロココの話し言葉ではなく、実際のレシピ本に書かれているような文体にしてください。「〜だよ」「〜してね」のような話しかける言い方や、「です」「ます」などの敬語は使わず、「〜を切る。」「〜を加えて炒める。」のように動詞の言い切り（辞書形）で簡潔に書いてください。

ユーザーの文脈に「アレルギー」が含まれる場合、それは絶対に守るべき安全上の制約です。材料・作り方のどこにも、該当食材そのものや、それを原材料として含む調味料・加工食品（例: 卵アレルギーならマヨネーズやつなぎの卵、乳アレルギーならバターやチーズ、小麦アレルギーなら醤油やパン粉など）を含めないでください。もし通常のレシピにそれらが使われる場合は、安全な代替品に置き換えてください。

主食のご飯の量など、厳密でなくてよい分量は「適量」としてください。このアプリはカロリー管理アプリではないため、すべての分量を厳密なグラム数で示す必要はありません。

指定されたJSON形式で応答してください。
・dishes: 品目ごとの配列。
  - course: 「主食」「主菜」「副菜」「汁物」のいずれか
  - title: 料理名
  - ingredients: 材料の配列。nameには材料名のみ、amountには指定された人数分の分量（単位を含む）を入れてください。
  - steps: 作り方の配列。1手順につき1つの文字列にしてください。`;

type FinalDish = {
  course: Course;
  title: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
};

const FINAL_RESPONSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    dishes: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          course: { type: 'string' as const, enum: ['主食', '主菜', '副菜', '汁物'] },
          title: { type: 'string' as const },
          ingredients: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: { name: { type: 'string' }, amount: { type: 'string' } },
              required: ['name', 'amount'],
              additionalProperties: false,
            },
          },
          steps: { type: 'array' as const, items: { type: 'string' } },
        },
        required: ['course', 'title', 'ingredients', 'steps'],
        additionalProperties: false,
      },
    },
  },
  required: ['dishes'],
  additionalProperties: false,
};

function sortByCourseOrder(dishes: FinalDish[]): FinalDish[] {
  const order = COURSE_OPTIONS.map((option) => option.value);
  return [...dishes].sort((a, b) => order.indexOf(a.course) - order.indexOf(b.course));
}

function buildFinalText(dishes: FinalDish[], plainStaple?: string): string {
  const lines = ['献立が決まりました！'];
  for (const dish of dishes) {
    lines.push('', `◆ ${dish.course}：${dish.title}`, '', '【材料】(指定された人数分)');
    dish.ingredients.forEach((i) => lines.push(`・${i.name} ${i.amount}`));
    lines.push('', '【作り方】');
    dish.steps.forEach((s, idx) => lines.push(`${idx + 1}. ${s}`));
  }
  if (plainStaple) lines.push('', `◆ 主食：${plainStaple}`);
  return lines.join('\n');
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

function buildFridgeHint(): string {
  return '今回は冷蔵庫にある食材から考えるシーンです。挙げられた食材だけで献立が完結するのが理想ですが、無理に全部使い切ろうとして不自然な組み合わせや謎料理にはしないでください。実際に美味しく作れる自然な組み合わせを優先し、挙げられた食材はほどほどに活用してください（使わない食材があってもかまいません）。挙げられていない食材を使う場合は、米・調味料・少量の薬味など家庭に常備されていそうなものに留め、肉・魚・野菜などの主要な食材を勝手に追加しないでください。';
}

function summarizeAnswers(answers: Answers): string {
  const entryLabel = ENTRY_POINT_OPTIONS.find((o) => o.value === answers.entryPoint)?.label ?? '未指定';
  const lines = [`シーン: ${entryLabel}`, `人数: ${answers.people ?? '未指定'}人`];

  if (answers.cookingTime) {
    lines.push(`調理時間の希望: ${answers.cookingTime === 'relaxed' ? '時間をかけてもよい' : 'ぱぱっと手早く'}`);
  }
  if (answers.mood?.trim()) lines.push(`今の気分: ${answers.mood.trim()}`);
  if (answers.allergens?.trim()) lines.push(`アレルギー（絶対に避けるべき安全上の制約）: ${answers.allergens.trim()}`);
  if (answers.dislikedFoods?.trim()) lines.push(`苦手な食材（できるだけ避けたい好み）: ${answers.dislikedFoods.trim()}`);
  if (answers.pinnedRecipe) {
    lines.push(`献立には既に「${answers.pinnedRecipe.course}：${answers.pinnedRecipe.title}」を使うことが決まっている（変更しないこと）`);
  }
  if (answers.ingredients?.trim()) {
    const label = answers.entryPoint === 'fridge' ? '冷蔵庫にある食材（必ずこれらを中心に使うこと）' : '使いたい食材';
    lines.push(`${label}: ${answers.ingredients.trim()}`);
  }
  if (answers.shopping) lines.push(`買い物: ${answers.shopping === 'yes' ? '可能' : '不可'}`);
  if (answers.mealHistory?.trim()) lines.push(answers.mealHistory.trim());
  if (answers.kitchenMemory?.trim()) lines.push(`台所メモリー:\n${answers.kitchenMemory.trim()}`);
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
          model: JAPANESE_CHAT_MODEL,
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
        let mergedFields: MenuFields = {
          mainLabel: previousFields.mainLabel,
          main: parsed.updatedMain?.trim() || previousFields.main,
          side: parsed.updatedSide?.trim() || previousFields.side,
          soup: parsed.updatedSoup?.trim() || previousFields.soup,
          staple: parsed.updatedStaple?.trim() || previousFields.staple,
          alternative: parsed.updatedAlternative?.trim() || previousFields.alternative,
        };
        if (answers.pinnedRecipe) mergedFields = applyPinnedOverride(mergedFields, answers.pinnedRecipe);
        const text = buildProposalText(parsed.intro, parsed.closing, mergedFields);
        return Response.json({ message: text });
      }

      const fridgeHint = answers.entryPoint === 'fridge' ? `\n${buildFridgeHint()}` : '';
      const response = await createJapaneseChatCompletion(openai, {
        model: JAPANESE_CHAT_MODEL,
        messages: [
          { role: 'system', content: PROPOSAL_SYSTEM_PROMPT },
          { role: 'user', content: `${summarizeAnswers(answers)}\n\n${buildVarietyHint()}${fridgeHint}` },
        ],
      });
      let text = response.choices[0]?.message.content ?? '';
      if (answers.pinnedRecipe) text = enforcePinnedDish(text, answers.pinnedRecipe);
      return Response.json({ message: text });
    }

    const proposalText: string = body.proposalText ?? '';
    const response = await createJapaneseChatCompletion(openai, {
      model: JAPANESE_CHAT_MODEL,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'menu_final', strict: true, schema: FINAL_RESPONSE_SCHEMA },
      },
      messages: [
        { role: 'system', content: FINAL_SYSTEM_PROMPT },
        { role: 'user', content: summarizeAnswers(answers) },
        { role: 'assistant', content: proposalText },
        { role: 'user', content: 'この献立で確定しました。材料と作り方を教えてください。' },
      ],
    });
    const raw = response.choices[0]?.message.content ?? '{}';
    const parsed = JSON.parse(raw);
    let dishes: FinalDish[] = parsed.dishes ?? [];
    if (answers.pinnedRecipe) {
      const pinned = answers.pinnedRecipe;
      dishes = [...dishes.filter((dish) => dish.course !== pinned.course), pinned];
    }
    const orderedDishes = sortByCourseOrder(dishes);
    const plainStaple = orderedDishes.some((dish) => dish.course === '主食')
      ? undefined
      : parseMenuFields(proposalText).staple;
    const text = buildFinalText(orderedDishes, plainStaple);
    return Response.json({ message: text, dishes: orderedDishes });
  } catch (error) {
    console.error(error);
    return Response.json({ message: 'AIとの通信でエラーが発生しました。しばらくしてからもう一度お試しください。' }, { status: 500 });
  }
}
