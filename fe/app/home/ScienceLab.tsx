"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ELEMENTS } from "@/components/periodic-table/data";
import { CATEGORY_COLORS, type Element } from "@/components/periodic-table/types";
import { MOLECULE_CATALOG } from "@/components/molecules/catalog";
import type { Molecule, RenderMode } from "@/components/molecules/types";
import styles from "./landing.module.css";

const MoleculeViewer = dynamic(
  () => import("@/components/molecules/MoleculeViewer").then((module) => module.MoleculeViewer),
  { ssr: false, loading: () => <SciencePoster /> },
);

const MechanicsSimulationEmbed = dynamic(
  () => import("@/components/simulations/MechanicsSimulationEmbed").then((module) => module.MechanicsSimulationEmbed),
  { ssr: false, loading: () => <div className={styles.scienceLoading}>Đang dựng mô phỏng vật lý…</div> },
);

const PeriodicTableGrid = dynamic(
  () => import("@/components/periodic-table/periodic-table-grid").then((module) => module.PeriodicTableGrid),
  { ssr: false, loading: () => <div className={styles.scienceLoading}>Đang xếp 118 nguyên tố…</div> },
);

type ScienceFeatureId = "simulation" | "molecule" | "periodic";

const FEATURES: Array<{ id: ScienceFeatureId; number: string; label: string; title: string; description: string }> = [
  { id: "simulation", number: "58", label: "thí nghiệm", title: "Vật lý tương tác", description: "Thay đổi khối lượng, vận tốc và quan sát cặp lực trực đối trong Định luật III Newton." },
  { id: "molecule", number: `${MOLECULE_CATALOG.length}+`, label: "cấu tạo mẫu", title: "Cấu tạo chất 3D", description: "Xoay, thu phóng và đổi cách biểu diễn cấu trúc phân tử." },
  { id: "periodic", number: "118", label: "nguyên tố", title: "Bảng tuần hoàn", description: "Chạm vào từng ô để đọc dữ liệu nguyên tố thật." },
];

function useScienceCapability() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduceMotion(motionQuery.matches);
    const frame = requestAnimationFrame(() => {
      const canvas = document.createElement("canvas");
      setWebgl(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
      updateMotion();
    });
    motionQuery.addEventListener("change", updateMotion);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "180px" });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      motionQuery.removeEventListener("change", updateMotion);
      observer.disconnect();
    };
  }, []);

  return { ref, inView, webgl, reduceMotion };
}

function SciencePoster() {
  return (
    <div className={styles.sciencePoster} aria-hidden="true">
      <span className={styles.posterCore}>C</span>
      <i className={styles.posterOrbitOne} /><i className={styles.posterOrbitTwo} /><i className={styles.posterOrbitThree} />
      <b className={styles.posterElectronOne} /><b className={styles.posterElectronTwo} /><b className={styles.posterElectronThree} />
    </div>
  );
}

function PhysicsPreview() {
  return (
    <svg className={styles.previewDiagram} viewBox="0 0 320 150" aria-hidden="true">
      <defs><linearGradient id="physics-paper" x1="0" x2="1"><stop stopColor="#fbfffc"/><stop offset="1" stopColor="#eef7f5"/></linearGradient></defs>
      <rect width="320" height="150" rx="16" fill="url(#physics-paper)"/>
      <path d="M35 111H285" stroke="#b7c9c9" strokeWidth="2" strokeLinecap="round"/>
      <g className={styles.previewCartA}><rect x="72" y="76" width="52" height="30" rx="7" fill="#68cbd3"/><circle cx="84" cy="110" r="7" fill="#173a46"/><circle cx="112" cy="110" r="7" fill="#173a46"/><text x="98" y="96" textAnchor="middle">A</text></g>
      <g className={styles.previewCartB}><rect x="196" y="76" width="52" height="30" rx="7" fill="#ed7546"/><circle cx="208" cy="110" r="7" fill="#173a46"/><circle cx="236" cy="110" r="7" fill="#173a46"/><text x="222" y="96" textAnchor="middle">B</text></g>
      <path className={styles.previewSpring} d="M124 91h10l6-9 9 18 9-18 9 18 9-18 6 9h14" fill="none" stroke="#173a46" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M93 48H49m0 0 12-8M49 48l12 8" fill="none" stroke="#4d9fe6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M227 48h44m0 0-12-8m12 8-12 8" fill="none" stroke="#ed7546" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="38" y="28" className={styles.previewFormula}>F₍B→A₎ = −F₍A→B₎</text>
    </svg>
  );
}

