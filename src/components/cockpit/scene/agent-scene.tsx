'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ToolCategory } from '@/lib/events/schema';
import { AgentCore } from './agent-core';
import { Particles } from './particles';
import { SubagentSatellite } from './subagent-satellite';
import { ToolArc } from './tool-arc';
import type { SceneStatus } from './tool-color';
import type {
  SubagentDescriptor,
  ToolArcDescriptor,
} from './use-scene-state';

export interface AgentSceneProps {
  status: SceneStatus;
  toolCategory: ToolCategory | undefined;
  subagents: SubagentDescriptor[];
  toolArcs: ToolArcDescriptor[];
}

function CameraRig() {
  const { camera } = useThree();
  const tRef = useRef<number>(0);

  useFrame((_, delta) => {
    tRef.current += delta;
    const t = tRef.current;
    const radius = 6;
    const angle = t * 0.05;
    camera.position.x = Math.sin(angle) * radius;
    camera.position.z = Math.cos(angle) * radius;
    camera.position.y = 1.2 + Math.sin(t * 0.18) * 0.18;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export function AgentScene({
  status,
  toolCategory,
  subagents,
  toolArcs,
}: AgentSceneProps) {
  const aliveSubagentIds = useMemo(
    () => new Set(subagents.map((s) => s.id)),
    [subagents],
  );

  const pulseKey = toolArcs.length;

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 1.2, 6], fov: 45, near: 0.1, far: 100 }}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(0x000000), 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <CameraRig />

      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 2]} intensity={0.5} />

      <Particles count={600} radius={8} />

      <AgentCore
        status={status}
        toolCategory={toolCategory}
        pulseKey={pulseKey}
      />

      {subagents.map((s, i) => (
        <SubagentSatellite
          key={s.id}
          index={i}
          total={subagents.length}
          bornAt={s.bornAt}
          toolCategory={s.toolCategory}
          alive={aliveSubagentIds.has(s.id)}
        />
      ))}

      {toolArcs.map((arc) => (
        <ToolArc
          key={arc.id}
          id={arc.id}
          toolCategory={arc.toolCategory}
          bornAt={arc.bornAt}
          doneAt={arc.doneAt}
        />
      ))}

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.6}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
      </EffectComposer>
    </Canvas>
  );
}

export default AgentScene;
