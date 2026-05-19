/**
 * UMD / IIFE entry. Bundled with CSS inlined and React tree-shaken out,
 * intended for `<script src="...stash-pay.umd.min.js">`.
 *
 * After loading, the global looks like:
 *   window.StashPay.open({...})
 *   window.StashPay.Controller
 *   window.StashPay.StashPayError
 *   window.StashPay.injectStyles()
 *   window.StashPay.version
 *
 * Implementation note: only named exports are used here so tsup/esbuild's IIFE
 * format (`globalName: 'StashPay'`) lands each method directly on the global.
 * A `default` export would land under `window.StashPay.default`.
 */

import { StashPayController, open as controllerOpen } from '../core/controller';
import { StashPayError as StashPayErrorClass } from '../core/errors';
import { injectStyles as injectStylesFn } from '../core/styles-inject';

// Auto-inject styles on load. Replaced inline at build time via tsup `define`.
if (typeof document !== 'undefined') injectStylesFn();

// Build-time define — string literal injected by tsup.
declare const __STASH_PAY_VERSION__: string;

export const open = controllerOpen;
export { StashPayController as Controller };
export { StashPayErrorClass as StashPayError };
export const injectStyles = injectStylesFn;
export const version: string = __STASH_PAY_VERSION__;
