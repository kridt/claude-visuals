'use client';

import { Html, Line, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';

export interface HolopanelFrameProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  label: string;
  accent?: number;
  htmlSize?: [number, number];
  distanceFactor?: number;
  children: ReactNode;
}

interface BracketProps {
  position: [number, number, number];
  rotation: [number, number, number];
  size: number;
  color: number;
}

function Bracket({ position, rotation, size, color }: BracketProps) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[size, 0.03, 0.02]} />
        <meshBasicMaterial ref={matRef} color={color} toneMapped={false} />
      </mesh>
      <mesh position={[-size / 2 + 0.015, -size / 2 + 0.015, 0]}>
        <boxGeometry args={[0.03, size, 0.02]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function HolopanelFrame({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  label,
  accent = 0x9b7ce0,
  htmlSize,
  distanceFactor = 1.4,
  children,
}: HolopanelFrameProps) {
  const groupRef = useRef<THREE.Group>(null);
  const backplaneMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const borderTopMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const borderBotMatRef = useRef<THREE.MeshBasicMaterial>(null);

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

  const bracketSize = Math.min(width, height) * 0.18;
  const hw = width / 2;
  const hh = height / 2;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.6 + Math.sin(t * 1.2) * 0.25;

    if (backplaneMatRef.current) {
      backplaneMatRef.current.opacity = 0.32 + Math.sin(t * 0.7) * 0.03;
    }
    if (borderTopMatRef.current) {
      borderTopMatRef.current.opacity = pulse;
    }
    if (borderBotMatRef.current) {
      borderBotMatRef.current.opacity = pulse;
    }
  });

  const htmlW = htmlSize?.[0] ?? 360;
  const htmlH = htmlSize?.[1] ?? 520;

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={backplaneMatRef}
          color={'#0d0820'}
          transparent
          opacity={0.32}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <Line
        points={borderPoints}
        color={accent}
        lineWidth={1.2}
        transparent
        opacity={0.35}
      />

      <mesh position={[0, hh - 0.02, 0]}>
        <planeGeometry args={[width, 0.04]} />
        <meshBasicMaterial
          ref={borderTopMatRef}
          color={accentColor}
          transparent
          opacity={0.85}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -hh + 0.02, 0]}>
        <planeGeometry args={[width, 0.04]} />
        <meshBasicMaterial
          ref={borderBotMatRef}
          color={accentColor}
          transparent
          opacity={0.85}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <Bracket
        position={[-hw + bracketSize / 2, hh - bracketSize / 2, 0.01]}
        rotation={[0, 0, 0]}
        size={bracketSize}
        color={accent}
      />
      <Bracket
        position={[hw - bracketSize / 2, hh - bracketSize / 2, 0.01]}
        rotation={[0, 0, -Math.PI / 2]}
        size={bracketSize}
        color={accent}
      />
      <Bracket
        position={[hw - bracketSize / 2, -hh + bracketSize / 2, 0.01]}
        rotation={[0, 0, Math.PI]}
        size={bracketSize}
        color={accent}
      />
      <Bracket
        position={[-hw + bracketSize / 2, -hh + bracketSize / 2, 0.01]}
        rotation={[0, 0, Math.PI / 2]}
        size={bracketSize}
        color={accent}
      />

      <Text
        position={[0, hh + 0.18, 0.01]}
        fontSize={0.13}
        color={accent}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        outlineWidth={0.002}
        outlineColor={'#000000'}
      >
        {label}
      </Text>

      <Html
        transform
        occlude
        distanceFactor={distanceFactor}
        position={[0, 0, 0.01]}
        zIndexRange={[10, 0]}
        style={{
          width: `${htmlW}px`,
          height: `${htmlH}px`,
          pointerEvents: 'auto',
        }}
      >
        {children}
      </Html>
    </group>
  );
}
