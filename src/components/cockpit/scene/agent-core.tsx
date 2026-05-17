'use client';

import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import { useMemo, useRef, type ComponentRef } from 'react';
import * as THREE from 'three';
import type { ToolCategory } from '@/lib/events/schema';
import { STATUS_COLOR, TOOL_COLOR, type SceneStatus } from './tool-color';

interface Props {
  status: SceneStatus;
  toolCategory: ToolCategory | undefined;
  pulseKey: number;
}

function targetColor(
  status: SceneStatus,
  toolCategory: ToolCategory | undefined,
): number {
  if (status === 'running_tool' && toolCategory) {
    return TOOL_COLOR[toolCategory];
  }
  return STATUS_COLOR[status];
}

export function AgentCore({ status, toolCategory, pulseKey }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<ComponentRef<typeof MeshDistortMaterial>>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const currentColor = useMemo(() => new THREE.Color(STATUS_COLOR.idle), []);
  const targetColorObj = useMemo(() => new THREE.Color(STATUS_COLOR.idle), []);
  const pulseRef = useRef<{ active: boolean; t: number; key: number }>({
    active: false,
    t: 0,
    key: pulseKey,
  });

  if (pulseRef.current.key !== pulseKey) {
    pulseRef.current.key = pulseKey;
    pulseRef.current.active = true;
    pulseRef.current.t = 0;
  }

  useFrame((_, delta) => {
    targetColorObj.setHex(targetColor(status, toolCategory));
    currentColor.lerp(targetColorObj, Math.min(1, delta * 3.5));

    if (matRef.current) {
      matRef.current.color.copy(currentColor);
      matRef.current.emissive.copy(currentColor);
      const baseEmissive = status === 'idle' ? 0.55 : 0.85;
      matRef.current.emissiveIntensity = baseEmissive;
    }
    if (lightRef.current) {
      lightRef.current.color.copy(currentColor);
    }

    let pulseScale = 1;
    if (pulseRef.current.active) {
      pulseRef.current.t += delta;
      const dur = 0.4;
      const p = Math.min(1, pulseRef.current.t / dur);
      const eased = Math.sin(p * Math.PI);
      pulseScale = 1 + eased * 0.05;
      if (p >= 1) {
        pulseRef.current.active = false;
      }
    }
    if (groupRef.current) {
      const s = pulseScale;
      groupRef.current.scale.set(s, s, s);
      groupRef.current.rotation.y += delta * 0.12;
      groupRef.current.rotation.x = Math.sin(performance.now() * 0.0003) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <pointLight ref={lightRef} intensity={8} distance={4} decay={2} />
      <mesh>
        <sphereGeometry args={[1.2, 96, 96]} />
        <MeshDistortMaterial
          ref={matRef}
          distort={0.25}
          speed={2.5}
          roughness={0.25}
          metalness={0.15}
          clearcoat={0.6}
          clearcoatRoughness={0.4}
          transmission={0.05}
          ior={1.4}
          emissiveIntensity={0.8}
        />
      </mesh>
      <mesh scale={1.25}>
        <sphereGeometry args={[1.2, 48, 48]} />
        <meshBasicMaterial
          color={currentColor}
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
