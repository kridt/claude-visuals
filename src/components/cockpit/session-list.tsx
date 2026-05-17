'use client';

import { motion } from 'motion/react';
import { GitBranch, Inbox } from 'lucide-react';
import type { SessionSummary } from '@/lib/events/schema';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';

interface Props {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelect(id: string | null): void;
  loading: boolean;
}

function projectLabel(projectDir: string): string {
  if (!projectDir) return '—';
  const parts = projectDir.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length === 0) return projectDir;
  if (parts.length === 1) return parts[0]!;
  return `${parts[parts.length - 2]!}/${parts[parts.length - 1]!}`;
}

function shortId(id: string): string {
  if (id.length <= 8) return id;
  return id.slice(0, 8);
}

interface RowProps {
  session: SessionSummary | null;
  selected: boolean;
  onClick(): void;
}

function SessionRow({ session, selected, onClick }: RowProps) {
  const isActive = session?.isActive ?? false;
  const title = session
    ? session.title ?? shortId(session.sessionId)
    : 'All sessions';
  const meta = session
    ? `${projectLabel(session.projectDir)}${session.branch ? ` · ${session.branch}` : ''}`
    : 'Aggregate view';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ x: 2 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={cn(
        'group relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left',
        'transition-colors duration-200',
        selected
          ? 'border-[color-mix(in_oklch,var(--color-accent)_55%,transparent)]'
          : 'border-[var(--color-border)] hover:border-[color-mix(in_oklch,var(--color-accent)_30%,transparent)]',
      )}
      style={{
        background: selected
          ? 'color-mix(in oklch, var(--color-accent) 8%, var(--color-surface))'
          : 'color-mix(in oklch, var(--color-surface) 60%, transparent)',
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
        <span className="mt-1.5 inline-flex h-2 w-2 items-center justify-center">
          <span
            className="absolute inline-block h-2 w-2 rounded-full"
            style={{
              background: isActive
                ? 'var(--color-success)'
                : 'var(--color-text-dim)',
            }}
          />
          {isActive ? (
            <motion.span
              className="absolute inline-block h-2 w-2 rounded-full"
              style={{ background: 'var(--color-success)' }}
              animate={{ opacity: [0.55, 0, 0.55], scale: [1, 2.4, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          ) : null}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[13px] font-medium text-[var(--color-text)]">
              {truncate(title, 32)}
            </span>
            {session?.lastActivityAt ? (
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
                {formatRelativeTime(session.lastActivityAt)}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-[var(--color-text-muted)]">
            {session?.branch ? (
              <GitBranch className="h-3 w-3 shrink-0" aria-hidden />
            ) : null}
            <span className="truncate font-mono">{meta}</span>
          </div>
          {session ? (
            <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
              <span>{session.toolCalls} tools</span>
              <span>
                {(session.inputTokens + session.outputTokens).toLocaleString()}{' '}
                tok
              </span>
              {session.subagents > 0 ? (
                <span className="text-[var(--color-tool-agent)]">
                  {session.subagents} agents
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}

export function SessionList({
  sessions,
  selectedSessionId,
  onSelect,
  loading,
}: Props) {
  const sorted = [...sessions].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const at = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
    const bt = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
    return bt - at;
  });

  return (
    <aside className="flex h-full flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          Sessions
        </h2>
        <span className="font-mono text-[10.5px] tabular-nums text-[var(--color-text-dim)]">
          {sessions.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1 mask-fade-b">
        <SessionRow
          session={null}
          selected={selectedSessionId === null}
          onClick={() => onSelect(null)}
        />

        {sorted.length === 0 && !loading ? (
          <div className="mt-6 flex flex-col items-center gap-2 px-3 py-8 text-center text-[var(--color-text-dim)]">
            <Inbox className="h-5 w-5" aria-hidden />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em]">
              No sessions yet
            </span>
          </div>
        ) : null}

        {sorted.map((s) => (
          <SessionRow
            key={s.sessionId}
            session={s}
            selected={selectedSessionId === s.sessionId}
            onClick={() => onSelect(s.sessionId)}
          />
        ))}
      </div>
    </aside>
  );
}
