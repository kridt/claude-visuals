'use client';

import { AnimatePresence, motion } from 'motion/react';
import { GitBranch, Layers } from 'lucide-react';
import { useMemo } from 'react';
import type { SessionSummary } from '@/lib/events/schema';
import { friendlyProjectName, lastActivityRelative } from '@/lib/sessions/names';
import { HudCorners } from './hud-corners';

interface Props {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelectSession(id: string | null): void;
}

const ACCENT = 'var(--color-accent)';
const LIVE = 'var(--color-success)';

export function SessionRoster({
  sessions,
  selectedSessionId,
  onSelectSession,
}: Props) {
  const sorted = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      const at = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
      const bt = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
      return bt - at;
    });
  }, [sessions]);

  const activeCount = sorted.filter((s) => s.isActive).length;

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden font-sans"
      style={{
        background:
          'color-mix(in oklch, var(--color-bg-elevated) 38%, transparent)',
      }}
    >
      <HudCorners color={ACCENT} active />

      <header className="flex items-baseline justify-between px-5 pt-5 pb-3">
        <div className="flex flex-col">
          <span
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.34em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Sessions
          </span>
          <span
            className="mt-1 h-[2px] w-10 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${LIVE}, transparent)`,
              boxShadow: `0 0 8px color-mix(in oklch, ${LIVE} 70%, transparent)`,
            }}
            aria-hidden
          />
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className="font-mono text-[28px] font-semibold tabular-nums leading-none"
            style={{
              color: activeCount > 0 ? LIVE : 'var(--color-text-muted)',
              textShadow:
                activeCount > 0
                  ? `0 0 12px color-mix(in oklch, ${LIVE} 60%, transparent)`
                  : 'none',
            }}
          >
            {activeCount}
          </span>
          <span
            className="font-mono text-[9.5px] uppercase tracking-[0.28em]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            live
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-4">
        <RosterRow
          allMode
          selected={selectedSessionId === null}
          onClick={() => onSelectSession(null)}
          totalCount={sorted.length}
          activeCount={activeCount}
        />

        <AnimatePresence initial={false}>
          {sorted.map((s) => (
            <motion.div
              key={s.sessionId}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <RosterRow
                session={s}
                selected={selectedSessionId === s.sessionId}
                onClick={() => onSelectSession(s.sessionId)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {sorted.length === 0 ? (
          <div
            className="mt-4 px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.24em]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            no sessions detected
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface RowProps {
  session?: SessionSummary;
  allMode?: boolean;
  totalCount?: number;
  activeCount?: number;
  selected: boolean;
  onClick(): void;
}

function RosterRow({
  session,
  allMode,
  totalCount,
  activeCount,
  selected,
  onClick,
}: RowProps) {
  if (allMode) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative w-full text-left transition-colors"
        style={{
          height: 64,
          background: selected
            ? 'color-mix(in oklch, var(--color-accent) 14%, transparent)'
            : 'color-mix(in oklch, var(--color-surface) 36%, transparent)',
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: selected
            ? 'color-mix(in oklch, var(--color-accent) 50%, transparent)'
            : 'color-mix(in oklch, var(--color-border) 70%, transparent)',
        }}
      >
        {selected ? <RowBrackets color={ACCENT} /> : null}
        <div className="flex h-full items-center gap-3 px-4">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-md"
            style={{
              background:
                'color-mix(in oklch, var(--color-accent) 18%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            <Layers className="h-4 w-4" aria-hidden />
          </span>
          <div className="flex flex-1 flex-col gap-0.5">
            <span
              className="font-mono text-[13px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-text)' }}
            >
              All Sessions
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.22em]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {totalCount ?? 0} total · {activeCount ?? 0} live
            </span>
          </div>
        </div>
      </button>
    );
  }

  if (!session) return null;
  const { name, parents } = friendlyProjectName(session);
  const isLive = session.isActive;
  const parentStr = parents.length ? parents.slice(-2).join(' / ') : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full text-left transition-colors"
      style={{
        height: 80,
        background: selected
          ? 'color-mix(in oklch, var(--color-accent) 12%, transparent)'
          : isLive
            ? 'color-mix(in oklch, var(--color-bg-elevated) 65%, transparent)'
            : 'color-mix(in oklch, var(--color-surface) 28%, transparent)',
        borderLeft: '2px solid',
        borderColor: isLive ? LIVE : 'transparent',
        opacity: isLive ? 1 : 0.7,
      }}
    >
      {selected ? <RowBrackets color={ACCENT} /> : null}
      {isLive ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-full w-[2px]"
          style={{
            background: LIVE,
            boxShadow: `0 0 10px ${LIVE}`,
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}

      <div className="flex h-full items-center gap-3 px-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className="block truncate font-mono text-[13px] font-semibold uppercase tracking-[0.14em]"
            style={{
              color: isLive ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
          >
            {name}
          </span>
          {parentStr ? (
            <span
              className="block truncate font-mono text-[9.5px] uppercase tracking-[0.2em]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {parentStr}
            </span>
          ) : null}
          <div className="mt-1 flex items-center gap-2">
            <span
              className="font-mono text-[9.5px] tabular-nums uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {session.toolCalls} tools
            </span>
            <SubagentDots count={session.subagents} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {session.branch ? (
            <span
              className="inline-flex max-w-[110px] items-center gap-1 truncate font-mono text-[9.5px] uppercase tracking-[0.16em]"
              style={{ color: 'var(--color-text-muted)' }}
              title={session.branch}
            >
              <GitBranch className="h-2.5 w-2.5 shrink-0" aria-hidden />
              <span className="truncate">{session.branch}</span>
            </span>
          ) : null}
          <span
            className="rounded-full px-2 py-[2px] font-mono text-[9.5px] uppercase tracking-[0.2em] tabular-nums"
            style={{
              background: isLive
                ? `color-mix(in oklch, ${LIVE} 16%, transparent)`
                : 'color-mix(in oklch, var(--color-surface) 60%, transparent)',
              color: isLive ? LIVE : 'var(--color-text-dim)',
              border: '1px solid',
              borderColor: isLive
                ? `color-mix(in oklch, ${LIVE} 35%, transparent)`
                : 'var(--color-border)',
            }}
          >
            {isLive ? 'live' : lastActivityRelative(session)}
          </span>
        </div>
      </div>
    </button>
  );
}

function SubagentDots({ count }: { count: number }) {
  if (count <= 0) return null;
  const shown = Math.min(count, 5);
  const overflow = count - shown;
  return (
    <span className="inline-flex items-center gap-[3px]">
      {Array.from({ length: shown }).map((_, i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            background:
              'color-mix(in oklch, var(--color-tool-agent) 75%, transparent)',
            boxShadow:
              '0 0 4px color-mix(in oklch, var(--color-tool-agent) 60%, transparent)',
          }}
        />
      ))}
      {overflow > 0 ? (
        <span
          className="font-mono text-[9px] tabular-nums"
          style={{ color: 'var(--color-text-dim)' }}
        >
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}

function RowBrackets({ color }: { color: string }) {
  const stroke = 1.5;
  const length = 10;
  return (
    <>
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        className="pointer-events-none absolute left-1 top-1"
        aria-hidden
        style={{
          filter: `drop-shadow(0 0 5px color-mix(in oklch, ${color} 70%, transparent))`,
        }}
      >
        <path
          d={`M 0 ${length} L 0 0 L ${length} 0`}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
        />
      </svg>
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        className="pointer-events-none absolute right-1 top-1"
        aria-hidden
        style={{
          filter: `drop-shadow(0 0 5px color-mix(in oklch, ${color} 70%, transparent))`,
        }}
      >
        <path
          d={`M 14 ${length} L 14 0 L ${14 - length} 0`}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
        />
      </svg>
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        className="pointer-events-none absolute right-1 bottom-1"
        aria-hidden
        style={{
          filter: `drop-shadow(0 0 5px color-mix(in oklch, ${color} 70%, transparent))`,
        }}
      >
        <path
          d={`M 14 ${14 - length} L 14 14 L ${14 - length} 14`}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
        />
      </svg>
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        className="pointer-events-none absolute left-1 bottom-1"
        aria-hidden
        style={{
          filter: `drop-shadow(0 0 5px color-mix(in oklch, ${color} 70%, transparent))`,
        }}
      >
        <path
          d={`M 0 ${14 - length} L 0 14 L ${length} 14`}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
        />
      </svg>
    </>
  );
}
