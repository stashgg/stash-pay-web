# @stashgg/stash-pay

React component for Stash payment checkout integration.

## Installation

```bash
npm install @stashgg/stash-pay
```

## Usage

The component includes its own CSS styles. Depending on your bundler setup, you may need to import the styles separately:

### With CSS Import (Recommended)

```tsx
import { StashPay } from '@stashgg/stash-pay';
import '@stashgg/stash-pay/styles';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  return (
    <StashPay
      isOpen={isOpen}
      checkoutUrl={checkoutUrl}
      onClose={() => setIsOpen(false)}
      onPurchaseSuccess={(data) => console.log('Success:', data)}
      onPurchaseFailed={(data) => console.log('Failed:', data)}
    />
  );
}
```

### Without Separate Import

If your bundler handles CSS imports automatically (e.g., Next.js, Vite with CSS plugin), you can use the component directly:

```tsx
import { StashPay } from '@stashgg/stash-pay';

function App() {
  // ... same as above
}
```

**Note**: The component includes CSS classes that are required for proper styling. If styles don't appear, make sure to import `@stashgg/stash-pay/styles` in your application.

## Props

- `isOpen: boolean` - Controls the visibility of the payment modal
- `checkoutUrl: string | null` - The checkout URL to display in the iframe
- `onClose: () => void` - Callback when the modal is closed
- `onPurchaseSuccess?: (data?: Record<string, unknown>) => void` - Callback when payment succeeds
- `onPurchaseFailed?: (data?: Record<string, unknown>) => void` - Callback when payment fails

## Types

- `StashWindowEvent` - Enum of available window events
- `StashEventMessage` - Type for event messages

