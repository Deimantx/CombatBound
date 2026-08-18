/** Converts a result amount into the player's effective full-skip hourly rate. */
export function perHour(amount: number, requestedSeconds: number): number {
  return requestedSeconds > 0 && Number.isFinite(amount)
    ? Math.max(0, amount) * 3600 / requestedSeconds
    : 0;
}
