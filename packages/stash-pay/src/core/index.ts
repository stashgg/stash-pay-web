/**
 * Framework-agnostic entry. Available as `@stashgg/stash-pay/vanilla`.
 * Does not import React.
 */

export {
  StashPayController,
  open,
  StashPayError,
  toStashPayError,
} from './controller';
export { injectStyles } from './styles-inject';
export { preconnect } from './preconnect';
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
} from './types';
