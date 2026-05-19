'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { StashPayController } from '../core/controller';
import { toStashPayError, type StashPayError } from '../core/errors';
import type {
  PaymentFailureEvent,
  PaymentProcessingEvent,
  PaymentSuccessEvent,
  StashCheckoutTheme,
  StashPayBackdropOptions,
  StashPayIframeOptions,
  StashPayOptions,
  StashPayPosition,
  StashPayTheme,
} from '../core/types';

export interface StashPayProps {
  /** Declarative open state. */
  isOpen: boolean;
  /** Checkout URL. `null` is a no-op (component stays unmounted). */
  checkoutUrl: string | null;
  /** Colour scheme forwarded to the checkout page via `?theme=`. */
  checkoutTheme?: StashCheckoutTheme;

  // Layout
  position?: StashPayPosition;
  width?: string | number;
  height?: string | number;
  /** Alias for vanilla `container`. Defaults to `document.body`. */
  portalTarget?: HTMLElement;
  zIndex?: number;

  // Chrome
  showCloseButton?: boolean;
  showDragBar?: boolean;

  // Dismiss
  dismissOnBackdropClick?: boolean;
  dismissOnEscape?: boolean;

  // Auto-close
  autoCloseOnSuccess?: boolean;
  autoCloseOnFailure?: boolean;

  // Styling
  backdrop?: StashPayBackdropOptions;
  theme?: StashPayTheme;
  injectStyles?: boolean;
  cspNonce?: string;
  ariaLabel?: string;

  // Iframe
  iframe?: StashPayIframeOptions;

  // Motion
  animationDuration?: number;

  // Reliability
  /** Host allowlist for `checkoutUrl`; exact hosts or `*.domain` wildcards. */
  allowedCheckoutHosts?: string[];
  /** Ms to wait for the iframe's first load before `onError(NETWORK_ERROR)`. Omitted/0 = off. */
  loadTimeout?: number;

  // Callbacks
  onOpen?: () => void;
  onClose?: () => void;
  onReady?: () => void;
  onError?: (e: StashPayError) => void;
  onSuccess?: (e: PaymentSuccessEvent) => void;
  onFailure?: (e: PaymentFailureEvent) => void;
  onProcessing?: (e: PaymentProcessingEvent) => void;
}

/**
 * Serializable option keys — when any of these change, the controller's
 * `update()` is called. Callback identities are deliberately excluded; they
 * live behind a ref so parent re-renders do not thrash the DOM.
 */
const DOM_OPTION_KEYS: (keyof StashPayProps)[] = [
  'checkoutUrl',
  'checkoutTheme',
  'position',
  'width',
  'height',
  'zIndex',
  'showCloseButton',
  'showDragBar',
  'dismissOnBackdropClick',
  'dismissOnEscape',
  'autoCloseOnSuccess',
  'autoCloseOnFailure',
  'backdrop',
  'theme',
  'ariaLabel',
  'iframe',
  'animationDuration',
  'allowedCheckoutHosts',
  'loadTimeout',
];

function buildOptions(
  propsRef: React.MutableRefObject<StashPayProps>,
): StashPayOptions {
  const p = propsRef.current;
  return {
    checkoutUrl: p.checkoutUrl ?? '',
    checkoutTheme: p.checkoutTheme,
    position: p.position,
    width: p.width,
    height: p.height,
    container: p.portalTarget,
    zIndex: p.zIndex,
    showCloseButton: p.showCloseButton,
    showDragBar: p.showDragBar,
    dismissOnBackdropClick: p.dismissOnBackdropClick,
    dismissOnEscape: p.dismissOnEscape,
    autoCloseOnSuccess: p.autoCloseOnSuccess,
    autoCloseOnFailure: p.autoCloseOnFailure,
    backdrop: p.backdrop,
    theme: p.theme,
    injectStyles: p.injectStyles,
    cspNonce: p.cspNonce,
    ariaLabel: p.ariaLabel,
    iframe: p.iframe,
    animationDuration: p.animationDuration,
    allowedCheckoutHosts: p.allowedCheckoutHosts,
    loadTimeout: p.loadTimeout,
    // Callback proxies — stable identity, always the latest closure.
    onOpen: () => propsRef.current.onOpen?.(),
    onClose: () => propsRef.current.onClose?.(),
    onReady: () => propsRef.current.onReady?.(),
    onError: (e) => propsRef.current.onError?.(e),
    onSuccess: (e) => propsRef.current.onSuccess?.(e),
    onFailure: (e) => propsRef.current.onFailure?.(e),
    onProcessing: (e) => propsRef.current.onProcessing?.(e),
  };
}

function domOptionsChanged(prev: StashPayProps, next: StashPayProps): boolean {
  for (const key of DOM_OPTION_KEYS) {
    if (!Object.is(prev[key], next[key])) return true;
  }
  return false;
}

/**
 * Declarative React wrapper around `StashPayController`.
 *
 * The controller mounts DOM directly into `portalTarget` (default
 * `document.body`) so parent re-renders never disturb the iframe.
 */
export function StashPay(props: StashPayProps): null {
  const propsRef = useRef<StashPayProps>(props);
  const controllerRef = useRef<StashPayController | null>(null);
  const prevDomPropsRef = useRef<StashPayProps>(props);

  // Keep props ref fresh before any effect runs.
  useLayoutEffect(() => {
    propsRef.current = props;
  });

  // Lazy-mount on first (isOpen && checkoutUrl); destroy on unmount.
  useEffect(() => {
    if (!props.isOpen || !props.checkoutUrl) return;
    if (controllerRef.current) return;

    const controller = new StashPayController(buildOptions(propsRef));
    controllerRef.current = controller;
    try {
      controller.mount();
    } catch (err) {
      controllerRef.current = null;
      propsRef.current.onError?.(toStashPayError(err, 'MOUNT_ERROR'));
      return;
    }

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [props.isOpen, props.checkoutUrl]);

  // Sync open/close after initial mount.
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    if (props.isOpen) {
      if (controller.state === 'closed') controller.open();
    } else if (controller.state === 'open') {
      controller.close();
    }
  }, [props.isOpen]);

  // Sync non-callback option changes.
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) {
      prevDomPropsRef.current = props;
      return;
    }
    if (domOptionsChanged(prevDomPropsRef.current, props)) {
      controller.update(buildOptions(propsRef));
    }
    prevDomPropsRef.current = props;
  });

  return null;
}
