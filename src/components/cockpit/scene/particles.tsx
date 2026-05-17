'use client';

import { useFrame } from '@react-three/fiber';
import { PointMaterial, Points } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  count?: number;
  radius?: number;
}

export function Particles({ count = 600, radius = 8 }: Props) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * (0.4 + Math.random() * 0.6);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi) * 0.55;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, [count, radius]);

  const velocities = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 0.03;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.015;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const attr = geo.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;
    if (!attr) return;
    const arr = attr.array as Float32Array;
    const limit = radius * 1.2;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;
      const vx = velocities[ix] ?? 0;
      const vy = velocities[iy] ?? 0;
      const vz = velocities[iz] ?? 0;
      const px = (arr[ix] ?? 0) + vx * delta * 16;
      const py = (arr[iy] ?? 0) + vy * delta * 16;
      const pz = (arr[iz] ?? 0) + vz * delta * 16;

      const d2 = px * px + py * py + pz * pz;
      if (d2 > limit * limit) {
        const r = radius * (0.3 + Math.random() * 0.3);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        arr[ix] = r * Math.sin(phi) * Math.cos(theta);
        arr[iy] = r * Math.cos(phi) * 0.55;
        arr[iz] = r * Math.sin(phi) * Math.sin(theta);
      } else {
        arr[ix] = px;
        arr[iy] = py;
        arr[iz] = pz;
      }
    }
    attr.needsUpdate = true;
    pointsRef.current.rotation.y += delta * 0.02;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.4}
        depthWrite={false}
        color={0xb084f3}
      />
    </Points>
  );
}
