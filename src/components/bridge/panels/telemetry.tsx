'use client';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import type { NormalizedEvent, SessionSummary } from '@/lib/events/schema';
import { categorizeTool } from '@/lib/events/schema';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import { HudCorners } from './hud-corners';

interface Props {
  summary?: SessionSummary;
  events: NormalizedEvent[];
}

const TOOL_COLOR_VAR: Record<string, string> = {
  read: 'var(--color-tool-read)',
  edit: 'var(--color-tool-edit)',
  write: 'var(--color-tool-write)',
  bash: 'var(--color-tool-bash)',
  grep: 'var(--color-tool-grep)',
  glob: 'var(--color-tool-glob)',
  web: 'var(--color-tool-web)',
  agent: 'var(--color-tool-agent)',
  task: 'var(--color-tool-task)',
  other: 'var(--color-tool-other)',
};

function toolColorVar(name: string): string {
  return TOOL_COLOR_VAR[categorizeTool(name)] ?? TOOL_COLOR_VAR.other!;
}

function CountUp({
  value,
  className,
  style,
}: {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v: number) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState(value.toLocaleString());
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.55, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, mv, rounded]);
  return (
    <motion.span className={className} style={style} aria-label={String(value)}>
      {display}
    </motion.span>
  );
}

interface ToolCount {
  name: string;
  count: number;
  color: string;
}

