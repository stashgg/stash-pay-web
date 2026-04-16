/**
 * StashPayController — framework-agnostic driver.
 *
 * Responsibilities:
 *   - Build the DOM once on mount, mutate in place on update.
 *   - Own the `message` listener for the entire controller lifetime.
 *   - Drive open/close via `data-stash-pay-state`; CSS animates.
 *   - Enforce single-instance per container.
 *   - Trap focus and manage a11y siblings.
 *   - Translate iframe messages into typed events and fire user callbacks.
 */

import { installBridge } from './bridge';
import { DATA_ATTR, DEFAULT_ANIMATION_DURATION_MS } from './constants';
import {
  applyOptionsToDom,
  buildTree,
  collectFocusables,
  type BuiltTree,
} from './dom';
import { Emitter } from './emitter';
import { parseMessage } from './events';
import { createFocusTrap, type FocusTrap } from './focus-trap';
import { applyTheme, readAnimationDurationMs } from './theme';
import type {
  StashPayEventMap,
  StashPayHandle,
  StashPayOptions,
  StashPayState,
  StashPaymentEvent,
} from './types';

function requireDocument(): void {
  if (typeof document === 'undefined') {
    throw new Error(
      '[stash-pay] requires a browser environment (document is not defined).',
    );
  }
}

/**
 * Produce the iframe `src` URL, honouring `checkoutTheme` by appending
 * (or replacing) a `theme` query parameter. Falls back to string
 * concatenation for malformed URLs so invalid input doesn't crash mount.
 */
