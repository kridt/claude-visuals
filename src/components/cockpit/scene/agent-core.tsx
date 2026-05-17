'use client';

import { MeshDistortMaterial, MeshTransmissionMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ComponentRef } from 'react';
import * as THREE from 'three';
import type { ToolCategory } from '@/lib/events/schema';
import { STATUS_COLOR, TOOL_COLOR, type SceneStatus } from './tool-color';

interface Props {
  status: SceneStatus;
  toolCategory: ToolCategory | undefined;
  pulseKey: number;
  /** Disable the outer transmission shell on low-perf devices. */
  lowPerf?: boolean;
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

const FRESNEL_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPos = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRESNEL_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 V = normalize(vViewPos);
    float fres = pow(1.0 - max(dot(V, vNormal), 0.0), uPower);
    gl_FragColor = vec4(uColor * fres * uIntensity, fres);
  }
`;

export function AgentCore({ status, toolCategory, pulseKey, lowPerf }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<ComponentRef<typeof MeshDistortMaterial>>(null);
  const shellRef = useRef<ComponentRef<typeof MeshTransmissionMaterial>>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const currentColor = useMemo(() => new THREE.Color(STATUS_COLOR.idle), []);
  const targetColorObj = useMemo(() => new THREE.Color(STATUS_COLOR.idle), []);

  const fresnelUniforms = useRef({
    uColor: { value: new THREE.Color(STATUS_COLOR.idle) },
    uPower: { value: 2.4 },
    uIntensity: { value: 1.2 },
  });

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
      matRef.current.emissiveIntensity = 4;
    }
    if (shellRef.current) {
      // MeshTransmissionMaterial exposes color/attenuationColor as Color objects.
      const sm = shellRef.current as unknown as {
        color: THREE.Color;
        attenuationColor: THREE.Color;
      };
      sm.color.copy(currentColor);
      sm.attenuationColor.copy(currentColor);
    }
    if (lightRef.current) {
      lightRef.current.color.copy(currentColor);
    }
    fresnelUniforms.current.uColor.value.copy(currentColor);

    let pulseScale = 1;
    let pulseIntensity = 1.2;
    if (pulseRef.current.active) {
      pulseRef.current.t += delta;
      const dur = 0.4;
      const p = Math.min(1, pulseRef.current.t / dur);
      const eased = Math.sin(p * Math.PI);
      pulseScale = 1 + eased * 0.05;
      pulseIntensity = 1.2 + eased * 0.8;
      if (p >= 1) pulseRef.current.active = false;
    }
    fresnelUniforms.current.uIntensity.value = pulseIntensity;

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

      {/* Inner: emissive plasma core. emissiveIntensity 4 + toneMapped=false → bloom magnet. */}
      <mesh>
        <icosahedronGeometry args={[0.7, 32]} />
        <MeshDistortMaterial
          ref={matRef}
          distort={0.35}
          speed={2}
          roughness={0.2}
          metalness={0}
          emissiveIntensity={4}
          toneMapped={false}
        />
      </mesh>

      {/* Middle: fresnel rim — additive blend so it stacks with bloom without hiding the core. */}
      <mesh>
        <icosahedronGeometry args={[0.9, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={FRESNEL_VERT}
          fragmentShader={FRESNEL_FRAG}
          uniforms={fresnelUniforms.current}
        />
      </mesh>

      {/* Outer: refractive shell. Skip on low-perf to drop one render target pass. */}
      {!lowPerf && (
        <mesh>
          <sphereGeometry args={[1.1, 64, 64]} />
          <MeshTransmissionMaterial
            ref={shellRef}
            backside
            transmission={1}
            thickness={0.08}
            roughness={0.25}
            chromaticAberration={0.06}
            ior={1.4}
            samples={4}
            resolution={128}
            transmissionSampler
            attenuationDistance={1.5}
          />
        </mesh>
      )}
    </group>
  );
}
