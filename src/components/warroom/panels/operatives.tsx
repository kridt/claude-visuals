'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import type {
  NormalizedEvent,
  ToolCategory,
  ToolUseEvent,
} from '@/lib/events/schema';
import { categorizeTool } from '@/lib/events/schema';
import { truncate } from '@/lib/utils';
import { codename } from '../lib/callsigns';

interface Props {
  events: NormalizedEvent[];
}

const TOOL_COLOR_VAR: Record<ToolCategory, string> = {
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

const SUBAGENT_TTL_MS = 60_000;
const ENGAGED_WINDOW_MS = 6_000;

type OperativeStatus = 'engaged' | 'standby';
type MainStatus = 'engaged' | 'analyzing' | 'standby' | 'alert';

interface Operative {
  id: string;
  callsign: string;
  status: OperativeStatus;
  currentTool: string;
  currentTarget: string;
  startedAt: number;
  color: string;
}

interface State {
  operatives: Operative[];
  mainStatus: MainStatus;
  mainDetail: string;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function previewFor(tu: ToolUseEvent): string {
  if (isObj(tu.input)) {
    for (const key of [
      'file_path',
      'filePath',
      'path',
      'pattern',
      'url',
      'command',
      'description',
      'query',
    ]) {
      const v = tu.input[key];
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  return tu.inputPreview ?? '';
}

function deriveState(events: NormalizedEvent[]): State {
  const now = Date.now();
  const resultsByUseId = new Map<
    string,
    { ts: number; isError: boolean }
  >();
  for (const e of events) {
    if (e.kind === 'tool_result') {
      resultsByUseId.set(e.toolUseId, {
        ts: e.timestamp ? Date.parse(e.timestamp) : 0,
        isError: Boolean(e.isError),
      });
    }
  }

  const buckets = new Map<
    string,
    {
      lastTool: string;
      lastTarget: string;
      lastTs: number;
      lastCategory: ToolCategory;
      lastToolUseId: string;
      lastOpenSince: number | null;
    }
  >();

  let mainLastToolTs = 0;
  let mainOpenToolName: string | null = null;
  let mainOpenStarted = 0;
  let mainLatestThinkingTs = 0;
  let mainLatestErrorTs = 0;
  let latestEventTs = 0;

  for (const e of events) {
    const ts = e.timestamp ? Date.parse(e.timestamp) : 0;
    if (ts > latestEventTs) latestEventTs = ts;

    if (e.kind === 'tool_use') {
      const category = categorizeTool(e.toolName);
      const result = resultsByUseId.get(e.toolUseId);
      if (e.agent === 'subagent') {
        const key = e.parentUuid ?? e.toolUseId;
        const existing = buckets.get(key);
        const target = previewFor(e);
        const openSince = result ? null : ts || now;
        if (!existing || ts >= existing.lastTs) {
          buckets.set(key, {
            lastTool: e.toolName,
            lastTarget: target,
            lastTs: ts || now,
            lastCategory: category,
            lastToolUseId: e.toolUseId,
            lastOpenSince: openSince,
          });
        }
      } else {
        if (ts >= mainLastToolTs) {
          mainLastToolTs = ts;
          if (!result) {
            mainOpenToolName = e.toolName;
            mainOpenStarted = ts || now;
          } else {
            mainOpenToolName = null;
          }
        }
      }
    } else if (e.kind === 'tool_result') {
      if (e.isError && ts > mainLatestErrorTs) mainLatestErrorTs = ts;
    } else if (e.kind === 'assistant_thinking') {
      if (ts > mainLatestThinkingTs) mainLatestThinkingTs = ts;
    }
  }

  const cutoff = now - SUBAGENT_TTL_MS;
  const operatives: Operative[] = [];
  for (const [key, info] of buckets) {
    if (info.lastTs < cutoff) continue;
    const isEngaged =
      info.lastOpenSince !== null ||
      now - info.lastTs < ENGAGED_WINDOW_MS;
    operatives.push({
      id: key,
      callsign: codename(key),
      status: isEngaged ? 'engaged' : 'standby',
      currentTool: info.lastTool,
      currentTarget: info.lastTarget,
      startedAt: info.lastOpenSince ?? info.lastTs,
      color: TOOL_COLOR_VAR[info.lastCategory],
    });
  }

  operatives.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'engaged' ? -1 : 1;
    return b.startedAt - a.startedAt;
  });

  let mainStatus: MainStatus = 'standby';
  let mainDetail = 'No active operation';
  if (mainLatestErrorTs > 0 && now - mainLatestErrorTs < 2500) {
    mainStatus = 'alert';
    mainDetail = 'Fault detected';
  } else if (mainOpenToolName) {
    mainStatus = 'engaged';
    mainDetail = `EXEC ${mainOpenToolName.toUpperCase()}`;
  } else if (
    mainLatestThinkingTs > 0 &&
    mainLatestThinkingTs === latestEventTs
  ) {
    mainStatus = 'analyzing';
    mainDetail = 'Analyzing';
  }

  return { operatives, mainStatus, mainDetail };
}

function useElapsed(): number {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function fmtElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '00:00';
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function Operatives({ events }: Props) {
  const state = useMemo(() => deriveState(events), [events]);
  const now = useElapsed();
  const activeCount = state.operatives.filter(
    (o) => o.status === 'engaged',
  ).length;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden font-sans wr-scanlines"
      style={{
        background:
          'color-mix(in oklch, var(--color-bg) 78%, transparent)',
      }}
    >
      <Header active={activeCount} total={state.operatives.length} />

      <div className="relative flex-1 overflow-hidden">
        {state.operatives.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-px px-2 py-2">
            <AnimatePresence initial={false}>
              {state.operatives.slice(0, 6).map((op) => (
                <motion.li
                  key={op.id}
                  layout
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                >
                  <OperativeRow op={op} now={now} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <MainAgentSummary status={state.mainStatus} detail={state.mainDetail} />
      <CornerBrackets />
    </div>
  );
}

function Header({ active, total }: { active: number; total: number }) {
  return (
    <div
      className="flex items-center justify-between gap-2 border-b px-3 py-2"
      style={{
        borderColor:
          'color-mix(in oklch, var(--color-accent) 35%, transparent)',
        background:
          'linear-gradient(180deg, color-mix(in oklch, var(--color-accent) 14%, transparent), transparent)',
      }}
    >
      <div className="flex items-center gap-2">
        <PulseSquare color="var(--color-accent)" />
        <span
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em]"
          style={{ color: 'var(--color-accent)' }}
        >
          Operatives
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: 'var(--color-success)' }}
        >
          {active.toString().padStart(2, '0')}
        </span>
        <span
          className="font-mono text-[9px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          /
        </span>
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {total.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

function OperativeRow({ op, now }: { op: Operative; now: number }) {
  const elapsedMs = now - op.startedAt;
  const isEngaged = op.status === 'engaged';
  const statusColor = isEngaged
    ? 'var(--color-success)'
    : 'var(--color-text-dim)';

  return (
    <div
      className="relative flex flex-col gap-0.5 rounded-sm border px-2.5 py-1.5"
      style={{
        borderColor: isEngaged
          ? 'color-mix(in oklch, var(--color-accent) 35%, transparent)'
          : 'color-mix(in oklch, var(--color-border) 60%, transparent)',
        background: isEngaged
          ? 'color-mix(in oklch, var(--color-accent) 6%, transparent)'
          : 'color-mix(in oklch, var(--color-surface) 30%, transparent)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2 w-2"
            style={{
              background: statusColor,
              boxShadow: isEngaged
                ? `0 0 6px ${statusColor}`
                : 'none',
            }}
          />
          <span
            className="font-mono text-[13px] font-semibold tabular-nums tracking-[0.08em]"
            style={{ color: 'var(--color-text)' }}
          >
            {op.callsign}
          </span>
        </div>
        <span
          className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: statusColor }}
        >
          {isEngaged ? 'Engaged' : 'Standby'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span
          className="truncate font-mono text-[10px]"
          style={{ color: op.color }}
          title={`${op.currentTool}${op.currentTarget ? ` · ${op.currentTarget}` : ''}`}
        >
          <span className="font-semibold">{op.currentTool}</span>
          {op.currentTarget ? (
            <span
              className="ml-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              · {truncate(op.currentTarget, 22)}
            </span>
          ) : null}
        </span>
        <span
          className="shrink-0 font-mono text-[9.5px] tabular-nums"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {fmtElapsed(elapsedMs)}
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-3">
      <div className="flex flex-col items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-3 w-3"
          style={{
            background:
              'color-mix(in oklch, var(--color-text-dim) 60%, transparent)',
          }}
        />
        <span
          className="text-center font-mono text-[10px] uppercase tracking-[0.32em]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          No active operatives
        </span>
      </div>
    </div>
  );
}

function MainAgentSummary({
  status,
  detail,
}: {
  status: MainStatus;
  detail: string;
}) {
  const color =
    status === 'alert'
      ? 'var(--color-danger)'
      : status === 'engaged'
        ? 'var(--color-success)'
        : status === 'analyzing'
          ? 'var(--color-accent)'
          : 'var(--color-text-dim)';
  const label =
    status === 'alert'
      ? 'ALERT'
      : status === 'engaged'
        ? 'ENGAGED'
        : status === 'analyzing'
          ? 'ANALYZING'
          : 'STANDBY';

  return (
    <div
      className="flex items-center justify-between gap-2 border-t px-3 py-2"
      style={{
        borderColor:
          'color-mix(in oklch, var(--color-accent) 30%, transparent)',
        background:
          'linear-gradient(0deg, color-mix(in oklch, var(--color-accent) 10%, transparent), transparent)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="font-mono text-[9px] uppercase tracking-[0.3em]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Main Agent
        </span>
        <span
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color }}
        >
          {label}
        </span>
      </div>
      <span
        className="truncate font-mono text-[9.5px]"
        style={{ color: 'var(--color-text-muted)' }}
        title={detail}
      >
        {truncate(detail, 20)}
      </span>
    </div>
  );
}

function PulseSquare({ color }: { color: string }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      <motion.span
        aria-hidden
        className="absolute inset-0"
        style={{ background: color }}
        animate={{ opacity: [0.7, 0, 0.7], scale: [1, 2.2, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
      />
    </span>
  );
}

function CornerBrackets() {
  const c = 'color-mix(in oklch, var(--color-accent) 80%, transparent)';
  const sz = 10;
  const w = 1.2;
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute left-1 top-1"
        style={{
          width: sz,
          height: sz,
          borderLeft: `${w}px solid ${c}`,
          borderTop: `${w}px solid ${c}`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-1 top-1"
        style={{
          width: sz,
          height: sz,
          borderRight: `${w}px solid ${c}`,
          borderTop: `${w}px solid ${c}`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-1 bottom-1"
        style={{
          width: sz,
          height: sz,
          borderLeft: `${w}px solid ${c}`,
          borderBottom: `${w}px solid ${c}`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-1 bottom-1"
        style={{
          width: sz,
          height: sz,
          borderRight: `${w}px solid ${c}`,
          borderBottom: `${w}px solid ${c}`,
        }}
      />
    </>
  );
}
