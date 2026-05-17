'use client';

import {
  CameraShake,
  ContactShadows,
  Environment,
  Lightformer,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, type ReactNode } from 'react';
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
        dpr={[1, 2]}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        flat
        camera={{ position: [0, 1.6, 0], fov: 55, near: 0.1, far: 50 }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <color attach="background" args={['#070512']} />
        <fog attach="fog" args={['#070512', 10, 32]} />

        {/* IBL — Lightformers act as area lights AND reflect in physical materials */}
        <Environment
          preset="night"
          background={false}
          environmentIntensity={0.45}
        >
          <Lightformer
            form="rect"
            intensity={3}
            color="#88aaff"
            position={[0, 5, -7]}
            scale={[14, 3, 1]}
            target={[0, 1, 0]}
          />
          <Lightformer
            form="rect"
            intensity={2.2}
            color="#c875f5"
            position={[-6, 2, 2]}
            scale={[3, 5, 1]}
            target={[0, 1, 0]}
          />
          <Lightformer
            form="rect"
            intensity={2.2}
            color="#5cc8ff"
            position={[6, 2, 2]}
            scale={[3, 5, 1]}
            target={[0, 1, 0]}
          />
          <Lightformer
            form="ring"
            intensity={4}
            color="#ffffff"
            position={[0, 6, 0]}
            scale={2}
            target={[0, 1, 0]}
          />
        </Environment>
        <ambientLight intensity={0.08} color="#b084f3" />

        <CameraRig />
        <CameraShake
          maxYaw={0.005}
          maxPitch={0.005}
          maxRoll={0.005}
          yawFrequency={0.4}
          pitchFrequency={0.4}
          rollFrequency={0.2}
          intensity={0.7}
          decayRate={0.65}
        />

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

        <ContactShadows
          position={[0, 0, -2]}
          opacity={0.5}
          scale={20}
          blur={2.8}
          far={4}
          resolution={512}
          color="#000814"
          frames={1}
        />

        <Suspense fallback={null}>
          <PostEffects />
        </Suspense>
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
