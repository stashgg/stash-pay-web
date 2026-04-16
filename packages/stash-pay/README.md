# @stashgg/stash-pay

Embeddable checkout SDK for [Stash Pay](https://docs.stash.gg/guides/stash-pay/integration). Drop it into any React app, plain HTML page, or Unity WebGL build — the component opens a theme-able card that hosts the Stash Pay checkout iframe and surfaces typed success/failure/processing events to the host.

- **React component** — declarative `<StashPay isOpen checkoutUrl ... />`
- **Vanilla ESM core** — `import { open } from '@stashgg/stash-pay/vanilla'` for non-React apps
- **Script-tag UMD** — `<script src="...stash-pay.umd.global.js">` exposes `window.StashPay.open({ ... })`
- Four layout presets: bottom sheet, centered modal, side panels
- Full CSS-variable theming
- Accessible by default: `role=dialog`, focus trap, `inert` siblings, reduced-motion honored
- No runtime dependencies; React is a peer (optional for the vanilla/UMD surface)

## Install

```bash
npm install @stashgg/stash-pay
```

Or load directly via CDN:

```html
<script src="https://unpkg.com/@stashgg/stash-pay@2/dist/umd/stash-pay.umd.global.js"></script>
```

## Quick start — React

```tsx
import { StashPay } from '@stashgg/stash-pay';
import '@stashgg/stash-pay/styles'; // once in your app entry

export function PayButton({ checkoutUrl }: { checkoutUrl: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Pay</button>
      <StashPay
        isOpen={open}
        checkoutUrl={checkoutUrl}
        position="center-modal"
        onSuccess={(e) => console.log('paid', e.orderId)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
```

## Quick start — script tag (Unity WebGL, vanilla HTML, etc.)

```html
<script src="https://unpkg.com/@stashgg/stash-pay@2/dist/umd/stash-pay.umd.global.js"></script>
<script>
  const handle = StashPay.open({
    checkoutUrl: 'https://pay.stash.gg/checkout/abc...',
    position: 'center-modal',
    dismissOnBackdropClick: true,
    onSuccess: (e) => console.log('paid', e.orderId),
    onClose: () => console.log('closed'),
  });

  // later:
  // handle.update({ position: 'bottom-sheet' });
  // handle.close();
  // handle.destroy();
</script>
```

Styles are auto-injected once on load in the UMD bundle. No separate CSS import needed.

## Quick start — vanilla ESM (no React)

```ts
import { open } from '@stashgg/stash-pay/vanilla';
import '@stashgg/stash-pay/styles';

const handle = open({
  checkoutUrl,
  position: 'side-panel-right',
  onSuccess: (e) => console.log(e.orderId),
});
```

## Props / options reference

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `checkoutUrl` | `string` | — | **Required.** URL returned by Stash Pay server API. |
| `isOpen` *(React only)* | `boolean` | — | **Required.** Controls visibility. |
| `checkoutTheme` | `'light' \| 'dark'` | — | Forwards a `theme=` query parameter to the checkout page so the checkout UI renders in the matching colour scheme. Distinct from `theme` (which styles the surrounding card). |
| `position` | `'bottom-sheet' \| 'center-modal' \| 'side-panel-right' \| 'side-panel-left'` | `'bottom-sheet'` | Layout preset. |
| `width` | `string \| number` | — | Overrides the preset width. |
| `height` | `string \| number` | — | Overrides the preset height. |
| `zIndex` | `number` | `2147483000` | Sets `--stash-pay-z-index`. |
| `portalTarget` / `container` | `HTMLElement` | `document.body` | Where the modal mounts. |
| `showCloseButton` | `boolean` | `true` | |
| `showDragBar` | `boolean` | `true` on bottom-sheet, else `false` | |
| `dismissOnBackdropClick` | `boolean` | `true` | |
| `dismissOnEscape` | `boolean` | `true` | |
| `autoCloseOnSuccess` | `boolean` | `true` | Callback fires *before* close. |
| `autoCloseOnFailure` | `boolean` | `true` | |
| `backdrop` | `{ blur?, color?, opacity?, hidden? }` | — | Inline backdrop overrides. |
| `theme` | `StashPayTheme` | — | Sets CSS variables on the root. |
| `animationDuration` | `number` (ms) | `300` | Overrides the easing duration. |
| `ariaLabel` | `string` | `'Stash Pay checkout'` | |
| `iframe` | `StashPayIframeOptions` | — | See below. |
| `injectStyles` | `boolean` | UMD: `true`, else `false` | Runtime `<style>` injection toggle. |
| `cspNonce` | `string` | — | Applied to the injected `<style>` when runtime injection is enabled. |
| `onOpen / onClose / onReady / onError / onSuccess / onFailure / onProcessing` | fn | — | Callbacks. |

### Iframe options

```ts
interface StashPayIframeOptions {
  sandbox?: string;           // default: allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox
  allow?: string;             // default: "payment"
  title?: string;             // default: "Stash Pay checkout"
  referrerPolicy?: ReferrerPolicy;
  loading?: 'eager' | 'lazy';
  /** Optional postMessage origin whitelist. If set, events from other origins are dropped. */
  allowedOrigins?: string[];
}
```

## Event types

```ts
type StashPaymentEvent =
  | { type: 'success';    orderId?: string;   raw: Record<string, unknown> }
  | { type: 'failure';    errorCode?: string; message?: string; raw: Record<string, unknown> }
  | { type: 'processing'; raw: Record<string, unknown> };
```

Every callback receives a structured event plus a `raw` escape hatch containing every field the checkout page emitted, so forward-compatible fields can be read without a library bump.

## Theming

Every visual token is a CSS custom property defined on the root. Override globally:

```css
:root {
  --stash-pay-color-bg: #111;
  --stash-pay-color-accent: #ff7a00;
  --stash-pay-radius: 2rem;
  --stash-pay-animation-duration: 220ms;
}
```

…or per-instance via the `theme` option:

```tsx
<StashPay
  isOpen={open}
  checkoutUrl={url}
  theme={{
    colorBackground: '#111',
    colorAccent: '#ff7a00',
    radius: '2rem',
    animationDuration: 220,
  }}
/>
```

Full token list:

```
--stash-pay-color-bg
--stash-pay-color-backdrop
--stash-pay-color-text
--stash-pay-color-accent
--stash-pay-color-close-bg
--stash-pay-color-close-bg-hover
--stash-pay-color-close-fg
--stash-pay-color-close-fg-hover
--stash-pay-color-spinner-track
--stash-pay-color-spinner-head
--stash-pay-color-drag-bar
--stash-pay-color-shadow
--stash-pay-radius
--stash-pay-sheet-max-width
--stash-pay-modal-max-width
--stash-pay-side-panel-width
--stash-pay-close-offset
--stash-pay-animation-duration
--stash-pay-animation-easing
--stash-pay-iframe-fade-duration
--stash-pay-z-index
```

## Imperative / headless React usage

Prefer a function over a component?

```tsx
import { useStashPay } from '@stashgg/stash-pay';

function PayButton() {
  const { open } = useStashPay();
  return (
    <button
      onClick={() =>
        open({
          checkoutUrl: '...',
          onSuccess: (e) => alert(`paid ${e.orderId}`),
        })
      }
    >
      Pay
    </button>
  );
}
```

The handle returned by `open` exposes `close`, `update`, `destroy`, and typed `on` / `off`.

## Accessibility

- Root has `role="dialog"`, `aria-modal="true"`, `aria-label="Stash Pay checkout"` (customisable via `ariaLabel`).
- Siblings of the root get `inert` (with `aria-hidden` fallback) while the modal is open.
- Tab cycles between the close button and the iframe; the iframe handles its own internal focus.
- `previouslyFocused` element is restored on close.
- `prefers-reduced-motion: reduce` collapses all transitions.

## How the iframe communicates back

The checkout page drives the host through a small set of methods on
`window.stash_sdk` — the same surface the native Stash Pay SDKs expose
to their WebViews. The SDK installs this bridge on every iframe `load`:

| Method | Fires |
| --- | --- |
| `window.stash_sdk.onPaymentSuccess({ orderId })` | `onSuccess` |
| `window.stash_sdk.onPaymentFailure({ errorCode, message })` | `onFailure` |
| `window.stash_sdk.onPurchaseProcessing({ ... })` | `onProcessing` |
| `window.stash_sdk.expand()` / `.collapse()` | reserved (no-op unless you wire the host) |
| `window.stash_sdk.openExternalBrowser(url)` | `window.open(url, '_blank')` by default |
| `window.close()` | `onClose` |

The bridge is installed by assigning to `iframe.contentWindow` directly.
Because of the same-origin policy this only works when the checkout URL
is served from the **same origin** as your host page (Stash Pay
deployments typically CNAME the checkout onto your own domain). For
cross-origin iframes the installer is a silent no-op, and the SDK
listens for two postMessage envelope shapes as a fallback:

```js
// stash_sdk envelope (preferred)
window.parent.postMessage(
  { source: 'stash_sdk', method: 'onPaymentSuccess', payload: { orderId } },
  '*',
);

// legacy envelope (v1-compatible)
window.parent.postMessage(
  { eventName: 'STASH_WINDOW_EVENT__PAYMENT_SUCCESS', orderId },
  '*',
);
```

Both envelopes resolve to the same typed `onSuccess` callback — pick
whichever is easier to emit from the checkout page.

## Security notes

- The default iframe `sandbox` includes `allow-same-origin` — this is required for the bridge installation, for the checkout page to read its own cookies, redirect through 3DS providers, and drive the webhook round-trip. Override via `iframe.sandbox` if you understand the implications.
- For strict postMessage validation, pass `iframe.allowedOrigins: ['https://pay.stash.gg']` (or your environment's origin).
- Strict CSP? Runtime `<style>` injection accepts a `cspNonce`; or disable injection with `injectStyles: false` and ship the stylesheet yourself via `<link rel="stylesheet" href="/stash-pay.css">`.

## SSR

`<StashPay>` renders nothing on the server (returns `null`) and mounts its DOM from a client effect, so it is safe inside Next.js server components and app-router layouts. The `/vanilla` entry throws if `document` is not available — call it from a client-side effect or `window`-guarded path.

## Migration from v1.x

See [MIGRATION.md](./MIGRATION.md). Highlights:

- `onPurchaseSuccess` → `onSuccess` (typed).
- `onPurchaseFailed` → `onFailure` (typed).
- Callbacks now fire **before** the auto-close animation starts.
- Width prop unchanged; new `height`, `position`, `backdrop`, `theme`, `iframe`, dismiss and auto-close flags are all additive.

## Browser support

Evergreen Chrome/Edge/Firefox, Safari 14+.

## License

MIT © Stash
