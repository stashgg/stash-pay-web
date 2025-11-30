# Stash Pay Sample - Next.js Integration

A Next.js application demonstrating how to integrate Stash Pay checkout links with a React component that handles payment events from an embedded iframe.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### StashPay Component

The `StashPay` component embeds a Stash checkout URL in an iframe and listens for payment events.

#### Basic Usage

```tsx
import StashPay from './components/StashPay';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  return (
    <StashPay
      isOpen={isOpen}
      checkoutUrl={checkoutUrl}
      onClose={() => setIsOpen(false)}
      onPurchaseSuccess={(data) => {
        console.log('Payment successful!', data);
        // Handle successful payment
      }}
      onPurchaseFailed={(data) => {
        console.log('Payment failed!', data);
        // Handle failed payment
      }}
    />
  );
}
```

#### Props

- `isOpen: boolean` - Controls modal visibility
- `checkoutUrl: string | null` - The Stash checkout URL to embed
- `onClose: () => void` - Callback when modal is closed
- `onPurchaseSuccess?: (data?: Record<string, unknown>) => void` - Callback when payment succeeds
- `onPurchaseFailed?: (data?: Record<string, unknown>) => void` - Callback when payment fails

### How Events Work

The Stash Pay checkout iframe communicates with the parent page using the [PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

#### Event Flow

1. **Iframe sends event**: The Stash checkout page calls `window.parent.postMessage()` with an event object
2. **Parent listens**: The `StashPay` component listens for these messages using `window.addEventListener('message', ...)`
3. **Event parsing**: The component parses the message and extracts the event type
4. **Callback execution**: The appropriate callback (`onPurchaseSuccess` or `onPurchaseFailed`) is called
5. **Auto-close**: The modal automatically closes on success or failure

#### Event Format

The Stash checkout iframe sends events in the following format:

```javascript
{
  eventName: "STASH_WINDOW_EVENT__PAYMENT_SUCCESS",  // or PAYMENT_FAILURE
  // ... additional data (optional)
}
```

#### Supported Events

- `PAYMENT_SUCCESS` - Payment completed successfully
- `PAYMENT_FAILURE` - Payment failed or was cancelled
- `PURCHASE_PROCESSING` - Payment is being processed (currently not handled by callbacks)

### API Endpoint

The project includes a backend API route at `/api/checkout` that generates Stash checkout links.

#### Request

```bash
POST /api/checkout
Content-Type: application/json

{}
```

The endpoint uses default payload values. You can customize the request body to override defaults:

```json
{
  "regionCode": "USA",
  "currency": "USD",
  "item": {
    "id": "item-id",
    "pricePerItem": "9.99",
    "quantity": 1,
    "name": "Product Name",
    "description": "Product Description"
  },
  "user": {
    "id": "user-id",
    "validatedEmail": "user@example.com",
    "regionCode": "US",
    "platform": "IOS"
  }
}
```

#### Response

```json
{
  "url": "https://checkout.stash.gg/...",
  "id": "checkout-id",
  "regionCode": "USA"
}
```

## Project Structure

```
app/
├── api/
│   └── checkout/
│       └── route.ts          # Backend API for generating checkout links
├── components/
│   └── StashPay.tsx          # Main payment modal component
├── page.tsx                  # Example usage page
└── layout.tsx                # Root layout
```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
STASH_API_KEY=your_stash_api_key_here
```

The API key is used by the `/api/checkout` endpoint to authenticate with the Stash API.

## StashPay Component Details

### Features

- **Loading State**: Shows a spinner while the iframe loads
- **Smooth Animations**: Slide-up animation with fade transitions
- **Backdrop Dismiss**: Click outside the card to close
- **Auto-close**: Automatically closes on payment success or failure
- **Event Handling**: Listens for `window.parent.postMessage()` from the iframe

### Event Listening Implementation

The component uses the following approach to listen for events:

```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    // Parse the event from the iframe
    const eventName = event.data.eventName;
    const eventType = eventName.replace('STASH_WINDOW_EVENT__', '');
    
    // Call appropriate callback
    if (eventType === 'PAYMENT_SUCCESS') {
      onPurchaseSuccess?.(eventData);
    } else if (eventType === 'PAYMENT_FAILURE') {
      onPurchaseFailed?.(eventData);
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, [isOpen, onPurchaseSuccess, onPurchaseFailed]);
```

## Development

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## License

MIT
