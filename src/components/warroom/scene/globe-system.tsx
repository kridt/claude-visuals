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
  const pillarMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const capMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
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
  const isLive = isActive || isSelected;
  const baseColor = isLive ? '#22d3ee' : '#37536a';
  const baseEmissive = isLive ? '#22d3ee' : '#000000';
  const baseEmissiveIntensity = isSelected ? 3.2 : isActive ? 2.5 : 0;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (isActive && !isSelected) {
      // Pulse the emissive on active (non-selected) pins.
      const pulse = 1.8 + Math.sin(t * 2.4) * 0.8;
      if (pillarMatRef.current) pillarMatRef.current.emissiveIntensity = pulse;
      if (capMatRef.current) capMatRef.current.emissiveIntensity = pulse;
    }
    if (beamMatRef.current && isSelected) {
      beamMatRef.current.opacity = 0.65 + Math.sin(t * 2.0) * 0.2;
    }
  });

  const pillarOffset = height / 2;
  const labelOffset = height + 0.08;

  return (
    <group position={localPos} quaternion={quat}>
      {/* Pillar */}
      <mesh position={[0, pillarOffset, 0]}>
        <cylinderGeometry args={[0.015, 0.025, height, 8]} />
        <meshPhysicalMaterial
          ref={pillarMatRef}
          color={baseColor}
          emissive={baseEmissive}
          emissiveIntensity={baseEmissiveIntensity}
          metalness={isLive ? 0.4 : 0.5}
          roughness={isLive ? 0.3 : 0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Glowing cap at the pin tip */}
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshPhysicalMaterial
          ref={capMatRef}
          color={baseColor}
          emissive={baseEmissive}
          emissiveIntensity={baseEmissiveIntensity}
          metalness={isLive ? 0.4 : 0.5}
          roughness={isLive ? 0.3 : 0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Surface-spill point light on the selected pin so the globe
          locally bounces some cyan back. */}
      {isSelected && (
        <pointLight
          position={[0, 0.2, 0]}
          color={'#7cd2ea'}
          intensity={2}
          distance={1}
        />
      )}

      {/* Vertical light beam on the selected pin */}
      {isSelected && (
        <mesh position={[0, height + 1.5, 0]}>
          <cylinderGeometry args={[0.015, 0.04, 3.0, 8, 1, true]} />
          <meshBasicMaterial
            ref={beamMatRef}
            color={[0.7, 3, 4.5]}
            transparent
            opacity={0.65}
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

  // HDR cyan so bloom catches the great circles. Use THREE.Color so we
  // can push channels above 1.0 — bloom keys off luminance, and a
  // tone-mapped-off material lets the raw values reach the bloom pass.
  const hdrCyan = useMemo(() => new THREE.Color(0.8, 3.5, 5), []);
  const dimCyan = useMemo(() => new THREE.Color(0.4, 1.8, 2.4), []);

  return (
    <group>
      <Line
        points={equator}
        color={hdrCyan}
        lineWidth={1.4}
        transparent
        opacity={0.95}
        toneMapped={false}
      />
      <Line
        points={meridian}
        color={hdrCyan}
        lineWidth={1.2}
        transparent
        opacity={0.8}
        toneMapped={false}
      />
      <Line
        points={tropic}
        color={dimCyan}
        lineWidth={0.8}
        transparent
        opacity={0.55}
        toneMapped={false}
      />
      <Line
        points={tropicS}
        color={dimCyan}
        lineWidth={0.8}
        transparent
        opacity={0.55}
        toneMapped={false}
      />
    </group>
  );
}

/**
 * Fresnel atmosphere shell — additive cyan rim around the globe.
 */
const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const ATMO_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fres = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.5);
    gl_FragColor = vec4(uColor, fres);
  }
`;

function AtmosphereShell({ radius }: { radius: number }) {
  const uniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color('#22d3ee') } }),
    [],
  );
  return (
    <mesh scale={1.06}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        vertexShader={ATMO_VERT}
        fragmentShader={ATMO_FRAG}
        uniforms={uniforms}
      />
    </mesh>
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

  // Sphere geometries for the two wireframe passes. Memoize so we don't
  // rebuild EdgesGeometry every frame.
  const edgeGeo = useMemo(() => {
    const sphere = new THREE.SphereGeometry(radius, 48, 48);
    const edges = new THREE.EdgesGeometry(sphere, 12);
    sphere.dispose();
    return edges;
  }, [radius]);

  useFrame((state, delta) => {
    cameraPosRef.current.copy(state.camera.position);
    if (groupRef.current && selectedSessionId === null) {
      // Slow Y rotation when nothing is selected.
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  // Determine which pins should show labels: the selected one plus the
  // 3 closest-to-camera pins (in local space, before rotation).
  const labelSet = useMemo(() => {
    const set = new Set<string>();
    if (selectedSessionId) set.add(selectedSessionId);

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
      {/* Fresnel atmosphere shell. */}
      <AtmosphereShell radius={radius} />

      {/* Rotating group: solid inner sphere + dual wireframe pass + great
          circles + session pins. */}
      <group ref={groupRef}>
        {/* Solid inner sphere — PBR so it picks up the lightformers. */}
        <mesh>
          <sphereGeometry args={[radius * 0.985, 64, 64]} />
          <meshPhysicalMaterial
            color={'#02060e'}
            metalness={0.6}
            roughness={0.35}
            clearcoat={0.8}
            clearcoatRoughness={0.2}
            envMapIntensity={1.0}
          />
        </mesh>

        {/* Front-facing bright wireframe (HDR cyan). */}
        <lineSegments geometry={edgeGeo}>
          <lineBasicMaterial
            color={[1.4, 4, 5.5]}
            transparent
            opacity={1}
            toneMapped={false}
          />
        </lineSegments>

        {/* Occluded dim wireframe — Iron-Man "see through" effect. */}
        <lineSegments geometry={edgeGeo}>
          <lineBasicMaterial
            color={'#22d3ee'}
            transparent
            opacity={0.12}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>

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
