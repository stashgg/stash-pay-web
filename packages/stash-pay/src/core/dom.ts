/**
 * DOM builder — constructs the full card tree using `createElement` only.
 * No `innerHTML`, no template strings with interpolation. Every user-supplied
 * string goes through attribute/textContent APIs so XSS is structurally
 * impossible at this layer.
 */

import {
  CLASS,
  DATA_ATTR,
  DEFAULT_ALLOW,
  DEFAULT_ARIA_LABEL,
  DEFAULT_SANDBOX,
  DEFAULT_TITLE,
} from './constants';
import type { StashPayOptions } from './types';

export interface BuiltTree {
  root: HTMLDivElement;
  backdrop: HTMLDivElement;
  card: HTMLDivElement;
  dragBar: HTMLDivElement;
  closeButton: HTMLButtonElement;
  loading: HTMLDivElement;
  iframe: HTMLIFrameElement;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function buildCloseButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = CLASS.closeButton;
  btn.setAttribute('aria-label', 'Close');

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M6 18L18 6M6 6l12 12');
  svg.appendChild(path);
  btn.appendChild(svg);
  return btn;
}

function buildDragBar(): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = CLASS.dragBar;
  wrap.setAttribute('aria-hidden', 'true');
  const ind = document.createElement('div');
  ind.className = CLASS.dragBarIndicator;
  wrap.appendChild(ind);
  return wrap;
}

function buildLoading(): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = CLASS.loading;
  wrap.setAttribute('aria-hidden', 'true');
  const spinner = document.createElement('div');
  spinner.className = CLASS.spinner;
  wrap.appendChild(spinner);
  return wrap;
}

function buildIframe(options: StashPayOptions): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.className = CLASS.iframe;
  iframe.title = options.iframe?.title ?? DEFAULT_TITLE;
  iframe.setAttribute('allow', options.iframe?.allow ?? DEFAULT_ALLOW);
  iframe.setAttribute('sandbox', options.iframe?.sandbox ?? DEFAULT_SANDBOX);
  if (options.iframe?.referrerPolicy) {
    iframe.referrerPolicy = options.iframe.referrerPolicy;
  }
  if (options.iframe?.loading) {
    iframe.loading = options.iframe.loading;
  }
  return iframe;
}

export function buildTree(options: StashPayOptions): BuiltTree {
  const root = document.createElement('div');
  root.className = CLASS.root;
  root.setAttribute(DATA_ATTR.root, '');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', options.ariaLabel ?? DEFAULT_ARIA_LABEL);
  root.setAttribute(DATA_ATTR.state, 'closed');
  root.setAttribute(DATA_ATTR.loading, 'true');

  const backdrop = document.createElement('div');
  backdrop.className = CLASS.backdrop;

  const card = document.createElement('div');
  card.className = CLASS.card;

  const iframeWrap = document.createElement('div');
  iframeWrap.className = CLASS.iframeWrap;

  const iframe = buildIframe(options);
  iframeWrap.appendChild(iframe);

  const dragBar = buildDragBar();
  const closeButton = buildCloseButton();
  const loading = buildLoading();

  card.appendChild(dragBar);
  card.appendChild(closeButton);
  card.appendChild(loading);
  card.appendChild(iframeWrap);

  root.appendChild(backdrop);
  root.appendChild(card);

  return { root, backdrop, card, dragBar, closeButton, loading, iframe };
}

function toCssSize(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Apply the subset of options that drive DOM attributes/inline styles
 * (everything except iframe src and listeners).
 * Called on first build and on every `update()`.
 */
export function applyOptionsToDom(tree: BuiltTree, options: StashPayOptions): void {
  const { root, card, backdrop, dragBar, closeButton } = tree;

  const position = options.position ?? 'bottom-sheet';
  root.setAttribute(DATA_ATTR.position, position);

  if (options.ariaLabel) {
    root.setAttribute('aria-label', options.ariaLabel);
  }

  // Z-index
  if (options.zIndex !== undefined) {
    root.style.setProperty('--stash-pay-z-index', String(options.zIndex));
  } else {
    root.style.removeProperty('--stash-pay-z-index');
  }

  // Animation duration (override via prop takes precedence over theme var)
  if (options.animationDuration !== undefined) {
    root.style.setProperty(
      '--stash-pay-animation-duration',
      `${options.animationDuration}ms`,
    );
  }

  // Width / height inline on card (overrides preset max-widths)
  const widthCss = toCssSize(options.width);
  const heightCss = toCssSize(options.height);
  if (widthCss) {
    card.style.width = widthCss;
    card.style.maxWidth = widthCss;
  } else {
    card.style.width = '';
    card.style.maxWidth = '';
  }
  if (heightCss) {
    card.style.height = heightCss;
    card.style.maxHeight = heightCss;
  } else {
    card.style.height = '';
    card.style.maxHeight = '';
  }

  // Backdrop
  const bd = options.backdrop ?? {};
  backdrop.style.display = bd.hidden ? 'none' : '';
  if (bd.color !== undefined) {
    backdrop.style.backgroundColor = bd.color;
  } else {
    backdrop.style.backgroundColor = '';
  }
  if (bd.opacity !== undefined) {
    backdrop.style.opacity = String(bd.opacity);
  } else {
    backdrop.style.opacity = '';
  }
  if (bd.blur !== undefined) {
    const blurCss = typeof bd.blur === 'number' ? `${bd.blur}px` : bd.blur;
    const filter = bd.blur === 0 || bd.blur === '0' ? '' : `blur(${blurCss})`;
    backdrop.style.backdropFilter = filter;
    // @ts-expect-error — vendor prefix
    backdrop.style.webkitBackdropFilter = filter;
  } else {
    backdrop.style.backdropFilter = '';
    // @ts-expect-error — vendor prefix
    backdrop.style.webkitBackdropFilter = '';
  }

  // Drag bar visibility: explicit option wins, else default (true for sheet only)
  const showDragBar =
    options.showDragBar ??
    (position === 'bottom-sheet');
  dragBar.style.display = showDragBar ? '' : 'none';

  // Close button visibility
  const showClose = options.showCloseButton ?? true;
  closeButton.style.display = showClose ? '' : 'none';

  // Iframe — update mutable attrs without replacing the element
  const ifr = tree.iframe;
  if (options.iframe?.title !== undefined) ifr.title = options.iframe.title;
  if (options.iframe?.allow !== undefined) {
    ifr.setAttribute('allow', options.iframe.allow);
  }
  if (options.iframe?.sandbox !== undefined) {
    ifr.setAttribute('sandbox', options.iframe.sandbox);
  }
  if (options.iframe?.referrerPolicy !== undefined) {
    ifr.referrerPolicy = options.iframe.referrerPolicy;
  }
  if (options.iframe?.loading !== undefined) {
    ifr.loading = options.iframe.loading;
  }
}

/**
 * Utility: collect the focusable chrome elements for the focus trap.
 * Order matters — first element gets initial focus, and Tab cycles.
 */
export function collectFocusables(tree: BuiltTree): HTMLElement[] {
  const list: HTMLElement[] = [];
  if (tree.closeButton.style.display !== 'none') {
    list.push(tree.closeButton);
  }
  list.push(tree.iframe);
  return list;
}
