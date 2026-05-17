'use client';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function CameraRig() {
  const { camera, mouse } = useThree();

  useFrame((_, dt) => {
    const t = performance.now();
    // Mouse drives the high-level target; sinusoids add a slow drift.
    const targetX = mouse.x * 0.25 + Math.sin(t * 0.00015) * 0.06;
    const targetY = 1.6 + mouse.y * 0.12 + Math.sin(t * 0.0003) * 0.04;
    // damp() second arg is a "decay rate" — higher = snappier.
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 4, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 4, dt);
    camera.lookAt(0, 1.2, -3.0);
  });

  return null;
}
