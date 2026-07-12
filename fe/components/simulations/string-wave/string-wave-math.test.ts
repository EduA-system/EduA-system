import { describe, it, expect } from "vitest";
import {
  angularFrequency,
  antinodePositionsFixedFixed,
  nodePositionsFixedFixed,
  standingDisplacement,
  travelingDisplacement,
  waveNumber,
  waveSpeed,
  wavelengthForHarmonicFixedFixed,
} from "./string-wave-math";

describe("waveNumber / angularFrequency / waveSpeed", () => {
  it("k = 2π/λ, ω = 2πf, v = λf", () => {
    expect(waveNumber(2)).toBeCloseTo(Math.PI, 9);
    expect(angularFrequency(3)).toBeCloseTo(6 * Math.PI, 9);
    expect(waveSpeed(2, 3)).toBeCloseTo(6, 9);
  });
});

describe("travelingDisplacement", () => {
  it("tại t=0, y(x,0) = A·sin(kx)", () => {
    const A = 2, wavelength = 4, f = 1;
    const k = waveNumber(wavelength);
    for (const x of [0, 0.5, 1, 3]) {
      expect(travelingDisplacement(x, 0, A, wavelength, f)).toBeCloseTo(A * Math.sin(k * x), 9);
    }
  });

  it("truyền sang phải: đỉnh sóng dịch chuyển theo +x khi t tăng — y(x, t) = y(x + v·dt, t + dt)", () => {
    const A = 1, wavelength = 4, f = 2, dir = 1;
    const v = waveSpeed(wavelength, f);
    const dt = 0.01;
    for (const x of [0, 1, 2]) {
      const y1 = travelingDisplacement(x, 0, A, wavelength, f, dir);
      const y2 = travelingDisplacement(x + v * dt, dt, A, wavelength, f, dir);
      expect(y2).toBeCloseTo(y1, 6);
    }
  });

  it("truyền sang trái: đỉnh sóng dịch chuyển theo −x khi t tăng", () => {
    const A = 1, wavelength = 4, f = 2, dir = -1;
    const v = waveSpeed(wavelength, f);
    const dt = 0.01;
    for (const x of [0, 1, 2]) {
      const y1 = travelingDisplacement(x, 0, A, wavelength, f, dir);
      const y2 = travelingDisplacement(x - v * dt, dt, A, wavelength, f, dir);
      expect(y2).toBeCloseTo(y1, 6);
    }
  });
});

describe("standingDisplacement", () => {
  const A = 1.5, wavelength = 4, f = 2;

  it("biên độ tại nút luôn = 0 với mọi t", () => {
    for (const n of [0, 1, 2, 3]) {
      const x = n * (wavelength / 2);
      for (const t of [0, 0.1, 0.37, 1]) {
        expect(standingDisplacement(x, t, A, wavelength, f)).toBeCloseTo(0, 9);
      }
    }
  });

  it("biên độ tại bụng đạt cực đại ±2A khi cos(ωt) = ±1", () => {
    const xAntinode = wavelength / 4; // giữa 2 nút đầu tiên
    const omega = angularFrequency(f);
    const tAtMax = (2 * Math.PI) / omega; // t=0 → cos=1 → cực đại +2A
    expect(standingDisplacement(xAntinode, tAtMax, A, wavelength, f)).toBeCloseTo(2 * A, 6);
  });

  it("y(x,t) = 2A·sin(kx)·cos(ωt) đúng công thức tại điểm bất kỳ", () => {
    const k = waveNumber(wavelength), omega = angularFrequency(f);
    const x = 0.7, t = 0.33;
    expect(standingDisplacement(x, t, A, wavelength, f)).toBeCloseTo(2 * A * Math.sin(k * x) * Math.cos(omega * t), 9);
  });
});

describe("wavelengthForHarmonicFixedFixed / node / antinode positions", () => {
  it("L = k·λ/2 đúng với λ suy ra từ harmonic", () => {
    const length = 6;
    for (const k of [1, 2, 3, 5]) {
      const wavelength = wavelengthForHarmonicFixedFixed(length, k);
      expect((k * wavelength) / 2).toBeCloseTo(length, 9);
    }
  });

  it("số nút = k+1 (gồm cả 2 đầu dây), 2 đầu luôn là nút", () => {
    const length = 6, k = 3;
    const nodes = nodePositionsFixedFixed(length, k);
    expect(nodes).toHaveLength(k + 1);
    expect(nodes[0]).toBeCloseTo(0, 9);
    expect(nodes[nodes.length - 1]).toBeCloseTo(length, 9);
  });

  it("số bụng = k, mỗi bụng đúng giữa 2 nút liên tiếp", () => {
    const length = 6, k = 3;
    const nodes = nodePositionsFixedFixed(length, k);
    const antinodes = antinodePositionsFixedFixed(length, k);
    expect(antinodes).toHaveLength(k);
    for (let i = 0; i < k; i++) {
      expect(antinodes[i]).toBeCloseTo((nodes[i]! + nodes[i + 1]!) / 2, 9);
    }
  });
});
