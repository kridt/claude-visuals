'use client';

import { Html, Line } from '@react-three/drei';
import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';

export interface TickerStripProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  pixelW: number;
  pixelH: number;
  children: ReactNode;
}

/**
 * Slim tilted strip at the front of the war room. Houses a scrolling
 * tool-ops ticker rendered as HTML.
 */
export function TickerStrip({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  pixelW,
  pixelH,
  children,
}: TickerStripProps) {
  const hw = width / 2;
  const hh = height / 2;

  const borderPoints = useMemo(
    () => [
      new THREE.Vector3(-hw, hh, 0),
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(-hw, hh, 0),
    ],
    [hw, hh],
  );

  return (
    <group position={position} rotation={rotation}>
      {/* Semi-opaque backplane. */}
      <mesh position={[0, 0, -0.015]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={'#0a1626'}
          transparent
          opacity={0.88}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Thin cyan border. */}
      <Line
        points={borderPoints}
        color={'#7cd2ea'}
        lineWidth={1.2}
        transparent
        opacity={0.7}
      />

      {/* Top rail — slightly brighter accent. */}
      <mesh position={[0, hh - 0.012, -0.005]}>
        <planeGeometry args={[width, 0.022]} />
        <meshBasicMaterial color={'#7cd2ea'} toneMapped={false} />
      </mesh>

      <Html
        transform
        occlude
        distanceFactor={1.4}
        position={[0, 0, 0.01]}
        zIndexRange={[10, 0]}
        style={{
          width: `${pixelW}px`,
          height: `${pixelH}px`,
          pointerEvents: 'auto',
        }}
      >
        {children}
      </Html>
    </group>
  );
}
