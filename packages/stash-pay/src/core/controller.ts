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

import { installBridge } from "./bridge";
import {
  DATA_ATTR,
  DEFAULT_ANIMATION_DURATION_MS,
  MESSAGE_PREFIX,
} from "./constants";
import { debugLog } from "./debug";
import {
  applyOptionsToDom,
  buildTree,
  collectFocusables,
  type BuiltTree,
} from "./dom";
import { Emitter } from "./emitter";
import { StashPayError, toStashPayError } from "./errors";
import { parseMessage } from "./events";
import { createFocusTrap, type FocusTrap } from "./focus-trap";
import { isWebKitEngine } from "./is-webkit-engine";
import { preconnectOrigin } from "./preconnect";
import { applyTheme, readAnimationDurationMs } from "./theme";
import type {
  StashPayEventMap,
  StashPayHandle,
  StashPayOptions,
  StashPayState,
  StashPaymentEvent,
} from "./types";
import { resolveCheckoutUrl, resolveMountContainer } from "./url";

/** How checkout is presented for this controller instance. */
type PresentationMode = "iframe" | "top-level";

/** Poll interval for detecting `window.open` child closed by the user. */
const CHILD_CLOSED_POLL_MS = 500;
/**
 * Posted by the success page's "back to game" / close action. A page-initiated
 * `window.close()` cannot dismiss a cross-origin iframe, so the checkout also
 * emits this over postMessage; without honoring it, that button is a dead end
 * and only the host's own close button dismisses the card.
 */
const CLOSE_SUCCESS_WINDOW_EVENT = `${MESSAGE_PREFIX}CLOSE_PURCHASE_SUCCESS_WINDOW`;

