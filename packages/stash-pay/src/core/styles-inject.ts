/**
 * Runtime CSS injection with dedupe guard.
 * Used exclusively by the UMD bundle and by consumers who opt into
 * `injectStyles: true` from ESM.
 */

import { STYLE_TAG_ID } from './constants';

/**
 * Populated at build time by the UMD bundle via a tsup `define`:
 *   `__STASH_PAY_CSS__: JSON.stringify(cssContent)`.
 * In ESM/CJS builds this stays the empty string, and `injectStyles()` is a
 * no-op unless the caller supplies CSS themselves.
 */
declare const __STASH_PAY_CSS__: string | undefined;

function getEmbeddedCss(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return typeof __STASH_PAY_CSS__ === 'string' ? __STASH_PAY_CSS__ : '';
  } catch {
    return '';
  }
}

export interface InjectStylesOptions {
  /** Explicit CSS text. If omitted, uses the build-time embedded CSS. */
  css?: string;
  /** CSP nonce for the injected `<style>`. */
  nonce?: string;
  /** Insert at `head` prepend (default true — consumers can override). */
  prepend?: boolean;
}

/**
 * Inject the SDK stylesheet once per document. Safe to call repeatedly.
 * Returns true if injection occurred, false if a tag was already present
 * or there is nothing to inject.
 */
export function injectStyles(opts: InjectStylesOptions = {}): boolean {
  if (typeof document === 'undefined') return false;

  const existing = document.getElementById(STYLE_TAG_ID);
  if (existing) return false;

  const css = opts.css ?? getEmbeddedCss();
  if (!css) return false;

  const style = document.createElement('style');
  style.id = STYLE_TAG_ID;
  style.setAttribute('data-stash-pay-styles', 'true');
  if (opts.nonce) style.setAttribute('nonce', opts.nonce);
  style.textContent = css;

  const parent = document.head || document.documentElement;
  if (opts.prepend === false) {
    parent.appendChild(style);
  } else {
    parent.prepend(style);
  }
  return true;
}
