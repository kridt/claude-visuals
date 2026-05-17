'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Floor: PBR-reflective plane (bounces IBL/Lightformers for that
 * wet-bunker look) with a steel-blue grid helper and a custom shader
 * pass adding concentric range rings and a slow radar sweep.
 */

const FLOOR_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FLOOR_FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  uniform float uTime;
  uniform vec3 uColor;

  void main() {
    // Distance from origin in world XZ plane.
    float r = length(vWorldPos.xz);

    // Soft concentric rings every 1.0 world unit. Anti-aliased band.
    float ringPhase = fract(r);
    float ring = smoothstep(0.96, 1.0, ringPhase) + smoothstep(0.0, 0.04, ringPhase) * (1.0 - step(0.04, ringPhase));
    float rings = ring * 0.35;

    // Radar sweep: a thick ring whose radius grows from 1 to 8 then resets.
    float sweepR = mod(uTime * 0.9, 7.0) + 1.0;
    float sweep = exp(-pow((r - sweepR) * 1.8, 2.0)) * 0.9;
    sweep *= smoothstep(8.5, 5.0, r);

    // Overall radial fade — center is brighter, far edge fades to black.
    float radial = smoothstep(12.0, 1.0, r);

    float intensity = (rings + sweep) * radial;
    // HDR scale so bloom catches the rings and sweep.
    vec3 color = uColor * intensity * 1.6;
    float alpha = intensity * 0.85;
    gl_FragColor = vec4(color, alpha);
  }
`;

export function TacticalFloor() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const gridRef = useRef<THREE.GridHelper>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#7cd2ea') },
    }),
    [],
  );

  // Build a custom grid where the bright (main) lines are HDR cyan so
  // bloom picks them up. GridHelper uses a vertex-color material and
  // there's no clean way to set toneMapped via JSX, so we configure
  // both materials in a layout-effect after mount.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const apply = (m: THREE.LineBasicMaterial) => {
      m.transparent = true;
      m.opacity = 0.55;
      m.toneMapped = false;
      m.vertexColors = true;
    };
    const mat = grid.material;
    if (Array.isArray(mat)) {
      for (const m of mat) apply(m as THREE.LineBasicMaterial);
    } else {
      apply(mat as THREE.LineBasicMaterial);
    }
  }, []);

  useFrame((_, delta) => {
    if (matRef.current) {
      const t = matRef.current.uniforms.uTime;
      if (t) t.value += delta;
    }
  });

  // HDR colors for the grid helper. GridHelper's first color is for the
  // main axes/cross, the second is for the rest. We push the main color
  // past 1.0 to make it bloom.
  const gridArgs = useMemo<[number, number, THREE.Color, THREE.Color]>(
    () => [
      40,
      40,
      new THREE.Color(0.4, 1.6, 2.4),
      new THREE.Color('#13283a'),
    ],
    [],
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Polished tactical-bunker floor. PBR plane that bounces the
          lightformers for cinematic specular streaks. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40, 1, 1]} />
        <meshPhysicalMaterial
          color={'#040a16'}
          metalness={0.85}
          roughness={0.4}
          envMapIntensity={0.6}
        />
      </mesh>

      {/* Wireframe grid. */}
      <gridHelper ref={gridRef} args={gridArgs} position={[0, 0.001, 0]} />

      {/* Range rings + radar sweep shader plane on top of the grid. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[40, 40, 1, 1]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={FLOOR_VERT}
          fragmentShader={FLOOR_FRAG}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
