/**
 * Framework-agnostic entry. Available as `@stashgg/stash-pay/vanilla`.
 * Does not import React.
 */

export { StashPayController, open } from './controller';
export { injectStyles } from './styles-inject';
export { StashPayError } from './errors';
export type { StashPayErrorCode } from './errors';
export type {
  PaymentFailureEvent,
  PaymentProcessingEvent,
  PaymentSuccessEvent,
  StashCheckoutTheme,
  StashPayBackdropOptions,
  StashPayEventMap,
  StashPayHandle,
  StashPayIframeOptions,
  StashPayOptions,
  StashPayPosition,
  StashPayState,
  StashPayTheme,
  StashPaymentEvent,
} from './types';
