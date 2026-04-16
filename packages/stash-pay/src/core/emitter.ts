/**
 * Minimal typed event emitter.
 * Keys are event names; values are handler signatures.
 * Handlers run synchronously in insertion order. Errors are caught and
 * swallowed per-handler so one bad subscriber can't break the payment flow.
 */
export class Emitter<M extends { [K in keyof M]: (...args: any[]) => void }> {
  private readonly listeners: { [K in keyof M]?: Set<M[K]> } = {};

  on<K extends keyof M>(event: K, handler: M[K]): () => void {
    const set = (this.listeners[event] ??= new Set<M[K]>());
    set.add(handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof M>(event: K, handler: M[K]): void {
    this.listeners[event]?.delete(handler);
  }

  emit<K extends keyof M>(event: K, ...args: Parameters<M[K]>): void {
    const set = this.listeners[event];
    if (!set) return;
    for (const handler of set) {
      try {
        (handler as (...a: unknown[]) => void)(...args);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[stash-pay] handler for "${String(event)}" threw:`, err);
      }
    }
  }

  clear(): void {
    for (const key of Object.keys(this.listeners)) {
      this.listeners[key as keyof M]?.clear();
    }
  }
}
