'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import type {
  AssistantTextEvent,
  NormalizedEvent,
  SessionSummary,
  ToolUseEvent,
} from '@/lib/events/schema';
import { categorizeTool } from '@/lib/events/schema';
import { truncate } from '@/lib/utils';
import { friendlyProjectName } from '@/lib/sessions/names';
import { HudCorners } from './hud-corners';

interface Props {
  events: NormalizedEvent[];
  sessionSummary?: SessionSummary;
}

type Status = 'standby' | 'thinking' | 'executing' | 'waiting' | 'alert';

interface DerivedState {
  status: Status;
  activeTool: ToolUseEvent | null;
  toolColor: string;
  lastMessage: AssistantTextEvent | null;
  subagentSummaries: { id: string; toolName: string; tone: string }[];
  pulseKey: number;
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

const STATUS_LABEL: Record<Status, string> = {
  standby: 'STANDBY',
  thinking: 'THINKING…',
  executing: 'EXECUTING',
  waiting: 'WAITING',
  alert: 'ALERT',
};

const STATUS_COLOR: Record<Status, string> = {
  standby: 'var(--color-text-dim)',
  thinking: 'var(--color-accent)',
  executing: 'var(--color-success)',
  waiting: 'var(--color-warning)',
  alert: 'var(--color-danger)',
};

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function extractPreview(t: ToolUseEvent): string | null {
  if (isObj(t.input)) {
    for (const key of [
      'file_path',
      'filePath',
      'path',
      'notebook_path',
      'pattern',
      'url',
      'command',
      'description',
      'query',
    ]) {
      const v = t.input[key];
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  return t.inputPreview ?? null;
}

function deriveState(events: NormalizedEvent[]): DerivedState {
  const now = Date.now();
  const openUses = new Map<string, ToolUseEvent>();
  const results = new Map<string, { isError: boolean; ts: number }>();
  let latestThinkingTs = 0;
  let latestAssistantText: AssistantTextEvent | null = null;
  let latestAssistantTextTs = 0;
  let latestErrorTs = 0;
  let latestEventTs = 0;
  const subagentMap = new Map<
    string,
    { lastTool: string; lastTs: number }
  >();

  for (const e of events) {
    const ts = e.timestamp ? Date.parse(e.timestamp) : 0;
    if (ts > latestEventTs) latestEventTs = ts;

    if (e.kind === 'tool_use') {
      openUses.set(e.toolUseId, e);
      if (e.agent === 'subagent') {
        const bucket = e.parentUuid ?? e.toolUseId;
        const existing = subagentMap.get(bucket);
        if (!existing || ts > existing.lastTs) {
          subagentMap.set(bucket, { lastTool: e.toolName, lastTs: ts || now });
        }
      }
    } else if (e.kind === 'tool_result') {
      const r = { isError: Boolean(e.isError), ts };
      results.set(e.toolUseId, r);
      openUses.delete(e.toolUseId);
      if (e.isError && ts > latestErrorTs) latestErrorTs = ts;
    } else if (e.kind === 'assistant_thinking') {
      if (ts > latestThinkingTs) latestThinkingTs = ts;
    } else if (e.kind === 'assistant_text') {
      if (ts >= latestAssistantTextTs) {
        latestAssistantTextTs = ts;
        latestAssistantText = e;
      }
    }
  }

  let activeTool: ToolUseEvent | null = null;
  let activeTs = 0;
  for (const tu of openUses.values()) {
    const ts = Date.parse(tu.timestamp);
    if (Number.isFinite(ts) && ts >= activeTs) {
      activeTs = ts;
      activeTool = tu;
    }
  }

  let status: Status = 'standby';
  if (latestErrorTs > 0 && now - latestErrorTs < 2500) {
    status = 'alert';
  } else if (activeTool) {
    status = 'executing';
  } else if (latestThinkingTs > 0 && latestThinkingTs === latestEventTs) {
    status = 'thinking';
  } else if (latestAssistantText && latestAssistantTextTs === latestEventTs) {
    status = 'waiting';
  }

  const toolCategory = activeTool ? categorizeTool(activeTool.toolName) : 'other';
  const toolColor = TOOL_COLOR_VAR[toolCategory] ?? TOOL_COLOR_VAR.other!;

  const cutoff = now - 60_000;
  const subagentSummaries = [...subagentMap.entries()]
    .filter(([, info]) => info.lastTs >= cutoff)
    .slice(-6)
    .map(([id, info]) => ({
      id,
      toolName: info.lastTool,
      tone:
        TOOL_COLOR_VAR[categorizeTool(info.lastTool)] ?? TOOL_COLOR_VAR.other!,
    }));

  return {
    status,
    activeTool,
    toolColor,
    lastMessage: latestAssistantText,
    subagentSummaries,
    pulseKey: events.length,
  };
}

function useSystemClock(): string {
  const [now, setNow] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(
        d.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function MissionControl({ events, sessionSummary }: Props) {
  const state = useMemo(() => deriveState(events), [events]);
  const clock = useSystemClock();

  const projectName = sessionSummary
    ? friendlyProjectName(sessionSummary).name
    : 'ALL SESSIONS';

  const statusLabel =
    state.status === 'executing' && state.activeTool
      ? `EXECUTING · ${state.activeTool.toolName.toUpperCase()}`
      : STATUS_LABEL[state.status];
  const statusColor = STATUS_COLOR[state.status];

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden font-sans"
      style={{
        background:
          'color-mix(in oklch, var(--color-bg-elevated) 38%, transparent)',
      }}
    >
      <HudCorners color="var(--color-accent)" active size={18} />

      <header className="flex items-baseline justify-between px-6 pt-6 pb-2">
        <div className="flex flex-col">
          <span
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.36em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Mission Control
          </span>
          <span
            className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--color-text-dim)' }}
            title={projectName}
          >
            {truncate(projectName, 28)}
          </span>
        </div>
        <span
          className="font-mono text-[11px] tabular-nums tracking-[0.18em]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {clock}
        </span>
      </header>

      <div
        aria-hidden
        className="mx-6 h-[2px] rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${statusColor} 30%, ${statusColor} 70%, transparent)`,
          boxShadow: `0 0 12px color-mix(in oklch, ${statusColor} 60%, transparent)`,
        }}
      />

      <section className="flex flex-col gap-1 px-6 pt-5 pb-2">
        <span
          className="font-mono text-[9px] uppercase tracking-[0.34em]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Status
        </span>
        <div className="relative h-[58px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={statusLabel}
              initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center"
            >
              <div className="flex items-center gap-3">
                <StatusDot color={statusColor} animated={state.status !== 'standby'} />
                <span
                  className="font-mono text-[34px] font-semibold uppercase leading-none tracking-[0.06em]"
                  style={{
                    color: statusColor,
                    textShadow: `0 0 16px color-mix(in oklch, ${statusColor} 55%, transparent)`,
                  }}
                >
                  {statusLabel}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section className="flex flex-col gap-1.5 px-6 py-3">
        <span
          className="font-mono text-[9px] uppercase tracking-[0.34em]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Active Tool
        </span>
        {state.activeTool ? (
          <div className="flex flex-col gap-1">
            <span
              className="font-mono text-[22px] font-medium tracking-tight"
              style={{
                color: state.toolColor,
                textShadow: `0 0 10px color-mix(in oklch, ${state.toolColor} 45%, transparent)`,
              }}
            >
              {state.activeTool.toolName}
            </span>
            <span
              className="truncate font-mono text-[11px]"
              style={{ color: 'var(--color-text-muted)' }}
              title={extractPreview(state.activeTool) ?? ''}
            >
              {truncate(extractPreview(state.activeTool) ?? '—', 60)}
            </span>
          </div>
        ) : (
          <span
            className="font-mono text-[18px] italic"
            style={{ color: 'var(--color-text-dim)' }}
          >
            no tool running
          </span>
        )}
      </section>

      <section className="flex flex-col gap-1.5 px-6 py-3">
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono text-[9px] uppercase tracking-[0.34em]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Subagents
          </span>
          <span
            className="font-mono text-[18px] font-semibold tabular-nums leading-none"
            style={{
              color:
                state.subagentSummaries.length > 0
                  ? 'var(--color-tool-agent)'
                  : 'var(--color-text-dim)',
              textShadow:
                state.subagentSummaries.length > 0
                  ? '0 0 8px color-mix(in oklch, var(--color-tool-agent) 60%, transparent)'
                  : 'none',
            }}
          >
            {state.subagentSummaries.length}
          </span>
        </div>
        {state.subagentSummaries.length === 0 ? (
          <span
            className="font-mono text-[11px]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            none active
          </span>
        ) : (
          <ul className="flex flex-col gap-1">
            {state.subagentSummaries.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 font-mono text-[11px]"
              >
                <Users
                  className="h-3 w-3 shrink-0"
                  style={{ color: 'var(--color-tool-agent)' }}
                  aria-hidden
                />
                <span style={{ color: s.tone }}>{s.toolName}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-1 min-h-0 flex-col gap-1.5 px-6 pt-3 pb-4">
        <span
          className="font-mono text-[9px] uppercase tracking-[0.34em]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Message
        </span>
        <div
          className="flex-1 overflow-hidden rounded-md border px-3 py-2"
          style={{
            borderColor:
              'color-mix(in oklch, var(--color-accent) 22%, transparent)',
            background:
              'color-mix(in oklch, var(--color-bg) 60%, transparent)',
          }}
        >
          {state.lastMessage ? (
            <p
              className="line-clamp-5 text-[12px] leading-relaxed"
              style={{ color: 'var(--color-text)' }}
            >
              {truncate(state.lastMessage.text, 220)}
            </p>
          ) : (
            <p
              className="font-mono text-[11px] italic"
              style={{ color: 'var(--color-text-dim)' }}
            >
              awaiting assistant output…
            </p>
          )}
        </div>
      </section>

      <PulseBar pulseKey={state.pulseKey} color={statusColor} />
    </div>
  );
}

function StatusDot({
  color,
  animated,
}: {
  color: string;
  animated: boolean;
}) {
  return (
    <span className="relative inline-flex h-3 w-3 items-center justify-center">
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
      />
      {animated ? (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.55, 0, 0.55], scale: [1, 2.4, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      ) : null}
    </span>
  );
}

function PulseBar({
  pulseKey,
  color,
}: {
  pulseKey: number;
  color: string;
}) {
  return (
    <div
      className="relative h-[3px] w-full overflow-hidden"
      style={{ background: 'color-mix(in oklch, var(--color-border) 40%, transparent)' }}
      aria-hidden
    >
      <motion.div
        key={pulseKey}
        initial={{ x: '-100%', opacity: 0.9 }}
        animate={{ x: '100%', opacity: 0.3 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
        className="absolute inset-y-0 w-[35%]"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 10px color-mix(in oklch, ${color} 60%, transparent)`,
        }}
      />
    </div>
  );
}
