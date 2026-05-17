'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import {
  AlertTriangle,
  Brain,
  Code,
  FileEdit,
  FileText,
  Globe,
  ListTodo,
  MessageSquare,
  PencilRuler,
  Search,
  Terminal,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type {
  NormalizedEvent,
  ToolCategory,
  ToolUseEvent,
} from '@/lib/events/schema';
import { categorizeTool } from '@/lib/events/schema';
import { truncate } from '@/lib/utils';

interface Props {
  events: NormalizedEvent[];
}

const MAX_ROWS = 14;

const CATEGORY_ICON: Record<ToolCategory, LucideIcon> = {
  read: FileText,
  edit: FileEdit,
  write: PencilRuler,
  bash: Terminal,
  grep: Search,
  glob: Search,
  web: Globe,
  agent: Users,
  task: ListTodo,
  other: Code,
};

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

type RowKind = 'exec' | 'response' | 'analyzing' | 'alert' | 'msg';

interface Row {
  id: string;
  ts: number;
  kind: RowKind;
  label: string;
  context: string;
  color: string;
  Icon: LucideIcon;
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

function fmtClock(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return '--:--:--';
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function buildRows(events: NormalizedEvent[]): Row[] {
  const toolUseById = new Map<string, ToolUseEvent>();
  for (const e of events) {
    if (e.kind === 'tool_use') toolUseById.set(e.toolUseId, e);
  }

  const rows: Row[] = [];

  for (const e of events) {
    const ts = e.timestamp ? Date.parse(e.timestamp) : 0;

    if (e.kind === 'tool_use') {
      const category = categorizeTool(e.toolName);
      rows.push({
        id: `tu-${e.id}`,
        ts,
        kind: 'exec',
        label: `EXEC ${e.toolName.toUpperCase()}`,
        context: previewFor(e),
        color: TOOL_COLOR_VAR[category],
        Icon: CATEGORY_ICON[category],
      });
    } else if (e.kind === 'tool_result') {
      const used = toolUseById.get(e.toolUseId);
      const category = used
        ? categorizeTool(used.toolName)
        : ('other' as ToolCategory);
      if (e.isError) {
        rows.push({
          id: `tr-${e.id}`,
          ts,
          kind: 'alert',
          label: 'ALERT — FAULT',
          context:
            e.outputPreview ??
            (used ? `${used.toolName} failed` : 'tool returned error'),
          color: 'var(--color-danger)',
          Icon: AlertTriangle,
        });
      } else {
        rows.push({
          id: `tr-${e.id}`,
          ts,
          kind: 'response',
          label: 'RESPONSE',
          context: e.outputPreview ?? (used ? used.toolName : ''),
          color: TOOL_COLOR_VAR[category],
          Icon: CATEGORY_ICON[category],
        });
      }
    } else if (e.kind === 'assistant_thinking') {
      rows.push({
        id: `th-${e.id}`,
        ts,
        kind: 'analyzing',
        label: 'ANALYZING',
        context: truncate(e.text || '...', 80),
        color: 'var(--color-accent)',
        Icon: Brain,
      });
    } else if (e.kind === 'assistant_text') {
      rows.push({
        id: `at-${e.id}`,
        ts,
        kind: 'msg',
        label: 'MSG',
        context: e.text,
        color: 'var(--color-text-muted)',
        Icon: MessageSquare,
      });
    } else if (e.kind === 'user_message') {
      rows.push({
        id: `um-${e.id}`,
        ts,
        kind: 'msg',
        label: 'INBOUND',
        context: e.text,
        color: 'var(--color-text-muted)',
        Icon: MessageSquare,
      });
    }
  }

  return rows.slice(-MAX_ROWS).reverse();
}

export function OpsFeed({ events }: Props) {
  const rows = useMemo(() => buildRows(events), [events]);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden font-sans wr-scanlines"
      style={{
        background:
          'color-mix(in oklch, var(--color-bg) 78%, transparent)',
      }}
    >
      <Header count={rows.length} />

      <div className="relative flex-1 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12"
          style={{
            background:
              'linear-gradient(to bottom, transparent, color-mix(in oklch, var(--color-bg) 80%, transparent))',
          }}
        />
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col">
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <motion.li
                  key={row.id}
                  layout
                  initial={{ opacity: 0, x: -12, scaleY: 0.6 }}
                  animate={{ opacity: 1, x: 0, scaleY: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 360,
                    damping: 30,
                  }}
                >
                  <FeedRow row={row} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <FooterBar />
      <CornerBrackets />
    </div>
  );
}

function Header({ count }: { count: number }) {
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
          Ops Feed
        </span>
      </div>
      <span
        className="font-mono text-[10px] tabular-nums tracking-[0.18em]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ({count.toString().padStart(2, '0')})
      </span>
    </div>
  );
}

function FeedRow({ row }: { row: Row }) {
  const Icon = row.Icon;
  const isAlert = row.kind === 'alert';

  return (
    <div
      className="relative flex items-start gap-2 px-3 py-1.5"
      style={{
        background: isAlert
          ? 'color-mix(in oklch, var(--color-danger) 8%, transparent)'
          : 'transparent',
      }}
    >
      {isAlert ? (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[2px]"
          style={{
            background: 'var(--color-danger)',
            boxShadow:
              '0 0 6px color-mix(in oklch, var(--color-danger) 70%, transparent)',
          }}
        />
      ) : null}
      <span
        className="mt-[2px] shrink-0 font-mono text-[9px] tabular-nums tracking-[0.1em]"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {fmtClock(row.ts)}
      </span>
      <Icon
        className="mt-[1px] h-3 w-3 shrink-0"
        style={{ color: row.color }}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
        <motion.span
          initial={isAlert ? { opacity: 1 } : { opacity: 1 }}
          animate={isAlert ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
          transition={
            isAlert
              ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
              : undefined
          }
          className="font-mono text-[10px] font-semibold uppercase leading-tight tracking-[0.2em]"
          style={{ color: row.color }}
        >
          {row.label}
        </motion.span>
        {row.context ? (
          <span
            className="truncate font-mono text-[10px] leading-tight"
            style={{ color: 'var(--color-text-muted)' }}
            title={row.context}
          >
            {truncate(row.context, 38)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-4">
      <span
        className="font-mono text-[10px] uppercase tracking-[0.32em]"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Channel quiet — standing by
      </span>
    </div>
  );
}

function FooterBar() {
  return (
    <div
      className="relative h-[2px]"
      style={{
        background:
          'linear-gradient(90deg, transparent, color-mix(in oklch, var(--color-accent) 60%, transparent), transparent)',
      }}
    />
  );
}

function PulseSquare({ color }: { color: string }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
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
