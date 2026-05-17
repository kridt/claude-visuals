'use client';

import { Sparkles, Stars } from '@react-three/drei';
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
      {/* Far layer: dense pinpoints behind everything */}
      <Stars
        radius={60}
        depth={30}
        count={2400}
        factor={3}
        fade
        saturation={0}
        speed={0.2}
      />
      {/* Near layer: fewer but bigger, slight blue cast */}
      <Stars
        radius={28}
        depth={12}
        count={900}
        factor={5}
        fade
        saturation={0.3}
        speed={0.45}
      />
      {/* Animated near-field twinkle that catches bloom */}
      <Sparkles
        count={60}
        scale={30}
        size={3}
        speed={0.15}
        color="#88aaff"
      />
    </group>
  );
}
