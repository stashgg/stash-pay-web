'use client';

import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import {
  StashPay,
  type PaymentFailureEvent,
  type PaymentProcessingEvent,
  type PaymentSuccessEvent,
} from '@stashgg/stash-pay';
import { CodeSnippet } from './_components/CodeSnippet';
import { ControlPanel } from './_components/ControlPanel';
import { ReactionLog, type LogEntry } from './_components/ReactionLog';
import { StashLogo } from './_components/StashLogo';
import { DEFAULT_CONFIG, type PlaygroundConfig } from './_lib/defaults';

type Action =
  | { kind: 'patch'; patch: Partial<PlaygroundConfig> }
  | { kind: 'backdrop'; patch: Partial<NonNullable<PlaygroundConfig['backdrop']>> }
  | { kind: 'theme'; patch: Partial<NonNullable<PlaygroundConfig['theme']>> }
  | { kind: 'iframe'; patch: Partial<NonNullable<PlaygroundConfig['iframe']>> };

function reducer(state: PlaygroundConfig, action: Action): PlaygroundConfig {
  switch (action.kind) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'backdrop':
      return { ...state, backdrop: { ...state.backdrop, ...action.patch } };
    case 'theme':
      return { ...state, theme: { ...state.theme, ...action.patch } };
    case 'iframe':
      return { ...state, iframe: { ...state.iframe, ...action.patch } };
  }
}

function sanitiseConfig(cfg: PlaygroundConfig): PlaygroundConfig {
  const clean: PlaygroundConfig = { ...cfg };
  if (cfg.theme) {
    const t = { ...cfg.theme };
    (Object.keys(t) as (keyof typeof t)[]).forEach((k) => {
      if (t[k] === '' || t[k] === undefined) delete t[k];
    });
    clean.theme = Object.keys(t).length > 0 ? t : undefined;
  }
  if (cfg.backdrop) {
    const b = { ...cfg.backdrop };
    if (b.color === '' || b.color === undefined) delete b.color;
    if (b.opacity === undefined) delete b.opacity;
    if (b.blur === undefined) delete b.blur;
    if (b.hidden === false) delete b.hidden;
    clean.backdrop = Object.keys(b).length > 0 ? b : undefined;
  }
  if (cfg.iframe) {
    const i = { ...cfg.iframe };
    (Object.keys(i) as (keyof typeof i)[]).forEach((k) => {
      if (i[k] === '' || i[k] === undefined) delete i[k];
    });
    clean.iframe = Object.keys(i).length > 0 ? i : undefined;
  }
  return clean;
}

export default function Playground() {
  const [config, dispatch] = useReducer(reducer, DEFAULT_CONFIG);
  const [url, setUrl] = useState('https://test.stashpreview.com/');
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const nextIdRef = useRef(1);

  const log = useCallback(
    (name: LogEntry['name'], message?: string, payload?: unknown) => {
      setLogEntries((prev) => [
        { id: nextIdRef.current++, ts: Date.now(), name, message, payload },
        ...prev,
      ]);
    },
    [],
  );

  const update = useCallback(
    (patch: Partial<PlaygroundConfig>) => dispatch({ kind: 'patch', patch }),
    [],
  );
  const updateBackdrop = useCallback(
    (patch: Partial<NonNullable<PlaygroundConfig['backdrop']>>) =>
      dispatch({ kind: 'backdrop', patch }),
    [],
  );
  const updateTheme = useCallback(
    (patch: Partial<NonNullable<PlaygroundConfig['theme']>>) =>
      dispatch({ kind: 'theme', patch }),
    [],
  );
  const updateIframe = useCallback(
    (patch: Partial<NonNullable<PlaygroundConfig['iframe']>>) =>
      dispatch({ kind: 'iframe', patch }),
    [],
  );

  const handleOpen = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setActiveUrl(trimmed);
    setIsOpen(true);
  }, [url]);

  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleCopyConfig = useCallback(() => {
    const snapshot = sanitiseConfig(config);
    navigator.clipboard
      .writeText(JSON.stringify(snapshot, null, 2))
      .then(() => log('info', 'Config copied to clipboard'))
      .catch(() => log('error', 'Clipboard copy failed'));
  }, [config, log]);

  const sdkProps = useMemo(() => sanitiseConfig(config), [config]);

  return (
    <main className="min-h-screen bg-stash-bg text-stash-text">
      <header className="border-b border-stash-border">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-6 py-4">
          <StashLogo className="text-stash-text" height={18} />
          <span className="hidden text-[13px] text-stash-text-soft sm:inline">
            · Pay SDK playground
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-0 md:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="max-h-[calc(100vh-57px)] overflow-y-auto border-b border-stash-border p-6 md:border-b-0 md:border-r">
          <ControlPanel
            config={config}
            update={update}
            updateBackdrop={updateBackdrop}
            updateTheme={updateTheme}
            updateIframe={updateIframe}
            onOpen={handleOpen}
            onClose={handleClose}
            onCopyConfig={handleCopyConfig}
            isOpen={isOpen}
            canOpen={url.trim().length > 0}
            url={url}
            onUrlChange={setUrl}
          />
        </aside>

        <div className="grid h-[calc(100vh-57px)] grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
          <ReactionLog entries={logEntries} onClear={() => setLogEntries([])} />
          <CodeSnippet config={sdkProps} checkoutUrl={url.trim()} />
        </div>
      </div>

      <StashPay
        isOpen={isOpen}
        checkoutUrl={activeUrl}
        {...sdkProps}
        onOpen={() => log('open')}
        onClose={() => {
          setIsOpen(false);
          log('close');
        }}
        onReady={() => log('ready')}
        onSuccess={(e: PaymentSuccessEvent) => log('success', e.orderId, e)}
        onFailure={(e: PaymentFailureEvent) => log('failure', e.message, e)}
        onProcessing={(e: PaymentProcessingEvent) =>
          log('processing', undefined, e)
        }
        onError={(e) => log('error', e.message, { stack: e.stack })}
      />
    </main>
  );
}
