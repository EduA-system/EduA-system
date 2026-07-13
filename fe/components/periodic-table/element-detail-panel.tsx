"use client";

import { useEffect, useRef, useState } from 'react';
import { CATEGORY_COLORS } from './types';
import type { AtomicWeight, Element } from './types';
import AtomModel3D, {
  SHELL_COLORS, SHELL_NAMES, SUBSHELL_COLORS,
  getShellDistribution, getEnergySubshells,
} from './atom-model-3d-dynamic';

const ELEMENT_GLB: Partial<Record<number, string>> = {};

interface Props {
  element: Element | null;
  onClose: () => void;
}

function formatTemp(c: number | null): string {
  if (c === null) return '—';
  return `${c.toFixed(1)} °C`;
}

function formatVal(v: number | null, unit = ''): string {
  if (v === null) return '—';
  return `${v}${unit ? ' ' + unit : ''}`;
}

function formatAtomicWeight(weight: AtomicWeight): string {
  if (weight === null) return '—';
  if (weight.kind === 'interval') return `${weight.min}–${weight.max}`;
  if (weight.kind === 'mass-number') return `[${weight.value}]`;
  return String(weight.value);
}

const STATE_VI: Record<string, string> = {
  solid: 'Rắn',
  liquid: 'Lỏng',
  gas: 'Khí',
  unknown: 'Không xác định',
};

function EnergyDiagram({ subshells, activeSubshell, onSelect }: {
  subshells: ReturnType<typeof getEnergySubshells>;
  activeSubshell: string | null;
  onSelect: (key: string) => void;
}) {
  return <div className="max-h-44 w-full overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2" aria-label="Sơ đồ mức năng lượng Aufbau">
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mức năng lượng Aufbau (cao → thấp)</div>
    <div className="space-y-1.5">
      {[...subshells].reverse().map(subshell => {
        const active = activeSubshell === subshell.key;
        const color = SUBSHELL_COLORS[subshell.type];
        return <button key={subshell.key} onClick={() => onSelect(subshell.key)} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition" style={active ? { backgroundColor: `${color}22`, boxShadow: `inset 3px 0 ${color}` } : undefined}>
          <span className="w-7 font-mono text-xs font-bold" style={{ color }}>{subshell.key}</span>
          <span className="flex gap-0.5" aria-label={`${subshell.electrons} electron`}>
            {subshell.boxes.map((box, index) => <span key={index} className="flex h-5 w-5 items-center justify-center border border-slate-400 bg-white text-[13px] leading-none text-slate-800">{box.arrows.includes('up') && '↑'}{box.arrows.includes('down') && '↓'}</span>)}
          </span>
        </button>;
      })}
    </div>
  </div>;
}

