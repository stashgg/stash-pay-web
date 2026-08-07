/**
 * Detect WebKit (Safari engine) for wallet / storage-partitioning workarounds.
 *
 * Google Pay cannot complete inside a cross-origin iframe on WebKit because
 * storage partitioning breaks the `pay.google.com` popup handoff. On those
 * engines the SDK opens checkout top-level instead of mounting an iframe.
 *
 * Logic mirrors checkout (`is-webkit-engine.ts`): iOS UAs, iPadOS desktop UA,
 * and desktop Safari (Safari/ without Chromium-family tokens).
 */

export interface WebKitEngineHints {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}

/**
 * Returns `true` when the environment is WebKit (desktop Safari or any iOS
 * browser). Pass `hints` in tests; in browsers, reads `navigator`.
 */
export function isWebKitEngine(hints?: WebKitEngineHints): boolean {
  const nav =
    typeof navigator !== "undefined"
      ? navigator
      : (undefined as Navigator | undefined);

  const userAgent = hints?.userAgent ?? nav?.userAgent ?? "";
  const platform = hints?.platform ?? nav?.platform ?? "";
  const maxTouchPoints = hints?.maxTouchPoints ?? nav?.maxTouchPoints ?? 0;

  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;

  // iPadOS 13+ can report as Macintosh with touch.
  if (platform === "MacIntel" && maxTouchPoints > 1) return true;

  // Desktop Safari: has Safari/ but not Chromium / Edge / Opera / Android WebView.
  if (
    /Safari\//i.test(userAgent) &&
    !/Chrome|Chromium|Edg|OPR|Android/i.test(userAgent)
  ) {
    return true;
  }

  return false;
}
