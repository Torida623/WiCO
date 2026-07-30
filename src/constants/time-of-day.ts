const DAYTIME_START_HOUR = 6;
const DAYTIME_END_HOUR = 18;

// Set to true/false to force day/night for testing; null uses the real clock.
const FORCE_DAYTIME: boolean | null = null;

export function isDaytime(): boolean {
  if (FORCE_DAYTIME !== null) return FORCE_DAYTIME;
  const hour = new Date().getHours();
  return hour >= DAYTIME_START_HOUR && hour < DAYTIME_END_HOUR;
}
