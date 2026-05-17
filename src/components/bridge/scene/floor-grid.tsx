'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const FLOOR_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FLOOR_FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  void main() {
    vec2 uv = vUv;

    float depthFade = smoothstep(0.0, 0.55, 1.0 - uv.y);

    float scan = sin((uv.y * 60.0) + uTime * 1.6);
    scan = smoothstep(0.7, 1.0, scan) * 0.55;

    float pulseY = fract(uTime * 0.06);
    float pulse = exp(-pow((uv.y - pulseY) * 6.0, 2.0)) * 0.5;

    float horizon = smoothstep(0.9, 1.0, uv.y);

    vec3 color = mix(uColorA, uColorB, depthFade);
    // Push horizon glow above 1.0 so bloom threshold catches the band.
    color += uColorB * scan * depthFade * 1.4;
    color += uColorB * pulse * depthFade * 1.4;
    color += uColorB * horizon * 2.6;

    float alpha = depthFade * 0.55 + horizon * 0.7;
    gl_FragColor = vec4(color, alpha);
  }
`;

export function FloorGrid() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const gridRef = useRef<THREE.GridHelper>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color('#1a0f3a') },
      uColorB: { value: new THREE.Color('#7c4dff') },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (matRef.current) {
      const t = matRef.current.uniforms.uTime;
      if (t) t.value += delta;
    }
    if (gridRef.current) {
      const mat = gridRef.current.material as
        | THREE.LineBasicMaterial
        | THREE.LineBasicMaterial[];
      if (Array.isArray(mat)) {
        for (const m of mat) {
          m.transparent = true;
          m.opacity = 0.45;
          m.toneMapped = false;
        }
      } else {
        mat.transparent = true;
        mat.opacity = 0.45;
        mat.toneMapped = false;
      }
    }
  });

  return (
    <group position={[0, -0.05, -10]}>
      {/* Reflective base: catches Environment IBL for the wet-floor look. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[80, 50, 1, 1]} />
        <meshStandardMaterial
          color={'#0a0820'}
          metalness={0.6}
          roughness={0.5}
        />
      </mesh>

      <gridHelper
        ref={gridRef}
        args={[80, 80, '#9b7ce0', '#3a2a72']}
        position={[0, 0, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[80, 50, 1, 1]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={FLOOR_VERT}
          fragmentShader={FLOOR_FRAG}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, 0.4, -20]} rotation={[0, 0, 0]}>
        <planeGeometry args={[60, 0.8, 1, 1]} />
        <meshBasicMaterial
          color={'#b084f3'}
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
