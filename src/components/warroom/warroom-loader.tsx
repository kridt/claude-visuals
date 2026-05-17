'use client';

import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import type { WarRoomProps } from './warroom';

import '@/app/warroom.css';

/**
 * Skeleton: a slowly pulsing cyan crosshair in the middle of a dark
 * navy field. Visually distinct from the bridge's purple blur.
 */
function WarRoomSkeleton() {
  return (
    <div className="warroom fixed inset-0 flex items-center justify-center bg-[var(--wr-bg)]">
      <motion.div
        aria-hidden
        className="relative"
        style={{ width: 160, height: 160 }}
        animate={{ opacity: [0.35, 0.9, 0.35] }}
        transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '1px solid color-mix(in oklch, var(--wr-accent) 60%, transparent)',
            boxShadow:
              '0 0 24px color-mix(in oklch, var(--wr-accent-glow) 35%, transparent)',
          }}
        />
        {/* Inner ring */}
        <div
          className="absolute rounded-full"
          style={{
            top: 40,
            left: 40,
            right: 40,
            bottom: 40,
            border:
              '1px solid color-mix(in oklch, var(--wr-accent) 80%, transparent)',
          }}
        />
        {/* Crosshair lines */}
        <div
          className="absolute"
          style={{
            top: '50%',
            left: 0,
            right: 0,
            height: 1,
            background:
              'color-mix(in oklch, var(--wr-accent) 70%, transparent)',
            transform: 'translateY(-50%)',
          }}
        />
        <div
          className="absolute"
          style={{
            left: '50%',
            top: 0,
            bottom: 0,
            width: 1,
            background:
              'color-mix(in oklch, var(--wr-accent) 70%, transparent)',
            transform: 'translateX(-50%)',
          }}
        />
        {/* Center dot */}
        <div
          className="absolute rounded-full"
          style={{
            top: '50%',
            left: '50%',
            width: 6,
            height: 6,
            background: 'var(--wr-accent-glow)',
            boxShadow: '0 0 12px var(--wr-accent-glow)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </motion.div>
    </div>
  );
}

const WarRoomDynamic = dynamic<WarRoomProps>(
  () => import('./warroom').then((m) => m.WarRoom),
  { ssr: false, loading: () => <WarRoomSkeleton /> },
);

export function WarRoomLoader(props: WarRoomProps) {
  return <WarRoomDynamic {...props} />;
}
