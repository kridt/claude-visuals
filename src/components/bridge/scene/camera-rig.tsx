'use client';

import { useFrame } from '@react-three/fiber';

export function CameraRig() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.y = 1.6 + Math.sin(t * 0.3) * 0.04;
    state.camera.position.x = Math.sin(t * 0.15) * 0.06;
    state.camera.position.z = Math.cos(t * 0.11) * 0.03;
    state.camera.lookAt(0, 1.2, -3.0);
  });
  return null;
}
