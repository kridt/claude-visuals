'use client';

import { motion } from 'motion/react';

interface Props {
  mode: 'bridge' | 'warroom';
  onChange(m: 'bridge' | 'warroom'): void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Display mode"
      className="relative inline-flex items-center overflow-hidden border"
      style={{
        borderColor:
          'color-mix(in oklch, var(--color-accent) 45%, transparent)',
        background:
          'color-mix(in oklch, var(--color-bg) 50%, transparent)',
      }}
    >
      <Segment
        label="Bridge"
        active={mode === 'bridge'}
        onClick={() => onChange('bridge')}
      />
      <Segment
        label="War Room"
        active={mode === 'warroom'}
        onClick={() => onChange('warroom')}
      />
    </div>
  );
}

function Segment({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="relative px-2.5 py-[3px] font-mono text-[9.5px] font-semibold uppercase tracking-[0.24em] transition-colors"
      style={{
        color: active ? 'var(--color-bg)' : 'var(--color-text-muted)',
      }}
    >
      {active ? (
        <motion.span
          layoutId="mode-toggle-pill"
          className="absolute inset-0"
          style={{
            background: 'var(--color-accent)',
            boxShadow:
              '0 0 10px color-mix(in oklch, var(--color-accent) 60%, transparent)',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      ) : null}
      <span className="relative">{label}</span>
    </button>
  );
}
