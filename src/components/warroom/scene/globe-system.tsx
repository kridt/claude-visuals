'use client';

import { Line, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface GlobeSession {
  sessionId: string;
  isActive: boolean;
}

export interface GlobeSystemProps {
  sessions: GlobeSession[];
  selectedSessionId: string | null;
  position?: [number, number, number];
  radius?: number;
}

/**
 * Hash a session id into a stable lat/lon pair on the globe so each
 * session always lands at the same coordinates between renders.
 */
function sessionIdToLatLon(id: string): { lat: number; lon: number } {
  let h1 = 5381;
  let h2 = 0;
  for (let i = 0; i < id.length; i++) {
    const c = id.charCodeAt(i);
    h1 = ((h1 << 5) + h1) ^ c;
    h2 = ((h2 << 7) + h2) ^ (c * 31);
  }
  const lat = ((h1 >>> 0) % 1801) / 10 - 90;
  const lon = ((h2 >>> 0) % 3601) / 10 - 180;
  return { lat, lon };
}

/**
 * Convert lat/lon (degrees) on a unit sphere of given radius to a 3D
 * point and an outward-pointing normal.
 */
function latLonToVec3(
  lat: number,
  lon: number,
  radius: number,
): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const pos = new THREE.Vector3(x, y, z);
  const normal = pos.clone().normalize();
  return { pos, normal };
}

/**
 * Compute a stable short label for a session id. The container can pass
 * richer names later — for now we use the last 4 chars of the id.
 */
function shortLabel(id: string): string {
  if (id.length <= 6) return id.toUpperCase();
  return id.slice(-4).toUpperCase();
}

interface PinProps {
  sessionId: string;
  isActive: boolean;
  isSelected: boolean;
  radius: number;
  cameraPos: THREE.Vector3;
  showLabel: boolean;
}

function SessionPin({
  sessionId,
  isActive,
  isSelected,
  radius,
  cameraPos: _cameraPos,
  showLabel,
}: PinProps) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const beamMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const { localPos, normal } = useMemo(() => {
    const { lat, lon } = sessionIdToLatLon(sessionId);
    const { pos, normal: n } = latLonToVec3(lat, lon, radius);
    return { localPos: pos, normal: n };
  }, [sessionId, radius]);

  // Orientation: align the pin's +Y axis with the outward normal.
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return q;
  }, [normal]);

  const height = isSelected ? 0.25 : isActive ? 0.15 : 0.08;
  const color = isSelected
    ? '#bef0ff'
    : isActive
      ? '#7cd2ea'
      : '#4d7390';

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (matRef.current && isActive && !isSelected) {
      // Pulsing brightness on active (non-selected) pins.
      const pulse = 0.7 + Math.sin(t * 2.4) * 0.3;
      matRef.current.opacity = pulse;
    } else if (matRef.current) {
      matRef.current.opacity = isSelected ? 1.0 : 0.75;
    }
    if (beamMatRef.current && isSelected) {
      beamMatRef.current.opacity = 0.55 + Math.sin(t * 2.0) * 0.15;
    }
  });

  // Position the pin so its base sits on the sphere surface and its
  // pillar grows outward along the normal.
  const pillarOffset = height / 2;
  const labelOffset = height + 0.08;

  return (
    <group position={localPos} quaternion={quat}>
      {/* Pillar */}
      <mesh position={[0, pillarOffset, 0]}>
        <cylinderGeometry args={[0.015, 0.025, height, 8]} />
        <meshBasicMaterial
          ref={matRef}
          color={color}
          transparent
          opacity={isSelected ? 1.0 : 0.85}
          toneMapped={false}
        />
      </mesh>

      {/* Small glowing cap at the pin tip */}
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Vertical light beam on the selected pin */}
      {isSelected && (
        <mesh position={[0, height + 1.5, 0]}>
          <cylinderGeometry args={[0.015, 0.04, 3.0, 8, 1, true]} />
          <meshBasicMaterial
            ref={beamMatRef}
            color={'#bef0ff'}
            transparent
            opacity={0.55}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Label */}
      {showLabel && (
        <Text
          position={[0, labelOffset, 0]}
          fontSize={0.06}
          color={isSelected ? '#bef0ff' : '#9ad6e8'}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.003}
          outlineColor={'#000000'}
          letterSpacing={0.1}
        >
          {shortLabel(sessionId)}
        </Text>
      )}
    </group>
  );
}

