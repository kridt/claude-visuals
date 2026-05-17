'use client';

import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

/**
 * Sparse high-orbit starfield. Different from the bridge — less stars,
 * desaturated, very slow rotation so the camera doesn't feel weightless.
 */
export function StarBackdrop() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.0008;
    }
  });

  return (
    <group ref={groupRef}>
      <Stars
        radius={50}
        depth={25}
        count={2500}
        factor={3}
        fade
        saturation={0}
        speed={0.2}
      />
    </group>
  );
}
