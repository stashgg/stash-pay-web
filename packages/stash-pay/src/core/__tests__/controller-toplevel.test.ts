import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StashPayController } from "../controller";
import { MESSAGE_PREFIX } from "../constants";

const CHECKOUT_URL = "https://checkout.stash.gg/pay/abc";

function stubWebKitNavigator(): void {
  vi.stubGlobal("navigator", {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    platform: "MacIntel",
    maxTouchPoints: 0,
  });
}

function stubChromiumNavigator(): void {
  vi.stubGlobal("navigator", {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    platform: "MacIntel",
    maxTouchPoints: 0,
  });
}

describe("StashPayController WebKit top-level", () => {
  let openSpy: ReturnType<typeof vi.fn>;
  let assignSpy: ReturnType<typeof vi.fn>;
  let child: { closed: boolean; close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    child = { closed: false, close: vi.fn() };
    openSpy = vi.fn(() => child as unknown as Window);
    assignSpy = vi.fn();
    vi.stubGlobal("open", openSpy);
    // location.assign is not always configurable; replace via defineProperty.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign: assignSpy, href: "http://localhost/" },
    });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("opens top-level tab on WebKit (no iframe)", () => {
    stubWebKitNavigator();
    const onTopLevelNavigation = vi.fn();
    const onOpen = vi.fn();
    const onReady = vi.fn();

    const controller = new StashPayController({
      checkoutUrl: CHECKOUT_URL,
      onTopLevelNavigation,
      onOpen,
      onReady,
    });
    controller.mount();

    expect(openSpy).toHaveBeenCalledWith(CHECKOUT_URL, "_blank");
    // Must not pass a features string (noopener would break opener callbacks).
    expect(openSpy.mock.calls[0]?.length).toBe(2);
    expect(onTopLevelNavigation).toHaveBeenCalledWith({
      url: CHECKOUT_URL,
      mode: "tab",
    });
    expect(onOpen).toHaveBeenCalled();
    expect(onReady).toHaveBeenCalled();
    expect(document.querySelector("iframe")).toBeNull();
    expect(controller.isOpen).toBe(true);

    controller.destroy();
  });

  it("falls back to location.assign when popup is blocked", () => {
    stubWebKitNavigator();
    openSpy.mockReturnValue(null);
    const onTopLevelNavigation = vi.fn();

    const controller = new StashPayController({
      checkoutUrl: CHECKOUT_URL,
      onTopLevelNavigation,
    });
    controller.mount();

    expect(onTopLevelNavigation).toHaveBeenCalledWith({
      url: CHECKOUT_URL,
      mode: "redirect",
    });
    expect(assignSpy).toHaveBeenCalledWith(CHECKOUT_URL);
    controller.destroy();
  });

  it("opt-out preferTopLevelOnWebKit keeps iframe path on WebKit", () => {
    stubWebKitNavigator();
    const controller = new StashPayController({
      checkoutUrl: CHECKOUT_URL,
      preferTopLevelOnWebKit: false,
    });
    controller.mount();

    expect(openSpy).not.toHaveBeenCalled();
    expect(document.querySelector("iframe")).not.toBeNull();
    controller.destroy();
  });

  it("Chromium keeps iframe drawer", () => {
    stubChromiumNavigator();
    const controller = new StashPayController({
      checkoutUrl: CHECKOUT_URL,
    });
    controller.mount();

    expect(openSpy).not.toHaveBeenCalled();
    expect(document.querySelector("iframe")).not.toBeNull();
    controller.destroy();
  });

  it("accepts payment postMessage only from the opened child", () => {
    stubWebKitNavigator();
    const onSuccess = vi.fn();
    const controller = new StashPayController({
      checkoutUrl: CHECKOUT_URL,
      onSuccess,
      autoCloseOnSuccess: false,
    });
    controller.mount();

    const trusted = new MessageEvent("message", {
      data: {
        source: "stash_sdk",
        method: "onPaymentSuccess",
        payload: { orderId: "ord_1" },
      },
      origin: "https://checkout.stash.gg",
      source: child as unknown as MessageEventSource,
    });
    window.dispatchEvent(trusted);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0]?.[0]).toMatchObject({
      type: "success",
      orderId: "ord_1",
    });

    // Second terminal event from an untrusted source must not reset latch —
    // but first verify untrusted is ignored before settle... already settled.
    onSuccess.mockClear();
    const untrusted = new MessageEvent("message", {
      data: {
        source: "stash_sdk",
        method: "onPaymentSuccess",
        payload: { orderId: "ord_2" },
      },
      origin: "https://evil.example",
      source: window,
    });
    window.dispatchEvent(untrusted);
    expect(onSuccess).not.toHaveBeenCalled();

    controller.destroy();
  });

  it("ignores payment messages from untrusted sources before settle", () => {
    stubWebKitNavigator();
    const onSuccess = vi.fn();
    const controller = new StashPayController({
      checkoutUrl: CHECKOUT_URL,
      onSuccess,
      autoCloseOnSuccess: false,
    });
    controller.mount();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          source: "stash_sdk",
          method: "onPaymentSuccess",
          payload: { orderId: "spoof" },
        },
        origin: "https://checkout.stash.gg",
        source: window,
      }),
    );
    expect(onSuccess).not.toHaveBeenCalled();
    controller.destroy();
  });

  it("emits onClose when child.closed is detected", async () => {
    stubWebKitNavigator();
    vi.useFakeTimers();
    const onClose = vi.fn();
    const controller = new StashPayController({
      checkoutUrl: CHECKOUT_URL,
      onClose,
    });
    controller.mount();
    expect(controller.isOpen).toBe(true);

    child.closed = true;
    await vi.advanceTimersByTimeAsync(600);

    expect(onClose).toHaveBeenCalled();
    expect(controller.state).toBe("closed");
    controller.destroy();
    vi.useRealTimers();
  });

  it("honors CLOSE_PURCHASE_SUCCESS_WINDOW from child", () => {
    stubWebKitNavigator();
    const onClose = vi.fn();
    const controller = new StashPayController({
      checkoutUrl: CHECKOUT_URL,
      onClose,
    });
    controller.mount();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          eventName: `${MESSAGE_PREFIX}CLOSE_PURCHASE_SUCCESS_WINDOW`,
        },
        origin: "https://checkout.stash.gg",
        source: child as unknown as MessageEventSource,
      }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(child.close).toHaveBeenCalled();
    controller.destroy();
  });
});
