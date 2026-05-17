'use client';

import { categorizeTool, type ToolCategory } from '@/lib/events/schema';
import { cn } from '@/lib/utils';

interface Props {
  name: string;
  className?: string;
  size?: 'sm' | 'md';
}

const CATEGORY_VAR: Record<ToolCategory, string> = {
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

export function toolColor(name: string): string {
  return CATEGORY_VAR[categorizeTool(name)];
}

export function ToolBadge({ name, className, size = 'sm' }: Props) {
  const color = toolColor(name);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-mono',
        size === 'sm'
          ? 'px-1.5 py-0.5 text-[10.5px]'
          : 'px-2 py-1 text-[12px]',
        className,
      )}
      style={{
        borderColor: `color-mix(in oklch, ${color} 35%, transparent)`,
        background: `color-mix(in oklch, ${color} 10%, transparent)`,
        color,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span className="tracking-tight">{name}</span>
    </span>
  );
}
