import OpenAI from 'openai';

export const JAPANESE_CHAT_MODEL = 'gpt-5.6-terra';

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
