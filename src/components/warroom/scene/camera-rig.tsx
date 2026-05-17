'use client';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Surveillance-camera drift with mouse parallax. The damping makes the
 * motion feel weighty and intentional rather than twitchy.
 */
export function CameraRig() {
  const { camera, mouse } = useThree();
  useFrame((_, dt) => {
    const t = performance.now();
    const targetX = mouse.x * 0.3 + Math.sin(t * 0.00012) * 0.15;
    const targetY = 2.2 + mouse.y * 0.15 + Math.sin(t * 0.0002) * 0.05;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 1.5, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 1.5, dt);
    camera.lookAt(0, 1.5, 0);
  });
  return null;
}
