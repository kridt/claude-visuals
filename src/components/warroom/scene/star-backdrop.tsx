'use client';

import { Sparkles, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

/**
 * Layered starfield: a sparse far field for distance + a denser closer
 * field for parallax. Topped with rare cyan sparkles to suggest particles
 * drifting in the room.
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
        radius={120}
        depth={60}
        count={4000}
        factor={3}
        saturation={0}
        fade
        speed={0.25}
      />
      <Stars
        radius={60}
        depth={30}
        count={1500}
        factor={5}
        saturation={0.4}
        fade
        speed={0.9}
      />
      <Sparkles
        count={50}
        scale={30}
        size={2.5}
        speed={0.12}
        color={'#88ccff'}
      />
    </group>
  );
}
