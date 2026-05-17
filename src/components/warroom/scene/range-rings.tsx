'use client';

import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

interface RingProps {
  radius: number;
  opacity: number;
  segments?: number;
  color?: string;
}

function Ring({ radius, opacity, segments = 96, color = '#7cd2ea' }: RingProps) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }, [radius, segments]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1.0}
      transparent
      opacity={opacity}
    />
  );
}

/**
 * Static concentric rings on the floor. The outermost ring is dimmest,
 * the innermost is brightest. Visually anchors the globe over the
 * tactical surface.
 */
export function RangeRings() {
  return (
    <group position={[0, 0.012, 0]}>
      <Ring radius={2} opacity={0.55} />
      <Ring radius={4} opacity={0.4} />
      <Ring radius={6} opacity={0.25} />
      <Ring radius={8} opacity={0.15} />
    </group>
  );
}
