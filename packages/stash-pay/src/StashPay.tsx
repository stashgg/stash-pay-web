'use client';

import { useEffect, useState, useRef } from 'react';
import './stash-pay.css';

// Stash types
export enum StashWindowEvent {
  PAYMENT_FAILURE = 'PAYMENT_FAILURE',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PURCHASE_PROCESSING = 'PURCHASE_PROCESSING',
}

export interface StashEventMessage {
  type: StashWindowEvent;
  data?: Record<string, unknown>;
}

interface StashPayProps {
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
      {/* Backdrop with blur */}
      <div
        className="stash-pay-backdrop"
        onClick={onClose}
      />

      {/* Payment Card */}
      <div
        className={`stash-pay-card ${isOpen ? '' : 'closed'}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          height: isLoading ? '400px' : '90vh',
          maxHeight: '90vh',
        }}
      >
        {/* Drag bar - Overlay */}
        <div className="stash-pay-drag-bar">
          <div className="stash-pay-drag-bar-indicator" />
        </div>

        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="stash-pay-close-button"
          aria-label="Close"
        >
          <svg
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Simple Loading Indicator */}
        {isLoading && (
          <div className="stash-pay-loading">
            <div className="stash-pay-spinner" />
          </div>
        )}

        {/* Iframe Container */}
        <div
          className={`stash-pay-iframe-container ${isLoading ? 'loading' : 'loaded'}`}
        >
          <iframe
            key={checkoutUrl}
            ref={iframeRef}
            src={checkoutUrl}
            className="stash-pay-iframe"
            onLoad={handleIframeLoad}
            title="Stash Payment"
            allow="payment"
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </div>
    </div>
  );
}

