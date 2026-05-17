'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, Brain, Sparkles, User } from 'lucide-react';
import type {
  NormalizedEvent,
  ToolResultEvent,
  ToolUseEvent,
  AssistantTextEvent,
  AssistantThinkingEvent,
  UserMessageEvent,
  UsageEvent,
  SessionMetaEvent,
} from '@/lib/events/schema';
import { cn, formatNumber, truncate } from '@/lib/utils';
import { toolColor } from './tool-badge';

interface Props {
  events: NormalizedEvent[];
  max?: number;
}

type ToolPairStatus = 'running' | 'done' | 'error';

interface ToolPair {
  kind: 'tool';
  use: ToolUseEvent;
  result: ToolResultEvent | null;
  status: ToolPairStatus;
  durationMs: number | null;
}

interface SingleEntry {
  kind: 'single';
  event: NormalizedEvent;
}

type StreamItem =
  | { id: string; data: ToolPair }
  | { id: string; data: SingleEntry };

function pairEvents(events: NormalizedEvent[]): StreamItem[] {
  const seenResultIds = new Set<string>();
  const resultByToolId = new Map<string, ToolResultEvent>();

  for (const e of events) {
    if (e.kind === 'tool_result') {
      resultByToolId.set(e.toolUseId, e);
    }
  }

  const items: StreamItem[] = [];
  for (const e of events) {
    if (e.kind === 'tool_use') {
      const result = resultByToolId.get(e.toolUseId) ?? null;
      const status: ToolPairStatus = result
        ? result.isError
          ? 'error'
          : 'done'
        : 'running';
      let durationMs: number | null = null;
      if (result) {
        if (typeof result.durationMs === 'number') {
          durationMs = result.durationMs;
        } else {
          const start = Date.parse(e.timestamp);
          const end = Date.parse(result.timestamp);
          if (Number.isFinite(start) && Number.isFinite(end)) {
            durationMs = end - start;
          }
        }
        seenResultIds.add(result.id);
      }
      items.push({
        id: e.id,
        data: { kind: 'tool', use: e, result, status, durationMs },
      });
    } else if (e.kind === 'tool_result') {
      if (!seenResultIds.has(e.id)) {
        items.push({ id: e.id, data: { kind: 'single', event: e } });
      }
    } else {
      items.push({ id: e.id, data: { kind: 'single', event: e } });
    }
  }

  return items.reverse();
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 2 : 1)}s`;
  return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
}

function coerceText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    return v
      .map((item) => {
        if (typeof item === 'string') return item;
        if (
          item &&
          typeof item === 'object' &&
          'text' in (item as Record<string, unknown>)
        ) {
          const t = (item as Record<string, unknown>).text;
          if (typeof t === 'string') return t;
        }
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }
  return '';
}

function ToolCard({ pair }: { pair: ToolPair }) {
  const { use, result, status, durationMs } = pair;
  const color = toolColor(use.toolName);
  const isSub = use.agent === 'subagent';

  return (
    <div
      className="relative overflow-hidden rounded-xl border"
      style={{
        borderColor: 'var(--color-border)',
        background:
          'color-mix(in oklch, var(--color-surface) 80%, transparent)',
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: color, boxShadow: `0 0 16px ${color}` }}
      />

      <div className="flex flex-col gap-2 px-4 py-3 pl-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[13px] font-medium tracking-tight"
              style={{ color }}
            >
              {use.toolName}
            </span>
            {isSub ? (
              <span
                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider"
                style={{
                  borderColor:
                    'color-mix(in oklch, var(--color-tool-agent) 40%, transparent)',
                  color: 'var(--color-tool-agent)',
                }}
              >
                subagent
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-wider">
            {status === 'running' ? (
              <span className="inline-flex items-center gap-1.5 text-[var(--color-warning)]">
                <motion.span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--color-warning)' }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                running
              </span>
            ) : status === 'error' ? (
              <span className="inline-flex items-center gap-1 text-[var(--color-danger)]">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                error
              </span>
            ) : (
              <span className="text-[var(--color-success)]">done</span>
            )}
            <span className="tabular-nums text-[var(--color-text-dim)]">
              {formatDuration(durationMs)}
            </span>
          </div>
        </div>

        {use.inputPreview ? (
          <p className="break-all font-mono text-[11.5px] leading-relaxed text-[var(--color-text-muted)]">
            {truncate(use.inputPreview, 220)}
          </p>
        ) : null}

        {result ? (
          <div
            className="mt-1 rounded-md border px-3 py-2"
            style={{
              borderColor:
                result.isError
                  ? 'color-mix(in oklch, var(--color-danger) 35%, transparent)'
                  : 'color-mix(in oklch, var(--color-border) 80%, transparent)',
              background: result.isError
                ? 'color-mix(in oklch, var(--color-danger) 8%, transparent)'
                : 'color-mix(in oklch, var(--color-bg-elevated) 60%, transparent)',
            }}
          >
            <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-widest text-[var(--color-text-dim)]">
              <ArrowRight className="h-3 w-3" aria-hidden />
              result
            </div>
            {result.outputPreview ? (
              <p
                className={cn(
                  'mt-1 break-all font-mono text-[11px] leading-relaxed whitespace-pre-wrap',
                  result.isError
                    ? 'text-[var(--color-danger)]'
                    : 'text-[var(--color-text-muted)]',
                )}
              >
                {truncate(result.outputPreview, 360)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AssistantTextCard({ event }: { event: AssistantTextEvent }) {
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{
        borderColor:
          'color-mix(in oklch, var(--color-accent) 30%, transparent)',
        background:
          'linear-gradient(135deg, color-mix(in oklch, var(--color-accent) 8%, transparent), color-mix(in oklch, var(--color-bg-elevated) 70%, transparent))',
      }}
    >
      <div className="flex items-center gap-2 pb-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
        <Sparkles className="h-3 w-3" aria-hidden />
        assistant
      </div>
      <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--color-text)]">
        {truncate(event.text, 480)}
      </p>
    </div>
  );
}

function ThinkingCard({ event }: { event: AssistantThinkingEvent }) {
  return (
    <div
      className="rounded-xl border border-dashed px-4 py-3"
      style={{
        borderColor:
          'color-mix(in oklch, var(--color-text-muted) 30%, transparent)',
        background: 'transparent',
      }}
    >
      <div className="flex items-center gap-2 pb-1 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
        <Brain className="h-3 w-3" aria-hidden />
        thinking…
      </div>
      <p className="whitespace-pre-wrap text-[12px] italic leading-relaxed text-[var(--color-text-muted)]">
        {truncate(event.text || '—', 280)}
      </p>
    </div>
  );
}

function UserCard({ event }: { event: UserMessageEvent }) {
  return (
    <div className="ml-auto max-w-[88%]">
      <div
        className="rounded-xl border px-4 py-2.5"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <div className="flex items-center justify-end gap-2 pb-1 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
          you
          <User className="h-3 w-3" aria-hidden />
        </div>
        <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--color-text)]">
          {truncate(event.text, 480)}
        </p>
      </div>
    </div>
  );
}

function UsageChip({ event }: { event: UsageEvent }) {
  const cacheTotal = event.cacheReadTokens + event.cacheCreationTokens;
  const total = event.inputTokens + cacheTotal;
  const hitPct =
    total > 0 ? Math.round((event.cacheReadTokens / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 px-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--color-text-dim)]">
      <span>usage</span>
      <span className="tabular-nums">+{formatNumber(event.inputTokens)} in</span>
      <span className="tabular-nums">
        +{formatNumber(event.outputTokens)} out
      </span>
      {cacheTotal > 0 ? (
        <span className="tabular-nums text-[var(--color-tool-read)]">
          cache {hitPct}%
        </span>
      ) : null}
    </div>
  );
}

function MetaLine({ event }: { event: SessionMetaEvent }) {
  return (
    <div className="px-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--color-text-dim)]">
      <span className="text-[var(--color-text-muted)]">[meta]</span>{' '}
      session {event.field}: {truncate(event.value, 80)}
    </div>
  );
}

function StreamRow({ item }: { item: StreamItem }) {
  if (item.data.kind === 'tool') {
    return <ToolCard pair={item.data} />;
  }
  const ev = item.data.event;
  switch (ev.kind) {
    case 'assistant_text':
      return <AssistantTextCard event={ev} />;
    case 'assistant_thinking':
      return <ThinkingCard event={ev} />;
    case 'user_message':
      return <UserCard event={ev} />;
    case 'usage':
      return <UsageChip event={ev} />;
    case 'session_meta':
      return <MetaLine event={ev} />;
    case 'tool_result': {
      const text = coerceText(ev.output) || ev.outputPreview || '';
      return (
        <div
          className="rounded-md border px-3 py-2"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-surface)',
          }}
        >
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--color-text-dim)]">
            orphan result
          </span>
          <p className="mt-1 break-all font-mono text-[11px] text-[var(--color-text-muted)]">
            {truncate(text, 240)}
          </p>
        </div>
      );
    }
    case 'hook':
      return (
        <div className="px-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--color-text-dim)]">
          hook · {ev.hook}
        </div>
      );
    default:
      return null;
  }
}

export function ToolStream({ events, max = 50 }: Props) {
  const items = useMemo(() => pairEvents(events).slice(0, max), [events, max]);

  return (
    <section
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'var(--color-border)',
        background:
          'color-mix(in oklch, var(--color-bg-elevated) 60%, transparent)',
      }}
    >
      <div
        className="flex items-center justify-between border-b px-5 py-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          Activity Stream
        </h3>
        <span className="font-mono text-[10px] tabular-nums text-[var(--color-text-dim)]">
          {items.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-dim)]">
              awaiting activity…
            </span>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    type: 'spring',
                    stiffness: 320,
                    damping: 30,
                    mass: 0.6,
                  }}
                >
                  <StreamRow item={item} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
