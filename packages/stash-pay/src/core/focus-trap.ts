/**
 * Minimal focus trap — cycles Tab between the close button and the iframe.
 * The iframe is treated as the terminal focusable; the browser handles
 * keyboard navigation inside it natively.
 *
 * Also applies `inert` (with `aria-hidden` fallback) to siblings of the root
 * so screen readers and AT tools can't reach outside the modal.
 */

export interface FocusTrap {
  activate(): void;
  deactivate(): void;
}

export function createFocusTrap(
  root: HTMLElement,
  getFocusables: () => HTMLElement[],
): FocusTrap {
  let previouslyFocused: Element | null = null;
  const inertedSiblings: Array<{
    el: Element;
    hadInert: boolean;
    prevAriaHidden: string | null;
  }> = [];
  let active = false;

  const onKeyDown = (ev: KeyboardEvent) => {
    if (!active || ev.key !== 'Tab') return;
    const focusables = getFocusables();
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const activeEl = document.activeElement as HTMLElement | null;

    if (ev.shiftKey && activeEl === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && activeEl === last) {
      ev.preventDefault();
      first.focus();
    }
  };

  const applyInert = (container: ParentNode) => {
    for (const sibling of Array.from(container.children)) {
      if (sibling === root || sibling.tagName === 'SCRIPT') continue;
      const el = sibling as HTMLElement;
      const hadInert = (el as HTMLElement & { inert?: boolean }).inert === true;
      const prevAriaHidden = el.getAttribute('aria-hidden');
      try {
        (el as HTMLElement & { inert?: boolean }).inert = true;
      } catch {
        /* inert not supported — fall back to aria-hidden */
      }
      el.setAttribute('aria-hidden', 'true');
      inertedSiblings.push({ el, hadInert, prevAriaHidden });
    }
  };

  const clearInert = () => {
    for (const { el, hadInert, prevAriaHidden } of inertedSiblings) {
      try {
        (el as HTMLElement & { inert?: boolean }).inert = hadInert;
      } catch {
        /* noop */
      }
      if (prevAriaHidden === null) {
        el.removeAttribute('aria-hidden');
      } else {
        el.setAttribute('aria-hidden', prevAriaHidden);
      }
    }
    inertedSiblings.length = 0;
  };

  return {
    activate() {
      if (active) return;
      active = true;
      previouslyFocused = document.activeElement;
      const parent = root.parentNode;
      if (parent) applyInert(parent);
      document.addEventListener('keydown', onKeyDown, true);

      // Defer to next frame so animations don't fight with focus.
      requestAnimationFrame(() => {
        const focusables = getFocusables();
        focusables[0]?.focus({ preventScroll: true });
      });
    },
    deactivate() {
      if (!active) return;
      active = false;
      document.removeEventListener('keydown', onKeyDown, true);
      clearInert();
      if (
        previouslyFocused &&
        previouslyFocused instanceof HTMLElement &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus({ preventScroll: true });
      }
      previouslyFocused = null;
    },
  };
}