function MoleculePreview() {
  return (
    <svg className={styles.previewDiagram} viewBox="0 0 320 150" aria-hidden="true">
      <rect width="320" height="150" rx="16" fill="#f7fbf8"/>
      <g className={styles.previewMoleculeGroup}>
        <path d="M126 77 188 77M118 68 88 42M118 86 83 111M126 58 127 26M195 59 223 32M197 91 229 116M202 76 249 76" stroke="#9db4b5" strokeWidth="7" strokeLinecap="round"/>
        <circle cx="122" cy="77" r="27" fill="#34434b"/><circle cx="193" cy="77" r="27" fill="#34434b"/>
        <circle cx="83" cy="39" r="15" fill="#fff" stroke="#c7d7d6"/><circle cx="78" cy="115" r="15" fill="#fff" stroke="#c7d7d6"/><circle cx="127" cy="23" r="15" fill="#fff" stroke="#c7d7d6"/>
        <circle cx="227" cy="29" r="15" fill="#fff" stroke="#c7d7d6"/><circle cx="234" cy="119" r="15" fill="#fff" stroke="#c7d7d6"/><circle cx="255" cy="76" r="15" fill="#fff" stroke="#c7d7d6"/>
        <text x="122" y="83" textAnchor="middle">C</text><text x="193" y="83" textAnchor="middle">C</text>
      </g>
      <text x="24" y="29" className={styles.previewFormula}>ETAN · C₂H₆</text>
      <path d="M274 37c13 10 18 24 14 39" fill="none" stroke="#ed7546" strokeWidth="2" strokeLinecap="round"/><path d="m283 72 5 5 5-5" fill="none" stroke="#ed7546" strokeWidth="2"/>
    </svg>
  );
}

function PeriodicPreview() {
  return (
    <svg className={styles.previewDiagram} viewBox="0 0 180 100" aria-hidden="true">
      <rect width="180" height="100" rx="10" fill="#f7fbf8"/>
      {ELEMENTS.map((element) => {
        const colors = CATEGORY_COLORS[element.category];
        const row = element.gridRow >= 9 ? element.gridRow - 1 : element.gridRow;
        return <rect key={element.atomicNumber} style={{ "--wave-i": element.gridRow + element.gridCol } as React.CSSProperties} x={5 + (element.gridCol - 1) * 9.35} y={5 + (row - 1) * 10.1} width="7.5" height="8.2" rx="1.3" fill={colors.bg} stroke={colors.border} strokeWidth=".7"/>;
      })}
      <text x="171" y="94" textAnchor="end" className={styles.previewFormula}>118</text>
    </svg>
  );
}

function SciencePreview({ kind, webglEnabled, rotating }: { kind: ScienceFeatureId; webglEnabled: boolean; rotating: boolean }) {
  if (kind === "simulation") {
    return <div className={`${styles.sciencePreview} ${styles.forcePreview}`} aria-hidden="true"><PhysicsPreview /></div>;
  }
  if (kind === "molecule") {
    return <div className={`${styles.sciencePreview} ${styles.moleculePreview}`} aria-hidden="true">{webglEnabled ? <MoleculeViewer molecule={MOLECULE_CATALOG[1]} mode="ball-and-stick" rotating={rotating} theme="light" interactive={false} compact /> : <MoleculePreview />}</div>;
  }
  return <div className={`${styles.sciencePreview} ${styles.tablePreview}`} aria-hidden="true"><PeriodicPreview /></div>;
}

function MoleculeDemo({ enabled, rotating }: { enabled: boolean; rotating: boolean }) {
  const [molecule, setMolecule] = useState<Molecule>(MOLECULE_CATALOG[1]);
  const [mode, setMode] = useState<RenderMode>("ball-and-stick");
  const choices = [MOLECULE_CATALOG[0], MOLECULE_CATALOG[1], MOLECULE_CATALOG[6], MOLECULE_CATALOG[7]];
  return (
    <div className={styles.moleculeDemo}>
      <aside>
        <span className={styles.labLabel}>DANH MỤC PHÂN TỬ</span>
        {choices.map((item) => <button type="button" key={item.name} className={item.name === molecule.name ? styles.labChoiceActive : ""} onClick={() => setMolecule(item)}><strong>{item.name}</strong><small>{item.formula}</small></button>)}
      </aside>
      <div className={styles.moleculeViewerShell}>
        <div className={styles.moleculeToolbar}><div><span>Đang quan sát</span><strong>{molecule.name} · {molecule.formula}</strong></div><div><button type="button" className={mode === "ball-and-stick" ? styles.labChoiceActive : ""} onClick={() => setMode("ball-and-stick")}>Khung nối</button><button type="button" className={mode === "space-filling" ? styles.labChoiceActive : ""} onClick={() => setMode("space-filling")}>Đặc khít</button></div></div>
        <div className={styles.webglViewport}>{enabled ? <MoleculeViewer molecule={molecule} mode={mode} rotating={rotating} theme="light" /> : <SciencePoster />}</div>
        <p>Kéo để xoay · cuộn để phóng to · chuyển mô hình bằng thanh công cụ</p>
      </div>
    </div>
  );
}

