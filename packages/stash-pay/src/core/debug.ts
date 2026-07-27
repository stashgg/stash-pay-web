/**
 * Gated debug logger. No-ops unless `enabled` is `true`.
 * Prefixed for easy console filtering; uses `console.debug` so it stays
 * distinct from the always-on `console.error` in the emitter.
 */
export function debugLog(
  enabled: boolean | undefined,
  ...args: unknown[]
): void {
  if (!enabled) return;
  // eslint-disable-next-line no-console
  console.debug("[stash-pay]", ...args);
}
