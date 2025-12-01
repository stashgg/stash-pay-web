# @stashgg/stash-pay

React component for Stash payment checkout integration.

## Installation

```bash
npm install @stashgg/stash-pay
```

## Usage

```tsx
import { StashPay } from '@stashgg/stash-pay';

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

## Props

- `isOpen: boolean` - Controls the visibility of the payment modal
- `checkoutUrl: string | null` - The checkout URL to display in the iframe
- `onClose: () => void` - Callback when the modal is closed
- `onPurchaseSuccess?: (data?: Record<string, unknown>) => void` - Callback when payment succeeds
- `onPurchaseFailed?: (data?: Record<string, unknown>) => void` - Callback when payment fails

## Types

- `StashWindowEvent` - Enum of available window events
- `StashEventMessage` - Type for event messages

