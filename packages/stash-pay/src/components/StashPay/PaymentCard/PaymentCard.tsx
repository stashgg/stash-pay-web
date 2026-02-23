import { RefObject } from 'react';
import DragBar from '../DragBar/DragBar';
import CloseButton from '../CloseButton/CloseButton';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import CheckoutContainer from '../CheckoutContainer/CheckoutContainer';

interface PaymentCardProps {
  isOpen: boolean;
  isLoading: boolean;
  checkoutUrl: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
  onIframeLoad: () => void;
  /** Optional width for the payment card (e.g., '500px', '100%', '50vw') */
  width?: string | number;
}

export default function PaymentCard({
  isOpen,
  isLoading,
  checkoutUrl,
  iframeRef,
  onClose,
  onIframeLoad,
  width,
}: PaymentCardProps) {
  return (
    <div
      className={`stash-pay-card ${isOpen ? '' : 'closed'}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        height: isLoading ? '400px' : '90vh',
        maxHeight: '90vh',
        ...(width !== undefined && { width: typeof width === 'number' ? `${width}px` : width }),
      }}
    >
      <DragBar />
      <CloseButton onClick={onClose} />
      {isLoading && <LoadingSpinner />}
      <CheckoutContainer
        checkoutUrl={checkoutUrl}
        iframeRef={iframeRef}
        isLoading={isLoading}
        onLoad={onIframeLoad}
      />
    </div>
  );
}

