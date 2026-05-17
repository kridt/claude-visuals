'use client';

import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';

interface Props {
  children: ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  htmlSize?: [number, number];
  distanceFactor?: number;
  accent?: number;
}

export function BottomStrip({
  children,
  position = [0, 0.1, -1.6],
  rotation = [-0.3, 0, 0],
  width = 6.0,
  height = 1.0,
  htmlSize = [840, 120],
  distanceFactor = 1.0,
  accent = 0x9b7ce0,
}: Props) {
  const backplaneRef = useRef<THREE.MeshBasicMaterial>(null);
  const borderTopRef = useRef<THREE.MeshBasicMaterial>(null);

  const accentColor = useMemo(() => new THREE.Color(accent), [accent]);

  const borderPoints = useMemo(() => {
    const hw = width / 2;
    const hh = height / 2;
    return [
      new THREE.Vector3(-hw, hh, 0),
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(-hw, hh, 0),
    ];
  }, [width, height]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (backplaneRef.current) {
      backplaneRef.current.opacity = 0.28 + Math.sin(t * 0.6) * 0.02;
    }
    if (borderTopRef.current) {
      borderTopRef.current.opacity = 0.55 + Math.sin(t * 1.1) * 0.2;
    }
  });

  const hh = height / 2;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={backplaneRef}
          color={'#0d0820'}
          transparent
          opacity={0.3}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <Line
        points={borderPoints}
        color={accent}
        lineWidth={1.0}
        transparent
        opacity={0.3}
      />

      <mesh position={[0, hh - 0.015, 0]}>
        <planeGeometry args={[width, 0.03]} />
        <meshBasicMaterial
          ref={borderTopRef}
          color={accentColor}
          transparent
          opacity={0.75}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <Html
        transform
        occlude
        distanceFactor={distanceFactor}
        position={[0, 0, 0.01]}
        zIndexRange={[10, 0]}
        style={{
          width: `${htmlSize[0]}px`,
          height: `${htmlSize[1]}px`,
          pointerEvents: 'auto',
        }}
      >
        {children}
      </Html>
    </group>
  );
}
