'use client';

import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import type { NormalizedEvent, SessionSummary } from '@/lib/events/schema';
import { categorizeTool } from '@/lib/events/schema';
import { formatNumber, formatRelativeTime, truncate } from '@/lib/utils';
import { toolColor } from './tool-badge';

interface Props {
  session: SessionSummary | null;
  events: NormalizedEvent[];
}

function CountUp({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v: number) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState(value.toLocaleString());

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.6,
      ease: 'easeOut',
    });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, mv, rounded]);

  return (
    <motion.span className={className} aria-label={String(value)}>
      {display}
    </motion.span>
  );
}

interface TokenRow {
  label: string;
  value: number;
  color: string;
}

function TokenBars({
  rows,
  max,
}: {
  rows: TokenRow[];
  max: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => {
        const pct = max > 0 ? Math.min(100, (row.value / max) * 100) : 0;
        return (
          <div key={row.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between font-mono text-[10.5px] uppercase tracking-wider">
              <span className="text-[var(--color-text-muted)]">{row.label}</span>
              <CountUp
                value={row.value}
                className="tabular-nums text-[var(--color-text)]"
              />
            </div>
            <div
              className="relative h-1.5 overflow-hidden rounded-full"
              style={{ background: 'var(--color-surface)' }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: row.color,
                  boxShadow: `0 0 8px color-mix(in oklch, ${row.color} 60%, transparent)`,
                }}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 140, damping: 22 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{
        borderColor: 'var(--color-border)',
        background:
          'color-mix(in oklch, var(--color-bg-elevated) 70%, transparent)',
      }}
    >
      <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

interface ToolCount {
  name: string;
  count: number;
}

function deriveToolCounts(
  session: SessionSummary | null,
  events: NormalizedEvent[],
): ToolCount[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.kind === 'tool_use') {
      counts.set(e.toolName, (counts.get(e.toolName) ?? 0) + 1);
    }
  }
  if (counts.size === 0 && session?.toolCalls) {
    return [];
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function countSubagents(events: NormalizedEvent[]): number {
  const seen = new Set<string>();
  for (const e of events) {
    if (e.agent === 'subagent') seen.add(e.sessionId + ':' + (e.parentUuid ?? ''));
  }
  return seen.size;
}

export function StatPanel({ session, events }: Props) {
  const input = session?.inputTokens ?? 0;
  const output = session?.outputTokens ?? 0;
  const cacheRead = session?.cacheReadTokens ?? 0;
  const cacheCreate = session?.cacheCreationTokens ?? 0;
  const maxTok = Math.max(input, output, cacheRead, cacheCreate, 1);

  const tokenRows: TokenRow[] = [
    { label: 'input', value: input, color: 'var(--color-tool-read)' },
    { label: 'output', value: output, color: 'var(--color-accent)' },
    { label: 'cache read', value: cacheRead, color: 'var(--color-tool-grep)' },
    {
      label: 'cache create',
      value: cacheCreate,
      color: 'var(--color-tool-edit)',
    },
  ];

  const toolCounts = deriveToolCounts(session, events);
  const maxToolCount = toolCounts.reduce((m, t) => Math.max(m, t.count), 1);
  const subagentCount = session?.subagents ?? countSubagents(events);

  return (
    <aside className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
      <Card title="Tokens">
        <TokenBars rows={tokenRows} max={maxTok} />
        <div className="mt-1 flex items-baseline justify-between border-t pt-2 font-mono text-[10.5px] uppercase tracking-wider"
          style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-[var(--color-text-dim)]">total</span>
          <span className="tabular-nums text-[var(--color-text)]">
            {formatNumber(input + output + cacheRead + cacheCreate)}
          </span>
        </div>
      </Card>

      <Card title="Tools">
        {toolCounts.length === 0 ? (
          <p className="font-mono text-[11px] text-[var(--color-text-dim)]">
            no tool calls yet
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {toolCounts.map((t) => {
              const color = toolColor(t.name);
              const pct = (t.count / maxToolCount) * 100;
              return (
                <li key={t.name} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between font-mono text-[11px]">
                    <span
                      className="truncate tracking-tight"
                      style={{ color }}
                      title={`${t.name} · ${categorizeTool(t.name)}`}
                    >
                      {t.name}
                    </span>
                    <CountUp
                      value={t.count}
                      className="tabular-nums text-[var(--color-text)]"
                    />
                  </div>
                  <div
                    className="relative h-1 overflow-hidden rounded-full"
                    style={{ background: 'var(--color-surface)' }}
                  >
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: color }}
                      animate={{ width: `${pct}%` }}
                      transition={{ type: 'spring', stiffness: 160, damping: 24 }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Subagents">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg border"
            style={{
              borderColor:
                'color-mix(in oklch, var(--color-tool-agent) 35%, transparent)',
              background:
                'color-mix(in oklch, var(--color-tool-agent) 12%, transparent)',
            }}
          >
            <Users
              className="h-5 w-5"
              style={{ color: 'var(--color-tool-agent)' }}
              aria-hidden
            />
          </div>
          <div className="flex flex-col">
            <CountUp
              value={subagentCount}
              className="font-mono text-[24px] tabular-nums text-[var(--color-text)]"
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
              spawned
            </span>
          </div>
        </div>
        {subagentCount > 0 ? (
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: Math.min(subagentCount, 24) }).map((_, i) => (
              <span
                key={i}
                className="inline-block h-4 w-4 rounded-full"
                style={{
                  background:
                    'color-mix(in oklch, var(--color-tool-agent) 60%, transparent)',
                  boxShadow:
                    '0 0 6px color-mix(in oklch, var(--color-tool-agent) 60%, transparent)',
                }}
                aria-hidden
              />
            ))}
          </div>
        ) : null}
      </Card>

      {session ? (
        <Card title="Session">
          <dl className="flex flex-col gap-2 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[var(--color-text-dim)] uppercase tracking-wider text-[10px]">
                version
              </dt>
              <dd className="text-[var(--color-text)]">
                {session.version ?? '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[var(--color-text-dim)] uppercase tracking-wider text-[10px]">
                branch
              </dt>
              <dd className="truncate text-[var(--color-text)]">
                {session.branch ?? '—'}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[var(--color-text-dim)] uppercase tracking-wider text-[10px]">
                cwd
              </dt>
              <dd className="break-all text-[var(--color-text-muted)]">
                {truncate(session.cwd ?? session.projectDir, 80)}
              </dd>
            </div>
            {session.startedAt ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--color-text-dim)] uppercase tracking-wider text-[10px]">
                  started
                </dt>
                <dd className="text-[var(--color-text)]">
                  {formatRelativeTime(session.startedAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>
      ) : null}
    </aside>
  );
}
