// Toán học thuần cho sóng cơ 1 chiều trên dây — không phụ thuộc Konva/React,
// kiểm chứng bằng công thức SGK (giống tinh thần wave/wave-math.ts).

export function waveNumber(wavelength: number): number {
  return (2 * Math.PI) / wavelength;
}

export function angularFrequency(frequency: number): number {
  return 2 * Math.PI * frequency;
}

export function waveSpeed(wavelength: number, frequency: number): number {
  return wavelength * frequency;
}

/**
 * Sóng truyền (traveling wave) trên dây dài: y(x,t) = A·sin(kx − dir·ωt).
 * direction = +1 → truyền sang phải (chiều dương x); −1 → truyền sang trái.
 */
export function travelingDisplacement(
  x: number,
  t: number,
  amplitude: number,
  wavelength: number,
  frequency: number,
  direction: 1 | -1 = 1,
): number {
  const k = waveNumber(wavelength);
  const omega = angularFrequency(frequency);
  return amplitude * Math.sin(k * x - direction * omega * t);
}

/**
 * Sóng dừng trên dây 2 đầu cố định (x=0 và x=L luôn là nút):
 * y(x,t) = 2A·sin(kx)·cos(ωt).
 */
export function standingDisplacement(x: number, t: number, amplitude: number, wavelength: number, frequency: number): number {
  const k = waveNumber(wavelength);
  const omega = angularFrequency(frequency);
  return 2 * amplitude * Math.sin(k * x) * Math.cos(omega * t);
}

/** Điều kiện sóng dừng 2 đầu cố định: L = k·λ/2 (k = số bó sóng nguyên dương) → λ = 2L/k. */
export function wavelengthForHarmonicFixedFixed(length: number, harmonic: number): number {
  return (2 * length) / harmonic;
}

/** Vị trí các nút (biên độ luôn = 0) trên dây 2 đầu cố định, gồm cả 2 đầu dây. */
export function nodePositionsFixedFixed(length: number, harmonic: number): number[] {
  const step = length / harmonic;
  return Array.from({ length: harmonic + 1 }, (_, n) => n * step);
}

/** Vị trí các bụng (biên độ dao động cực đại ±2A) — chính giữa 2 nút liên tiếp. */
export function antinodePositionsFixedFixed(length: number, harmonic: number): number[] {
  const step = length / harmonic;
  return Array.from({ length: harmonic }, (_, n) => (n + 0.5) * step);
}
