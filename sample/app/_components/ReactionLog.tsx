'use client';

import { useState } from 'react';

export interface LogEntry {
  id: number;
  ts: number;
  name:
    | 'open'
    | 'close'
    | 'ready'
    | 'success'
    | 'failure'
    | 'processing'
    | 'error'
    | 'info';
  message?: string;
  payload?: unknown;
}

const PILL: Record<LogEntry['name'], string> = {
  open: 'text-sky-800 bg-sky-100/70',
  close: 'text-stash-text-muted bg-stash-paper',
  ready: 'text-emerald-800 bg-emerald-100/70',
  success: 'text-emerald-900 bg-[#e5ff11]/40',
  failure: 'text-red-800 bg-red-100/70',
  processing: 'text-amber-800 bg-amber-100/70',
  error: 'text-rose-800 bg-rose-100/70',
  info: 'text-stash-text-muted bg-stash-paper',
};

function formatTs(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

export function ReactionLog({
  entries,
  onClear,
}: {
  entries: LogEntry[];
  onClear: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-stash-bg">
      <div className="flex items-center justify-between gap-2 border-b border-stash-border px-6 py-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stash-text-soft">
          Reaction log
        </h2>
        <div className="flex items-center gap-3 text-[12px]">
          <span className="text-stash-text-soft">
            {entries.length} event{entries.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={onClear}
            className="text-stash-text-soft underline decoration-stash-border underline-offset-4 transition hover:text-stash-text hover:decoration-stash-text-muted"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-stash-text-soft">
            Callbacks from the SDK will appear here as they fire.
          </div>
        ) : (
          <ul className="divide-y divide-stash-border">
            {entries.map((entry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasPayload = entry.payload !== undefined && entry.payload !== null;
  return (
    <li className="px-6 py-3 text-[13px]">
      <button
        className="flex w-full items-center gap-3 text-left"
        onClick={() => hasPayload && setExpanded((v) => !v)}
      >
        <span className="font-mono text-[12px] text-stash-text-soft">
          {formatTs(entry.ts)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PILL[entry.name]}`}
        >
          on{entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}
        </span>
        {entry.message ? (
          <span className="flex-1 truncate text-stash-text-muted">
            {entry.message}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        {hasPayload ? (
          <span className="text-stash-text-soft">{expanded ? '▾' : '▸'}</span>
        ) : null}
      </button>
      {expanded && hasPayload ? (
        <pre className="mt-2 overflow-x-auto rounded border border-stash-border bg-stash-paper px-3 py-2 font-mono text-[11px] leading-relaxed text-stash-text-muted">
          {JSON.stringify(entry.payload, null, 2)}
        </pre>
      ) : null}
    </li>
  );
}