function requireDocument(): void {
  if (typeof document === "undefined") {
    throw new Error(
      "[stash-pay] requires a browser environment (document is not defined).",
    );
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
  private iframeErrorHandler: (() => void) | null = null;
  private closeTimeout: ReturnType<typeof setTimeout> | null = null;
  private loadTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private _state: StashPayState = "idle";
  private _hasLoadedOnce = false;
  /** Terminal-event latch — set by the first success/failure. See `dispatchPaymentEvent`. */
  private _settled = false;
  /** Load-outcome latch — the first of load / error / timeout wins. */
  private _loadSettled = false;
  private _currentSrc: string | null = null;
  /** iframe drawer vs WebKit top-level tab/redirect. Set in `mount()`. */
  private _presentation: PresentationMode = "iframe";
  /** Child window from `window.open` (top-level presentation only). */
  private _childWindow: Window | null = null;
  private childClosedPoll: ReturnType<typeof setInterval> | null = null;

  constructor(options: StashPayOptions) {
    this.options = { ...options };
  }

  // ---- public getters ----
  get state(): StashPayState {
    return this._state;
  }
  get isOpen(): boolean {
    return this._state === "open";
  }
  get isReady(): boolean {
    return this._hasLoadedOnce;
  }

  // ---- lifecycle ----

  /** Build DOM, attach listeners, insert into container, start open animation. */
  mount(): void {
    if (this._state !== "idle") {
      throw new Error(
        `[stash-pay] cannot mount from state "${this._state}". Create a new controller.`,
      );
    }
    requireDocument();
    this.log("mount: starting");
    this.wireCallbacks();

    const resolved = resolveCheckoutUrl(
      this.options.checkoutUrl,
      this.options.checkoutTheme,
      this.options.checkoutLocale,
      this.options.allowedCheckoutHosts,
    );
    if (!resolved.ok) {
      this.failMount(resolved.error);
    }

    // Warm DNS/TCP/TLS to the checkout origin now, so the handshake overlaps
    // tree building instead of blocking the iframe's first navigation.
    preconnectOrigin(resolved.url.origin);

    if (this.shouldOpenTopLevel()) {
      this.mountTopLevel(resolved.url.toString());
      return;
    }

    this.mountIframe(resolved.url.toString());
  }

  /**
   * WebKit + preferTopLevelOnWebKit (default true): open checkout top-level so
   * wallets run first-party. Non-WebKit always uses the iframe drawer.
   */
  private shouldOpenTopLevel(): boolean {
    if (this.options.preferTopLevelOnWebKit === false) return false;
    return isWebKitEngine();
  }

  /**
   * Skip the iframe drawer. Open checkout in a new tab (preserving
   * `window.opener` — do **not** pass `noopener`) so postMessage callbacks
   * reach the host. If the popup is blocked, fall back to `location.assign`
   * so payment can still complete.
   */
  private mountTopLevel(url: string): void {
    this._presentation = "top-level";
    this._settled = false;
    this._currentSrc = url;
    this.log("mount: top-level WebKit path", url);

    this.attachTopLevelListeners();

    // No feature string — `noopener` / `noreferrer` would clear `window.opener`
    // and break checkout → host postMessage callbacks.
    const child = window.open(url, "_blank");

    if (!child || child.closed) {
      this.log("mount: popup blocked — falling back to location.assign");
      this.options.onTopLevelNavigation?.({ url, mode: "redirect" });
      // Host page unloads; leave state as idle-ish — assign navigates away.
      this._state = "open";
      this.emitEvent("open");
      window.location.assign(url);
      return;
    }

    this._childWindow = child;
    this.options.onTopLevelNavigation?.({ url, mode: "tab" });
    this._state = "open";
    this.emitEvent("open");
    // No iframe load event — treat successful open as ready.
    this._hasLoadedOnce = true;
    this.emitEvent("ready");
    this.startChildClosedPoll();
  }

  private mountIframe(url: string): void {
    this._presentation = "iframe";

    let container: HTMLElement;
    try {
      container = resolveMountContainer(this.options.container);
    } catch (err) {
      this.failMount(toStashPayError(err, "MOUNT_ERROR"));
    }

    if (container.dataset[DATA_ATTR.active]) {
      this.failMount(
        new StashPayError(
          "MOUNT_ERROR",
          "[stash-pay] a Stash Pay instance is already mounted in this container. Destroy the previous handle first.",
        ),
      );
    }

    this.container = container;
    container.dataset[DATA_ATTR.active] = "1";

    try {
      const tree = buildTree(this.options);
      this.tree = tree;
      applyOptionsToDom(tree, this.options);
      applyTheme(tree.root, this.options.theme);
      container.appendChild(tree.root);
      this.log("mount: tree appended", { container });

      this.attachListeners();
      this.setIframeSrc(url);

      // Two rAFs let the browser paint the initial `closed` state before we
      // flip to `open`, which is what makes the transition animate.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.openInternal());
      });
    } catch (err) {
      this.clearLoadTimeout();
      delete container.dataset[DATA_ATTR.active];
      this.container = null;
      this.tree = null;
      this.failMount(toStashPayError(err, "MOUNT_ERROR"));
    }
  }

  open(): void {
    if (this._state === "destroyed") {
      throw new Error("[stash-pay] cannot open a destroyed controller.");
    }
    if (this._state === "open") return;
    if (this._state === "idle") {
      this.mount();
      return;
    }
    if (this._presentation === "top-level") {
      // Re-open checkout top-level after a prior close (child was dismissed).
      const resolved = resolveCheckoutUrl(
        this.options.checkoutUrl,
        this.options.checkoutTheme,
        this.options.checkoutLocale,
        this.options.allowedCheckoutHosts,
      );
      if (!resolved.ok) {
        this.emitEvent("error", resolved.error);
        return;
      }
      this.reopenTopLevel(resolved.url.toString());
      return;
    }
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.openInternal();
  }

  close(): void {
    if (this._presentation === "top-level") {
      this.closeTopLevel();
      return;
    }
    if (!this.tree) return;
    if (this._state !== "open") return;

    this.log("close: starting");
    this.clearLoadTimeout();
    this._state = "closing";
    this.setStateAttr("closing");
    this.focusTrap?.deactivate();

    const duration = readAnimationDurationMs(
      this.tree.root,
      this.options.animationDuration ?? DEFAULT_ANIMATION_DURATION_MS,
    );
    this.closeTimeout = setTimeout(() => {
      if (this._state !== "closing") return;
      this.setStateAttr("closed");
      this._state = "closed";
      this.emitEvent("close");
      this.closeTimeout = null;
    }, duration + 50);
  }

  update(partial: Partial<StashPayOptions>): void {
    if (this._state === "destroyed") return;
    this.log("update:", Object.keys(partial));
    this.options = { ...this.options, ...partial };

    if (this._presentation === "top-level") {
      this.wireCallbacks();
      if (
        "checkoutUrl" in partial ||
        "checkoutTheme" in partial ||
        "checkoutLocale" in partial ||
        "allowedCheckoutHosts" in partial
      ) {
        const resolved = resolveCheckoutUrl(
          this.options.checkoutUrl,
          this.options.checkoutTheme,
          this.options.checkoutLocale,
          this.options.allowedCheckoutHosts,
        );
        if (!resolved.ok) {
          this.emitEvent("error", resolved.error);
        } else {
          const nextSrc = resolved.url.toString();
          if (nextSrc !== this._currentSrc && this._state === "open") {
            this.reopenTopLevel(nextSrc);
          } else {
            this._currentSrc = nextSrc;
          }
        }
      }
      return;
    }

    if (!this.tree) return;

    if ("theme" in partial) applyTheme(this.tree.root, this.options.theme);
    applyOptionsToDom(this.tree, this.options);

    if (
      "checkoutUrl" in partial ||
      "checkoutTheme" in partial ||
      "checkoutLocale" in partial ||
      "allowedCheckoutHosts" in partial
    ) {
      const resolved = resolveCheckoutUrl(
        this.options.checkoutUrl,
        this.options.checkoutTheme,
        this.options.checkoutLocale,
        this.options.allowedCheckoutHosts,
      );
      if (!resolved.ok) {
        this.emitEvent("error", resolved.error);
      } else {
        const nextSrc = resolved.url.toString();
        if (nextSrc !== this._currentSrc) this.setIframeSrc(nextSrc);
      }
    }

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
    if (this._state === "destroyed") return;
    this.log("destroy: tearing down");
    try {
      this.detachListeners();
      this.stopChildClosedPoll();
      this.focusTrap?.deactivate();
      if (this.closeTimeout) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = null;
      }
      this.clearLoadTimeout();
      if (this._childWindow && !this._childWindow.closed) {
        try {
          this._childWindow.close();
        } catch {
          /* cross-origin close can throw in some browsers */
        }
      }
      this._childWindow = null;
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
      this._state = "destroyed";
    }
  }

  /**
   * Static shorthand — `StashPayController.open(options)` returns a handle when
   * mount succeeds.
   *
   * @throws {StashPayError} Pre-flight failures (invalid URL, bad container, …).
   *   `onError` is invoked with the same error before the throw; no handle is returned.
   */
  static open(options: StashPayOptions): StashPayHandle {
    const controller = new StashPayController(options);
    controller.mount();
    return makeHandle(controller);
  }

  // ---- internals ----

  /**
   * Pre-flight mount failure: notify via `onError` / `error` event, then throw
   * so `open()` does not return a handle and callers can `try/catch` the same
   * typed error.
   */
  private failMount(error: StashPayError): never {
    this.log("mount: failed", error.code, error.message);
    this.emitEvent("error", error);
    throw error;
  }

  private openInternal(): void {
    if (this._state === "destroyed") return;
    this.log("open: state → open");
    this.setStateAttr("open");
    this._state = "open";
    this.focusTrap?.activate();
    this.emitEvent("open");
  }

  private setStateAttr(state: StashPayState): void {
    this.tree?.root.setAttribute(DATA_ATTR.state, state);
  }

  /**
   * Point the iframe at a (validated) checkout URL. This is the single reset
   * point for the terminal-event latch: a new checkout document begins a fresh
   * session that may emit `success`/`failure` again.
   */
  private setIframeSrc(url: string): void {
    if (!this.tree) return;
    this.log("iframe: setting src", url);
    this.clearLoadTimeout();
    this._hasLoadedOnce = false;
    this._settled = false;
    this._loadSettled = false;
    this._currentSrc = url;
    this.tree.root.setAttribute(DATA_ATTR.loading, "true");
    this.tree.iframe.src = url;
    this.armLoadTimeout(url);
  }

  /**
   * Arm the load-failure timeout. Opt-in: nothing happens unless `loadTimeout`
   * is a positive number. A safety net for a syntactically valid `checkoutUrl`
   * whose server never responds (the iframe `load` event would never fire).
   */
  private armLoadTimeout(srcAtArm: string): void {
    const ms = this.options.loadTimeout;
    if (typeof ms !== "number" || ms <= 0) return;
    this.log("iframe: arming load timeout", ms, "ms");
    this.loadTimeoutTimer = setTimeout(() => {
      this.loadTimeoutTimer = null;
      if (this._state === "destroyed" || !this.tree) return;
      if (this._currentSrc !== srcAtArm) return;
      if (this._loadSettled) return;
      this._loadSettled = true;
      this.tree.root.setAttribute(DATA_ATTR.loading, "false");
      this.log("iframe: load timeout", ms, "ms");
      this.emitEvent(
        "error",
        new StashPayError(
          "NETWORK_ERROR",
          `Checkout did not load within ${ms}ms.`,
          { checkoutUrl: this.options.checkoutUrl, timeoutMs: ms },
        ),
      );
    }, ms);
  }

  private clearLoadTimeout(): void {
    if (this.loadTimeoutTimer) {
      clearTimeout(this.loadTimeoutTimer);
      this.loadTimeoutTimer = null;
    }
  }

  /**
   * Honor the success page's "back to game" / close request. Cross-origin the
   * page's own `window.close()` is a no-op on our iframe, so the checkout also
   * posts CLOSE_PURCHASE_SUCCESS_WINDOW; we translate it into a card close.
   * Accepted only from this controller's own iframe or top-level child.
   * `close()` is a no-op when the card isn't open, so this is safe even after
   * `autoCloseOnSuccess`.
   *
   * Returns `true` when the message was the close signal (handled or rejected),
   * `false` for unrelated messages.
   */
  private handleCloseSuccessWindow(ev: MessageEvent): boolean {
    const data = ev.data as Record<string, unknown> | null;
    if (!data || typeof data !== "object") return false;
    if (data.eventName !== CLOSE_SUCCESS_WINDOW_EVENT) return false;

    if (!this.isTrustedCheckoutSource(ev)) {
      this.log("close-window: rejected (untrusted source)", {
        origin: ev.origin,
      });
      return true;
    }

    this.log("close-window: honoring back-to-game close");
    this.close();
    return true;
  }

  /**
   * True when `ev` comes from this instance's checkout surface: the iframe
   * `contentWindow`, or the top-level `window.open` child.
   */
  private isTrustedCheckoutSource(ev: MessageEvent): boolean {
    if (this._presentation === "top-level") {
      return this._childWindow !== null && ev.source === this._childWindow;
    }
    return (
      this.tree !== null && ev.source === this.tree.iframe.contentWindow
    );
  }

  private attachTopLevelListeners(): void {
    this.messageHandler = (ev: MessageEvent) => {
      if (!this.isTrustedCheckoutSource(ev)) {
        this.log("message: ignored (untrusted source)", { origin: ev.origin });
        return;
      }
      if (this.handleCloseSuccessWindow(ev)) return;
      const parsed = parseMessage(ev, this.options.iframe?.allowedOrigins);
      if (parsed) {
        this.log("message: parsed", parsed.type, parsed);
        this.dispatchPaymentEvent(parsed);
      } else {
        this.log("message: ignored", { origin: ev.origin });
      }
    };
    window.addEventListener("message", this.messageHandler);
  }

  private closeTopLevel(): void {
    if (this._state !== "open") return;
    this.log("close: top-level");
    this.stopChildClosedPoll();
    if (this._childWindow && !this._childWindow.closed) {
      try {
        this._childWindow.close();
      } catch {
        /* ignore */
      }
    }
    this._childWindow = null;
    this._state = "closed";
    this.emitEvent("close");
  }

  private reopenTopLevel(url: string): void {
    this.stopChildClosedPoll();
    if (this._childWindow && !this._childWindow.closed) {
      try {
        this._childWindow.close();
      } catch {
        /* ignore */
      }
    }
    this._childWindow = null;
    this._settled = false;
    this._currentSrc = url;
    this._hasLoadedOnce = false;

    const child = window.open(url, "_blank");
    if (!child || child.closed) {
      this.log("reopen: popup blocked — falling back to location.assign");
      this.options.onTopLevelNavigation?.({ url, mode: "redirect" });
      this._state = "open";
      this.emitEvent("open");
      window.location.assign(url);
      return;
    }

    this._childWindow = child;
    this.options.onTopLevelNavigation?.({ url, mode: "tab" });
    this._state = "open";
    this.emitEvent("open");
    this._hasLoadedOnce = true;
    this.emitEvent("ready");
    this.startChildClosedPoll();
  }

  private startChildClosedPoll(): void {
    this.stopChildClosedPoll();
    this.childClosedPoll = setInterval(() => {
      if (!this._childWindow) {
        this.stopChildClosedPoll();
        return;
      }
      if (this._childWindow.closed) {
        this.log("top-level: child window closed");
        this._childWindow = null;
        this.stopChildClosedPoll();
        if (this._state === "open") {
          this._state = "closed";
          this.emitEvent("close");
        }
      }
    }, CHILD_CLOSED_POLL_MS);
  }

  private stopChildClosedPoll(): void {
    if (this.childClosedPoll) {
      clearInterval(this.childClosedPoll);
      this.childClosedPoll = null;
    }
  }

  private attachListeners(): void {
    if (!this.tree) return;
    const { backdrop, closeButton, iframe, root } = this.tree;

    this.messageHandler = (ev: MessageEvent) => {
      if (this.handleCloseSuccessWindow(ev)) return;
      // Payment events: keep origin allowlist via parseMessage. Close is
      // already gated to our iframe; payment stays origin-based for the
      // iframe path (v2-compatible). Top-level path gates by child source.
      const parsed = parseMessage(ev, this.options.iframe?.allowedOrigins);
      if (parsed) {
        this.log("message: parsed", parsed.type, parsed);
        this.dispatchPaymentEvent(parsed);
      } else {
        this.log("message: ignored", { origin: ev.origin });
      }
    };
    window.addEventListener("message", this.messageHandler);

    this.escapeHandler = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      if (!this.isOpen) return;
      if (this.options.dismissOnEscape === false) return;
      ev.stopPropagation();
      this.close();
    };
    document.addEventListener("keydown", this.escapeHandler);

    this.backdropHandler = (ev: MouseEvent) => {
      if (ev.target !== backdrop) return;
      if (this.options.dismissOnBackdropClick === false) return;
      this.close();
    };
    backdrop.addEventListener("click", this.backdropHandler);

    this.closeHandler = () => this.close();
    closeButton.addEventListener("click", this.closeHandler);

    this.iframeLoadHandler = () => {
      if (!this._currentSrc) return;
      this._loadSettled = true;
      this.clearLoadTimeout();
      const wasFirst = !this._hasLoadedOnce;
      this._hasLoadedOnce = true;
      root.setAttribute(DATA_ATTR.loading, "false");
      this.log("iframe: load", wasFirst ? "first" : "subsequent");

      installBridge(iframe, {
        onSuccess: (e) => this.dispatchPaymentEvent(e),
        onFailure: (e) => this.dispatchPaymentEvent(e),
        onProcessing: (e) => this.dispatchPaymentEvent(e),
        onClose: () => this.close(),
      });
      this.log("iframe: bridge installed");

      if (wasFirst) this.emitEvent("ready");
    };
    iframe.addEventListener("load", this.iframeLoadHandler);

    this.iframeErrorHandler = () => {
      if (!this.tree || this._loadSettled) return;
      this._loadSettled = true;
      this.clearLoadTimeout();
      this.tree.root.setAttribute(DATA_ATTR.loading, "false");
      this.log("iframe: error event");
      this.emitEvent(
        "error",
        new StashPayError("NETWORK_ERROR", "Checkout iframe failed to load.", {
          checkoutUrl: this.options.checkoutUrl,
        }),
      );
    };
    iframe.addEventListener("error", this.iframeErrorHandler);

    this.focusTrap = createFocusTrap(root, () =>
      this.tree ? collectFocusables(this.tree) : [],
    );
  }

  private detachListeners(): void {
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler);
      this.messageHandler = null;
    }
    if (this.escapeHandler) {
      document.removeEventListener("keydown", this.escapeHandler);
      this.escapeHandler = null;
    }
    if (this.tree) {
      if (this.backdropHandler) {
        this.tree.backdrop.removeEventListener("click", this.backdropHandler);
      }
      if (this.closeHandler) {
        this.tree.closeButton.removeEventListener("click", this.closeHandler);
      }
      if (this.iframeLoadHandler) {
        this.tree.iframe.removeEventListener("load", this.iframeLoadHandler);
      }
      if (this.iframeErrorHandler) {
        this.tree.iframe.removeEventListener("error", this.iframeErrorHandler);
      }
    }
    this.backdropHandler = null;
    this.closeHandler = null;
    this.iframeLoadHandler = null;
    this.iframeErrorHandler = null;
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

    add("open", this.options.onOpen);
    add("close", this.options.onClose);
    add("ready", this.options.onReady);
    add("error", this.options.onError);
    add("success", this.options.onSuccess);
    add("failure", this.options.onFailure);
    add("processing", this.options.onProcessing);
  }

  /**
   * Single funnel for payment events from both delivery channels (the
   * in-iframe bridge and the postMessage fallback). `success`/`failure` are
   * terminal: the first one latches `_settled`, and every later payment event —
   * a duplicate from the other channel, or a stale event — is dropped. The
   * latch is reset only by `setIframeSrc` / top-level reopen (a new checkout
   * document). `processing` is not terminal and may fire repeatedly until a
   * terminal event arrives.
   */
  private dispatchPaymentEvent(event: StashPaymentEvent): void {
    if (this._settled) {
      this.log("payment: dropped (already settled)", event.type);
      return;
    }
    this.log("payment: dispatch", event.type, event);
    switch (event.type) {
      case "success":
        this._settled = true;
        this.emitEvent("success", event);
        if (this.options.autoCloseOnSuccess !== false) this.close();
        break;
      case "failure":
        this._settled = true;
        this.emitEvent("failure", event);
        if (this.options.autoCloseOnFailure !== false) this.close();
        break;
      case "processing":
        this.emitEvent("processing", event);
        break;
    }
  }

  /** Emit a user-facing event, tracing the callback when debug is on. */
  private emitEvent<K extends keyof StashPayEventMap>(
    event: K,
    ...args: Parameters<StashPayEventMap[K]>
  ): void {
    this.log(`callback:${event}`, ...args);
    this.emitter.emit(event, ...args);
  }

  private log(...args: unknown[]): void {
    debugLog(this.options.debug, ...args);
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

/**
 * Functional shorthand — equivalent to `StashPayController.open(options)`.
 *
 * @throws {StashPayError} Pre-flight failures — see {@link StashPayController.open}.
 */
export function open(options: StashPayOptions): StashPayHandle {
  return StashPayController.open(options);
}

export { StashPayError, toStashPayError };