/**
 * Equator + prime meridian + a few extra latitude circles to give the
 * wireframe globe more structure than a bare icosahedron.
 */
function GreatCircles({ radius }: { radius: number }) {
  const segments = 96;
  const equator = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }, [radius]);

  const meridian = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(0, Math.sin(a) * radius, Math.cos(a) * radius));
    }
    return pts;
  }, [radius]);

  const tropic = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const r = radius * Math.cos(Math.PI / 6); // ~30deg latitude
    const y = radius * Math.sin(Math.PI / 6);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    return pts;
  }, [radius]);

  const tropicS = useMemo(
    () => tropic.map((p) => new THREE.Vector3(p.x, -p.y, p.z)),
    [tropic],
  );

  return (
    <group>
      <Line
        points={equator}
        color={'#7cd2ea'}
        lineWidth={1.4}
        transparent
        opacity={0.85}
      />
      <Line
        points={meridian}
        color={'#7cd2ea'}
        lineWidth={1.2}
        transparent
        opacity={0.65}
      />
      <Line
        points={tropic}
        color={'#4f8aa0'}
        lineWidth={0.8}
        transparent
        opacity={0.4}
      />
      <Line
        points={tropicS}
        color={'#4f8aa0'}
        lineWidth={0.8}
        transparent
        opacity={0.4}
      />
    </group>
  );
}

export function GlobeSystem({
  sessions,
  selectedSessionId,
  position = [0, 1.5, 0],
  radius = 1.3,
}: GlobeSystemProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cameraPosRef = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    cameraPosRef.current.copy(state.camera.position);
    if (groupRef.current && selectedSessionId === null) {
      // Slow Y rotation when nothing is selected.
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  // Determine which pins should show labels: the selected one plus the
  // 3 closest-to-camera pins (in local space, before rotation). For a
  // small N this is cheap to do on every render of the array.
  const labelSet = useMemo(() => {
    const set = new Set<string>();
    if (selectedSessionId) set.add(selectedSessionId);

    // Cheap proximity proxy: pick the 3 pins whose local Z is largest
    // (i.e. facing the camera in the globe's un-rotated frame). The
    // globe rotates slowly, so this set updates with rotation only when
    // there is no selection — and when there IS a selection, rotation
    // is frozen, so the front-facing set is also static.
    const scored = sessions.map((s) => {
      const { lat, lon } = sessionIdToLatLon(s.sessionId);
      const { pos } = latLonToVec3(lat, lon, radius);
      return { id: s.sessionId, z: pos.z };
    });
    scored.sort((a, b) => b.z - a.z);
    for (let i = 0; i < Math.min(3, scored.length); i++) {
      const item = scored[i];
      if (item) set.add(item.id);
    }
    return set;
  }, [sessions, selectedSessionId, radius]);

  return (
    <group position={position}>
      {/* Atmospheric glow halo — slightly larger sphere, additive. */}
      <mesh>
        <sphereGeometry args={[radius * 1.08, 32, 32]} />
        <meshBasicMaterial
          color={'#7cd2ea'}
          transparent
          opacity={0.06}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 1.04, 32, 32]} />
        <meshBasicMaterial
          color={'#bef0ff'}
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>

      {/* Rotating group: solid inner sphere + wireframe + great circles +
          session pins. Everything that should rotate with the globe lives
          in here. */}
      <group ref={groupRef}>
        {/* Solid inner sphere */}
        <mesh>
          <sphereGeometry args={[radius * 0.985, 48, 32]} />
          <meshBasicMaterial color={'#0d1a2a'} />
        </mesh>

        {/* Wireframe icosahedron skin */}
        <mesh>
          <icosahedronGeometry args={[radius, 4]} />
          <meshBasicMaterial
            color={'#3a7da0'}
            wireframe
            transparent
            opacity={0.55}
            toneMapped={false}
          />
        </mesh>

        <GreatCircles radius={radius} />

        {/* Session pins */}
        {sessions.map((s) => (
          <SessionPin
            key={s.sessionId}
            sessionId={s.sessionId}
            isActive={s.isActive}
            isSelected={s.sessionId === selectedSessionId}
            radius={radius}
            cameraPos={cameraPosRef.current}
            showLabel={labelSet.has(s.sessionId)}
          />
        ))}
      </group>
    </group>
  );
}
