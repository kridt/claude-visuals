'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  connected: boolean;
  sessionCount: number;
  activeCount: number;
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
        <radialGradient id="logo-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.86 0.14 290)" />
          <stop offset="100%" stopColor="oklch(0.55 0.2 290)" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="14" fill="url(#logo-g)" />
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
  const [now, setNow] = useState<string>('');
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
    <span className="font-mono text-[12px] tracking-[0.2em] text-[var(--color-text-muted)] tabular-nums">
      {now}
    </span>
  );
}

export function Header({ connected, sessionCount, activeCount }: Props) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text)]">
              Claude Visuals
            </span>
            <span className="text-[10.5px] uppercase tracking-[0.32em] text-[var(--color-text-dim)]">
              Live Cockpit
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-2 md:flex">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-dim)]">
              Sessions
            </span>
            <span className="font-mono text-[14px] tabular-nums text-[var(--color-text)]">
              {sessionCount}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-dim)]">
              · Active
            </span>
            <span className="font-mono text-[14px] tabular-nums text-[var(--color-success)]">
              {activeCount}
            </span>
          </div>

          <div
            className={cn(
              'inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5',
              'transition-colors duration-300',
            )}
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
                animate={{
                  opacity: [0.55, 0, 0.55],
                  scale: [1, 2.4, 1],
                }}
                transition={{
                  duration: connected ? 1.8 : 2.6,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            </span>
            <span
              className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em]"
              style={{
                color: connected
                  ? 'var(--color-success)'
                  : 'var(--color-danger)',
              }}
            >
              {connected ? 'Streaming' : 'Reconnecting'}
            </span>
          </div>

          <Clock />
        </div>
      </div>

      <div
        className="h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, transparent, color-mix(in oklch, var(--color-accent) 55%, transparent) 50%, transparent)',
        }}
      />
    </div>
  );
}