function deriveToolCounts(events: NormalizedEvent[]): ToolCount[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.kind === 'tool_use') {
      counts.set(e.toolName, (counts.get(e.toolName) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, color: toolColorVar(name) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function deriveSparkline(events: NormalizedEvent[]): number[] {
  const buckets = new Array<number>(20).fill(0);
  const now = Date.now();
  const totalWindow = 60_000;
  const bucketMs = totalWindow / buckets.length;
  for (const e of events) {
    if (e.kind !== 'tool_use') continue;
    const ts = Date.parse(e.timestamp);
    if (!Number.isFinite(ts)) continue;
    const age = now - ts;
    if (age < 0 || age > totalWindow) continue;
    const idx = Math.min(
      buckets.length - 1,
      Math.max(0, buckets.length - 1 - Math.floor(age / bucketMs)),
    );
    buckets[idx] = (buckets[idx] ?? 0) + 1;
  }
  return buckets;
}

export function Telemetry({ summary, events }: Props) {
  const input = summary?.inputTokens ?? 0;
  const output = summary?.outputTokens ?? 0;
  const cacheRead = summary?.cacheReadTokens ?? 0;
  const cacheCreation = summary?.cacheCreationTokens ?? 0;

  const tokenMax = Math.max(input, output, cacheRead + cacheCreation, 1);

  const toolCounts = useMemo(() => deriveToolCounts(events), [events]);
  const maxTool = toolCounts.reduce((m, t) => Math.max(m, t.count), 1);

  const spark = useMemo(() => deriveSparkline(events), [events]);
  const sparkMax = spark.reduce((m, v) => Math.max(m, v), 1);

  return (
    <div
      className="relative flex h-full flex-col gap-3 overflow-y-auto px-5 pt-5 pb-4 font-sans"
      style={{
        background:
          'color-mix(in oklch, var(--color-bg-elevated) 38%, transparent)',
      }}
    >
      <HudCorners color="var(--color-accent)" active />

      <header className="flex items-baseline justify-between pb-1">
        <span
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.34em]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Telemetry
        </span>
        <span
          aria-hidden
          className="ml-3 h-[2px] flex-1 max-w-[100px] rounded-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--color-accent), transparent)',
            boxShadow:
              '0 0 8px color-mix(in oklch, var(--color-accent) 60%, transparent)',
          }}
        />
      </header>

      <Section title="Token Flow">
        <TokenRow
          label="Input"
          value={input}
          max={tokenMax}
          color="var(--color-tool-read)"
        />
        <TokenRow
          label="Output"
          value={output}
          max={tokenMax}
          color="var(--color-accent)"
        />
        <TokenRow
          label="Cache"
          value={cacheRead + cacheCreation}
          max={tokenMax}
          color="var(--color-tool-grep)"
        />
      </Section>

      <Section title="Tools">
        {toolCounts.length === 0 ? (
          <span
            className="font-mono text-[11px]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            no tool calls yet
          </span>
        ) : (
          <ul className="flex flex-col gap-2">
            {toolCounts.map((t) => {
              const pct = (t.count / maxTool) * 100;
              return (
                <li key={t.name} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between font-mono text-[11px]">
                    <span
                      className="truncate"
                      style={{ color: t.color }}
                      title={t.name}
                    >
                      {t.name}
                    </span>
                    <CountUp
                      value={t.count}
                      className="tabular-nums"
                      style={{ color: 'var(--color-text)' }}
                    />
                  </div>
                  <div
                    className="relative h-1 overflow-hidden rounded-full"
                    style={{
                      background:
                        'color-mix(in oklch, var(--color-surface) 60%, transparent)',
                    }}
                  >
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: t.color,
                        boxShadow: `0 0 6px color-mix(in oklch, ${t.color} 70%, transparent)`,
                      }}
                      animate={{ width: `${pct}%` }}
                      transition={{ type: 'spring', stiffness: 160, damping: 24 }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Agent Activity">
        <Sparkline values={spark} max={sparkMax} />
        <div
          className="flex justify-between font-mono text-[9.5px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <span>-60s</span>
          <span>now</span>
        </div>
      </Section>

      {summary ? (
        <Section title="Session Info">
          <dl className="flex flex-col gap-1.5 font-mono text-[11px]">
            <InfoRow label="Branch" value={summary.branch ?? '—'} />
            <InfoRow label="Version" value={summary.version ?? '—'} />
            {summary.startedAt ? (
              <InfoRow
                label="Started"
                value={formatRelativeTime(summary.startedAt)}
              />
            ) : null}
            <InfoRow label="Events" value={String(summary.totalEvents)} />
          </dl>
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="relative flex flex-col gap-2 rounded-md border px-3 py-3"
      style={{
        borderColor: 'color-mix(in oklch, var(--color-border) 75%, transparent)',
        background: 'color-mix(in oklch, var(--color-bg) 55%, transparent)',
      }}
    >
      <h3
        className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.32em]"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function TokenRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between font-mono text-[11px]">
        <span
          className="uppercase tracking-[0.22em]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {label}
        </span>
        <span
          className="text-[14px] tabular-nums"
          style={{ color: 'var(--color-text)' }}
        >
          {formatNumber(value)}
        </span>
      </div>
      <div
        className="relative h-1.5 overflow-hidden rounded-full"
        style={{
          background:
            'color-mix(in oklch, var(--color-surface) 60%, transparent)',
        }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 8px color-mix(in oklch, ${color} 70%, transparent)`,
          }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 140, damping: 22 }}
        />
      </div>
    </div>
  );
}

function Sparkline({ values, max }: { values: number[]; max: number }) {
  if (values.length === 0) return null;
  const w = 280;
  const h = 44;
  const step = w / (values.length - 1 || 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = h - (v / max) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPoints = `0,${h} ${points} ${w},${h}`;
  const lineEnd = values[values.length - 1] ?? 0;
  const endY = h - (lineEnd / max) * (h - 4) - 2;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
      style={{ display: 'block', height: 48 }}
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#spark-fill)" />
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          filter:
            'drop-shadow(0 0 4px color-mix(in oklch, var(--color-accent) 60%, transparent))',
        }}
      />
      <circle
        cx={w}
        cy={endY}
        r="2.5"
        fill="var(--color-accent)"
        style={{
          filter:
            'drop-shadow(0 0 6px color-mix(in oklch, var(--color-accent) 80%, transparent))',
        }}
      />
    </svg>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt
        className="uppercase tracking-[0.22em]"
        style={{ color: 'var(--color-text-dim)', fontSize: '10px' }}
      >
        {label}
      </dt>
      <dd
        className="truncate text-right"
        style={{ color: 'var(--color-text)' }}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
