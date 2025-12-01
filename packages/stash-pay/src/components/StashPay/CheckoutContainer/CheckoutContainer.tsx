import { RefObject } from 'react';

interface CheckoutContainerProps {
  checkoutUrl: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  isLoading: boolean;
  onLoad: () => void;
}

export default function CheckoutContainer({ checkoutUrl, iframeRef, isLoading, onLoad }: CheckoutContainerProps) {
  return (
    <div
      className={`stash-pay-iframe-container ${isLoading ? 'loading' : 'loaded'}`}
    >
      <iframe
        key={checkoutUrl}
        ref={iframeRef}
        src={checkoutUrl}
        className="stash-pay-iframe"
        onLoad={onLoad}
        title="Stash Payment"
        allow="payment"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}

