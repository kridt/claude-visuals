'use client';

import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import type { BridgeProps } from './bridge';

function BridgeSkeleton() {
  return (
    <div className="fixed inset-0 bg-[var(--color-bg)] flex items-center justify-center">
      <motion.div
        aria-hidden
        className="h-40 w-40 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, color-mix(in oklch, #7c4dff 45%, transparent), transparent 70%)',
          filter: 'blur(12px)',
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.85, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

const BridgeDynamic = dynamic<BridgeProps>(
  () => import('./bridge').then((m) => m.Bridge),
  { ssr: false, loading: () => <BridgeSkeleton /> },
);

export function BridgeLoader(props: BridgeProps) {
  return <BridgeDynamic {...props} />;
}
