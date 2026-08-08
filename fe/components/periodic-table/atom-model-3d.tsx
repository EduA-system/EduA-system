"use client";

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getShellDistribution as getShellData, subshellKey, type ElectronShell, type SubshellType } from './orbital-data';

export interface AtomModel3DProps {
  atomicNumber: number;
  protons: number;
  neutrons: number | null;
  categoryColor: string;
  electronConfig: string;
  glbPath?: string;
  mode?: 'shell' | 'orbital';
  activeShell?: number | null;
  activeSubshell?: string | null;
  paused?: boolean;
}

export { getShellDistribution } from './orbital-data';
export const SUBSHELL_COLORS: Record<SubshellType, string> = { s: '#60a5fa', p: '#4ade80', d: '#f59e0b', f: '#a855f7' };
export const SHELL_COLORS = ['#2563eb', '#84cc16', '#d4a017', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04'] as const;
export const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'] as const;
const ELECTRON_RADIUS = 0.18;
const SUBSHELL_ENVELOPE_RADIUS = ELECTRON_RADIUS * 1.5;

function Nucleus({ protons, neutrons }: Pick<AtomModel3DProps, 'protons' | 'neutrons'>) {
  const particles = useMemo(() => {
    const protonCount = Math.min(protons, 20);
    const neutronCount = Math.min(neutrons ?? 0, 18);
    const total = protonCount + neutronCount;
    return Array.from({ length: total }, (_, index) => {
      const phi = Math.acos(1 - (2 * (index + 0.5)) / total);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const radius = total <= 1 ? 0 : 0.18 + 0.12 * Math.cbrt(index);
      const proton = index % 2 === 0 ? index / 2 < protonCount : Math.floor(index / 2) < neutronCount;
      return { position: [radius * Math.cos(theta) * Math.sin(phi), radius * Math.cos(phi), radius * Math.sin(theta) * Math.sin(phi)] as [number, number, number], proton };
    });
  }, [protons, neutrons]);

  return <group>{particles.map(({ position, proton }, index) => <mesh key={index} position={position}><sphereGeometry args={[0.25, 16, 16]} /><meshStandardMaterial color={proton ? '#dc2626' : '#94a3b8'} emissive={proton ? '#5f1212' : '#263548'} emissiveIntensity={0.28} /></mesh>)}</group>;
}

function createRoundedArcTubeGeometry(orbitRadius: number, tubeRadius: number, arc: number): THREE.BufferGeometry {
  const radialSegments = 20;
  const arcSegments = Math.max(12, Math.ceil(arc * 28));
  const capSegments = 7;
  const rings: { angle: number; tangentOffset: number; crossRadius: number }[] = [];

  // Hemisphere at the start, constant-radius arc, then hemisphere at the end.
  for (let index = 0; index <= capSegments; index++) {
    const beta = (index / capSegments) * (Math.PI / 2);
    rings.push({ angle: 0, tangentOffset: -tubeRadius * Math.cos(beta), crossRadius: tubeRadius * Math.sin(beta) });
  }
  for (let index = 1; index <= arcSegments; index++) rings.push({ angle: (index / arcSegments) * arc, tangentOffset: 0, crossRadius: tubeRadius });
  for (let index = 1; index <= capSegments; index++) {
    const beta = (Math.PI / 2) * (1 - index / capSegments);
    rings.push({ angle: arc, tangentOffset: tubeRadius * Math.cos(beta), crossRadius: tubeRadius * Math.sin(beta) });
  }

  const positions: number[] = [];
  const indices: number[] = [];
  for (const ring of rings) {
    const normalX = Math.cos(ring.angle);
    const normalZ = Math.sin(ring.angle);
    const tangentX = -Math.sin(ring.angle);
    const tangentZ = Math.cos(ring.angle);
    for (let index = 0; index < radialSegments; index++) {
      const phi = (index / radialSegments) * Math.PI * 2;
      const offset = ring.crossRadius * Math.cos(phi);
      positions.push(
        normalX * (orbitRadius + offset) + tangentX * ring.tangentOffset,
        ring.crossRadius * Math.sin(phi),
        normalZ * (orbitRadius + offset) + tangentZ * ring.tangentOffset,
      );
    }
  }
  for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex++) {
    for (let index = 0; index < radialSegments; index++) {
      const next = (index + 1) % radialSegments;
      const current = ringIndex * radialSegments + index;
      const following = (ringIndex + 1) * radialSegments + index;
      indices.push(current, following, ringIndex * radialSegments + next, ringIndex * radialSegments + next, following, (ringIndex + 1) * radialSegments + next);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function SubshellEnvelope({ radius, startAngle, arc, color, opacity }: { radius: number; startAngle: number; arc: number; color: string; opacity: number }) {
  const geometry = useMemo(() => createRoundedArcTubeGeometry(radius, SUBSHELL_ENVELOPE_RADIUS, Math.max(arc, 0.001)), [radius, arc]);
  return <group rotation={[0, -startAngle, 0]}>
    {arc === 0 ? <mesh position={[radius, 0, 0]}><sphereGeometry args={[SUBSHELL_ENVELOPE_RADIUS, 20, 20]} /><meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.3} depthWrite={false} side={THREE.FrontSide} /></mesh> : null}
    {arc > 0 ? <mesh geometry={geometry}>
      <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.3} depthWrite={false} side={THREE.FrontSide} />
    </mesh> : null}
  </group>;
}

function LayerRing({ shell, shellIndex, mode, activeShell, activeSubshell, paused }: {
  shell: ElectronShell;
  shellIndex: number;
  mode: 'shell' | 'orbital';
  activeShell: number | null | undefined;
  activeSubshell: string | null | undefined;
  paused: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const radius = 2.1 + shellIndex * 1.1;
  const ringColor = SHELL_COLORS[shellIndex % SHELL_COLORS.length];
  const particles = useMemo(() => shell.subshells.flatMap(subshell => Array.from({ length: subshell.electrons }, (_, index) => ({ key: subshellKey(subshell), type: subshell.type, index }))), [shell]);
  const subshellEnvelopes = useMemo(() => shell.subshells.map((subshell, index) => ({
    subshell,
    startIndex: shell.subshells.slice(0, index).reduce((total, previous) => total + previous.electrons, 0),
  })), [shell]);
  const shellSelected = mode === 'shell' && activeShell === shellIndex;
  const subshellSelected = mode === 'orbital' && activeSubshell != null && shell.subshells.some(subshell => subshellKey(subshell) === activeSubshell);
  const ringDimmed = mode === 'shell' && activeShell != null && !shellSelected;

  useFrame((_, delta) => { if (!paused && ref.current) ref.current.rotation.y += delta * (0.17 + shellIndex * 0.025); });

  return <group ref={ref}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, shellSelected || subshellSelected ? 0.07 : 0.047, 12, 112]} /><meshStandardMaterial color={ringColor} transparent opacity={ringDimmed ? 0.16 : subshellSelected || shellSelected ? 0.74 : 0.45} /></mesh>
    {subshellEnvelopes.map(({ subshell, startIndex }) => {
      const count = subshell.electrons;
      const step = (Math.PI * 2) / particles.length;
      const startAngle = shellIndex * 0.42 + startIndex * step;
      const arc = (count - 1) * step;
      const selected = mode === 'orbital' && activeSubshell === subshellKey(subshell);
      const muted = mode === 'orbital' && activeSubshell != null && !selected;
      const color = SUBSHELL_COLORS[subshell.type];
      const opacity = muted || ringDimmed ? 0.10 : selected ? 0.42 : 0.28;
      return <SubshellEnvelope key={subshellKey(subshell)} radius={radius} startAngle={startAngle} arc={arc} color={color} opacity={opacity} />;
    })}
    {particles.map((particle, index) => {
      const angle = (index / particles.length) * Math.PI * 2 + shellIndex * 0.42;
      const selected = mode === 'orbital' && activeSubshell === particle.key;
      const muted = mode === 'orbital' && activeSubshell != null && !selected;
      const color = mode === 'orbital' && selected ? SUBSHELL_COLORS[particle.type] : muted || ringDimmed ? '#94a3b8' : '#2563eb';
      return <mesh key={`${particle.key}-${particle.index}`} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]} scale={selected || shellSelected ? 1.2 : 1}>
        <sphereGeometry args={[ELECTRON_RADIUS, 18, 18]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected || shellSelected ? 0.78 : muted || ringDimmed ? 0.08 : 0.42} />
      </mesh>;
    })}
  </group>;
}

