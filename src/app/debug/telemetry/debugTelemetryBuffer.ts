export const DEBUG_AUTOMATION_BUFFER_LIMIT = 100;
export const DEBUG_EVENT_BUFFER_LIMIT = 500;
export const DEBUG_RNG_BUFFER_LIMIT = 100;
export const DEBUG_TELEMETRY_FLUSH_MS = 100;

export function appendRing<T>(items: T[], additions: T[], limit: number) {
  return [...items, ...additions].slice(-limit);
}

