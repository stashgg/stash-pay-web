import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StashPayController } from "../controller";

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

describe("StashPayController WebKit same-tab redirect", () => {
  let openSpy: ReturnType<typeof vi.fn>;
  let assignSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    openSpy = vi.fn();
    assignSpy = vi.fn();
    vi.stubGlobal("open", openSpy);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: assignSpy,
        href: "http://localhost/",
      },
    });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("redirects same-tab on WebKit (no iframe, no window.open)", () => {
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

    expect(openSpy).not.toHaveBeenCalled();
    expect(document.querySelector("iframe")).toBeNull();
    expect(onTopLevelNavigation).toHaveBeenCalledWith({
      url: CHECKOUT_URL,
      mode: "redirect",
    });
    expect(onOpen).toHaveBeenCalled();
    expect(onReady).toHaveBeenCalled();
    expect(assignSpy).toHaveBeenCalledWith(CHECKOUT_URL);
    expect(controller.isOpen).toBe(true);

    controller.destroy();
  });

  it("fires onOpen and onReady before location.assign", () => {
    stubWebKitNavigator();
    const order: string[] = [];
    const controller = new StashPayController({
      checkoutUrl: CHECKOUT_URL,
      onOpen: () => order.push("open"),
      onReady: () => order.push("ready"),
      onTopLevelNavigation: () => order.push("nav"),
    });
    assignSpy.mockImplementation(() => order.push("assign"));
    controller.mount();

    expect(order).toEqual(["nav", "open", "ready", "assign"]);
    controller.destroy();
  });

  it("opt-out preferRedirectOnWebKit keeps iframe path on WebKit", () => {
    stubWebKitNavigator();
    const controller = new StashPayController({
      checkoutUrl: CHECKOUT_URL,
      preferRedirectOnWebKit: false,
    });
    controller.mount();

    expect(assignSpy).not.toHaveBeenCalled();
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

    expect(assignSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
    expect(document.querySelector("iframe")).not.toBeNull();
    controller.destroy();
  });

  it("still validates checkoutUrl before redirect", () => {
    stubWebKitNavigator();
    const onError = vi.fn();
    const controller = new StashPayController({
      checkoutUrl: "not-a-url",
      onError,
    });

    expect(() => controller.mount()).toThrow();
    expect(onError).toHaveBeenCalled();
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
