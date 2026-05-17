'use client';

import { motion } from 'motion/react';

export function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex flex-col items-center gap-5 px-8 py-12 text-center"
      >
        <div className="relative h-32 w-32">
          <motion.div
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor:
                'color-mix(in oklch, var(--color-accent) 35%, transparent)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border-2 border-dashed"
            style={{
              borderColor:
                'color-mix(in oklch, var(--color-accent) 55%, transparent)',
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-10 rounded-full"
            style={{
              background:
                'radial-gradient(circle, var(--color-accent-glow), transparent 70%)',
            }}
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.05, 0.9] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="font-mono text-[14px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text)]">
            Claude Visuals
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
            Listening on ~/.claude/projects/
          </span>
        </div>

        <p className="max-w-md font-mono text-[11.5px] leading-relaxed text-[var(--color-text-dim)]">
          Open a Claude Code session in any project — it&apos;ll appear here
          within a second.
        </p>
      </motion.div>
    </div>
  );
}
