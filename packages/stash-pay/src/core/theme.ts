/**
 * Theme object → CSS custom property mapping.
 * Called from `applyTheme(root, theme)` inside the controller.
 */

import type { StashPayTheme } from './types';

type CssVar = `--stash-pay-${string}`;

const THEME_MAP: { [K in keyof Required<StashPayTheme>]: CssVar } = {
  // Colors
  colorBackground: '--stash-pay-color-bg',
  colorBackdrop: '--stash-pay-color-backdrop',
  colorText: '--stash-pay-color-text',
  colorAccent: '--stash-pay-color-accent',
  colorCloseButtonBg: '--stash-pay-color-close-bg',
  colorCloseButtonBgHover: '--stash-pay-color-close-bg-hover',
  colorCloseButtonFg: '--stash-pay-color-close-fg',
  colorCloseButtonFgHover: '--stash-pay-color-close-fg-hover',
  colorSpinnerTrack: '--stash-pay-color-spinner-track',
  colorSpinnerHead: '--stash-pay-color-spinner-head',
  colorDragBar: '--stash-pay-color-drag-bar',
  colorShadow: '--stash-pay-color-shadow',
  // Geometry
  radius: '--stash-pay-radius',
  sheetMaxWidth: '--stash-pay-sheet-max-width',
  modalMaxWidth: '--stash-pay-modal-max-width',
  sidePanelWidth: '--stash-pay-side-panel-width',
  // Motion
  animationDuration: '--stash-pay-animation-duration',
  animationEasing: '--stash-pay-animation-easing',
  // Layering
  zIndex: '--stash-pay-z-index',
};

function toCss(value: unknown, key: keyof StashPayTheme): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    // Duration-like keys get `ms`; everything else numeric is unitless.
    if (key === 'animationDuration') return `${value}ms`;
    return String(value);
  }
  return String(value);
}

/**
 * Apply a partial theme object to the given root element.
 * Removes the property if the value is undefined or empty string.
 */
export function applyTheme(root: HTMLElement, theme: StashPayTheme = {}): void {
  (Object.keys(THEME_MAP) as (keyof StashPayTheme)[]).forEach((key) => {
    const varName = THEME_MAP[key];
    const value = theme[key];
    if (value === undefined || value === null || value === '') {
      root.style.removeProperty(varName);
      return;
    }
    root.style.setProperty(varName, toCss(value, key));
  });
}

/**
 * Read the current resolved animation duration (in ms) from the root.
 * Used to coordinate close-transition completion.
 */
export function readAnimationDurationMs(
  root: HTMLElement,
  fallback: number,
): number {
  const raw = getComputedStyle(root)
    .getPropertyValue('--stash-pay-animation-duration')
    .trim();
  if (!raw) return fallback;
  if (raw.endsWith('ms')) return parseFloat(raw) || fallback;
  if (raw.endsWith('s')) return (parseFloat(raw) || fallback / 1000) * 1000;
  return parseFloat(raw) || fallback;
}
