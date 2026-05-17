'use client';

import { useFrame } from '@react-three/fiber';
import { Float, Line } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ToolCategory } from '@/lib/events/schema';
import { TOOL_COLOR } from './tool-color';

interface Props {
  index: number;
  total: number;
  bornAt: number;
  toolCategory: ToolCategory;
  alive: boolean;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function buildOrbitPoints(radius: number, segments = 96): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return pts;
}

export function SubagentSatellite({
  index,
  bornAt,
  toolCategory,
  alive,
}: Props) {
  const planeRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const haloRef = useRef<THREE.MeshBasicMaterial>(null);

  const radius = 2.4 + (index % 4) * 0.35;
  const speed = 0.35 + ((index * 0.13) % 0.6);
  const phase = (index * GOLDEN_ANGLE) % (Math.PI * 2);
  const tiltX = ((index * GOLDEN_ANGLE) % Math.PI) - Math.PI / 2;
  const tiltZ = ((index * GOLDEN_ANGLE * 1.7) % Math.PI) - Math.PI / 2;

  const orbitPoints = useMemo(() => buildOrbitPoints(radius), [radius]);
  const colorHex = TOOL_COLOR[toolCategory];
  const color = useMemo(() => new THREE.Color(colorHex), [colorHex]);
  const targetColor = useMemo(() => new THREE.Color(colorHex), [colorHex]);

  const aliveSinceRef = useRef<number>(bornAt);
  const dyingSinceRef = useRef<number | null>(null);
  const aliveRef = useRef<boolean>(alive);

  if (aliveRef.current !== alive) {
    aliveRef.current = alive;
    if (!alive) dyingSinceRef.current = performance.now();
    else dyingSinceRef.current = null;
  }

  useFrame((state, delta) => {
    if (!planeRef.current || !bodyRef.current) return;

    targetColor.setHex(colorHex);
    color.lerp(targetColor, Math.min(1, delta * 4));
    if (matRef.current) {
      matRef.current.color.copy(color);
      matRef.current.emissive.copy(color);
    }
    if (haloRef.current) {
      haloRef.current.color.copy(color);
    }

    const t = state.clock.elapsedTime;
    const angle = phase + t * speed;
    bodyRef.current.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    );

    planeRef.current.rotation.x = tiltX;
    planeRef.current.rotation.z = tiltZ;
    planeRef.current.rotation.y += delta * 0.02;

    const ageMs = Math.max(0, performance.now() - aliveSinceRef.current);
    const spawnDur = 600;
    let spawnScale = 1;
    if (ageMs < spawnDur) {
      const p = ageMs / spawnDur - 1;
      const overshoot = 1.7;
      const eased =
        p === 0 ? 1 : 1 + p * p * ((overshoot + 1) * p + overshoot);
      spawnScale = Math.max(0, eased);
    }

    let deathScale = 1;
    let deathOpacity = 1;
    if (dyingSinceRef.current !== null) {
      const dyingMs = performance.now() - dyingSinceRef.current;
      const dur = 600;
      const p = Math.min(1, dyingMs / dur);
      deathScale = 1 - p;
      deathOpacity = 1 - p;
    }

    const s = Math.max(0, spawnScale * deathScale);
    bodyRef.current.scale.set(s, s, s);

    if (matRef.current) {
      matRef.current.opacity = deathOpacity;
      matRef.current.transparent = deathOpacity < 1;
    }
    if (haloRef.current) {
      haloRef.current.opacity = 0.18 * deathOpacity;
    }
  });

  return (
    <group ref={planeRef}>
      <Line
        points={orbitPoints}
        color={colorHex}
        lineWidth={0.6}
        dashed
        dashSize={0.18}
        gapSize={0.12}
        transparent
        opacity={0.35}
      />
      <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.35}>
        <group ref={bodyRef}>
          <mesh>
            <sphereGeometry args={[0.35, 32, 32]} />
            <meshStandardMaterial
              ref={matRef}
              emissiveIntensity={1.2}
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
          <mesh scale={1.8}>
            <sphereGeometry args={[0.35, 24, 24]} />
            <meshBasicMaterial
              ref={haloRef}
              transparent
              opacity={0.18}
              depthWrite={false}
            />
          </mesh>
          <pointLight color={colorHex} intensity={1.6} distance={2} decay={2} />
        </group>
      </Float>
    </group>
  );
}
