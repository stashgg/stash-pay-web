'use client';

import { useCallback, useEffect, useRef } from 'react';
import { StashPayController } from '../core/controller';
import type { StashPayHandle, StashPayOptions } from '../core/types';

/**
 * Imperative hook — alternative to `<StashPay />`.
 *
 * ```tsx
 * const { open } = useStashPay();
 * <button onClick={() => open({ checkoutUrl, onSuccess })}>Pay</button>
 * ```
 *
 * Handles are cleaned up on unmount.
 */
export function useStashPay(): {
  open: (options: StashPayOptions) => StashPayHandle;
} {
  const handleRef = useRef<StashPayHandle | null>(null);

  useEffect(() => {
    return () => {
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  const open = useCallback((options: StashPayOptions) => {
    handleRef.current?.destroy();
    const handle = StashPayController.open(options);
    handleRef.current = handle;
    return handle;
  }, []);

  return { open };
}