function PeriodicDemo() {
  const [selectedNumber, setSelectedNumber] = useState(6);
  const selected = useMemo(() => ELEMENTS.find((element) => element.atomicNumber === selectedNumber) ?? ELEMENTS[5], [selectedNumber]);
  const colors = CATEGORY_COLORS[selected.category];
  const weight = selected.atomicWeight?.kind === "interval"
    ? `${selected.atomicWeight.min}–${selected.atomicWeight.max}`
    : selected.atomicWeight?.value ?? "—";
  const selectElement = (element: Element) => setSelectedNumber(element.atomicNumber);

  return (
    <div className={styles.periodicDemoReal}>
      <div className={styles.periodicBoard}>
        <div className={styles.periodicBoardHead}><span>DỮ LIỆU HÓA HỌC · 118 NGUYÊN TỐ</span><small>Chọn một ô để đọc thông tin</small></div>
        <PeriodicTableGrid compact selectedAtomicNumber={selectedNumber} onSelectElement={selectElement} className={styles.periodicGridEmbed} />
      </div>
      <aside className={styles.elementDetailReal} style={{ "--element-accent": colors.border, "--element-surface": colors.bg } as React.CSSProperties}>
        <span>NGUYÊN TỐ ĐANG CHỌN</span>
        <div className={styles.elementSymbolReal}><small>{selected.atomicNumber}</small><strong>{selected.symbol}</strong><em>{weight}</em></div>
        <h3>{selected.nameVi}</h3><p>{selected.name}</p>
        <dl><div><dt>Chu kỳ</dt><dd>{selected.period}</dd></div><div><dt>Nhóm</dt><dd>{selected.group ?? "—"}</dd></div><div><dt>Cấu hình electron</dt><dd>{selected.electronConfig}</dd></div></dl>
      </aside>
    </div>
  );
}

export default function ScienceLab() {
  const [active, setActive] = useState<ScienceFeatureId | null>(null);
  const [rendered, setRendered] = useState<ScienceFeatureId | null>(null);
  const { ref, inView, webgl, reduceMotion } = useScienceCapability();
  const webglEnabled = inView && webgl;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => window.dispatchEvent(new CustomEvent("edua:layout-change")), 880);
    return () => window.clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    if (active) return;
    const timer = window.setTimeout(() => setRendered(null), 820);
    return () => window.clearTimeout(timer);
  }, [active]);

  const toggleFeature = (id: ScienceFeatureId) => {
    if (active === id) {
      setActive(null);
      return;
    }
    setRendered(id);
    setActive(id);
  };

  return (
    <div ref={ref} className={styles.scienceLab} data-science-lab data-active={active ?? "none"}>
      <div className={styles.scienceTabs} data-science-tabs>
        {FEATURES.map((feature) => (
          <button key={feature.id} type="button" data-science-tab aria-expanded={active === feature.id} className={`${styles.scienceTab} ${active === feature.id ? styles.scienceTabActive : ""}`} onClick={() => toggleFeature(feature.id)}>
            <SciencePreview kind={feature.id} webglEnabled={webglEnabled} rotating={!reduceMotion} />
            <span className={styles.scienceStat}><strong>{feature.number}</strong><small>{feature.label}</small></span>
            <div><h3>{feature.title}</h3><p>{feature.description}</p></div>
            <i>{active === feature.id ? "×" : "↗"}</i>
          </button>
        ))}
      </div>
      <div className={`${styles.scienceStage} ${active ? styles.scienceStageOpen : ""}`} data-science-stage aria-hidden={!active}>
        {rendered === "simulation" ? <MechanicsSimulationEmbed presetId="dinh-luat-3-newton" active={active === "simulation" && inView && !reduceMotion} appearance="light" autoReplay landingMinimal className={styles.mechanicsEmbed} /> : null}
        {rendered === "molecule" ? <MoleculeDemo enabled={webglEnabled} rotating={active === "molecule" && !reduceMotion} /> : null}
        {rendered === "periodic" ? <PeriodicDemo /> : null}
      </div>
    </div>
  );
}
