/**
 * Error model for the Stash Pay SDK.
 *
 * `onError` (and the `error` event) deliver a `StashPayError` — an `Error`
 * subclass carrying a machine-readable `code` so host code can branch on the
 * failure kind without string-matching `message`.
 */

export type StashPayErrorCode =
  /** `checkoutUrl` is empty, unparseable, or not an `http(s)` URL. */
  | 'INVALID_URL'
  /** `checkoutUrl` host is not in `allowedCheckoutHosts`. */
  | 'DOMAIN_NOT_ALLOWED'
  /** The checkout iframe failed to load, or did not load within `loadTimeout`. */
  | 'NETWORK_ERROR'
  /** The modal could not be mounted into the DOM. */
  | 'MOUNT_ERROR'
  /** Any other / unclassified failure. */
  | 'UNKNOWN';

/**
 * An `Error` subclass with a stable `code`. Prefer branching on `code` over
 * `instanceof` — a bundled copy of the class may differ by reference.
 */
export class StashPayError extends Error {
  readonly code: StashPayErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: StashPayErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'StashPayError';
    this.code = code;
    if (details) this.details = details;
    Object.setPrototypeOf(this, StashPayError.prototype);
  }
}

export function toStashPayError(
  err: unknown,
  fallbackCode: StashPayErrorCode = 'UNKNOWN',
): StashPayError {
  if (err instanceof StashPayError) return err;
  if (err instanceof Error) {
    return new StashPayError(fallbackCode, err.message, { cause: err });
  }
  return new StashPayError(fallbackCode, String(err));
}
