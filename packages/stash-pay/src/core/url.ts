/**
 * Checkout URL validation.
 *
 * `checkoutUrl` is assigned directly to the iframe `src`; an invalid value
 * silently leaves the checkout stuck on its loading spinner. Validating up
 * front lets the SDK fail fast through `onError` instead.
 */

import { StashPayError } from './errors';

export type ValidatedUrl =
  | { ok: true; url: URL }
  | { ok: false; error: StashPayError };

/**
 * Validate a checkout URL. It must be an **absolute** `http:`/`https:` URL,
 * and — when `allowedHosts` is a non-empty list — its host must match an
 * entry.
 *
 * @param raw           The `checkoutUrl` option, as supplied by the host.
 * @param allowedHosts  Optional host allowlist. Entries may be exact hosts
 *                      (`'pay.stash.gg'`) or `'*.domain'` wildcards (apex and
 *                      any subdomain). Undefined or empty = no constraint.
 */
export function validateCheckoutUrl(
  raw: string,
  allowedHosts?: string[],
): ValidatedUrl {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') {
    return {
      ok: false,
      error: new StashPayError('INVALID_URL', 'checkoutUrl is empty.'),
    };
  }

  // A checkout URL is always absolute — it points at the Stash checkout host.
  // Parsing without a base URL rejects bare/relative strings (`'not-a-url'`,
  // `'pay.stash.gg/checkout'`) that would otherwise resolve against the host
  // page and silently 404 inside the iframe.
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ok: false,
      error: new StashPayError(
        'INVALID_URL',
        `checkoutUrl is not a valid absolute URL: "${trimmed}".`,
        { checkoutUrl: raw },
      ),
    };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      ok: false,
      error: new StashPayError(
        'INVALID_URL',
        `checkoutUrl must use http: or https: (got "${url.protocol}").`,
        { checkoutUrl: raw, protocol: url.protocol },
      ),
    };
  }

  if (allowedHosts && allowedHosts.length > 0) {
    const host = url.hostname.toLowerCase();
    if (!allowedHosts.some((pattern) => hostMatches(host, pattern))) {
      return {
        ok: false,
        error: new StashPayError(
          'DOMAIN_NOT_ALLOWED',
          `checkoutUrl host "${host}" is not in allowedCheckoutHosts.`,
          { host, allowedHosts },
        ),
      };
    }
  }

  return { ok: true, url };
}

/**
 * Match a (lowercased) host against one allowlist entry. A `'*.domain'` entry
 * matches the apex and any subdomain; any other entry is an exact match.
 */
function hostMatches(host: string, pattern: string): boolean {
  const p = pattern.trim().toLowerCase();
  if (p === '') return false;
  if (p.startsWith('*.')) {
    const bare = p.slice(2);
    if (bare === '') return false;
    return host === bare || host.endsWith('.' + bare);
  }
  return host === p;
}
