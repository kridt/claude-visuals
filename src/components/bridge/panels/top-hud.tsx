'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface Props {
  activeCount: number;
  totalCount: number;
  connected: boolean;
  onOpenPalette(): void;
}

function Logo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <radialGradient id="bridge-logo-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.86 0.14 290)" />
          <stop offset="100%" stopColor="oklch(0.55 0.2 290)" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="14" fill="url(#bridge-logo-g)" />
      <motion.circle
        cx="32"
        cy="32"
        r="22"
        stroke="oklch(0.78 0.18 290)"
        strokeOpacity="0.55"
        strokeWidth="1.4"
        fill="none"
        strokeDasharray="4 6"
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '32px 32px' }}
      />
      <motion.circle
        cx="32"
        cy="32"
        r="28"
        stroke="oklch(0.78 0.18 290)"
        strokeOpacity="0.25"
        strokeWidth="1"
        fill="none"
        strokeDasharray="2 8"
        animate={{ rotate: -360 }}
        transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '32px 32px' }}
      />
    </svg>
  );
}

function Clock() {
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
  return (
    <span
      className="font-mono text-[11px] tabular-nums tracking-[0.22em]"
      style={{ color: 'var(--color-text-muted)' }}
    >
      {now}
    </span>
  );
}

export function TopHud({
  activeCount,
  totalCount,
  connected,
  onOpenPalette,
}: Props) {
  const hasActive = activeCount > 0;

  return (
    <div
      className="relative w-full"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in oklch, var(--color-bg) 75%, transparent), color-mix(in oklch, var(--color-bg) 20%, transparent))',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="flex flex-col leading-none">
            <span
              className="font-mono text-[12px] font-semibold uppercase tracking-[0.36em]"
              style={{ color: 'var(--color-text)' }}
            >
              Claude Visuals
            </span>
            <span
              className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.4em]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Bridge
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono text-[9.5px] uppercase tracking-[0.28em]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Active
            </span>
            <motion.span
              className="font-mono text-[24px] font-semibold tabular-nums leading-none"
              style={{
                color: hasActive
                  ? 'var(--color-success)'
                  : 'var(--color-text-muted)',
                textShadow: hasActive
                  ? '0 0 12px color-mix(in oklch, var(--color-success) 60%, transparent)'
                  : 'none',
              }}
              animate={hasActive ? { opacity: [1, 0.75, 1] } : { opacity: 1 }}
              transition={
                hasActive
                  ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                  : undefined
              }
            >
              {activeCount}
            </motion.span>
          </div>
          <div
            aria-hidden
            className="h-5 w-px"
            style={{ background: 'var(--color-border)' }}
          />
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono text-[9.5px] uppercase tracking-[0.28em]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Total
            </span>
            <span
              className="font-mono text-[18px] tabular-nums leading-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {totalCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionPill connected={connected} />
          <Clock />
          <button
            type="button"
            onClick={onOpenPalette}
            className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 transition-colors hover:bg-[var(--color-surface)]"
            style={{
              borderColor: 'var(--color-border)',
              background:
                'color-mix(in oklch, var(--color-surface) 40%, transparent)',
            }}
            title="Switch session"
          >
            <span
              className="font-mono text-[10px] uppercase tracking-[0.24em]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Switch
            </span>
            <span
              className="inline-flex items-center gap-0.5 rounded border px-1 py-px font-mono text-[9px]"
              style={{
                borderColor: 'var(--color-border)',
                background:
                  'color-mix(in oklch, var(--color-bg) 60%, transparent)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>⌘</span>
              <span>K</span>
            </span>
          </button>
        </div>
      </div>

      <div
        className="relative h-[2px] w-full overflow-hidden"
        style={{
          background:
            'color-mix(in oklch, var(--color-border) 50%, transparent)',
        }}
      >
        <motion.div
          className="absolute inset-y-0 w-[30%]"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--color-accent), transparent)',
            boxShadow:
              '0 0 12px color-mix(in oklch, var(--color-accent) 70%, transparent)',
          }}
          animate={{ x: ['-30%', '100vw'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </div>
  );
}

function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1"
      style={{
        borderColor: connected
          ? 'color-mix(in oklch, var(--color-success) 40%, transparent)'
          : 'color-mix(in oklch, var(--color-danger) 40%, transparent)',
        background: connected
          ? 'color-mix(in oklch, var(--color-success) 8%, transparent)'
          : 'color-mix(in oklch, var(--color-danger) 8%, transparent)',
      }}
    >
      <span className="relative inline-flex h-2 w-2 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: connected
              ? 'var(--color-success)'
              : 'var(--color-danger)',
          }}
        />
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            background: connected
              ? 'var(--color-success)'
              : 'var(--color-danger)',
          }}
          animate={{ opacity: [0.55, 0, 0.55], scale: [1, 2.4, 1] }}
          transition={{
            duration: connected ? 1.8 : 2.6,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      </span>
      <span
        className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em]"
        style={{
          color: connected ? 'var(--color-success)' : 'var(--color-danger)',
        }}
      >
        {connected ? 'Live' : 'Reconnecting'}
      </span>
    </div>
  );
}
