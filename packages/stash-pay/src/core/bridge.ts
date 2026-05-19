/**
 * In-iframe bridge — mirrors the `window.stash_sdk` surface that native
 * WebViews expose, so the same checkout code runs in browser iframes.
 *
 * Wired on every iframe `load` so it survives internal navigations
 * (3DS, redirects back to the checkout origin, etc.).
 *
 * Cross-origin caveat: the browser blocks direct access to
 * `iframe.contentWindow` properties for iframes whose document is on a
 * different origin than the host page. In that case the installer
 * throws — we swallow the error and rely on the legacy postMessage
 * channel defined in `events.ts`. For `window.stash_sdk` to work the
 * checkout page must be served from the same origin as the host (e.g.
 * via a custom domain / reverse proxy), which is the standard Stash
 * Pay deployment pattern.
 */

import type {
  PaymentFailureEvent,
  PaymentProcessingEvent,
  PaymentSuccessEvent,
} from './types';

export interface BridgeHandlers {
  onSuccess: (event: PaymentSuccessEvent) => void;
  onFailure: (event: PaymentFailureEvent) => void;
  onProcessing: (event: PaymentProcessingEvent) => void;
  onClose: () => void;
  onExpand?: () => void;
  onCollapse?: () => void;
  onOpenExternalBrowser?: (url: string) => void;
}

function coerceRaw(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readString(
  source: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = source[key];
  return typeof v === 'string' ? v : undefined;
}

/**
 * Install the `stash_sdk` object and a `close` shim on the iframe's window.
 * Returns `true` on success, `false` when access was denied by the
 * same-origin policy (this is normal for cross-origin checkout URLs).
 */
export function installBridge(
  iframe: HTMLIFrameElement,
  handlers: BridgeHandlers,
): boolean {
  const win = safeContentWindow(iframe);
  if (!win) return false;

  try {
    const sdk = {
      onPaymentSuccess(payload: unknown) {
        const raw = coerceRaw(payload);
        handlers.onSuccess({
          type: 'success',
          orderId: readString(raw, 'orderId'),
          raw,
        });
      },
      onPaymentFailure(payload: unknown) {
        const raw = coerceRaw(payload);
        handlers.onFailure({
          type: 'failure',
          orderId: readString(raw, 'orderId'),
          errorCode: readString(raw, 'errorCode'),
          message: readString(raw, 'message'),
          raw,
        });
      },
      onPurchaseProcessing(payload: unknown) {
        const raw = coerceRaw(payload);
        handlers.onProcessing({ type: 'processing', raw });
      },
      expand() {
        handlers.onExpand?.();
      },
      collapse() {
        handlers.onCollapse?.();
      },
      openExternalBrowser(url: unknown) {
        if (typeof url !== 'string') return;
        if (handlers.onOpenExternalBrowser) {
          handlers.onOpenExternalBrowser(url);
          return;
        }
        try {
          window.open(url, '_blank', 'noopener,noreferrer');
        } catch {
          /* popup blocked */
        }
      },
    };

    // Attach to the iframe's own window — same identity the checkout uses.
    (win as unknown as { stash_sdk: typeof sdk }).stash_sdk = sdk;

    // `window.close()` from a header close button — normally a no-op inside
    // an iframe. We shadow it on the iframe's window so the checkout's
    // existing close affordance drives our host-side close handler.
    try {
      Object.defineProperty(win, 'close', {
        configurable: true,
        writable: true,
        value: () => handlers.onClose(),
      });
    } catch {
      /* some engines don't let you redefine close; ignore */
    }

    return true;
  } catch {
    // Cross-origin document — SecurityError. Silent fall-through to
    // the legacy postMessage channel.
    return false;
  }
}

function safeContentWindow(iframe: HTMLIFrameElement): Window | null {
  try {
    return iframe.contentWindow ?? null;
  } catch {
    return null;
  }
}
