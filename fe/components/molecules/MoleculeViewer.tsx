"use client";

// Renderer R3F cho mô hình phân tử: ball-and-stick hoặc space-filling.
// Khung Canvas/ánh sáng/điều khiển mượn từ periodic-table/atom-model-3d.tsx.

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { Bond, Molecule, Vec3 } from './types';
import { elementStyle, BOND_RADIUS, BOND_COLOR, MULTI_BOND_OFFSET } from './constants';

export type ViewMode = 'ball-stick' | 'space-filling';

const UP = new THREE.Vector3(0, 1, 0);

// ── Atom ────────────────────────────────────────────────────────────────────

function AtomSphere({ position, color, radius }: { position: Vec3; color: string; radius: number }) {
  const isWhite = color.toLowerCase() === '#ffffff';
  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.35}
        metalness={0.0}
        clearcoat={0.6}
        clearcoatRoughness={0.3}
        // H trắng: thêm viền tối nhẹ qua envMapIntensity thấp để nổi trên nền trắng
        envMapIntensity={isWhite ? 0.4 : 1.0}
      />
    </mesh>
  );
}

// ── Bond ────────────────────────────────────────────────────────────────────

/** Một trụ định hướng giữa hai điểm (đã dời theo `offset`). */
function Cylinder({ from, to, offset }: { from: Vec3; to: Vec3; offset: Vec3 }) {
  const { position, quaternion, height } = useMemo(() => {
    const a = new THREE.Vector3(...from).add(new THREE.Vector3(...offset));
    const b = new THREE.Vector3(...to).add(new THREE.Vector3(...offset));
    const dir = new THREE.Vector3().subVectors(b, a);
    const h = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
    return { position: mid.toArray() as Vec3, quaternion: q, height: h };
  }, [from, to, offset]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[BOND_RADIUS, BOND_RADIUS, height, 16]} />
      <meshStandardMaterial color={BOND_COLOR} roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

/** Một liên kết: order 1/2/3 → 1/2/3 trụ song song. */
function BondGroup({ bond, atoms }: { bond: Bond; atoms: Molecule['atoms'] }) {
  const from = atoms[bond.a].position;
  const to = atoms[bond.b].position;

  const offsets = useMemo<Vec3[]>(() => {
    if (bond.order === 1) return [[0, 0, 0]];

    const dir = new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize();
    let ref = new THREE.Vector3(0, 0, 1);
    if (Math.abs(dir.dot(ref)) > 0.9) ref = new THREE.Vector3(0, 1, 0);
    const perp = new THREE.Vector3().crossVectors(dir, ref).normalize().multiplyScalar(MULTI_BOND_OFFSET);
    const p = perp.toArray() as Vec3;
    const np: Vec3 = [-p[0], -p[1], -p[2]];

    if (bond.order === 2) return [p, np];
    return [p, [0, 0, 0], np];
  }, [bond.order, from, to]);

  return (
    <>
      {offsets.map((off, i) => (
        <Cylinder key={i} from={from} to={to} offset={off} />
      ))}
    </>
  );
}

// ── Scene ───────────────────────────────────────────────────────────────────

function MoleculeScene({ molecule, mode }: { molecule: Molecule; mode: ViewMode }) {
  return (
    <>
      {molecule.atoms.map((atom, i) => {
        const style = elementStyle(atom.element);
        const radius = mode === 'space-filling' ? style.radiusVdw : style.radiusBall;
        return <AtomSphere key={`a${i}`} position={atom.position} color={style.color} radius={radius} />;
      })}
      {mode === 'ball-stick' &&
        molecule.bonds.map((bond, i) => <BondGroup key={`b${i}`} bond={bond} atoms={molecule.atoms} />)}
    </>
  );
}

// ── Public component ────────────────────────────────────────────────────────

export function MoleculeViewer({
  molecule,
  mode = 'ball-stick',
  paused = false,
}: {
  molecule: Molecule;
  mode?: ViewMode;
  paused?: boolean;
}) {
  // Bán kính bao của phân tử → khoảng cách camera.
  const maxRadius = useMemo(() => {
    let r = 1;
    for (const atom of molecule.atoms) {
      const d = Math.hypot(atom.position[0], atom.position[1], atom.position[2]);
      if (d > r) r = d;
    }
    return r + 1.5;
  }, [molecule]);

  const camDist = maxRadius * 2.4;

  return (
    <Canvas
      shadows
      camera={{ position: [camDist * 0.4, camDist * 0.5, camDist * 0.75], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#f8fafc']} />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={camDist * 3}
        shadow-camera-left={-maxRadius * 2}
        shadow-camera-right={maxRadius * 2}
        shadow-camera-top={maxRadius * 2}
        shadow-camera-bottom={-maxRadius * 2}
      />
      <pointLight position={[-maxRadius * 1.5, maxRadius, -maxRadius * 2]} intensity={0.5} color="#6366f1" />
      <pointLight position={[0, -maxRadius, maxRadius]} intensity={0.25} color="#fbbf24" />

      <ContactShadows
        position={[0, -maxRadius, 0]}
        opacity={0.22}
        scale={maxRadius * 4}
        blur={3}
        far={maxRadius * 3}
        color="#1e293b"
      />

      <OrbitControls
        enablePan
        minDistance={2.5}
        maxDistance={camDist * 2.5}
        autoRotate={!paused}
        autoRotateSpeed={0.5}
        // Chuột trái = xoay, chuột GIỮA = di chuyển vị trí xem, chuột phải = di chuyển; lăn = phóng to
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />

      <Suspense fallback={null}>
        <Environment preset="warehouse" />
      </Suspense>

      <MoleculeScene molecule={molecule} mode={mode} />
    </Canvas>
  );
}


