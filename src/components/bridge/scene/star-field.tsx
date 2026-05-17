'use client';

import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export function StarField() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      <Stars
        radius={40}
        depth={20}
        count={3000}
        factor={4}
        fade
        saturation={0}
        speed={0.3}
      />
    </group>
  );
}
