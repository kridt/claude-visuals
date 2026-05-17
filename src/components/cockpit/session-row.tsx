'use client';

import { motion } from 'motion/react';
import { GitBranch, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SessionSummary } from '@/lib/events/schema';
import { cn, formatNumber, truncate } from '@/lib/utils';
import { friendlyProjectName, lastActivityRelative } from '@/lib/sessions/names';

interface Props {
  session: SessionSummary | null;
  selected: boolean;
  focused: boolean;
  onClick(): void;
  totalActive?: number;
  totalSessions?: number;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="relative mt-[3px] inline-flex h-2 w-2 shrink-0 items-center justify-center">
      <span
        className="absolute inline-block h-2 w-2 rounded-full"
        style={{
          background: active
            ? 'var(--color-success)'
            : 'var(--color-text-dim)',
          boxShadow: active
            ? '0 0 8px color-mix(in oklch, var(--color-success) 70%, transparent)'
            : 'none',
        }}
      />
      {active ? (
        <motion.span
          className="absolute inline-block h-2 w-2 rounded-full"
          style={{ background: 'var(--color-success)' }}
          animate={{ opacity: [0.55, 0, 0.55], scale: [1, 2.6, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      ) : null}
    </span>
  );
}

function SubagentDots({ count }: { count: number }) {
  if (count <= 0) return null;
  const capped = Math.min(count, 5);
  return (
    <span className="inline-flex items-center gap-[3px]">
      {Array.from({ length: capped }).map((_, i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: 'var(--color-tool-agent)' }}
        />
      ))}
      {count > 5 ? (
        <span className="ml-1 font-mono text-[9px] text-[var(--color-tool-agent)]">
          +{count - 5}
        </span>
      ) : null}
    </span>
  );
}

function useTick(ms: number): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

function Breadcrumb({ parents }: { parents: string[] }) {
  if (parents.length === 0) return null;
  return (
    <span className="truncate font-mono text-[10.5px] text-[var(--color-text-dim)]">
      {parents.map((p, i) => (
        <span key={`${p}-${i}`}>
          {i > 0 ? (
            <span className="px-1 text-[var(--color-text-dim)]/60">›</span>
          ) : null}
          {p}
        </span>
      ))}
    </span>
  );
}

export function SessionRow({
  session,
  selected,
  focused,
  onClick,
  totalActive,
  totalSessions,
}: Props) {
  useTick(5000);
  const isAggregate = session === null;
  const isActive = session?.isActive ?? (totalActive ?? 0) > 0;

  let name: string;
  let parents: string[] = [];
  let fullPath = '';

  if (isAggregate) {
    name = 'All sessions';
  } else {
    const friendly = friendlyProjectName(session);
    name = friendly.name;
    parents = friendly.parents;
    fullPath = friendly.fullPath;
  }

  const ago = isAggregate ? null : lastActivityRelative(session);
  const tokens = session
    ? formatNumber(session.inputTokens + session.outputTokens)
    : null;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={fullPath || undefined}
      data-session-row
      whileHover={{ x: 2 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={cn(
        'group relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left',
        'transition-colors duration-200 outline-none',
        selected
          ? 'border-[color-mix(in_oklch,var(--color-accent)_55%,transparent)]'
          : 'border-[var(--color-border)] hover:border-[color-mix(in_oklch,var(--color-accent)_30%,transparent)]',
        focused && !selected
          ? 'ring-1 ring-[color-mix(in_oklch,var(--color-accent)_45%,transparent)]'
          : '',
      )}
      style={{
        background: selected
          ? 'color-mix(in oklch, var(--color-accent) 9%, var(--color-surface))'
          : 'color-mix(in oklch, var(--color-surface) 55%, transparent)',
      }}
    >
      {selected ? (
        <motion.span
          layoutId="session-pill"
          className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full"
          style={{
            background: 'var(--color-accent)',
            boxShadow: '0 0 12px var(--color-accent-glow)',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      ) : null}

      <div className="flex items-start gap-2.5">
        {isAggregate ? (
          <span className="relative mt-[3px] inline-flex h-2 w-2 shrink-0 items-center justify-center">
            <Layers
              className="h-3 w-3 -translate-y-[2px] text-[var(--color-text-muted)]"
              aria-hidden
            />
          </span>
        ) : (
          <StatusDot active={isActive} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                'truncate text-[13px]',
                isAggregate
                  ? 'font-semibold text-[var(--color-text)]'
                  : 'font-medium text-[var(--color-text)]',
              )}
            >
              {truncate(name, 36)}
            </span>
            {ago ? (
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
                {ago}
              </span>
            ) : null}
          </div>

          {isAggregate ? (
            <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
              <span className="font-mono">
                {totalSessions ?? 0} total
              </span>
              <span className="text-[var(--color-text-dim)]">·</span>
              <span
                className="font-mono"
                style={{
                  color:
                    (totalActive ?? 0) > 0
                      ? 'var(--color-success)'
                      : 'var(--color-text-dim)',
                }}
              >
                {totalActive ?? 0} live
              </span>
            </div>
          ) : (
            <div className="mt-0.5 truncate">
              <Breadcrumb parents={parents} />
            </div>
          )}

          {!isAggregate ? (
            <div className="mt-1.5 flex items-center gap-2 truncate text-[10.5px] text-[var(--color-text-muted)]">
              {session?.branch ? (
                <span className="inline-flex items-center gap-1 font-mono">
                  <GitBranch className="h-2.5 w-2.5 shrink-0" aria-hidden />
                  <span className="truncate">{session.branch}</span>
                </span>
              ) : null}
              {isActive ? (
                <span
                  className="rounded-full px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    background:
                      'color-mix(in oklch, var(--color-success) 18%, transparent)',
                    color: 'var(--color-success)',
                  }}
                >
                  Live
                </span>
              ) : null}
            </div>
          ) : null}

          {session ? (
            <div className="mt-1.5 flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
              <span>~{tokens} tok</span>
              <span>{session.toolCalls} tools</span>
              {session.subagents > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <SubagentDots count={session.subagents} />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}
