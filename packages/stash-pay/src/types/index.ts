/**
 * Stash Window Event Types
 * 
 * These types define the events that can be sent from the Stash checkout iframe
 * to the parent window via postMessage.
 */

export enum StashWindowEvent {
  PAYMENT_FAILURE = 'PAYMENT_FAILURE',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PURCHASE_PROCESSING = 'PURCHASE_PROCESSING',
}

export interface StashEventMessage {
  type: StashWindowEvent;
  data?: Record<string, unknown>;
}

