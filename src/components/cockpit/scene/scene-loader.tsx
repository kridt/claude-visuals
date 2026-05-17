'use client';

import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import type { AgentSceneProps } from './agent-scene';

function SceneSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        aria-hidden
        className="h-32 w-32 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, color-mix(in oklch, #7c4dff 35%, transparent), transparent 70%)',
          filter: 'blur(10px)',
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

const AgentSceneDynamic = dynamic<AgentSceneProps>(
  () => import('./agent-scene').then((m) => m.AgentScene),
  { ssr: false, loading: () => <SceneSkeleton /> },
);

export function SceneLoader(props: AgentSceneProps) {
  return <AgentSceneDynamic {...props} />;
}
