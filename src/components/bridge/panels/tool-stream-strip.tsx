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
import { truncate } from '@/lib/utils';

interface Props {
  events: NormalizedEvent[];
}

const MAX_CHIPS = 10;

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

interface Chip {
  id: string;
  toolName: string;
  category: ToolCategory;
  color: string;
  icon: LucideIcon;
  preview: string;
  isError: boolean;
  isRunning: boolean;
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

function buildChips(events: NormalizedEvent[]): Chip[] {
  const results = new Map<string, ToolResultEvent>();
  for (const e of events) {
    if (e.kind === 'tool_result') results.set(e.toolUseId, e);
  }

  const chips: Chip[] = [];
  for (const e of events) {
    if (e.kind !== 'tool_use') continue;
    const result = results.get(e.toolUseId);
    const category = categorizeTool(e.toolName);
    chips.push({
      id: e.toolUseId,
      toolName: e.toolName,
      category,
      color: TOOL_COLOR_VAR[category],
      icon: CATEGORY_ICON[category],
      preview: previewFor(e),
      isError: Boolean(result?.isError),
      isRunning: !result,
    });
  }

  return chips.slice(-MAX_CHIPS);
}

export function ToolStreamStrip({ events }: Props) {
  const chips = useMemo(() => buildChips(events), [events]);

  return (
    <div
      className="relative h-full w-full overflow-hidden font-sans"
      style={{
        background:
          'color-mix(in oklch, var(--color-bg-elevated) 30%, transparent)',
      }}
    >
      <div className="flex items-center gap-3 px-4 pt-2">
        <span
          className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.32em]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Tool Stream
        </span>
        <span
          aria-hidden
          className="h-[1px] flex-1 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, color-mix(in oklch, var(--color-accent) 45%, transparent), transparent)',
          }}
        />
        <span
          className="font-mono text-[9.5px] tabular-nums uppercase tracking-[0.2em]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {chips.length}
        </span>
      </div>

      <div className="relative mt-1 flex h-[80px] items-center px-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12"
          style={{
            background:
              'linear-gradient(90deg, color-mix(in oklch, var(--color-bg-elevated) 70%, transparent), transparent)',
          }}
        />

        {chips.length === 0 ? (
          <div
            className="flex w-full items-center justify-center font-mono text-[10.5px] uppercase tracking-[0.28em]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            awaiting tool activity…
          </div>
        ) : (
          <div className="flex h-full flex-1 items-center gap-2 overflow-hidden">
            <AnimatePresence initial={false}>
              {chips.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, x: 24, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    type: 'spring',
                    stiffness: 320,
                    damping: 28,
                  }}
                  className="shrink-0"
                >
                  <ChipView chip={c} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function ChipView({ chip }: { chip: Chip }) {
  const Icon = chip.icon;
  const borderColor = chip.isError
    ? 'var(--color-danger)'
    : `color-mix(in oklch, ${chip.color} 50%, transparent)`;
  const glow = chip.isError
    ? `0 0 12px color-mix(in oklch, var(--color-danger) 60%, transparent)`
    : `0 0 10px color-mix(in oklch, ${chip.color} 35%, transparent)`;

  return (
    <div
      className="relative flex h-[60px] w-[120px] flex-col gap-0.5 overflow-hidden rounded-md border px-2 py-1.5"
      style={{
        borderColor,
        background: `color-mix(in oklch, ${chip.color} 8%, transparent)`,
        boxShadow: glow,
      }}
    >
      {chip.isRunning ? (
        <motion.span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: chip.color }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}

      <div className="flex items-center gap-1.5">
        {chip.isError ? (
          <AlertTriangle
            className="h-3 w-3 shrink-0"
            style={{ color: 'var(--color-danger)' }}
            aria-hidden
          />
        ) : (
          <Icon
            className="h-3 w-3 shrink-0"
            style={{ color: chip.color }}
            aria-hidden
          />
        )}
        <span
          className="truncate font-mono text-[10.5px] font-medium"
          style={{ color: chip.isError ? 'var(--color-danger)' : chip.color }}
          title={chip.toolName}
        >
          {chip.toolName}
        </span>
      </div>
      <span
        className="block truncate font-mono text-[9.5px] leading-snug"
        style={{ color: 'var(--color-text-muted)' }}
        title={chip.preview}
      >
        {chip.preview ? truncate(chip.preview, 22) : '—'}
      </span>
    </div>
  );
}
