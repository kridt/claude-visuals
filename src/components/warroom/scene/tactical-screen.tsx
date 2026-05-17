'use client';

import { Html, RoundedBox, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';

export interface TacticalScreenProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  label: string;
  pixelW: number;
  pixelH: number;
  children: ReactNode;
}

/**
 * Corner bracket: an L-shaped tactical marker. Rotation lets us reuse
 * the same geometry at all four corners.
 */
interface BracketProps {
  position: [number, number, number];
  rotation: [number, number, number];
  size: number;
  thickness?: number;
}
function Bracket({ position, rotation, size, thickness = 0.025 }: BracketProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Horizontal arm — extends in +X from the corner anchor. */}
      <mesh position={[size / 2, 0, 0]}>
        <boxGeometry args={[size, thickness, 0.02]} />
        <meshBasicMaterial color={[0.8, 3.5, 5]} toneMapped={false} />
      </mesh>
      {/* Vertical arm — extends in +Y from the corner anchor. */}
      <mesh position={[0, size / 2, 0]}>
        <boxGeometry args={[thickness, size, 0.02]} />
        <meshBasicMaterial color={[0.8, 3.5, 5]} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * CRT-style horizontal scanline material for the screen backplane.
 */
const SCANLINE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SCANLINE_FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uHeight; // world-space height of the plane

  void main() {
    // 220 lines across the whole height, scrolling slowly.
    float lines = sin((vUv.y * uHeight * 220.0) + uTime * 0.6);
    float scan = smoothstep(0.6, 1.0, lines) * 0.04;
    // Soft vertical fade toward the top and bottom edges.
    float edge = smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);
    gl_FragColor = vec4(vec3(0.49, 0.82, 0.92), scan * edge);
  }
`;

/**
 * War-room screen: chamfered PBR backplate, bloomed cyan caption rail,
 * tactical corner brackets, subtle CRT scanlines, and an HTML transform
 * slot.
 */
export function TacticalScreen({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  label,
  pixelW,
  pixelH,
  children,
}: TacticalScreenProps) {
  const groupRef = useRef<THREE.Group>(null);
  const railTopRef = useRef<THREE.MeshBasicMaterial>(null);
  const railBotRef = useRef<THREE.MeshBasicMaterial>(null);
  const scanMatRef = useRef<THREE.ShaderMaterial>(null);

  const hw = width / 2;
  const hh = height / 2;

  const labelBarHeight = 0.18;
  const labelBarY = hh - labelBarHeight / 2;
  const bracketSize = Math.min(width, height) * 0.14;

  const scanUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: height },
    }),
    [height],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.6 + Math.sin(t * 0.8) * 0.2;
    if (railTopRef.current) railTopRef.current.opacity = pulse;
    if (railBotRef.current) railBotRef.current.opacity = pulse;
    if (scanMatRef.current) {
      const u = scanMatRef.current.uniforms.uTime;
      if (u) u.value = t;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Chamfered PBR backplate. */}
      <RoundedBox
        args={[width, height, 0.04]}
        radius={0.02}
        smoothness={3}
        position={[0, 0, -0.03]}
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

      {/* CRT scanline overlay. */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[width, height]} />
        <shaderMaterial
          ref={scanMatRef}
          uniforms={scanUniforms}
          vertexShader={SCANLINE_VERT}
          fragmentShader={SCANLINE_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Top label bar — HDR cyan so bloom hugs it. */}
      <mesh position={[0, labelBarY, 0.002]}>
        <planeGeometry args={[width, labelBarHeight]} />
        <meshBasicMaterial color={[1, 5, 7]} toneMapped={false} />
      </mesh>
      <Text
        position={[-hw + 0.12, labelBarY, 0.008]}
        fontSize={0.085}
        color={'#0a1626'}
        anchorX="left"
        anchorY="middle"
        letterSpacing={0.22}
        fontWeight={'bold'}
      >
        {label}
      </Text>

      {/* Top and bottom accent rails (no side borders). */}
      <mesh position={[0, hh - labelBarHeight - 0.01, 0.002]}>
        <planeGeometry args={[width, 0.018]} />
        <meshBasicMaterial
          ref={railTopRef}
          color={[0.8, 3.5, 5]}
          transparent
          opacity={0.8}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -hh + 0.01, 0.002]}>
        <planeGeometry args={[width, 0.018]} />
        <meshBasicMaterial
          ref={railBotRef}
          color={[0.8, 3.5, 5]}
          transparent
          opacity={0.8}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Corner brackets. Each bracket is anchored at its corner with
          the L pointing inward. */}
      {/* Top-left: arms go right and down */}
      <Bracket
        position={[-hw, hh, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        size={bracketSize}
      />
      {/* Top-right: arms go left and down */}
      <Bracket
        position={[hw, hh, 0]}
        rotation={[0, 0, Math.PI]}
        size={bracketSize}
      />
      {/* Bottom-right: arms go left and up */}
      <Bracket
        position={[hw, -hh, 0]}
        rotation={[0, 0, Math.PI / 2]}
        size={bracketSize}
      />
      {/* Bottom-left: arms go right and up */}
      <Bracket
        position={[-hw, -hh, 0]}
        rotation={[0, 0, 0]}
        size={bracketSize}
      />

      {/* HTML content slot. Offset down by the label bar so the panel's
          available area is the region below the cyan caption. */}
      <Html
        transform
        occlude
        distanceFactor={1.4}
        position={[0, -labelBarHeight / 2, 0.01]}
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