function resolveIframeSrc(options: StashPayOptions): string {
  const base = options.checkoutUrl;
  const theme = options.checkoutTheme;
  if (!theme) return base;
  try {
    const href =
      typeof location !== 'undefined' ? location.href : 'http://localhost/';
    const url = new URL(base, href);
    url.searchParams.set('theme', theme);
    return url.toString();
  } catch {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}theme=${encodeURIComponent(theme)}`;
  }
}

export class StashPayController {
  // ---- fields ----
  private readonly emitter = new Emitter<StashPayEventMap>();
  private readonly ownedOffs: Array<() => void> = [];
  private options: StashPayOptions;
  private tree: BuiltTree | null = null;
  private container: HTMLElement | null = null;
  private focusTrap: FocusTrap | null = null;
  private messageHandler: ((ev: MessageEvent) => void) | null = null;
  private escapeHandler: ((ev: KeyboardEvent) => void) | null = null;
  private backdropHandler: ((ev: MouseEvent) => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private iframeLoadHandler: (() => void) | null = null;
  private closeTimeout: ReturnType<typeof setTimeout> | null = null;
  private _state: StashPayState = 'idle';
  private _hasLoadedOnce = false;
  private _currentSrc: string | null = null;

  constructor(options: StashPayOptions) {
    this.options = { ...options };
  }

  // ---- public getters ----
  get state(): StashPayState {
    return this._state;
  }
  get isOpen(): boolean {
    return this._state === 'open';
  }
  get isReady(): boolean {
    return this._hasLoadedOnce;
  }

  // ---- lifecycle ----

  /** Build DOM, attach listeners, insert into container, start open animation. */
  mount(): void {
    if (this._state !== 'idle') {
      throw new Error(
        `[stash-pay] cannot mount from state "${this._state}". Create a new controller.`,
      );
    }
    requireDocument();

    const container = this.options.container ?? document.body;
    if (container.dataset[DATA_ATTR.active]) {
      throw new Error(
        '[stash-pay] a Stash Pay instance is already mounted in this container. Destroy the previous handle first.',
      );
    }

    this.container = container;
    container.dataset[DATA_ATTR.active] = '1';

    try {
      const tree = buildTree(this.options);
      this.tree = tree;
      applyOptionsToDom(tree, this.options);
      applyTheme(tree.root, this.options.theme);
      container.appendChild(tree.root);

      this.attachListeners();
      this.setIframeSrc(resolveIframeSrc(this.options));
      this.wireCallbacks();

      // Two rAFs let the browser paint the initial `closed` state before we
      // flip to `open`, which is what makes the transition animate.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.openInternal());
      });
    } catch (err) {
      delete container.dataset[DATA_ATTR.active];
      this.container = null;
      this.tree = null;
      throw err;
    }
  }

  open(): void {
    if (this._state === 'destroyed') {
      throw new Error('[stash-pay] cannot open a destroyed controller.');
    }
    if (this._state === 'open') return;
    if (this._state === 'idle') {
      this.mount();
      return;
    }
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.openInternal();
  }

  close(): void {
    if (!this.tree) return;
    if (this._state !== 'open') return;

    this._state = 'closing';
    this.setStateAttr('closing');
    this.focusTrap?.deactivate();

    const duration = readAnimationDurationMs(
      this.tree.root,
      this.options.animationDuration ?? DEFAULT_ANIMATION_DURATION_MS,
    );
    this.closeTimeout = setTimeout(() => {
      if (this._state !== 'closing') return;
      this.setStateAttr('closed');
      this._state = 'closed';
      this.emitter.emit('close');
      this.closeTimeout = null;
    }, duration + 50);
  }

  update(partial: Partial<StashPayOptions>): void {
    if (this._state === 'destroyed') return;
    const prev = this.options;
    this.options = { ...prev, ...partial };

    if (!this.tree) return;

    if ('theme' in partial) applyTheme(this.tree.root, this.options.theme);
    applyOptionsToDom(this.tree, this.options);

    // Reload the iframe if the effective src changed (either checkoutUrl
    // or checkoutTheme).
    const nextSrc = resolveIframeSrc(this.options);
    const prevSrc = resolveIframeSrc(prev);
    if (nextSrc !== prevSrc) this.setIframeSrc(nextSrc);

    // Re-wire callbacks in case any on* handler changed.
    this.wireCallbacks();
  }

  on<K extends keyof StashPayEventMap>(
    event: K,
    handler: StashPayEventMap[K],
  ): () => void {
    return this.emitter.on(event, handler);
  }

  off<K extends keyof StashPayEventMap>(
    event: K,
    handler: StashPayEventMap[K],
  ): void {
    this.emitter.off(event, handler);
  }

  destroy(): void {
    if (this._state === 'destroyed') return;
    try {
      this.detachListeners();
      this.focusTrap?.deactivate();
      if (this.closeTimeout) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = null;
      }
      if (this.tree?.root.parentNode) {
        this.tree.root.parentNode.removeChild(this.tree.root);
      }
      this.emitter.clear();
    } finally {
      if (this.container) {
        delete this.container.dataset[DATA_ATTR.active];
      }
      this.container = null;
      this.tree = null;
      this.focusTrap = null;
      this.ownedOffs.length = 0;
      this._state = 'destroyed';
    }
  }

  /** Static shorthand — `StashPayController.open(options)` returns a handle. */
  static open(options: StashPayOptions): StashPayHandle {
    const controller = new StashPayController(options);
    controller.mount();
    return makeHandle(controller);
  }

  // ---- internals ----

  private openInternal(): void {
    if (this._state === 'destroyed') return;
    this.setStateAttr('open');
    this._state = 'open';
    this.focusTrap?.activate();
    this.emitter.emit('open');
  }

  private setStateAttr(state: StashPayState): void {
    this.tree?.root.setAttribute(DATA_ATTR.state, state);
  }

  private setIframeSrc(url: string): void {
    if (!this.tree) return;
    this._hasLoadedOnce = false;
    this._currentSrc = url;
    this.tree.root.setAttribute(DATA_ATTR.loading, 'true');
    this.tree.iframe.src = url;
  }

  private attachListeners(): void {
    if (!this.tree) return;
    const { backdrop, closeButton, iframe, root } = this.tree;

    this.messageHandler = (ev: MessageEvent) => {
      const parsed = parseMessage(ev, this.options.iframe?.allowedOrigins);
      if (parsed) this.dispatchPaymentEvent(parsed);
    };
    window.addEventListener('message', this.messageHandler);

    this.escapeHandler = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      if (!this.isOpen) return;
      if (this.options.dismissOnEscape === false) return;
      ev.stopPropagation();
      this.close();
    };
    document.addEventListener('keydown', this.escapeHandler);

    this.backdropHandler = (ev: MouseEvent) => {
      if (ev.target !== backdrop) return;
      if (this.options.dismissOnBackdropClick === false) return;
      this.close();
    };
    backdrop.addEventListener('click', this.backdropHandler);

    this.closeHandler = () => this.close();
    closeButton.addEventListener('click', this.closeHandler);

    this.iframeLoadHandler = () => {
      if (!this._currentSrc) return;
      const wasFirst = !this._hasLoadedOnce;
      this._hasLoadedOnce = true;
      root.setAttribute(DATA_ATTR.loading, 'false');

      // Re-install the in-iframe bridge on every load so internal
      // navigations (3DS hops, etc.) are covered. No-op cross-origin.
      installBridge(iframe, {
        onSuccess: (e) => this.dispatchPaymentEvent(e),
        onFailure: (e) => this.dispatchPaymentEvent(e),
        onProcessing: (e) => this.dispatchPaymentEvent(e),
        onClose: () => this.close(),
      });

      if (wasFirst) this.emitter.emit('ready');
    };
    iframe.addEventListener('load', this.iframeLoadHandler);

    this.focusTrap = createFocusTrap(root, () =>
      this.tree ? collectFocusables(this.tree) : [],
    );
  }

  private detachListeners(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    if (this.tree) {
      if (this.backdropHandler) {
        this.tree.backdrop.removeEventListener('click', this.backdropHandler);
      }
      if (this.closeHandler) {
        this.tree.closeButton.removeEventListener('click', this.closeHandler);
      }
      if (this.iframeLoadHandler) {
        this.tree.iframe.removeEventListener('load', this.iframeLoadHandler);
      }
    }
    this.backdropHandler = null;
    this.closeHandler = null;
    this.iframeLoadHandler = null;
  }

  /** Wire the `on*` option callbacks; user-registered `.on()` handlers persist. */
  private wireCallbacks(): void {
    while (this.ownedOffs.length) this.ownedOffs.pop()?.();

    const add = <K extends keyof StashPayEventMap>(
      event: K,
      handler: StashPayEventMap[K] | undefined,
    ) => {
      if (!handler) return;
      this.ownedOffs.push(this.emitter.on(event, handler));
    };

    add('open', this.options.onOpen);
    add('close', this.options.onClose);
    add('ready', this.options.onReady);
    add('error', this.options.onError);
    add('success', this.options.onSuccess);
    add('failure', this.options.onFailure);
    add('processing', this.options.onProcessing);
  }

  private dispatchPaymentEvent(event: StashPaymentEvent): void {
    switch (event.type) {
      case 'success':
        this.emitter.emit('success', event);
        if (this.options.autoCloseOnSuccess !== false) this.close();
        break;
      case 'failure':
        this.emitter.emit('failure', event);
        if (this.options.autoCloseOnFailure !== false) this.close();
        break;
      case 'processing':
        this.emitter.emit('processing', event);
        break;
    }
  }
}

function makeHandle(controller: StashPayController): StashPayHandle {
  return {
    close: () => controller.close(),
    update: (partial) => controller.update(partial),
    on: (event, handler) => controller.on(event, handler),
    off: (event, handler) => controller.off(event, handler),
    destroy: () => controller.destroy(),
  };
}

/** Functional shorthand — equivalent to `StashPayController.open(options)`. */
export function open(options: StashPayOptions): StashPayHandle {
  return StashPayController.open(options);
}
