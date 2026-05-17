'use client';

import { Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
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

function buildOrbitSegmentGeometry(
  radius: number,
  segments = 96,
): THREE.BufferGeometry {
  // lineSegments wants pairs (a,b)(b,c)(c,d)… — emit them explicitly.
  const positions = new Float32Array(segments * 2 * 3);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const b = ((i + 1) / segments) * Math.PI * 2;
    const o = i * 6;
    positions[o + 0] = Math.cos(a) * radius;
    positions[o + 1] = 0;
    positions[o + 2] = Math.sin(a) * radius;
    positions[o + 3] = Math.cos(b) * radius;
    positions[o + 4] = 0;
    positions[o + 5] = Math.sin(b) * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geo;
}

const HALO_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPos = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const HALO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 V = normalize(vViewPos);
    float fres = pow(1.0 - max(dot(V, vNormal), 0.0), 2.0);
    gl_FragColor = vec4(uColor * fres * 1.8, fres * uOpacity);
  }
`;

export function SubagentSatellite({
  index,
  bornAt,
  toolCategory,
  alive,
}: Props) {
  const planeRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const radius = 2.4 + (index % 4) * 0.35;
  const speed = 0.35 + ((index * 0.13) % 0.6);
  const phase = (index * GOLDEN_ANGLE) % (Math.PI * 2);
  const tiltX = ((index * GOLDEN_ANGLE) % Math.PI) - Math.PI / 2;
  const tiltZ = ((index * GOLDEN_ANGLE * 1.7) % Math.PI) - Math.PI / 2;

  const orbitGeometry = useMemo(
    () => buildOrbitSegmentGeometry(radius),
    [radius],
  );
  const colorHex = TOOL_COLOR[toolCategory];
  const color = useMemo(() => new THREE.Color(colorHex), [colorHex]);
  const targetColor = useMemo(() => new THREE.Color(colorHex), [colorHex]);

  const haloUniforms = useRef({
    uColor: { value: new THREE.Color(colorHex) },
    uOpacity: { value: 1 },
  });

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
    haloUniforms.current.uColor.value.copy(color);

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
    haloUniforms.current.uOpacity.value = deathOpacity;
  });

  return (
    <group ref={planeRef}>
      <lineSegments geometry={orbitGeometry}>
        <lineBasicMaterial
          color={colorHex}
          toneMapped={false}
          transparent
          opacity={0.55}
        />
      </lineSegments>
      <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.35}>
        <group ref={bodyRef}>
          <mesh>
            <sphereGeometry args={[0.35, 64, 64]} />
            <meshStandardMaterial
              ref={matRef}
              emissiveIntensity={2.5}
              roughness={0.3}
              metalness={0.1}
              toneMapped={false}
            />
          </mesh>
          {/* Fresnel halo replaces the flat opacity sphere — additive + bloom = soft glow */}
          <mesh scale={1.25}>
            <sphereGeometry args={[0.35, 32, 32]} />
            <shaderMaterial
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              vertexShader={HALO_VERT}
              fragmentShader={HALO_FRAG}
              uniforms={haloUniforms.current}
            />
          </mesh>
          <pointLight color={colorHex} intensity={1.6} distance={2} decay={2} />
        </group>
      </Float>
    </group>
  );
}
