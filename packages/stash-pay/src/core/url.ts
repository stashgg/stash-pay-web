import { StashPayError } from './errors';

type ValidateOk = { ok: true; url: URL };
type ValidateFail = { ok: false; error: StashPayError };
export type ValidateCheckoutUrlResult = ValidateOk | ValidateFail;

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

export function validateCheckoutUrl(
  raw: string | undefined,
  allowedHosts?: string[],
): ValidateCheckoutUrlResult {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') {
    return {
      ok: false,
      error: new StashPayError('INVALID_URL', 'checkoutUrl is empty.'),
    };
  }

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

export function resolveCheckoutUrl(
  checkoutUrl: string,
  checkoutTheme: 'light' | 'dark' | undefined,
  checkoutLocale: string | undefined,
  allowedCheckoutHosts: string[] | undefined,
): ValidateCheckoutUrlResult {
  const result = validateCheckoutUrl(checkoutUrl, allowedCheckoutHosts);
  if (!result.ok) return result;
  if (checkoutTheme) {
    result.url.searchParams.set('theme', checkoutTheme);
  }
  const locale = checkoutLocale?.trim();
  if (locale) {
    result.url.searchParams.set('locale', locale);
  }
  return result;
}

export function resolveMountContainer(
  raw: HTMLElement | undefined,
): HTMLElement {
  if (raw === undefined) {
    return document.body;
  }
  if (!(raw instanceof HTMLElement)) {
    throw new StashPayError(
      'MOUNT_ERROR',
      'container must be an HTMLElement.',
      { container: raw },
    );
  }
  return raw;
}
