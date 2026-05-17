'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Inbox, Search, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { SessionSummary } from '@/lib/events/schema';
import { friendlyProjectName } from '@/lib/sessions/names';
import { cn } from '@/lib/utils';
import { SessionRow } from './session-row';

interface Props {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelect(id: string | null): void;
  loading: boolean;
  activeCount: number;
}

type SortMode = 'active' | 'recent' | 'alpha';

const SORT_LABELS: Record<SortMode, string> = {
  active: 'Active first',
  recent: 'Recent first',
  alpha: 'Alphabetical',
};

const SORT_CYCLE: SortMode[] = ['active', 'recent', 'alpha'];

function matchSession(s: SessionSummary, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const { name, parents } = friendlyProjectName(s);
  const haystacks: string[] = [
    name,
    parents.join(' / '),
    s.title ?? '',
    s.branch ?? '',
    s.projectDir,
    s.cwd ?? '',
    s.sessionId,
  ];
  return haystacks.some((h) => h.toLowerCase().includes(needle));
}

export function SessionList({
  sessions,
  selectedSessionId,
  onSelect,
  loading,
  activeCount,
}: Props) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('active');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const list = sessions.filter((s) => matchSession(s, query));
    const sorted = [...list].sort((a, b) => {
      if (sortMode === 'alpha') {
        const an = friendlyProjectName(a).name.toLowerCase();
        const bn = friendlyProjectName(b).name.toLowerCase();
        return an.localeCompare(bn);
      }
      if (sortMode === 'recent') {
        const at = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
        const bt = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
        return bt - at;
      }
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      const at = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
      const bt = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
      return bt - at;
    });
    return sorted;
  }, [sessions, query, sortMode]);

  const visibleIds = useMemo(() => {
    const ids: (string | null)[] = [null];
    for (const s of filtered) ids.push(s.sessionId);
    return ids;
  }, [filtered]);

  useEffect(() => {
    if (focusedIndex >= visibleIds.length) {
      setFocusedIndex(Math.max(0, visibleIds.length - 1));
    }
  }, [visibleIds.length, focusedIndex]);

  const cycleSort = useCallback(() => {
    setSortMode((m) => {
      const idx = SORT_CYCLE.indexOf(m);
      const next = SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
      return next ?? 'active';
    });
  }, []);

  const handleKey = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      const inInput = target?.tagName === 'INPUT';

      if (e.key === '/' && !inInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'Escape' && inInput) {
        if (query) {
          setQuery('');
        } else {
          searchInputRef.current?.blur();
        }
        return;
      }

      const isDown = e.key === 'ArrowDown' || (e.key === 'j' && !inInput);
      const isUp = e.key === 'ArrowUp' || (e.key === 'k' && !inInput);

      if (isDown) {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(visibleIds.length - 1, i + 1));
        return;
      }
      if (isUp) {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter') {
        const id = visibleIds[focusedIndex];
        if (id === null || typeof id === 'string') {
          e.preventDefault();
          onSelect(id);
        }
      }
    },
    [visibleIds, focusedIndex, onSelect, query],
  );

  return (
    <aside
      className="flex h-full flex-col gap-3 overflow-hidden outline-none"
      tabIndex={0}
      onKeyDown={handleKey}
      ref={listRef}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          Sessions
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cycleSort}
            className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
            title="Change sort order"
          >
            {SORT_LABELS[sortMode]}
          </button>
          <span className="font-mono text-[10.5px] tabular-nums text-[var(--color-text-dim)]">
            {query ? `${filtered.length}/${sessions.length}` : sessions.length}
          </span>
        </div>
      </div>

      <div
        className="relative flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
        style={{
          borderColor: 'var(--color-border)',
          background:
            'color-mix(in oklch, var(--color-surface) 50%, transparent)',
        }}
      >
        <Search
          className="h-3 w-3 shrink-0 text-[var(--color-text-dim)]"
          aria-hidden
        />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFocusedIndex(0);
          }}
          placeholder="Filter sessions…"
          className="w-full bg-transparent font-mono text-[11.5px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              searchInputRef.current?.focus();
            }}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            aria-label="Clear filter"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1 mask-fade-b">
        <SessionRow
          session={null}
          selected={selectedSessionId === null}
          focused={focusedIndex === 0}
          onClick={() => onSelect(null)}
          totalActive={activeCount}
          totalSessions={sessions.length}
        />

        {filtered.length === 0 && !loading ? (
          <div className="mt-6 flex flex-col items-center gap-2 px-3 py-8 text-center text-[var(--color-text-dim)]">
            <Inbox className="h-5 w-5" aria-hidden />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em]">
              {query ? 'No matches' : 'No sessions yet'}
            </span>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className={cn(
                  'mt-1 rounded border px-2 py-0.5 font-mono text-[10px]',
                  'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                )}
                style={{ borderColor: 'var(--color-border)' }}
              >
                clear filter
              </button>
            ) : null}
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {filtered.map((s, i) => (
            <motion.div
              key={s.sessionId}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <SessionRow
                session={s}
                selected={selectedSessionId === s.sessionId}
                focused={focusedIndex === i + 1}
                onClick={() => {
                  onSelect(s.sessionId);
                  setFocusedIndex(i + 1);
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </aside>
  );
}
