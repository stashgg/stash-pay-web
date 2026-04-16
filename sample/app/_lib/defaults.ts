import type { StashPayProps } from '@stashgg/stash-pay';

export type PlaygroundConfig = Omit<
  StashPayProps,
  'isOpen' | 'checkoutUrl' | keyof CallbackProps
>;

type CallbackProps =
  | 'onOpen'
  | 'onClose'
  | 'onReady'
  | 'onError'
  | 'onSuccess'
  | 'onFailure'
  | 'onProcessing';

export const DEFAULT_CONFIG: PlaygroundConfig = {
  checkoutTheme: undefined,
  position: 'bottom-sheet',
  width: undefined,
  height: undefined,
  zIndex: undefined,
  showCloseButton: true,
  showDragBar: undefined,
  dismissOnBackdropClick: true,
  dismissOnEscape: true,
  autoCloseOnSuccess: true,
  autoCloseOnFailure: true,
  animationDuration: 300,
  backdrop: {
    color: '',
    opacity: undefined,
    blur: undefined,
    hidden: false,
  },
  theme: {
    colorBackground: '',
    colorAccent: '',
    radius: '',
  },
  iframe: {
    title: 'Stash Pay checkout',
  },
  ariaLabel: undefined,
};
