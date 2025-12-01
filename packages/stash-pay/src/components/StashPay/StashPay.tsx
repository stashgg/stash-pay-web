'use client';

import { useEffect, useState, useRef } from 'react';
import '../../styles/stash-pay.css';
import { StashWindowEvent } from '../../types';
import Backdrop from './Backdrop/Backdrop';
import PaymentCard from './PaymentCard/PaymentCard';

export interface StashPayProps {
  isOpen: boolean;
  checkoutUrl: string | null;
  onClose: () => void;
  onPurchaseSuccess?: (data?: Record<string, unknown>) => void;
  onPurchaseFailed?: (data?: Record<string, unknown>) => void;
}

export default function StashPay({ isOpen, checkoutUrl, onClose, onPurchaseSuccess, onPurchaseFailed }: StashPayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Reset loading state when modal opens or closes
    // Use setTimeout to defer state update and avoid linter warning
    const timer = setTimeout(() => {
      if (isOpen && checkoutUrl) {
        setIsLoading(true);
      } else if (!isOpen) {
        setIsLoading(true);
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, [isOpen, checkoutUrl]);

  // Listen for messages from iframe via window.parent.postMessage()
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'object' || event.data === null || !('eventName' in event.data)) {
        return;
      }

      const data = event.data as Record<string, unknown>;
      const eventName = data.eventName;

      if (typeof eventName !== 'string') {
        return;
      }

      // Remove "STASH_WINDOW_EVENT__" prefix to get the enum value
      const eventType = eventName.replace('STASH_WINDOW_EVENT__', '') as StashWindowEvent;

      if (!Object.values(StashWindowEvent).includes(eventType)) {
        return;
      }

      // Extract any additional data (excluding eventName)
      const rest = { ...data };
      delete rest.eventName;
      const eventData = Object.keys(rest).length > 0 ? rest : undefined;

      // Call appropriate callback based on event type
      if (eventType === StashWindowEvent.PAYMENT_SUCCESS) {
        onClose(); // Auto-close on success
        if (onPurchaseSuccess) {
          onPurchaseSuccess(eventData);
        }
      } else if (eventType === StashWindowEvent.PAYMENT_FAILURE) {
        onClose(); // Auto-close on failure
        if (onPurchaseFailed) {
          onPurchaseFailed(eventData);
        }
      }
    };

    if (isOpen) {
      window.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [isOpen, onClose, onPurchaseSuccess, onPurchaseFailed]);

  const handleIframeLoad = () => {
    // Iframe has loaded and rendered - stop loading animation
    setIsLoading(false);
  };

  if (!checkoutUrl) return null;

  return (
    <div
      className={`stash-pay-container ${isOpen ? 'open' : 'closed'}`}
    >
      <Backdrop onClick={onClose} />
      <PaymentCard
        isOpen={isOpen}
        isLoading={isLoading}
        checkoutUrl={checkoutUrl}
        iframeRef={iframeRef}
        onClose={onClose}
        onIframeLoad={handleIframeLoad}
      />
    </div>
  );
}

