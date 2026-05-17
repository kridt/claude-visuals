'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import {
  AlertTriangle,
  Code,
  FileEdit,
  FileText,
  Globe,
  ListTodo,
  PencilRuler,
  Search,
  Terminal,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type {
  NormalizedEvent,
  ToolCategory,
  ToolResultEvent,
  ToolUseEvent,
} from '@/lib/events/schema';
import { categorizeTool } from '@/lib/events/schema';
import { missionCode } from '../lib/callsigns';

interface Props {
  events: NormalizedEvent[];
}

const MAX_CHIPS = 7;

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

type ChipStatus = 'exec' | 'ok' | 'fail';

interface Chip {
  id: string;
  code: string;
  toolName: string;
  category: ToolCategory;
  color: string;
  icon: LucideIcon;
  status: ChipStatus;
}

function buildChips(events: NormalizedEvent[]): Chip[] {
  const results = new Map<string, ToolResultEvent>();
  for (const e of events) {
    if (e.kind === 'tool_result') results.set(e.toolUseId, e);
  }

  const tus: ToolUseEvent[] = [];
  for (const e of events) {
    if (e.kind === 'tool_use') tus.push(e);
  }

  const chips: Chip[] = tus.map((tu) => {
    const result = results.get(tu.toolUseId);
    const category = categorizeTool(tu.toolName);
    const status: ChipStatus = !result
      ? 'exec'
      : result.isError
        ? 'fail'
        : 'ok';
    return {
      id: tu.toolUseId,
      code: missionCode(tu.toolUseId),
      toolName: tu.toolName,
      category,
      color: TOOL_COLOR_VAR[category],
      icon: CATEGORY_ICON[category],
      status,
    };
  });

  return chips.slice(-MAX_CHIPS);
}

export function Ticker({ events }: Props) {
  const chips = useMemo(() => buildChips(events), [events]);

  return (
    <div
      className="relative h-full w-full overflow-hidden font-sans"
      style={{
        background:
          'color-mix(in oklch, var(--color-bg) 82%, transparent)',
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent 0, transparent 3px, color-mix(in oklch, var(--color-accent) 4%, transparent) 3px, color-mix(in oklch, var(--color-accent) 4%, transparent) 4px)',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 pt-2"
        style={{
          borderBottom:
            '1px solid color-mix(in oklch, var(--color-accent) 25%, transparent)',
          paddingBottom: '4px',
        }}
      >
        <span
          className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.32em]"
          style={{ color: 'var(--color-accent)' }}
        >
          Operations Ticker
        </span>
        <span
          aria-hidden
          className="h-[1px] flex-1"
          style={{
            background:
              'linear-gradient(90deg, color-mix(in oklch, var(--color-accent) 45%, transparent), transparent)',
          }}
        />
        <span
          className="font-mono text-[9.5px] tabular-nums uppercase tracking-[0.2em]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {chips.length.toString().padStart(2, '0')} / {MAX_CHIPS}
        </span>
      </div>

      <div className="relative mt-1 flex h-[74px] items-center px-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12"
          style={{
            background:
              'linear-gradient(90deg, color-mix(in oklch, var(--color-bg) 90%, transparent), transparent)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12"
          style={{
            background:
              'linear-gradient(270deg, color-mix(in oklch, var(--color-bg) 90%, transparent), transparent)',
          }}
        />

        {chips.length === 0 ? (
          <div
            className="flex w-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.32em]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            No operations on record
          </div>
        ) : (
          <div className="flex h-full flex-1 items-center justify-end gap-2 overflow-hidden">
            <AnimatePresence initial={false}>
              {chips.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, x: 28, scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.85 }}
                  transition={{
                    type: 'spring',
                    stiffness: 320,
                    damping: 28,
                  }}
                  className="shrink-0"
                >
                  <TickerChip chip={c} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function TickerChip({ chip }: { chip: Chip }) {
  const Icon = chip.icon;
  const isFail = chip.status === 'fail';
  const isExec = chip.status === 'exec';
  const accent = isFail ? 'var(--color-danger)' : chip.color;
  const statusLabel = isFail ? 'FAIL' : isExec ? 'EXEC' : 'OK';
  const statusColor = isFail
    ? 'var(--color-danger)'
    : isExec
      ? 'var(--color-warning)'
      : 'var(--color-success)';

  return (
    <div
      className="relative flex h-[58px] w-[140px] flex-col justify-between overflow-hidden border px-2 py-1"
      style={{
        borderColor: `color-mix(in oklch, ${accent} 50%, transparent)`,
        background: `color-mix(in oklch, ${accent} 7%, transparent)`,
        boxShadow: isFail
          ? '0 0 10px color-mix(in oklch, var(--color-danger) 55%, transparent)'
          : `0 0 8px color-mix(in oklch, ${accent} 25%, transparent)`,
      }}
    >
      {isExec ? (
        <motion.span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: accent }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}

      <div className="flex items-center justify-between gap-1">
        <span
          className="font-mono text-[9px] tabular-nums tracking-[0.14em]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {chip.code}
        </span>
        <motion.span
          className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: statusColor }}
          animate={
            isFail
              ? { opacity: [1, 0.4, 1] }
              : isExec
                ? { opacity: [0.7, 1, 0.7] }
                : { opacity: 1 }
          }
          transition={
            isFail
              ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
              : isExec
                ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
                : undefined
          }
        >
          {statusLabel}
        </motion.span>
      </div>

      <div className="flex items-center gap-1.5">
        {isFail ? (
          <AlertTriangle
            className="h-3 w-3 shrink-0"
            style={{ color: 'var(--color-danger)' }}
            aria-hidden
          />
        ) : (
          <Icon
            className="h-3 w-3 shrink-0"
            style={{ color: accent }}
            aria-hidden
          />
        )}
        <span
          className="truncate font-mono text-[11px] font-semibold"
          style={{ color: accent }}
          title={chip.toolName}
        >
          {chip.toolName}
        </span>
      </div>
    </div>
  );
}
