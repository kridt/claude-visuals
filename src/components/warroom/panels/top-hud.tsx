'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ModeToggle } from './mode-toggle';

export interface WarRoomTopHudProps {
  mode: 'bridge' | 'warroom';
  onModeChange(m: 'bridge' | 'warroom'): void;
  activeCount: number;
  totalCount: number;
  alertCount: number;
  connected: boolean;
  onOpenPalette(): void;
}

function RadarIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="var(--color-accent)"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      <circle
        cx="16"
        cy="16"
        r="9"
        stroke="var(--color-accent)"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <circle
        cx="16"
        cy="16"
        r="5"
        stroke="var(--color-accent)"
        strokeOpacity="0.3"
        strokeWidth="1"
      />
      <line
        x1="16"
        y1="3"
        x2="16"
        y2="29"
        stroke="var(--color-accent)"
        strokeOpacity="0.25"
        strokeWidth="1"
      />
      <line
        x1="3"
        y1="16"
        x2="29"
        y2="16"
        stroke="var(--color-accent)"
        strokeOpacity="0.25"
        strokeWidth="1"
      />
      <motion.line
        x1="16"
        y1="16"
        x2="16"
        y2="3"
        stroke="var(--color-accent-glow)"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{ transformOrigin: '16px 16px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      <circle cx="16" cy="16" r="1.4" fill="var(--color-accent-glow)" />
    </svg>
  );
}

function useClock(): string {
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

function ThreatLevel({
  alerts,
  activeCount,
}: {
  alerts: number;
  activeCount: number;
}) {
  const filled =
    alerts > 0
      ? Math.min(5, 3 + alerts)
      : activeCount === 0
        ? 1
        : activeCount > 4
          ? 3
          : 2;
  const colors = [
    'var(--color-success)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-warning)',
    'var(--color-danger)',
  ];

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="font-mono text-[9px] uppercase tracking-[0.28em]"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Threat
      </span>
      <div className="flex items-center gap-[3px]">
        {colors.map((c, i) => {
          const active = i < filled;
          return (
            <span
              key={i}
              aria-hidden
              className="h-3 w-[10px]"
              style={{
                background: active
                  ? c
                  : 'color-mix(in oklch, var(--color-border) 50%, transparent)',
                boxShadow: active
                  ? `0 0 6px color-mix(in oklch, ${c} 60%, transparent)`
                  : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function ConnectionPill({ connected }: { connected: boolean }) {
  const color = connected ? 'var(--color-success)' : 'var(--color-danger)';
  return (
    <div
      className="inline-flex items-center gap-1.5 border px-2 py-[3px]"
      style={{
        borderColor: `color-mix(in oklch, ${color} 50%, transparent)`,
        background: `color-mix(in oklch, ${color} 10%, transparent)`,
      }}
    >
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
          animate={{ opacity: [0.55, 0, 0.55], scale: [1, 2.2, 1] }}
          transition={{
            duration: connected ? 1.8 : 2.6,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      </span>
      <span
        className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.22em]"
        style={{ color }}
      >
        {connected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}

export function TopHud({
  mode,
  onModeChange,
  activeCount,
  totalCount,
  alertCount,
  connected,
  onOpenPalette,
}: WarRoomTopHudProps) {
  const clock = useClock();

  return (
    <div
      className="relative w-full"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in oklch, var(--color-bg) 85%, transparent), color-mix(in oklch, var(--color-bg) 25%, transparent))',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex items-center justify-between gap-4 px-6 py-2.5">
        <div className="flex items-center gap-3">
          <RadarIcon />
          <div className="flex flex-col leading-none">
            <span
              className="font-mono text-[12px] font-semibold uppercase tracking-[0.36em]"
              style={{ color: 'var(--color-text)' }}
            >
              Tactical Ops
            </span>
            <span
              className="mt-1 font-mono text-[9px] uppercase tracking-[0.4em]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              War Room
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <StatBlock label="Targets" value={totalCount} />
          <Divider />
          <StatBlock
            label="Active"
            value={activeCount}
            highlight={activeCount > 0}
          />
          <Divider />
          <StatBlock
            label="Alert"
            value={alertCount}
            danger={alertCount > 0}
          />
          <Divider />
          <ThreatLevel alerts={alertCount} activeCount={activeCount} />
        </div>

        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[11px] tabular-nums tracking-[0.22em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {clock}
          </span>
          <ConnectionPill connected={connected} />
          <ModeToggle mode={mode} onChange={onModeChange} />
          <button
            type="button"
            onClick={onOpenPalette}
            className="inline-flex items-center gap-1.5 border px-2 py-[3px] transition-colors"
            style={{
              borderColor:
                'color-mix(in oklch, var(--color-accent) 40%, transparent)',
              background:
                'color-mix(in oklch, var(--color-surface) 40%, transparent)',
            }}
            title="Switch target"
          >
            <span
              className="font-mono text-[9.5px] uppercase tracking-[0.24em]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Targets
            </span>
            <span
              className="inline-flex items-center gap-0.5 border px-1 py-px font-mono text-[8.5px]"
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
        aria-hidden
        className="h-[1px] w-full"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, color-mix(in oklch, var(--color-accent) 50%, transparent) 20%, color-mix(in oklch, var(--color-accent-glow) 80%, transparent) 50%, color-mix(in oklch, var(--color-accent) 50%, transparent) 80%, transparent 100%)',
        }}
      />
    </div>
  );
}

function StatBlock({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  danger?: boolean;
}) {
  const color = danger
    ? 'var(--color-danger)'
    : highlight
      ? 'var(--color-success)'
      : 'var(--color-text)';
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="font-mono text-[9px] uppercase tracking-[0.28em]"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {label}
      </span>
      <span
        className="font-mono text-[20px] font-semibold tabular-nums leading-none"
        style={{
          color,
          textShadow: highlight
            ? `0 0 10px color-mix(in oklch, ${color} 60%, transparent)`
            : danger
              ? `0 0 10px color-mix(in oklch, ${color} 60%, transparent)`
              : 'none',
        }}
      >
        {value.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      className="font-mono text-[14px]"
      style={{ color: 'var(--color-text-dim)' }}
    >
      |
    </span>
  );
}
