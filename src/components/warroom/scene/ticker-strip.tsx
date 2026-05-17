'use client';

import { Html, Line, RoundedBox } from '@react-three/drei';
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
 * Slim tilted strip at the front of the war room. Chamfered backplate
 * with a bloomed cyan top rail. Houses a scrolling tool-ops ticker
 * rendered as HTML.
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

  // HDR cyan for the bloom-friendly border.
  const hdrCyan = useMemo(() => new THREE.Color(0.8, 3.5, 5), []);

  return (
    <group position={position} rotation={rotation}>
      {/* Chamfered PBR backplate. */}
      <RoundedBox
        args={[width, height, 0.04]}
        radius={0.02}
        smoothness={3}
        position={[0, 0, -0.025]}
      >
        <meshPhysicalMaterial
          color={'#0a121e'}
          metalness={0.7}
          roughness={0.4}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
          envMapIntensity={0.8}
        />
      </RoundedBox>

      {/* Thin cyan border. */}
      <Line
        points={borderPoints}
        color={hdrCyan}
        lineWidth={1.2}
        transparent
        opacity={0.85}
        toneMapped={false}
      />

      {/* Top rail — HDR cyan accent that the post-bloom hugs. */}
      <mesh position={[0, hh - 0.012, 0.002]}>
        <planeGeometry args={[width, 0.022]} />
        <meshBasicMaterial color={[1, 5, 7]} toneMapped={false} />
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
