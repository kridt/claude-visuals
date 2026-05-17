'use client';

import { Canvas } from '@react-three/fiber';
import { type ReactNode } from 'react';
import * as THREE from 'three';
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
        dpr={[1, 1.5]}
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 2.2, 5.5], fov: 50, near: 0.1, far: 60 }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          camera.lookAt(0, 1.5, 0);
        }}
      >
        <color attach="background" args={['#070a14']} />
        <fog attach="fog" args={['#070a14', 12, 30]} />

        <ambientLight intensity={0.25} color={'#7cd2ea'} />
        <directionalLight
          position={[3, 6, 4]}
          intensity={0.8}
          color={'#9ad6ff'}
        />

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

        <CameraRig />
        <PostEffects />
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
