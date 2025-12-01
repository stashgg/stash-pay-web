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
}

export default function PaymentCard({
  isOpen,
  isLoading,
  checkoutUrl,
  iframeRef,
  onClose,
  onIframeLoad,
}: PaymentCardProps) {
  return (
    <div
      className={`stash-pay-card ${isOpen ? '' : 'closed'}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        height: isLoading ? '400px' : '90vh',
        maxHeight: '90vh',
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