export function ElementDetailPanel({ element, onClose }: Props) {
  const [shown, setShown] = useState<Element | null>(element);
  const [mode, setMode] = useState<'shell' | 'orbital'>('shell');
  const [activeShell, setActiveShell] = useState<number | null>(null);
  const [activeSubshell, setActiveSubshell] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [pillsCanScrollLeft, setPillsCanScrollLeft] = useState(false);
  const [pillsCanScrollRight, setPillsCanScrollRight] = useState(false);
  const pillsRef = useRef<HTMLDivElement>(null);
  const open = element !== null;

  const updatePillsScroll = () => {
    const el = pillsRef.current;
    if (!el) return;
    setPillsCanScrollLeft(el.scrollLeft > 2);
    setPillsCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    // Re-measure repeatedly so the layout has time to settle after the
    // popup scale-up animation (~300ms) and any pill width changes.
    const ids = [0, 60, 320].map(d => window.setTimeout(updatePillsScroll, d));
    const onResize = () => updatePillsScroll();
    window.addEventListener('resize', onResize);
    return () => {
      ids.forEach(window.clearTimeout);
      window.removeEventListener('resize', onResize);
    };
  }, [mode, shown, open]);

  const scrollPills = (dir: 1 | -1) => {
    pillsRef.current?.scrollBy({ left: dir * 180, behavior: 'smooth' });
  };

  if (element && element !== shown) {
    setShown(element);
    setActiveShell(null);
    setActiveSubshell(null);
    setPaused(false);
  }

  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setShown(null), 220);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const colors = shown ? CATEGORY_COLORS[shown.category] : null;
  const shells = shown ? getShellDistribution(shown.electronConfig) : [];
  const energySubshells = shown ? getEnergySubshells(shown.electronConfig) : [];

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-40 flex items-center justify-center p-3 transition-opacity duration-200 ${
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Popup */}
      <div
        role="dialog"
        className={`relative z-10 flex w-full max-w-[92vw] max-h-[96vh] overflow-hidden rounded-2xl bg-white shadow-2xl
          transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-2'}`}
      >
        {shown && colors && (
          <>
            {/* ── LEFT: info panel ── */}
            <div className="flex w-[420px] shrink-0 flex-col border-r border-gray-100">

              {/* Hero */}
              <div
                className="shrink-0 relative overflow-hidden flex flex-col items-center justify-center py-6 px-5"
                style={{
                  background: `linear-gradient(145deg, ${colors.bg} 0%, ${colors.border}28 100%)`,
                }}
              >
                {/* Dot grid texture across hero */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  aria-hidden
                  style={{ opacity: 0.22 }}
                >
                  <defs>
                    <pattern id={`dots-${shown.atomicNumber}`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill={colors.border} />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#dots-${shown.atomicNumber})`} />
                </svg>

                {/* Bohr atom silhouette on the right */}
                <svg
                  className="absolute -right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  width="160" height="160" viewBox="-80 -80 160 160"
                  aria-hidden
                  style={{ opacity: 0.32 }}
                >
                  <g fill="none" stroke={colors.border} strokeWidth="1.4">
                    <ellipse rx="68" ry="22" />
                    <ellipse rx="68" ry="22" transform="rotate(60)" />
                    <ellipse rx="68" ry="22" transform="rotate(-60)" />
                  </g>
                  <circle r="8" fill={colors.border} />
                  <circle cx="64" cy="-8" r="3.5" fill={colors.border} />
                  <circle cx="-32" cy="18" r="3.5" fill={colors.border} />
                  <circle cx="20" cy="-21" r="3.5" fill={colors.border} />
                  <circle cx="-50" cy="-14" r="3.5" fill={colors.border} />
                </svg>

                {/* Scattered cube / hex decorations */}
                <svg
                  className="absolute left-4 top-3 pointer-events-none"
                  width="22" height="22" viewBox="-11 -11 22 22"
                  aria-hidden
                  style={{ opacity: 0.40 }}
                >
                  <rect x="-7" y="-7" width="14" height="14" fill="none" stroke={colors.border} strokeWidth="1.4" transform="rotate(18)" />
                </svg>
                <svg
                  className="absolute right-3 top-4 pointer-events-none"
                  width="18" height="18" viewBox="-9 -9 18 18"
                  aria-hidden
                  style={{ opacity: 0.42 }}
                >
                  <polygon
                    points="0,-7 6,-3.5 6,3.5 0,7 -6,3.5 -6,-3.5"
                    fill="none" stroke={colors.border} strokeWidth="1.4"
                  />
                </svg>
                <svg
                  className="absolute left-8 bottom-3 pointer-events-none"
                  width="16" height="16" viewBox="-8 -8 16 16"
                  aria-hidden
                  style={{ opacity: 0.38 }}
                >
                  <rect x="-5" y="-5" width="10" height="10" fill="none" stroke={colors.border} strokeWidth="1.3" transform="rotate(-22)" />
                </svg>

                {/* Decorative circle (kept, repositioned subtler) */}
                <span
                  className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full pointer-events-none"
                  style={{ backgroundColor: colors.border + '14' }}
                />

                {/* Symbol + names on same row */}
                <div className="relative z-10 flex items-center gap-4">
                  <span
                    className="font-black leading-none"
                    style={{
                      fontSize: 86,
                      color: colors.text,
                      textShadow: `0 4px 12px ${colors.border}60, 0 10px 32px ${colors.border}35`,
                    }}
                  >
                    {shown.symbol}
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-xl font-bold tracking-wide" style={{ color: colors.text }}>
                      {shown.nameVi}
                    </span>
                    <span className="text-sm font-medium" style={{ color: colors.text, opacity: 0.5 }}>
                      {shown.name}
                    </span>
                  </div>
                </div>

                <span
                  className="relative z-10 mt-3 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest"
                  style={{
                    backgroundColor: colors.border + '22',
                    color: colors.text,
                    border: `1px solid ${colors.border}55`,
                  }}
                >
                  {colors.label}
                </span>
              </div>

              {/* Fade bridge — overlaps hero bottom */}
              <div
                className="shrink-0 h-10 -mt-10 relative z-10 pointer-events-none"
                style={{ background: `linear-gradient(to bottom, transparent, #ffffff)` }}
              />

              {/* Scrollable info + arrow */}
              <div className="relative flex-1 min-h-0">
                <div className="h-full overflow-y-auto px-5 pt-3 pb-10 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">


                {/* Basic info */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                    <span className="h-3 w-[3px] rounded-full" style={{ backgroundColor: colors.border }} />
                    Thông tin cơ bản
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {[
                      { label: 'Khối lượng nguyên tử chuẩn', val: formatAtomicWeight(shown.atomicWeight) },
                      { label: 'Chu kỳ / Nhóm', val: `${shown.period} / ${shown.group ?? 'f-block'}` },
                      { label: 'Khối', val: shown.block.toUpperCase() + '-block' },
                      { label: 'Trạng thái', val: STATE_VI[shown.state] },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">{label}</div>
                        <div className="font-bold text-gray-800 text-base">{val}</div>
                      </div>
                    ))}
                  </dl>
                </section>

                {/* Electron structure */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                    <span className="h-3 w-[3px] rounded-full" style={{ backgroundColor: colors.border }} />
                    Cấu trúc electron
                  </h3>
                  <div className="mb-3 rounded-xl px-4 py-3 font-mono text-sm leading-relaxed bg-gray-50 border border-gray-100 text-gray-700">
                    {shown.electronConfig}
                  </div>
                  <div className="flex flex-nowrap items-center justify-center gap-5">
                    {[
                      { label: 'Proton', val: shown.protons,     dot: '#ef4444' },
                      { label: 'Electron', val: shown.electrons, dot: colors.border },
                    ].map(({ label, val, dot }) => (
                      <div key={label} className="flex items-center gap-1.5 shrink-0">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                        <span className="text-sm text-gray-500 whitespace-nowrap">{label}</span>
                        <span className="font-bold text-gray-800 text-sm">{val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Đồng vị minh họa: </span>
                    {shown.representativeIsotope
                      ? `${shown.symbol}-${shown.representativeIsotope.massNumber} · ${shown.protons} proton · ${shown.representativeIsotope.neutronCount} neutron`
                      : 'Chưa có đồng vị đại diện'}
                  </div>
                </section>

                {/* Physical properties */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                    <span className="h-3 w-[3px] rounded-full" style={{ backgroundColor: colors.border }} />
                    Tính chất vật lý
                  </h3>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    {[
                      { label: 'Nóng chảy', val: formatTemp(shown.meltingPoint) },
                      { label: 'Sôi', val: formatTemp(shown.boilingPoint) },
                      { label: 'Khối lượng riêng', val: formatVal(shown.density, 'g/cm³') },
                      { label: 'Bán kính van der Waals', val: formatVal(shown.vanDerWaalsRadius, 'pm') },
                    ].map(({ label, val }, idx) => (
                      <div
                        key={label}
                        className="flex items-center justify-between px-4 py-2.5"
                        style={{ backgroundColor: idx % 2 === 0 ? '#fafafa' : '#ffffff' }}
                      >
                        <span className="text-sm text-gray-400">{label}</span>
                        <span className="font-semibold text-gray-800 text-sm">{val}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Chemical properties */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                    <span className="h-3 w-[3px] rounded-full" style={{ backgroundColor: colors.border }} />
                    Tính chất hóa học
                  </h3>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    {[
                      { label: 'Độ âm điện (Pauling)', val: formatVal(shown.electronegativity) },
                      { label: 'Năng lượng ion hóa', val: formatVal(shown.ionizationEnergy, 'kJ/mol') },
                      { label: 'Ái lực electron', val: formatVal(shown.electronAffinity, 'kJ/mol') },
                    ].map(({ label, val }, idx) => (
                      <div
                        key={label}
                        className="flex items-center justify-between px-4 py-2.5"
                        style={{ backgroundColor: idx % 2 === 0 ? '#fafafa' : '#ffffff' }}
                      >
                        <span className="text-sm text-gray-400">{label}</span>
                        <span className="font-semibold text-gray-800 text-sm">{val}</span>
                      </div>
                    ))}
                  </div>
                </section>

                </div>

                {/* Scroll arrow */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 flex flex-col items-center justify-end pb-2"
                  style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.96))' }}
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gray-300 animate-bounce">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l5 5 5-5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* ── RIGHT: atom model ── */}
            <div className="relative flex flex-1 flex-col min-w-0 bg-white">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-xl leading-none text-gray-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-gray-900 hover:scale-110"
                aria-label="Đóng"
              >
                ×
              </button>

              {/* Mode toggle (top-left of canvas) */}
              <div className="absolute left-4 top-4 z-10 flex rounded-lg bg-white/85 p-1 shadow-sm backdrop-blur">
                {(['shell', 'orbital'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setActiveShell(null);
                      setActiveSubshell(m === 'orbital' ? energySubshells.at(-1)?.key ?? null : null);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                      mode === m ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {m === 'shell' ? 'Lớp' : 'Orbital'}
                  </button>
                ))}
              </div>

              {/* Canvas */}
              <div className="flex-1 min-h-[600px]">
                <AtomModel3D
                  atomicNumber={shown.atomicNumber}
                  protons={shown.protons}
                  neutrons={shown.representativeIsotope?.neutronCount ?? null}
                  categoryColor={colors.border}
                  electronConfig={shown.electronConfig}
                  glbPath={ELEMENT_GLB[shown.atomicNumber]}
                  mode={mode}
                  activeShell={activeShell}
                  activeSubshell={activeSubshell}
                  paused={paused}
                />
              </div>

              <p className="shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-2 text-center text-[11px] leading-relaxed text-slate-500">
                Chế độ Lớp minh họa phân bố theo lớp chính. Chế độ Orbital hiển thị các hạt e⁻ theo phân lớp; vòng và chuyển động là quy ước trực quan, không phải quỹ đạo vật lý thực.
                {!shown.representativeIsotope && ' Hạt nhân chỉ hiển thị proton vì chưa có đồng vị minh họa.'}
              </p>

              {/* Selector — two rows: legend+controls on top, scrollable pills below */}
              <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-2 space-y-2">

                {/* Row 1 — legend + active info + pause */}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {mode === 'shell' && activeShell != null && (
                    <span
                      className="font-medium truncate"
                      style={{ color: SHELL_COLORS[activeShell % SHELL_COLORS.length] }}
                    >
                      Lớp {SHELL_NAMES[shells[activeShell].n - 1]}: {shells[activeShell].electrons} electron
                      {activeShell === 0 && ' (lớp trong cùng)'}
                      {activeShell === shells.length - 1 && activeShell > 0 && ' (lớp ngoài cùng)'}
                    </span>
                  )}
                  {mode === 'orbital' && activeSubshell != null && (
                    <span className="font-medium truncate" style={{ color: SUBSHELL_COLORS[activeSubshell.slice(-1) as 's'|'p'|'d'|'f'] }}>
                      Orbital {activeSubshell}
                    </span>
                  )}

                  <span className="ml-auto shrink-0 flex items-center gap-3">
                    {mode === 'orbital' ? (
                      (['s', 'p', 'd', 'f'] as const).map(t => (
                        <span key={t} className="flex items-center gap-1.5">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: SUBSHELL_COLORS[t] }} />
                          {t}
                        </span>
                      ))
                    ) : (
                      <>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-3 w-3 rounded-full bg-red-400" />
                          Proton
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-3 w-3 rounded-full bg-slate-400" />
                          Neutron
                        </span>
                      </>
                    )}
                    <button
                      onClick={() => setPaused(p => !p)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
                      aria-label={paused ? 'Tiếp tục' : 'Dừng'}
                      title={paused ? 'Tiếp tục' : 'Dừng chuyển động'}
                    >
                      {paused ? (
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M3 2.5l10 5.5-10 5.5V2.5z"/></svg>
                      ) : (
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M4 2h3v12H4V2zm5 0h3v12H9V2z"/></svg>
                      )}
                    </button>
                  </span>
                </div>

                {/* Row 2 — scrollable pill list with arrow indicators */}
                <div className="relative">
                  <div
                    ref={pillsRef}
                    onScroll={updatePillsScroll}
                    className="flex items-center gap-2 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden scroll-smooth pr-8"
                  >
                  <span className="shrink-0 text-[11px] font-medium text-gray-400">
                    {mode === 'shell' ? 'Lớp:' : 'Orbital:'}
                  </span>
                  {mode === 'shell'
                    ? shells.map((shell, i) => {
                        const eCount = shell.electrons;
                        const isActive = activeShell === i;
                        const c = SHELL_COLORS[i % SHELL_COLORS.length];
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveShell(isActive ? null : i)}
                            className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-150"
                            style={
                              isActive
                                ? { backgroundColor: c, color: '#fff', boxShadow: `0 0 0 3px ${c}40` }
                                : { backgroundColor: '#f1f5f9', color: '#64748b' }
                            }
                          >
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
                            {SHELL_NAMES[i]}: {eCount}e⁻
                          </button>
                        );
                      })
                    : <EnergyDiagram subshells={energySubshells} activeSubshell={activeSubshell} onSelect={setActiveSubshell} />}
                  </div>

                  {/* Left scroll arrow */}
                  {pillsCanScrollLeft && (
                    <button
                      onClick={() => scrollPills(-1)}
                      className="absolute left-0 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md text-gray-600 hover:text-gray-900 hover:scale-110 transition"
                      style={{ boxShadow: '0 0 0 4px white, 0 2px 6px rgba(0,0,0,0.15)' }}
                      aria-label="Cuộn trái"
                    >
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l-6 5 6 5" />
                      </svg>
                    </button>
                  )}

                  {/* Right scroll arrow + fade */}
                  {pillsCanScrollRight && (
                    <>
                      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12"
                        style={{ background: 'linear-gradient(to right, transparent, #ffffff 60%)' }} />
                      <button
                        onClick={() => scrollPills(1)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-600 hover:text-gray-900 hover:scale-110 transition"
                        style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
                        aria-label="Cuộn phải"
                      >
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 5l6 5-6 5" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
