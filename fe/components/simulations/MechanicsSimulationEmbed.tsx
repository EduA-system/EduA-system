"use client";

import dynamic from "next/dynamic";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPreset } from "./presets";
import type { MechanicsPreset } from "./presets/types";
import type { Scene } from "./engines/mechanics/types";
import { collisionOutcome, collisionParams } from "./newton-third-law/collision-physics";
import type { SceneReadout } from "./shared/scene-types";

const SceneKonva2D = dynamic(
  () => import("./renderers/mechanics/scene-konva-2d").then((module) => module.SceneKonva2D),
  { ssr: false },
);

const NewtonThirdLawScene = dynamic(
  () => import("./newton-third-law/NewtonThirdLawScene").then((module) => module.NewtonThirdLawScene),
  { ssr: false },
);

export interface MechanicsSimulationEmbedProps {
  presetId?: string;
  active?: boolean;
  compact?: boolean;
  className?: string;
  appearance?: "dark" | "light";
  autoReplay?: boolean;
  landingMinimal?: boolean;
}

export function MechanicsSimulationEmbed({
  presetId = "dinh-luat-2-newton",
  active = true,
  compact = true,
  className = "",
  appearance = "dark",
  autoReplay = false,
  landingMinimal = false,
}: MechanicsSimulationEmbedProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const requestedPreset = getPreset(presetId);
  const preset = (
    requestedPreset && (requestedPreset.kind === undefined || requestedPreset.kind === "mechanics")
      ? requestedPreset
      : getPreset("dinh-luat-2-newton")
  ) as MechanicsPreset;

  const defaults = useMemo(
    () => {
      const values = Object.fromEntries(preset.params.map((param) => [param.key, param.default]));
      return preset.id === "dinh-luat-2-newton" ? { ...values, F: 6, m: 2, friction: 0.05 } : values;
    }, [preset],
  );
  const [params, setParams] = useState<Record<string, number>>(defaults);
  const [manualRunning, setManualRunning] = useState(true);
  const [inView, setInView] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [readout, setReadout] = useState<SceneReadout | null>(null);
  const restartingRef = useRef(false);
  const lastReadoutAtRef = useRef(0);
  const running = active && inView && manualRunning && !reduceMotion;
  const isNewtonThird = preset.id === "dinh-luat-3-newton";
  const scene = useMemo(() => preset.applyParams(params) as Scene, [preset, params]);
  const handleReadout = useCallback((nextReadout: SceneReadout) => {
    const now = performance.now();
    if (now - lastReadoutAtRef.current < 80) return;
    lastReadoutAtRef.current = now;
    setReadout(nextReadout);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReduceMotion(motionQuery.matches);
    updateMotionPreference();
    motionQuery.addEventListener("change", updateMotionPreference);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(node);
    return () => {
      motionQuery.removeEventListener("change", updateMotionPreference);
      observer.disconnect();
    };
  }, []);

  const controls = isNewtonThird
    ? preset.params
    : preset.params.filter((param) => ["F", "m", "friction"].includes(param.key));
  const block = readout?.bodies.find((body) => body.id === "block");
  const force = params.F ?? 10;
  const mass = params.m ?? 1;
  const friction = params.friction ?? 0;
  const acceleration = Math.max(0, (force - friction * mass * (params.g ?? 9.8)) / mass);
  const collision = useMemo(() => collisionOutcome(collisionParams(params)), [params]);

  useEffect(() => {
    if (isNewtonThird) return;
    if ((block?.x ?? -4) < -3) restartingRef.current = false;
    if ((block?.x ?? -4) > 8 && !restartingRef.current) {
      restartingRef.current = true;
      setResetSignal((value) => value + 1);
    }
  }, [block?.x, isNewtonThird]);

  return (
    <div ref={rootRef} className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[#faf9f7] ${className}`} data-animation-active={running}>
      <div className="flex shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4 py-3">
        <div>
          <span className="block text-[9px] font-bold tracking-[0.14em] text-[#c96545] uppercase">Preset thật · Cơ học 10</span>
          <strong className="mt-1 block text-base text-[#171717]">{preset.title}</strong>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-xl border border-[#e8e2d9] bg-white p-1 shadow-sm">
          <button type="button" aria-label={running ? "Tạm dừng" : "Chạy mô phỏng"} onClick={() => setManualRunning((value) => !value)} className="grid size-8 place-items-center rounded-lg bg-[#e8724a] text-white">
            {running ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button type="button" aria-label="Đặt lại mô phỏng" onClick={() => { setParams(defaults); setResetSignal((value) => value + 1); setManualRunning(true); }} className="grid size-8 place-items-center rounded-lg text-[#615b55] hover:bg-[#f5f1ec]">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
      <div className="relative min-h-[280px] flex-1 overflow-hidden bg-white">
        {isNewtonThird ? (
          <NewtonThirdLawScene
            params={params}
            running={running}
            resetSignal={resetSignal}
            onRunningChange={setManualRunning}
            speed={1}
            appearance={appearance}
            autoReplay={autoReplay}
            minimal={landingMinimal}
          />
        ) : (
          <SceneKonva2D
            scene={scene}
            running={running}
            resetSignal={resetSignal}
            onRunningChange={setManualRunning}
            onReadout={handleReadout}
            speed={1}
          />
        )}
      </div>
      {!landingMinimal ? <div className={`grid shrink-0 gap-2 border-t border-[#e8e2d9] bg-white p-3 ${isNewtonThird ? "grid-cols-2 lg:grid-cols-4" : compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
        {controls.map((control) => (
          <label key={control.key} className="rounded-xl bg-[#f7f4ef] px-3 py-2 text-[10px] text-[#6b6b6b]">
            <span className="mb-1 flex items-center justify-between"><b>{control.label}</b><strong className="text-[#171717]">{params[control.key]} {control.unit}</strong></span>
            <input className="edua-range w-full" type="range" min={control.min} max={control.max} step={control.step} value={params[control.key]} onChange={(event) => setParams((current) => ({ ...current, [control.key]: Number(event.target.value) }))} />
          </label>
        ))}
      </div> : null}
      {!landingMinimal ? <div className="grid shrink-0 grid-cols-3 gap-px bg-[#e8e2d9] text-center text-[10px]">
        {isNewtonThird ? <>
          <div className="bg-[#fbfaf8] px-3 py-2"><span className="block text-[#8a8178]">Xung lượng |J|</span><b className="text-[#171717]">{collision.impulse.toFixed(2)} N·s</b></div>
          <div className="bg-[#fbfaf8] px-3 py-2"><span className="block text-[#8a8178]">Vận tốc sau A</span><b className="text-[#171717]">{Math.abs(collision.vA).toFixed(2)} {collision.vA < 0 ? "←" : "→"} m/s</b></div>
          <div className="bg-[#fbfaf8] px-3 py-2"><span className="block text-[#8a8178]">Vận tốc sau B</span><b className="text-[#171717]">{Math.abs(collision.vB).toFixed(2)} {collision.vB < 0 ? "←" : "→"} m/s</b></div>
        </> : <>
          <div className="bg-[#fbfaf8] px-3 py-2"><span className="block text-[#8a8178]">Gia tốc</span><b className="text-[#171717]">{acceleration.toFixed(2)} m/s²</b></div>
          <div className="bg-[#fbfaf8] px-3 py-2"><span className="block text-[#8a8178]">Vận tốc</span><b className="text-[#171717]">{(block?.speed ?? 0).toFixed(2)} m/s</b></div>
          <div className="bg-[#fbfaf8] px-3 py-2"><span className="block text-[#8a8178]">Hợp lực</span><b className="text-[#171717]">{(acceleration * mass).toFixed(2)} N</b></div>
        </>}
      </div> : null}
    </div>
  );
}
