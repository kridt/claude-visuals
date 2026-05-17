'use client';

import { useFrame } from '@react-three/fiber';

/**
 * Surveillance-camera sway. Slow side-to-side drift around the globe so
 * the scene never feels frozen, but never distracts either.
 */
export function CameraRig() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.08) * 0.15;
    state.camera.position.y = 2.2 + Math.sin(t * 0.12) * 0.05;
    state.camera.lookAt(0, 1.5, 0);
  });
  return null;
}
