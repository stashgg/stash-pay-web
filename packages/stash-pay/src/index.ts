/**
 * @stashgg/stash-pay — default entry.
 * React wrapper + re-exported public types.
 * Framework-agnostic primitives live at `@stashgg/stash-pay/vanilla`.
 */

export { StashPay, useStashPay } from './react';
export type { StashPayProps } from './react';
export { preconnect } from './core/preconnect';
export { isWebKitEngine } from './core/is-webkit-engine';
export type { WebKitEngineHints } from './core/is-webkit-engine';
export { StashPayError } from './core/errors';
export type {
  PaymentFailureEvent,
  PaymentProcessingEvent,
  PaymentSuccessEvent,
  StashCheckoutTheme,
  StashPayBackdropOptions,
  StashPayErrorCode,
  StashPayEventMap,
  StashPayHandle,
  StashPayIframeOptions,
  StashPayOptions,
  StashPayPosition,
  StashPayState,
  StashPayTheme,
  StashPaymentEvent,
} from './core/types';
