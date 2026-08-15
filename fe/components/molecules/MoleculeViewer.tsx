"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { buildGeometry } from "./geometry";
import type { Molecule, RenderMode } from "./types";

const COLORS: Record<string, string> = { C: "#30343b", H: "#f6f7fa", O: "#ef4444", N: "#3b82f6", S: "#eab308", P: "#f97316", F: "#22c55e", Cl: "#22c55e", Br: "#9a3412", I: "#7c3aed" };
const RADII: Record<string, number> = { H: .28, C: .42, O: .38, N: .39, S: .46, P: .45, F: .36, Cl: .48, Br: .52, I: .56 };

function Bond({ start, end, order, visible }: { start: [number, number, number]; end: [number, number, number]; order: number; visible: boolean }) {
  const midpoint = useMemo(() => new THREE.Vector3().addVectors(new THREE.Vector3(...start), new THREE.Vector3(...end)).multiplyScalar(.5), [start, end]);
  const length = useMemo(() => new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end)), [start, end]);
  const rotation = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...end).sub(new THREE.Vector3(...start)).normalize()), [start, end]);
  if (!visible) return null;
  return <group position={midpoint} quaternion={rotation}>{Array.from({ length: order }, (_, i) => <mesh key={i} position={[(i - (order - 1) / 2) * .12, 0, 0]}><cylinderGeometry args={[.07, .07, length, 12]} /><meshStandardMaterial color="#a8adb7" /></mesh>)}</group>;
}

function Scene({ molecule, mode, rotating }: { molecule: Molecule; mode: RenderMode; rotating: boolean }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => buildGeometry(molecule), [molecule]);
  useFrame((_, delta) => { if (rotating && group.current) group.current.rotation.y += delta * .45; });
  return <group ref={group}>{geometry.bonds.map((bond, i) => <Bond key={i} start={geometry.atoms[bond.from].position} end={geometry.atoms[bond.to].position} order={bond.order} visible={mode === "ball-and-stick"} />)}{geometry.atoms.map((atom, i) => <mesh key={i} position={atom.position}><sphereGeometry args={[mode === "space-filling" ? RADII[atom.element] * 1.7 : RADII[atom.element], 28, 20]} /><meshStandardMaterial color={COLORS[atom.element]} roughness={.35} metalness={.08} /></mesh>)}</group>;
}

export function MoleculeViewer({ molecule, mode, rotating, theme = "dark", interactive = true, compact = false }: { molecule: Molecule; mode: RenderMode; rotating: boolean; theme?: "dark" | "light"; interactive?: boolean; compact?: boolean }) {
  // Không đặt min-height: slot molecule trên slide thường thấp hơn 180px, canvas bị tràn xuống dưới
  // và bị cha overflow-hidden cắt đáy, làm phân tử trông lệch xuống. Cả hai nơi dùng viewer đều đã
  // có chiều cao xác định.
  const surface = theme === "light"
    ? "bg-[radial-gradient(circle_at_45%_38%,#ffffff_0%,#eef7f3_58%,#e4efec_100%)]"
    : "bg-gradient-to-br from-slate-900 to-slate-700";
  return <div className={`h-full w-full overflow-hidden ${compact ? "rounded-xl" : "rounded-2xl"} ${surface}`}><Canvas dpr={compact ? [1, 1.35] : [1, 2]} camera={{ position: [0, 0, compact ? 7.8 : 7], fov: compact ? 39 : 45 }}><ambientLight intensity={theme === "light" ? 2.2 : 1.5} /><directionalLight position={[5, 5, 5]} intensity={theme === "light" ? 2.7 : 2} /><directionalLight position={[-4, -2, 3]} intensity={theme === "light" ? .8 : 0} /><Scene molecule={molecule} mode={mode} rotating={rotating} />{interactive ? <OrbitControls enablePan enableZoom /> : null}</Canvas></div>;
}
