/** Perokoko's footer-bubble dialogue on the decided-menus screen. Picked randomly from whichever
 * pools match the current time (and day of week, for the special variants), so the line changes
 * every time the screen is focused. */

type TimeBand = {
  /** Minutes since midnight, inclusive. */
  startMinute: number;
  endMinute: number;
  lines: string[];
};

type DaySpecialBand = TimeBand & {
  /** Date#getDay() — 0 = Sunday .. 6 = Saturday. */
  day: number;
};

function toMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

const TIME_BANDS: TimeBand[] = [
  {
    // 早朝 5:00-8:59
    startMinute: toMinutes(5, 0),
    endMinute: toMinutes(8, 59),
    lines: [
      'おはよ〜！朝ごはん、何にする？',
      '今日の朝は、なに食べたい気分？',
      '朝ごはん、一緒に考えよ〜！おいしい一日にしようね！',
      'あったかいのもいいな〜。朝ごはん、なに作ろっか？',
      'パンにする？ごはんにする？……どっちも？',
      '朝ごはん、もう決まった？まだなら一緒に考えよ！',
      '目玉焼きもいいし、たまご焼きもいいし……たまごが足りないや。',
      '冷蔵庫になに入ってるかな〜。朝ごはんにできそうなのあるかな？',
      '朝は軽めにする？それとも、しっかり食べちゃう？',
      '今日はじめてのごはんだ〜！おいしいの、一緒に考えよ！',
    ],
  },
  {
    // 午前 9:00-11:29
    startMinute: toMinutes(9, 0),
    endMinute: toMinutes(11, 29),
    lines: [
      '今日はなに食べようかな〜。食べたいもの、もう決まってる？',
      '冷蔵庫になにがあったっけ？おいしく使えるもの、探してみよ〜！',
      '今日のごはん、まだ決まってない？じゃあ一緒に考えよう！',
      '昨日と違うもの食べたいな〜。今日はなににする？',
      '食べたいものが決まらない日ってあるよね〜。そんな日は任せて！',
      'お肉もいいし、お魚もいいな〜。おなかがふたつあったらいいのに。',
      '今日は、いつものごはん？それとも新しいのにしてみる？',
      '冷蔵庫のあれとこれ……一緒にしたら、おいしくなるかな？',
      'お昼どうする〜？まだ早いけど、考えてたらおなかすいてきた。',
      'なに食べようかな〜って考える時間、けっこう好きなんだ。',
    ],
  },
  {
    // お昼 11:30-13:59
    startMinute: toMinutes(11, 30),
    endMinute: toMinutes(13, 59),
    lines: [
      'お昼だ〜！今日はなに食べよっか？',
      'おなかすいた〜。おいしいもの、早く考えよ！',
      'お昼ごはん、ぱぱっと作る？それとも、ちゃんと作っちゃう？',
      '麺にする？ごはんにする？パンもあるね……選べない。',
      'お昼って、なんでも食べていい感じがして好き〜。',
      '冷蔵庫にあるもので、おいしいお昼ごはん作れるかな？',
      '今日のお昼は、いつもの味？ちょっと冒険してみる？',
      'おなかすいたときにごはんの写真見るの、きけんだね……。',
      '食べたいものいっぱいあるのに、お昼は一回しかないの？',
      'よーし、お昼ごはん考えよ！おなかはもう準備できてるよ〜。',
    ],
  },
  {
    // 午後 14:00-16:59
    startMinute: toMinutes(14, 0),
    endMinute: toMinutes(16, 59),
    lines: [
      '晩ごはん、なににしようかな〜。まだゆっくり考えられるね！',
      '今日の夜、なに食べたい？今ならいっぱい悩めるよ〜。',
      'そろそろおやつの時間かな？……ごはんを考えに来たんだった。',
      '冷蔵庫にいる食材たち、今日は誰の出番かな〜？',
      '晩ごはんまでまだあるのに、食べたいもの考えたらおなかすいてきた。',
      '時間あるし、今日はちょっとだけ手のこんだごはんにする？',
      'おやつ食べすぎると晩ごはん入らないんだって。困ったなぁ。',
      '今日使いたい食材ある？おいしくしてあげよ〜！',
      '晩ごはん決めたら、おやつにしよっか。……順番、大事だからね。',
      '星クッキーはおやつだから、献立には……入らないかぁ。',
    ],
  },
  {
    // 夜 17:00-20:59
    startMinute: toMinutes(17, 0),
    endMinute: toMinutes(20, 59),
    lines: [
      '今日も一日おつかれさま〜！おいしいもの食べよ！',
      'よーし、晩ごはんの時間だ〜！おなかすいたね！',
      '今日もごはん作るの？えらい！いっぱい応援するね〜！',
      'いいにおいするかな〜。まだ作ってないのに楽しみ！',
      '疲れた日は、簡単でおいしいのがいちばんだよ〜。',
      'エプロンつけた？手も洗った？……おなかの準備はできてる？',
      '晩ごはん作ろ〜！今日はどんな味になるかな？',
      'お料理してる音っていいよね〜。ジュ〜っていうの好き！',
      'できたてのごはんって、ちょっと特別だよね〜。',
      'よーし、作るぞ〜！……食べる係も必要だったら呼んでね。',
    ],
  },
  {
    // 深夜 21:00-4:59 (wraps past midnight)
    startMinute: toMinutes(21, 0),
    endMinute: toMinutes(4, 59),
    lines: [
      '今日はどんなごはん食べた？おいしかった〜？',
      '明日はなに食べようかな〜。今から考えるのも楽しいね！',
      'まだごはん食べてない？じゃあ、おいしいの考えよ〜！',
      '夜に見るごはんの写真って、なんでこんなにおいしそうなの……。',
      '明日のごはん、先に決めちゃう？楽しみがひとつ増えるよ〜！',
      '今日も一日おつかれさま！おいしいもの、ちゃんと食べられた？',
      'こんな時間におなかすいたら……なに食べるのが正解なんだろ。',
      '夜って、急にあったかいもの食べたくなるときあるよね〜。',
      '明日はなに食べようかな〜。考えてたらおなかすいてきた。',
      'おなかすいてないよ。……ごはんのこと考えてただけだよ。',
    ],
  },
];

