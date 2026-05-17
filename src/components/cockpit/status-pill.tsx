'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export type Status = 'thinking' | 'tool' | 'waiting' | 'idle' | 'error';

interface Props {
  status: Status;
  label?: string;
  className?: string;
}

const STATUS_COPY: Record<Status, string> = {
  thinking: 'THINKING',
  tool: 'RUNNING TOOL',
  waiting: 'WAITING',
  idle: 'IDLE',
  error: 'ERROR',
};

const STATUS_COLOR: Record<Status, string> = {
  thinking: 'var(--color-accent)',
  tool: 'var(--color-warning)',
  waiting: 'var(--color-text-muted)',
  idle: 'var(--color-text-dim)',
  error: 'var(--color-danger)',
};

export function StatusPill({ status, label, className }: Props) {
  const active = status === 'thinking' || status === 'tool';
  const color = STATUS_COLOR[status];

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]',
        className,
      )}
      style={{
        borderColor: `color-mix(in oklch, ${color} 40%, transparent)`,
        background: `color-mix(in oklch, ${color} 10%, transparent)`,
        color,
      }}
    >
      {active ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(90deg, transparent 0%, color-mix(in oklch, ${color} 22%, transparent) 50%, transparent 100%)`,
          }}
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        />
      ) : null}
      <span className="relative inline-flex h-2 w-2 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: color }}
        />
        {active ? (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: color }}
            animate={{ opacity: [0.6, 0, 0.6], scale: [1, 2.2, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        ) : null}
      </span>
      <span className="relative">{label ?? STATUS_COPY[status]}</span>
    </div>
  );
}
