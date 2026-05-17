'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Floor: dark plane with a steel-blue grid helper plus a custom shader
 * pass adding concentric range rings and a slow radar sweep.
 *
 * Faint, never showy — the globe is the centerpiece. The floor exists
 * to ground the eye and signal "tactical surface".
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
    float rings = ring * 0.18;

    // Radar sweep: a thick ring whose radius grows from 1 to 8 then resets.
    float sweepR = mod(uTime * 0.9, 7.0) + 1.0;
    float sweep = exp(-pow((r - sweepR) * 1.8, 2.0)) * 0.45;
    // Fade sweep toward the outer edge.
    sweep *= smoothstep(8.5, 5.0, r);

    // Overall radial fade — center is brighter, far edge fades to black.
    float radial = smoothstep(12.0, 1.0, r);

    float intensity = (rings + sweep) * radial;
    vec3 color = uColor * intensity;
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
          m.opacity = 0.35;
        }
      } else {
        mat.transparent = true;
        mat.opacity = 0.35;
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Solid dark plane so the floor reads as a surface, not a void. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[40, 40, 1, 1]} />
        <meshBasicMaterial color={'#0a1220'} />
      </mesh>

      {/* Wireframe grid. */}
      <gridHelper
        ref={gridRef}
        args={[40, 40, '#2a4860', '#13283a']}
        position={[0, 0.001, 0]}
      />

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
        />
      </mesh>
    </group>
  );
}
