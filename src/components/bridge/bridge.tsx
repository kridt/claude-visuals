'use client';

import { Canvas } from '@react-three/fiber';
import { type ReactNode } from 'react';
import * as THREE from 'three';
import type { AgentSceneProps } from '@/components/cockpit/scene/agent-scene';
import { AgentCoreGroup } from './scene/agent-core-group';
import { BottomStrip } from './scene/bottom-strip';
import { CameraRig } from './scene/camera-rig';
import { FloorGrid } from './scene/floor-grid';
import { HolopanelFrame } from './scene/holopanel-frame';
import { PostEffects } from './scene/post-effects';
import { StarField } from './scene/star-field';

export interface BridgeProps {
  topHud: ReactNode;
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  bottomStrip: ReactNode;
  sceneState: AgentSceneProps;
}

export function Bridge({
  topHud,
  leftPanel,
  centerPanel,
  rightPanel,
  bottomStrip,
  sceneState,
}: BridgeProps) {
  return (
    <div className="fixed inset-0 bg-[var(--color-bg)] overflow-hidden">
      <Canvas
        dpr={[1, 1.5]}
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 1.6, 0], fov: 55, near: 0.1, far: 50 }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <color attach="background" args={['#0a0814']} />
        <fog attach="fog" args={['#0a0814', 8, 24]} />

        <ambientLight intensity={0.2} />
        <directionalLight position={[0, 6, -4]} intensity={0.35} color={'#b084f3'} />

        <CameraRig />

        <StarField />
        <FloorGrid />

        <HolopanelFrame
          position={[-3.4, 1.4, -2.4]}
          rotation={[0, 0.35, 0]}
          width={2.8}
          height={4.0}
          label="SESSIONS"
          accent={0x7cd2ea}
          htmlSize={[360, 520]}
          distanceFactor={1.4}
        >
          {leftPanel}
        </HolopanelFrame>

        <HolopanelFrame
          position={[0, 1.5, -3.2]}
          rotation={[0, 0, 0]}
          width={3.6}
          height={4.2}
          label="MISSION CONTROL"
          accent={0xb084f3}
          htmlSize={[440, 600]}
          distanceFactor={1.4}
        >
          {centerPanel}
        </HolopanelFrame>

        <HolopanelFrame
          position={[3.4, 1.4, -2.4]}
          rotation={[0, -0.35, 0]}
          width={2.8}
          height={4.0}
          label="TELEMETRY"
          accent={0xc875f5}
          htmlSize={[360, 520]}
          distanceFactor={1.4}
        >
          {rightPanel}
        </HolopanelFrame>

        <BottomStrip>{bottomStrip}</BottomStrip>

        <AgentCoreGroup
          sceneState={sceneState}
          position={[0, 1.0, -1.8]}
          scale={0.32}
        />

        <PostEffects />
      </Canvas>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{ pointerEvents: 'none' }}
      >
        <div className="pointer-events-auto">{topHud}</div>
      </div>
    </div>
  );
}

export default Bridge;
