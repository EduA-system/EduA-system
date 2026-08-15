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

export function MoleculeViewer({ molecule, mode, rotating, theme = "dark", interactive = true, compact = false, pannable = true, contentScale = 1, screenOffset = [0, 0], captureMode = false, onCanvasReady }: { molecule: Molecule; mode: RenderMode; rotating: boolean; theme?: "dark" | "light"; interactive?: boolean; compact?: boolean; pannable?: boolean; /** Thu nhỏ phân tử trong khung (vd. 0.25 = còn 1/4) mà không đổi góc nhìn/ánh sáng. */ contentScale?: number; /**
   * Dời VỊ TRÍ HIỂN THỊ trong khung theo px màn hình (x âm = sang trái, y âm = lên trên),
   * KHÔNG đụng vào toạ độ 3D. Nếu dời bằng cách dịch group/target trong scene, trục xoay
   * (cả tự xoay lẫn kéo chuột xoay) sẽ lệch khỏi tâm phân tử — dời bằng CSS transform ở
   * ngoài Canvas thì camera vẫn nhìn thẳng vào tâm phân tử, chỉ có khung nhìn bị xê dịch.
   */ screenOffset?: [number, number]; /** Keeps the WebGL drawing buffer readable so callers can grab a still frame via `onCanvasReady`. */ captureMode?: boolean; onCanvasReady?: (canvas: HTMLCanvasElement) => void }) {
  // Không đặt min-height: slot molecule trên slide thường thấp hơn 180px, canvas bị tràn xuống dưới
  // và bị cha overflow-hidden cắt đáy, làm phân tử trông lệch xuống. Cả hai nơi dùng viewer đều đã
  // có chiều cao xác định.
  const surface = theme === "light"
    ? "bg-[radial-gradient(circle_at_45%_38%,#ffffff_0%,#eef7f3_58%,#e4efec_100%)]"
    : "bg-gradient-to-br from-slate-900 to-slate-700";

  return (
    <div className={`relative h-full w-full overflow-hidden ${compact ? "rounded-xl" : "rounded-2xl"} ${surface}`}>
      {/* `absolute inset-0` thay vì đo kích thước bằng ResizeObserver rồi gán width/height px
          tường minh cho Canvas — cách đo/gán đó lại khiến canvas dựng NHỎ HƠN khung thật và dính
          góc trên-trái (kiểm chứng bằng debug tô nền canvas: chỉ phần trên-trái đổi màu). `inset-0`
          buộc trình duyệt tự giãn đúng 100% khung cha bất kể phép đo, không phụ thuộc thời điểm đo. */}
      {/* `r3f-fit-parent` (globals.css) ghì <canvas> về đúng 100% khung này. Không có nó,
          R3F đo khung bằng getBoundingClientRect (đã gồm transform scale của stage trình
          chiếu / world div của editor) rồi gán lại số px đó vào inline style của canvas —
          nằm trong tổ tiên đã scale nên bị nhân scale lần nữa và canvas phình ra ngoài khung
          (đã quan sát: khung 465px nhưng canvas 930px). */}
      <div className="r3f-fit-parent absolute inset-0" style={{ transform: `translate(${screenOffset[0]}px, ${screenOffset[1]}px)` }}>
        <Canvas
          className="h-full w-full"
          dpr={compact ? [1, 1.35] : [1, 2]}
          camera={{ position: [0, 0, compact ? 7.8 : 7], fov: compact ? 39 : 45 }}
          gl={captureMode ? { preserveDrawingBuffer: true } : undefined}
          onCreated={(state) => {
            // Ép camera nhìn thẳng vào gốc toạ độ ngay khi vừa tạo — không dựa vào rotation mặc
            // định của PerspectiveCamera nữa (chấm đỏ debug cho thấy camera KHÔNG tự nhìn đúng
            // gốc toạ độ dù position/target đều để mặc định, kể cả khi tắt hẳn OrbitControls).
            state.camera.lookAt(0, 0, 0);
            onCanvasReady?.(state.gl.domElement);
          }}
        >
          <ambientLight intensity={theme === "light" ? 2.2 : 1.5} />
          <directionalLight position={[5, 5, 5]} intensity={theme === "light" ? 2.7 : 2} />
          <directionalLight position={[-4, -2, 3]} intensity={theme === "light" ? .8 : 0} />
          <group scale={contentScale}>
            <Scene molecule={molecule} mode={mode} rotating={rotating} />
          </group>
          {/* target mặc định ở gốc toạ độ — đúng tâm phân tử (geometry.ts đã centerOnOrigin) —
              nên cả tự xoay lẫn kéo chuột xoay đều lấy tâm phân tử làm trục. */}
          {interactive ? <OrbitControls enablePan={pannable} enableZoom={pannable} /> : null}
        </Canvas>
      </div>
    </div>
  );
}
