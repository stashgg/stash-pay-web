/**
 * Connection warming — inject resource hints so the browser resolves DNS and
 * completes the TCP + TLS handshake to the checkout origin *before* the iframe
 * navigates. On a cold connection this overlaps the handshake with the rest of
 * mount, moving it off the critical path of the first checkout load (the
 * document plus its same-origin JS chunks all reuse the warmed connection).
 *
 * The hints are credentialed (no `crossorigin`) to match the iframe document
 * navigation and its same-origin subresource fetches. Idempotent per origin
 * and safe to call repeatedly.
 */

const HINT_ATTR = 'data-stash-pay-preconnect';
const warmed = new Set<string>();

function injectHint(rel: string, origin: string): void {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = origin;
  link.setAttribute(HINT_ATTR, '');
  document.head.appendChild(link);
}

/** Warm a known-good origin exactly once per page. */
export function preconnectOrigin(origin: string): void {
  if (typeof document === 'undefined') return;
  if (warmed.has(origin)) return;
  warmed.add(origin);
  // `preconnect` covers DNS + TCP + TLS; `dns-prefetch` is a fallback for
  // browsers that ignore preconnect.
  injectHint('preconnect', origin);
  injectHint('dns-prefetch', origin);
}

/**
 * Warm the connection to a checkout URL's origin ahead of `open()`.
 *
 * Call this as early as the checkout host is known — e.g. when a buy button
 * renders — to take DNS/TLS off the critical path of the first checkout load.
 * Invalid or non-http(s) input is ignored; safe to call outside the browser.
 */
export function preconnect(checkoutUrl: string): void {
  if (typeof document === 'undefined') return;
  let origin: string;
  try {
    const url = new URL(checkoutUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    origin = url.origin;
  } catch {
    return;
  }
  preconnectOrigin(origin);
}