const DAY_SPECIAL_BANDS: DaySpecialBand[] = [
  {
    // 月曜日 5:00-11:29
    day: 1,
    startMinute: toMinutes(5, 0),
    endMinute: toMinutes(11, 29),
    lines: [
      '月曜日だ〜！今週もおいしいものいっぱい食べようね！',
      '新しい一週間だ〜！最初のごはん、なににしよっか？',
      '今週はどんなごはんに出会えるかな〜。楽しみ！',
    ],
  },
  {
    // 月曜日 17:00-20:59
    day: 1,
    startMinute: toMinutes(17, 0),
    endMinute: toMinutes(20, 59),
    lines: [
      '月曜日、おつかれさま〜！おいしいもの食べて元気だそ！',
      '一週間始まったばっかりだもん。今日は無理しないごはんでもいいよ〜。',
    ],
  },
  {
    // 水曜日 17:00-20:59
    day: 3,
    startMinute: toMinutes(17, 0),
    endMinute: toMinutes(20, 59),
    lines: ['今週も半分くらいきた〜！今日もおつかれさま！', '週のまんなかだ〜。おいしい晩ごはんでちょっと休憩しよ！'],
  },
  {
    // 金曜日 17:00-20:59
    day: 5,
    startMinute: toMinutes(17, 0),
    endMinute: toMinutes(20, 59),
    lines: [
      '金曜日だ〜！今日はちょっとごちそうにする？',
      '今週もおつかれさま〜！晩ごはん、ちょっと楽しんじゃう？',
      '金曜日の晩ごはんって、なんかわくわくするね〜！',
    ],
  },
  {
    // 土曜日 9:00-16:59
    day: 6,
    startMinute: toMinutes(9, 0),
    endMinute: toMinutes(16, 59),
    lines: [
      '土曜日だ〜！今日はゆっくりごはん考えられるかな？',
      'お休みのお昼って、いつもと違うもの食べたくならない？',
      '土曜日だし、ちょっと新しいごはんに挑戦してみる？',
    ],
  },
  {
    // 土曜日 17:00-20:59
    day: 6,
    startMinute: toMinutes(17, 0),
    endMinute: toMinutes(20, 59),
    lines: ['土曜日の晩ごはんだ〜！ちょっと手のこんだのもいいね！', '今日の晩ごはん、みんなで食べたくなるのにする？'],
  },
  {
    // 日曜日 9:00-16:59
    day: 0,
    startMinute: toMinutes(9, 0),
    endMinute: toMinutes(16, 59),
    lines: [
      '日曜日〜！今日はどんなごはんにしよっか？',
      '日曜日のお昼、なに食べようかな〜。ちょっと迷うね。',
      '明日の分も考えとく？……まず今日のごはんだった。',
    ],
  },
  {
    // 日曜日 17:00-20:59
    day: 0,
    startMinute: toMinutes(17, 0),
    endMinute: toMinutes(20, 59),
    lines: [
      '日曜日もおつかれさま〜！最後はおいしいもので締めよ！',
      '明日からまた一週間だ〜。その前に、おいしい晩ごはん食べよ！',
      '今週最後の晩ごはん、なににしよっか？',
    ],
  },
];

function inBand(minutes: number, startMinute: number, endMinute: number): boolean {
  if (startMinute <= endMinute) return minutes >= startMinute && minutes <= endMinute;
  return minutes >= startMinute || minutes <= endMinute; // band wraps past midnight
}

function pickRandom(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

/** Random Perokoko line for right now — mixes the current time band's lines with any day-specific
 * lines that also apply (e.g. a Friday-evening line still shares the pool with the regular 夜 lines). */
export function pickPerokokoLine(now: Date = new Date()): string {
  const minutes = toMinutes(now.getHours(), now.getMinutes());
  const day = now.getDay();

  const timeBand = TIME_BANDS.find((band) => inBand(minutes, band.startMinute, band.endMinute));
  const daySpecialLines = DAY_SPECIAL_BANDS.filter(
    (band) => band.day === day && inBand(minutes, band.startMinute, band.endMinute),
  ).flatMap((band) => band.lines);

  const pool = [...(timeBand?.lines ?? []), ...daySpecialLines];
  return pool.length > 0 ? pickRandom(pool) : '';
}
