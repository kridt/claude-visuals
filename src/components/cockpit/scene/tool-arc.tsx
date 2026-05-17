'use client';

import { useFrame } from '@react-three/fiber';
import { QuadraticBezierLine } from '@react-three/drei';
import { useMemo, useRef, type Ref } from 'react';
import * as THREE from 'three';
import type { ToolCategory } from '@/lib/events/schema';
import { TOOL_COLOR } from './tool-color';

interface Props {
  id: string;
  toolCategory: ToolCategory;
  bornAt: number;
  doneAt: number | null;
}

interface BezierRef {
  material: THREE.Material & {
    opacity?: number;
    dashOffset?: number;
    needsUpdate?: boolean;
  };
}

function seededEndpoint(seed: string): THREE.Vector3 {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r1 = ((h >>> 0) / 0xffffffff);
  const r2 = (((h * 16807) >>> 0) / 0xffffffff);
  const r3 = (((h * 48271) >>> 0) / 0xffffffff);
  const theta = r1 * Math.PI * 2;
  const phi = Math.acos(2 * r2 - 1);
  const r = 2.8 + r3 * 0.6;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi) * 0.55,
    r * Math.sin(phi) * Math.sin(theta),
  );
}

export function ToolArc({ id, toolCategory, bornAt, doneAt }: Props) {
  const colorHex = TOOL_COLOR[toolCategory];

  const endpoint = useMemo(() => seededEndpoint(id), [id]);
  const midpoint = useMemo(() => {
    const mid = endpoint.clone().multiplyScalar(0.55);
    mid.y += 0.8;
    return mid;
  }, [endpoint]);

  const lineRef = useRef<unknown>(null);
  const tipRef = useRef<THREE.Mesh>(null);
  const tipMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const completionRef = useRef<number | null>(doneAt);
  if (completionRef.current !== doneAt) {
    completionRef.current = doneAt;
  }

  useFrame((state) => {
    const ref = lineRef.current as BezierRef | null;
    if (!ref?.material) return;
    const mat = ref.material;

    const ageMs = performance.now() - bornAt;
    const spawnP = Math.min(1, ageMs / 280);

    let opacity = 0.55 * spawnP;

    if (completionRef.current !== null) {
      const since = performance.now() - completionRef.current;
      if (since < 200) {
        const p = since / 200;
        opacity = 0.55 + (1 - 0.55) * (1 - Math.abs(p - 0.5) * 2);
      } else {
        const fade = Math.min(1, (since - 200) / 800);
        opacity = 0.85 * (1 - fade);
      }
    }

    mat.opacity = opacity;
    if ('dashOffset' in mat && typeof mat.dashOffset === 'number') {
      mat.dashOffset = -state.clock.elapsedTime * 0.6;
    }

    if (tipRef.current && tipMatRef.current) {
      tipRef.current.position.copy(endpoint);
      tipMatRef.current.opacity = opacity;
      const s = 0.06 + Math.sin(state.clock.elapsedTime * 4 + ageMs * 0.001) * 0.015;
      tipRef.current.scale.setScalar(Math.max(0.04, s));
    }
  });

  return (
    <group>
      <QuadraticBezierLine
        ref={lineRef as Ref<never>}
        start={[0, 0, 0]}
        end={[endpoint.x, endpoint.y, endpoint.z]}
        mid={[midpoint.x, midpoint.y, midpoint.z]}
        color={colorHex}
        lineWidth={1.5}
        dashed
        dashScale={8}
        dashSize={0.5}
        gapSize={0.25}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
      <mesh ref={tipRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          ref={tipMatRef}
          color={colorHex}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
