/**
 * Placeholder entitlement checks until real subscription infra (RevenueCat) exists.
 * Each function here is a single seam to swap for a real tier check later — grep this
 * file's exports when wiring up real subscriptions, instead of hunting through every
 * screen that currently just renders a static lock icon.
 */
export function hasRecipeSearchAccess(): boolean {
  // TODO: 動作確認のため一時的にtrue固定にしてる。確認が終わったらfalseに戻すこと。
  return true;
}
