'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Cpu, FileText, Users } from 'lucide-react';
import type { NormalizedEvent, ToolUseEvent } from '@/lib/events/schema';
import { cn, truncate } from '@/lib/utils';
import { StatusPill, type Status } from './status-pill';
import { toolColor } from './tool-badge';

interface Props {
  events: NormalizedEvent[];
}

interface CurrentState {
  status: Status;
  toolUse: ToolUseEvent | null;
  startedAt: number | null;
  model: string | undefined;
  isSubagent: boolean;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function extractFile(input: unknown): string | null {
  if (!isObject(input)) return null;
  const candidates = [
    'file_path',
    'filePath',
    'path',
    'notebook_path',
    'pattern',
    'url',
    'command',
  ];
  for (const key of candidates) {
    const v = input[key];
    if (typeof v === 'string' && v.length > 0) {
      return v;
    }
  }
  return null;
}

function deriveState(events: NormalizedEvent[]): CurrentState {
  const openToolUses = new Map<string, ToolUseEvent>();
  let lastModel: string | undefined;
  let lastEvent: NormalizedEvent | null = null;

  for (const e of events) {
    if (e.kind === 'tool_use') {
      openToolUses.set(e.toolUseId, e);
    } else if (e.kind === 'tool_result') {
      openToolUses.delete(e.toolUseId);
    }
    if (e.kind === 'assistant_text' || e.kind === 'assistant_thinking') {
      if (e.model) lastModel = e.model;
    }
    lastEvent = e;
  }

  let latestUse: ToolUseEvent | null = null;
  let latestTs = 0;
  for (const tu of openToolUses.values()) {
    const ts = Date.parse(tu.timestamp);
    if (Number.isFinite(ts) && ts >= latestTs) {
      latestTs = ts;
      latestUse = tu;
    }
  }

  if (latestUse) {
    return {
      status: 'tool',
      toolUse: latestUse,
      startedAt: latestTs || Date.now(),
      model: lastModel,
      isSubagent: latestUse.agent === 'subagent',
    };
  }

  if (lastEvent?.kind === 'assistant_thinking') {
    return {
      status: 'thinking',
      toolUse: null,
      startedAt: Date.parse(lastEvent.timestamp) || Date.now(),
      model: lastEvent.model ?? lastModel,
      isSubagent: lastEvent.agent === 'subagent',
    };
  }

  if (lastEvent?.kind === 'assistant_text') {
    return {
      status: 'waiting',
      toolUse: null,
      startedAt: null,
      model: lastEvent.model ?? lastModel,
      isSubagent: lastEvent.agent === 'subagent',
    };
  }

  if (lastEvent?.kind === 'user_message') {
    return {
      status: 'thinking',
      toolUse: null,
      startedAt: Date.parse(lastEvent.timestamp) || Date.now(),
      model: lastModel,
      isSubagent: false,
    };
  }

  return {
    status: 'idle',
    toolUse: null,
    startedAt: null,
    model: lastModel,
    isSubagent: false,
  };
}

function useElapsed(startedAt: number | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [startedAt]);
  if (startedAt === null) return '—';
  const ms = Math.max(0, now - startedAt);
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  return `${m}m ${rem.toString().padStart(2, '0')}s`;
}

export function NowPlaying({ events }: Props) {
  const state = deriveState(events);
  const elapsed = useElapsed(state.startedAt);
  const tu = state.toolUse;
  const color = tu ? toolColor(tu.toolName) : 'var(--color-accent)';
  const file = tu ? extractFile(tu.input) : null;
  const preview = tu?.inputPreview;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'var(--color-border)',
        background:
          'linear-gradient(180deg, color-mix(in oklch, var(--color-bg-elevated) 90%, transparent), color-mix(in oklch, var(--color-surface) 80%, transparent))',
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        animate={{
          background: [
            `radial-gradient(60% 80% at 10% 0%, color-mix(in oklch, ${color} 18%, transparent), transparent 60%)`,
            `radial-gradient(60% 80% at 90% 0%, color-mix(in oklch, ${color} 18%, transparent), transparent 60%)`,
            `radial-gradient(60% 80% at 10% 0%, color-mix(in oklch, ${color} 18%, transparent), transparent 60%)`,
          ],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-dim)]">
              Now Playing
            </span>
            <StatusPill status={state.status} />
            {state.isSubagent ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                style={{
                  borderColor:
                    'color-mix(in oklch, var(--color-tool-agent) 40%, transparent)',
                  color: 'var(--color-tool-agent)',
                  background:
                    'color-mix(in oklch, var(--color-tool-agent) 10%, transparent)',
                }}
              >
                <Users className="h-3 w-3" aria-hidden />
                subagent
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] tabular-nums text-[var(--color-text-muted)]">
            {state.model ? (
              <span className="flex items-center gap-1.5">
                <Cpu className="h-3 w-3 text-[var(--color-text-dim)]" aria-hidden />
                <span className="text-[var(--color-text-dim)]">
                  {truncate(state.model, 28)}
                </span>
              </span>
            ) : null}
            <span
              className={cn(
                'min-w-[5ch] text-right',
                state.status === 'tool' || state.status === 'thinking'
                  ? 'text-[var(--color-text)]'
                  : 'text-[var(--color-text-dim)]',
              )}
            >
              {elapsed}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {tu ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-1 rounded-sm"
                  style={{ background: color, boxShadow: `0 0 12px ${color}` }}
                />
                <span
                  className="font-mono text-[18px] font-medium tracking-tight"
                  style={{ color }}
                >
                  {tu.toolName}
                </span>
              </div>
              {file ? (
                <div className="flex items-start gap-2 text-[12px]">
                  <FileText
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-text-dim)]"
                    aria-hidden
                  />
                  <span className="break-all font-mono text-[var(--color-text-muted)]">
                    {truncate(file, 140)}
                  </span>
                </div>
              ) : preview ? (
                <span className="font-mono text-[12px] text-[var(--color-text-muted)]">
                  {truncate(preview, 160)}
                </span>
              ) : null}
            </>
          ) : (
            <div className="flex items-center gap-3 py-1">
              <span
                className="font-mono text-[18px] tracking-tight"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {state.status === 'thinking'
                  ? 'reasoning…'
                  : state.status === 'waiting'
                    ? 'awaiting input'
                    : 'no activity'}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
