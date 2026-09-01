import OpenAI from 'openai';

export const JAPANESE_CHAT_MODEL = 'gpt-5.6-terra';

/**
 * Lighter/faster sibling for tasks that are instruction-following rather than
 * deep reasoning (e.g. picking a few dishes for a menu). ~2x faster than the
 * flagship with much less latency variance, so it stays under the client's
 * fetch timeout reliably.
 */
export const JAPANESE_CHAT_MODEL_FAST = 'gpt-5.4-mini';

const FOREIGN_SCRIPT_PATTERN = /[ऀ-ॿЀ-ӿ؀-ۿ가-힣฀-๿]/;

/**
 * The model occasionally slips into a foreign script mid-response. Since the
 * app only ever speaks Japanese, retry a couple of times rather than showing
 * the user a broken reply.
 */
export async function createJapaneseChatCompletion(
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