function LayerScene({ protons, neutrons, shells, mode, activeShell, activeSubshell, paused }: Pick<AtomModel3DProps, 'protons' | 'neutrons' | 'mode' | 'activeShell' | 'activeSubshell' | 'paused'> & { shells: ElectronShell[] }) {
  return <group><Nucleus protons={protons} neutrons={neutrons} />{shells.map((shell, index) => <LayerRing key={shell.n} shell={shell} shellIndex={index} mode={mode ?? 'shell'} activeShell={activeShell} activeSubshell={activeSubshell} paused={paused ?? false} />)}</group>;
}

export default function AtomModel3D({ atomicNumber, protons, neutrons, electronConfig, mode = 'shell', activeShell, activeSubshell, paused = false }: AtomModel3DProps) {
  const shells = useMemo(() => getShellData(electronConfig), [electronConfig]);
  const maxRadius = 2.1 + Math.max(shells.length - 1, 0) * 1.1;
  const cameraDistance = maxRadius * 2.6 + 3;

  return <Canvas key={`atom-${atomicNumber}-${mode}`} shadows camera={{ position: [0, cameraDistance * 0.7, cameraDistance * 0.7], fov: 52 }} dpr={[1, 2]} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }} style={{ width: '100%', height: '100%' }}>
    <color attach="background" args={['#fffdfb']} /><ambientLight intensity={0.6} /><directionalLight position={[7, 10, 8]} intensity={1.3} /><pointLight position={[-6, 4, -5]} intensity={0.7} color="#d97757" />
    <OrbitControls enablePan={false} enableZoom={false} autoRotate={!paused} autoRotateSpeed={0.35} />
    <Suspense fallback={null}><Environment preset="warehouse" /></Suspense>
    <LayerScene protons={protons} neutrons={neutrons} shells={shells} mode={mode} activeShell={activeShell} activeSubshell={activeSubshell} paused={paused} />
  </Canvas>;
}
