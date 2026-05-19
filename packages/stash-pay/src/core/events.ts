/**
 * postMessage parsing: wire format → typed `StashPaymentEvent`.
 *
 * Two envelope shapes are recognised:
 *
 *   1. Legacy (v1):
 *      { eventName: 'STASH_WINDOW_EVENT__PAYMENT_SUCCESS', ...additionalFields }
 *
 *   2. stash_sdk fallback — same surface the in-iframe bridge exposes,
 *      but forwarded over postMessage for cross-origin embeds where the
 *      bridge cannot be installed:
 *      { source: 'stash_sdk', method: 'onPaymentSuccess', payload: {...} }
 *
 * Both envelopes resolve to the same typed event union.
 */

import { MESSAGE_PREFIX } from './constants';
import type {
  PaymentFailureEvent,
  PaymentProcessingEvent,
  PaymentSuccessEvent,
  StashPaymentEvent,
} from './types';

type LegacyKind = 'PAYMENT_SUCCESS' | 'PAYMENT_FAILURE' | 'PURCHASE_PROCESSING';

const LEGACY_KINDS = new Set<LegacyKind>([
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILURE',
  'PURCHASE_PROCESSING',
]);

type BridgeMethod =
  | 'onPaymentSuccess'
  | 'onPaymentFailure'
  | 'onPurchaseProcessing';

const BRIDGE_METHODS = new Set<BridgeMethod>([
  'onPaymentSuccess',
  'onPaymentFailure',
  'onPurchaseProcessing',
]);

/**
 * Parse a `MessageEvent` into a typed SDK event, or `null` when the
 * message is not a recognised Stash envelope.
 *
 * @param event           Raw `MessageEvent`.
 * @param allowedOrigins  Optional origin whitelist. If set, messages from
 *                        other origins are dropped. Undefined = permissive.
 */
export function parseMessage(
  event: MessageEvent,
  allowedOrigins?: string[],
): StashPaymentEvent | null {
  if (allowedOrigins && allowedOrigins.length > 0) {
    if (!allowedOrigins.includes(event.origin)) return null;
  }

  const data = event.data;
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;

  // Shape 2: stash_sdk envelope (preferred going forward).
  if (record.source === 'stash_sdk') {
    return parseStashSdkEnvelope(record);
  }

  // Shape 1: legacy STASH_WINDOW_EVENT__ prefix.
  if ('eventName' in record) {
    return parseLegacyEnvelope(record);
  }

  return null;
}

function parseStashSdkEnvelope(
  record: Record<string, unknown>,
): StashPaymentEvent | null {
  const method = record.method;
  if (typeof method !== 'string') return null;
  if (!BRIDGE_METHODS.has(method as BridgeMethod)) return null;

  const payload = record.payload;
  const raw =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  return buildEvent(method as BridgeMethod, raw);
}

function parseLegacyEnvelope(
  record: Record<string, unknown>,
): StashPaymentEvent | null {
  const eventName = record.eventName;
  if (typeof eventName !== 'string' || !eventName.startsWith(MESSAGE_PREFIX)) {
    return null;
  }
  const kind = eventName.slice(MESSAGE_PREFIX.length) as LegacyKind;
  if (!LEGACY_KINDS.has(kind)) return null;

  const raw = { ...record };
  delete raw.eventName;

  return buildEvent(legacyKindToMethod(kind), raw);
}

function legacyKindToMethod(kind: LegacyKind): BridgeMethod {
  switch (kind) {
    case 'PAYMENT_SUCCESS':
      return 'onPaymentSuccess';
    case 'PAYMENT_FAILURE':
      return 'onPaymentFailure';
    case 'PURCHASE_PROCESSING':
      return 'onPurchaseProcessing';
  }
}

function buildEvent(
  method: BridgeMethod,
  raw: Record<string, unknown>,
): StashPaymentEvent {
  const readString = (key: string): string | undefined =>
    typeof raw[key] === 'string' ? (raw[key] as string) : undefined;

  switch (method) {
    case 'onPaymentSuccess': {
      const ev: PaymentSuccessEvent = {
        type: 'success',
        orderId: readString('orderId'),
        raw,
      };
      return ev;
    }
    case 'onPaymentFailure': {
      const ev: PaymentFailureEvent = {
        type: 'failure',
        orderId: readString('orderId'),
        errorCode: readString('errorCode'),
        message: readString('message'),
        raw,
      };
      return ev;
    }
    case 'onPurchaseProcessing': {
      const ev: PaymentProcessingEvent = { type: 'processing', raw };
      return ev;
    }
  }
}
