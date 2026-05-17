'use client';

import {
  CameraShake,
  ContactShadows,
  Environment,
  Lightformer,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, type ReactNode } from 'react';
import { CameraRig } from './scene/camera-rig';
import { GlobeSystem, type GlobeSession } from './scene/globe-system';
import { PostEffects } from './scene/post-effects';
import { RangeRings } from './scene/range-rings';
import { StarBackdrop } from './scene/star-backdrop';
import { TacticalFloor } from './scene/tactical-floor';
import { TacticalScreen } from './scene/tactical-screen';
import { TickerStrip } from './scene/ticker-strip';

import '@/app/warroom.css';

export interface WarRoomProps {
  topHud: ReactNode;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  bottomStrip: ReactNode;
  sessions: GlobeSession[];
  selectedSessionId: string | null;
}

export function WarRoom({
  topHud,
  leftPanel,
  rightPanel,
  bottomStrip,
  sessions,
  selectedSessionId,
}: WarRoomProps) {
  return (
    <div className="warroom fixed inset-0 overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        flat
        camera={{ position: [0, 2.2, 5.5], fov: 50, near: 0.1, far: 60 }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <color attach="background" args={['#040814']} />
        <fog attach="fog" args={['#040814', 12, 34]} />

        <Environment
          preset="warehouse"
          background={false}
          environmentIntensity={0.35}
        >
          <Lightformer
            form="rect"
            intensity={2.5}
            color="#7cd2ea"
            position={[0, 6, 4]}
            scale={[14, 4, 1]}
            target={[0, 1.5, 0]}
          />
          <Lightformer
            form="rect"
            intensity={1.8}
            color="#9ad6ff"
            position={[-6, 3, 4]}
            scale={[4, 5, 1]}
            target={[0, 1.5, 0]}
          />
          <Lightformer
            form="rect"
            intensity={1.8}
            color="#7cd2ea"
            position={[6, 3, 4]}
            scale={[4, 5, 1]}
            target={[0, 1.5, 0]}
          />
          <Lightformer
            form="ring"
            intensity={3.5}
            color="#ffffff"
            position={[0, 7, 0]}
            scale={2.5}
            target={[0, 1.5, 0]}
          />
        </Environment>

        <ambientLight intensity={0.08} color={'#7cd2ea'} />

        <StarBackdrop />
        <TacticalFloor />
        <RangeRings />

        <GlobeSystem
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          position={[0, 1.5, 0]}
        />

        <TacticalScreen
          position={[-3.8, 1.8, 0.6]}
          rotation={[0, 0.45, 0]}
          width={2.6}
          height={3.4}
          label="OPS FEED"
          pixelW={320}
          pixelH={460}
        >
          {leftPanel}
        </TacticalScreen>

        <TacticalScreen
          position={[3.8, 1.8, 0.6]}
          rotation={[0, -0.45, 0]}
          width={2.6}
          height={3.4}
          label="OPERATIVES"
          pixelW={320}
          pixelH={460}
        >
          {rightPanel}
        </TacticalScreen>

        <TickerStrip
          position={[0, 0.35, 2.0]}
          rotation={[-0.25, 0, 0]}
          width={8.0}
          height={0.9}
          pixelW={960}
          pixelH={110}
        >
          {bottomStrip}
        </TickerStrip>

        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.6}
          scale={20}
          blur={2.5}
          far={4}
          resolution={512}
          color="#000814"
          frames={1}
        />

        <CameraRig />
        <CameraShake
          maxYaw={0.003}
          maxPitch={0.003}
          maxRoll={0.002}
          yawFrequency={0.35}
          pitchFrequency={0.35}
          rollFrequency={0.15}
          intensity={0.5}
          decayRate={0.7}
        />

        <Suspense fallback={null}>
          <PostEffects />
        </Suspense>
      </Canvas>

      {/* DOM-overlay top HUD above the canvas. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{ pointerEvents: 'none' }}
      >
        <div className="pointer-events-auto">{topHud}</div>
      </div>
    </div>
  );
}

export default WarRoom;
