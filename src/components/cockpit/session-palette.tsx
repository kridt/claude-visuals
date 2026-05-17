'use client';

import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'motion/react';
import { GitBranch, Layers, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { SessionSummary } from '@/lib/events/schema';
import { friendlyProjectName, lastActivityRelative } from '@/lib/sessions/names';
import { cn, formatNumber } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  sessions: SessionSummary[];
  activeCount: number;
  onSelect(id: string | null): void;
}

interface Bucket {
  key: 'active' | 'recent' | 'all';
  label: string;
  items: SessionSummary[];
}

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function SessionPalette({
  open,
  onOpenChange,
  sessions,
  activeCount,
  onSelect,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  const buckets = useMemo<Bucket[]>(() => {
    const active: SessionSummary[] = [];
    const recent: SessionSummary[] = [];
    const all: SessionSummary[] = [];
    const now = Date.now();
    const sorted = [...sessions].sort((a, b) => {
      const at = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
      const bt = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
      return bt - at;
    });
    for (const s of sorted) {
      if (s.isActive) {
        active.push(s);
        continue;
      }
      const ts = s.lastActivityAt ? Date.parse(s.lastActivityAt) : 0;
      if (ts && now - ts < RECENT_WINDOW_MS) {
        recent.push(s);
      } else {
        all.push(s);
      }
    }
    return [
      { key: 'active', label: 'Active', items: active },
      { key: 'recent', label: 'Recent', items: recent },
      { key: 'all', label: 'All', items: all },
    ];
  }, [sessions]);

  const handleSelect = (id: string | null) => {
    onSelect(id);
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="palette-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          style={{
            background:
              'color-mix(in oklch, var(--color-bg) 55%, transparent)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            key="palette-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[640px] overflow-hidden rounded-2xl border shadow-2xl"
            style={{
              borderColor:
                'color-mix(in oklch, var(--color-accent) 28%, var(--color-border))',
              background:
                'color-mix(in oklch, var(--color-bg-elevated) 92%, transparent)',
              boxShadow:
                '0 30px 80px -20px color-mix(in oklch, var(--color-accent) 28%, transparent), 0 1px 0 color-mix(in oklch, var(--color-accent) 18%, transparent) inset',
            }}
          >
            <Command
              label="Switch session"
              loop
              filter={(value, search) => {
                if (!search) return 1;
                return value.toLowerCase().includes(search.toLowerCase())
                  ? 1
                  : 0;
              }}
            >
              <div
                className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2.5 text-[var(--color-text-muted)]">
                  <Search className="h-3.5 w-3.5" aria-hidden />
                  <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.28em]">
                    Switch session
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-dim)]">
                  <KeyHint>↑↓</KeyHint>
                  <span>navigate</span>
                  <KeyHint>↵</KeyHint>
                  <span>select</span>
                  <KeyHint>esc</KeyHint>
                  <span>close</span>
                </div>
              </div>

              <div
                className="flex items-center gap-2 border-b px-4 py-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Command.Input
                  ref={inputRef}
                  placeholder="Type a project name, branch, or session ID…"
                  className="w-full bg-transparent font-mono text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none"
                />
              </div>

              <Command.List
                className="max-h-[55vh] overflow-y-auto px-2 py-2"
                style={
                  {
                    ['--cmdk-list-height' as string]: 'auto',
                  } as React.CSSProperties
                }
              >
                <Command.Empty className="px-3 py-8 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-dim)]">
                  No sessions match
                </Command.Empty>

                <Command.Item
                  value="all-sessions aggregate overview"
                  onSelect={() => handleSelect(null)}
                  className={cn(
                    'group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5',
                    'data-[selected=true]:bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)]',
                  )}
                >
                  <Layers
                    className="h-3.5 w-3.5 text-[var(--color-text-muted)]"
                    aria-hidden
                  />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[var(--color-text)]">
                      All sessions
                    </div>
                    <div className="font-mono text-[10.5px] text-[var(--color-text-dim)]">
                      Aggregate view · {sessions.length} total · {activeCount}{' '}
                      live
                    </div>
                  </div>
                </Command.Item>

                {buckets.map((bucket) =>
                  bucket.items.length > 0 ? (
                    <Command.Group
                      key={bucket.key}
                      heading={
                        <BucketHeading
                          label={bucket.label}
                          count={bucket.items.length}
                          accent={bucket.key === 'active'}
                        />
                      }
                      className="mt-2"
                    >
                      {bucket.items.map((s) => (
                        <PaletteItem
                          key={s.sessionId}
                          session={s}
                          onSelect={() => handleSelect(s.sessionId)}
                        />
                      ))}
                    </Command.Group>
                  ) : null,
                )}
              </Command.List>
            </Command>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
              aria-label="Close palette"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="rounded border px-1.5 py-[2px] font-mono text-[9.5px] font-semibold uppercase text-[var(--color-text-muted)]"
      style={{
        borderColor: 'var(--color-border)',
        background:
          'color-mix(in oklch, var(--color-surface) 60%, transparent)',
      }}
    >
      {children}
    </kbd>
  );
}

function BucketHeading({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span
        className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em]"
        style={{
          color: accent ? 'var(--color-success)' : 'var(--color-text-dim)',
        }}
      >
        {label}
      </span>
      <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
        ({count})
      </span>
    </div>
  );
}

function PaletteItem({
  session,
  onSelect,
}: {
  session: SessionSummary;
  onSelect(): void;
}) {
  const { name, parents } = friendlyProjectName(session);
  const value = [
    name,
    ...parents,
    session.branch ?? '',
    session.sessionId,
    session.title ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        'group mt-0.5 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5',
        'data-[selected=true]:bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)]',
      )}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: session.isActive
            ? 'var(--color-success)'
            : 'var(--color-text-dim)',
          boxShadow: session.isActive
            ? '0 0 8px color-mix(in oklch, var(--color-success) 70%, transparent)'
            : 'none',
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-[var(--color-text)]">
            {name}
          </span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
            {lastActivityRelative(session)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 truncate font-mono text-[10.5px] text-[var(--color-text-dim)]">
          {parents.length > 0 ? (
            <span className="truncate">
              {parents.map((p, i) => (
                <span key={`${p}-${i}`}>
                  {i > 0 ? <span className="px-1 opacity-60">›</span> : null}
                  {p}
                </span>
              ))}
            </span>
          ) : null}
          {session.branch ? (
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-2.5 w-2.5" aria-hidden />
              {session.branch}
            </span>
          ) : null}
          <span>{session.toolCalls} tools</span>
          <span>
            ~{formatNumber(session.inputTokens + session.outputTokens)} tok
          </span>
        </div>
      </div>
    </Command.Item>
  );
}
