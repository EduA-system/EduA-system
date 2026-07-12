import { describe, it, expect } from "vitest";
import {
  activationTime,
  averageIntensityCausal,
  averageIntensityWithReveal,
  calculateFringeSpacingApproximation,
  causalEnvelope,
  distanceFromSlit,
  effectiveAmplitude,
  instantaneousFieldCausal,
  opticalPathToSlit,
  pathDifference,
  phaseDifference,
  screenAngle,
  screenIntensity,
  singleSlitEnvelope,
  singleSourceField,
  singleSourceIntensity,
  singleSourceIntensityWithReveal,
  slitPositions,
  totalOpticalPath,
  twoStageAmplitude,
  waveSpeed,
  type Point,
  type WaveParams,
} from "./physics";

const baseParams: WaveParams = {
  wavelength: 20,
  frequency: 1,
  amplitude: 1,
  slitSeparation: 80,
  slitWidth: 0,
  screenDistance: 350,
  sourceOffsetY: 0,
  amplitudeDecay: false,
  singleSlitDiffraction: false,
};

const xSingleSlit = -140;
const xSlits = 0;
const source: Point = { x: xSingleSlit, y: 0 };
const { s1, s2 } = slitPositions(xSlits, baseParams.slitSeparation);

/** Nhị phân tìm y (P trên màn tại x cố định) sao cho ΔL ≈ target, khi source trên trung trực (R1=R2 nên ΔL=Δr). */
function findYForDeltaL(target: number, x: number, src: Point, yMax = 3000): number {
  if (target > 0) return -findYForDeltaL(-target, x, src, yMax);
  let lo = 0, hi = yMax;
  const deltaAt = (y: number) => {
    const p = { x, y };
    const R1 = opticalPathToSlit(src, s1), R2 = opticalPathToSlit(src, s2);
    const L1 = totalOpticalPath(R1, distanceFromSlit(s1, p));
    const L2 = totalOpticalPath(R2, distanceFromSlit(s2, p));
    return pathDifference(L1, L2);
  };
  const deltaLo = deltaAt(lo), deltaHi = deltaAt(hi);
  if (target > deltaLo || target < deltaHi) throw new Error("target ngoài khoảng nhị phân — tăng yMax");
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (deltaAt(mid) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

describe("causalEnvelope — bao nhân quả (test 1, 3, 4)", () => {
  it("t ≤ arrivalTime → 0 (sóng CHƯA tới, không được xuất hiện)", () => {
    expect(causalEnvelope(0, 5, 1)).toBe(0);
    expect(causalEnvelope(4.9, 5, 1)).toBe(0);
    expect(causalEnvelope(5, 5, 1)).toBe(0);
  });

  it("tăng tuyến tính từ 0 → 1 trong khoảng fadeDuration ngay sau arrivalTime", () => {
    expect(causalEnvelope(5.5, 5, 1)).toBeCloseTo(0.5, 9);
    expect(causalEnvelope(6, 5, 1)).toBeCloseTo(1, 9);
    expect(causalEnvelope(10, 5, 1)).toBe(1);
  });
});

describe("activationTime", () => {
  it("= khoảng cách / tốc độ truyền", () => {
    const a: Point = { x: 0, y: 0 }, b: Point = { x: 30, y: 40 };
    expect(activationTime(a, b, 10)).toBeCloseTo(5, 9); // 50/10
  });
});

describe("instantaneousFieldCausal — nhân quả tại 1 điểm (test 1, 2, 3, 4)", () => {
  const v = waveSpeed(baseParams.wavelength, baseParams.frequency);
  const pFarBehindSlits: Point = { x: xSlits + baseParams.screenDistance, y: 0 };

  it("test 1: tại t rất nhỏ (sóng chưa kịp rời khe S), trường tại P phía sau 2 khe = 0", () => {
    const u = instantaneousFieldCausal(pFarBehindSlits, source, s1, s2, 0.001, baseParams);
    expect(u).toBeCloseTo(0, 9);
  });

  it("test 3/4: TRƯỚC khi sóng từ S tới S1/S2 (t < R1/v và t < R2/v), trường tại 1 điểm P bất kỳ đều = 0 (chưa có nhánh nào kịp bắt đầu, không nói tới cả tới P)", () => {
    const R1 = opticalPathToSlit(source, s1);
    const tBeforeSlits = (R1 / v) * 0.5; // chắc chắn còn trước khi tới CẢ S1 lẫn S2
    const u = instantaneousFieldCausal(pFarBehindSlits, source, s1, s2, tBeforeSlits, baseParams);
    expect(u).toBeCloseTo(0, 9);
  });

  it("SAU khi cả 2 nhánh đã tới P đủ lâu, trường khác 0 (dao động thật sự xảy ra)", () => {
    const R1 = opticalPathToSlit(source, s1);
    const r1 = distanceFromSlit(s1, pFarBehindSlits);
    const arrival1 = totalOpticalPath(R1, r1) / v;
    let sawNonZero = false;
    for (let dt = 0; dt < 3; dt += 0.05) {
      const u = instantaneousFieldCausal(pFarBehindSlits, source, s1, s2, arrival1 + 2 + dt, baseParams);
      if (Math.abs(u) > 1e-6) sawNonZero = true;
    }
    expect(sawNonZero).toBe(true);
  });
});

describe("twoStageAmplitude / effectiveAmplitude", () => {
  it("tắt suy giảm → biên độ không đổi qua mọi tầng truyền", () => {
    expect(twoStageAmplitude(2, 50, 100, false)).toBe(2);
    expect(effectiveAmplitude(2, 999, false)).toBe(2);
  });
  it("bật suy giảm → nhân 1/√R rồi 1/√r (2 tầng, không phải 1 tầng)", () => {
    const A = twoStageAmplitude(2, 4, 9, true); // 2/√4=1, rồi 1/√9=1/3
    expect(A).toBeCloseTo((2 / Math.sqrt(4)) / Math.sqrt(9), 9);
  });
});

describe("averageIntensityCausal — cực đại/cực tiểu dùng ΔL đúng, không phải Δr (test 7)", () => {
  const x = xSlits + baseParams.screenDistance;

  it("nguồn S trên trung trực (sourceOffsetY=0): P trên trung trực (y=0) → R1=R2, r1=r2, ΔL=0 → cực đại trung tâm ở ĐÚNG y=0", () => {
    const p: Point = { x, y: 0 };
    const I = averageIntensityCausal(p, source, s1, s2, baseParams);
    expect(I).toBeCloseTo((2 * baseParams.amplitude) ** 2, 6);
  });

  it("ΔL = m·λ → cực đại (2A)²; ΔL = (m+½)·λ → cực tiểu 0 (khi tắt suy giảm)", () => {
    for (const m of [0, 1, -1]) {
      const y = findYForDeltaL(m * baseParams.wavelength, x, source);
      const I = averageIntensityCausal({ x, y }, source, s1, s2, baseParams);
      expect(I).toBeCloseTo((2 * baseParams.amplitude) ** 2, 2);
    }
    for (const m of [0, 1]) {
      const y = findYForDeltaL((m + 0.5) * baseParams.wavelength, x, source);
      const I = averageIntensityCausal({ x, y }, source, s1, s2, baseParams);
      expect(I).toBeCloseTo(0, 2);
    }
  });

  it("phân bố đối xứng qua y=0 khi nguồn S trên trung trực", () => {
    for (const y of [10, 47.3, 120]) {
      const Ipos = averageIntensityCausal({ x, y }, source, s1, s2, baseParams);
      const Ineg = averageIntensityCausal({ x, y: -y }, source, s1, s2, baseParams);
      expect(Ipos).toBeCloseTo(Ineg, 9);
    }
  });
});

describe("Nguồn S lệch trục → hệ vân dịch (test 8)", () => {
  it("S lệch khỏi trung trực → tại y=0, R1 ≠ R2 nên ΔL ≠ 0 (vân trung tâm KHÔNG còn ở y=0)", () => {
    const offSource: Point = { x: xSingleSlit, y: 30 };
    const p: Point = { x: xSlits + baseParams.screenDistance, y: 0 };
    const R1 = opticalPathToSlit(offSource, s1), R2 = opticalPathToSlit(offSource, s2);
    expect(R1).not.toBeCloseTo(R2, 3);
    const r1 = distanceFromSlit(s1, p), r2 = distanceFromSlit(s2, p);
    const deltaL = pathDifference(totalOpticalPath(R1, r1), totalOpticalPath(R2, r2));
    expect(Math.abs(deltaL)).toBeGreaterThan(0.1);
  });

  it("S lệch trục → cường độ tại y=0 KHÔNG còn là cực đại tuyệt đối (bị dịch đi nơi khác)", () => {
    const offParams: WaveParams = { ...baseParams, sourceOffsetY: 30 };
    const offSource: Point = { x: xSingleSlit, y: 30 };
    const x = xSlits + baseParams.screenDistance;
    const Iat0 = averageIntensityCausal({ x, y: 0 }, offSource, s1, s2, offParams);
    expect(Iat0).toBeLessThan((2 * offParams.amplitude) ** 2 - 0.01);
  });
});

describe("averageIntensityWithReveal — sáng dần theo thời gian tới (test 5, 6)", () => {
  const v = waveSpeed(baseParams.wavelength, baseParams.frequency);
  const p: Point = { x: xSlits + baseParams.screenDistance, y: 0 };

  it("test 5: trước khi CẢ HAI nhánh tới P, cường độ hiển thị = 0 (tối hoàn toàn)", () => {
    const R1 = opticalPathToSlit(source, s1);
    const r1 = distanceFromSlit(s1, p);
    const arrival1 = totalOpticalPath(R1, r1) / v;
    const I = averageIntensityWithReveal(p, source, s1, s2, arrival1 * 0.1, baseParams);
    expect(I).toBe(0);
  });

  it("test 6: sau khi cả 2 nhánh tới đủ lâu (env=1 cả 2 phía), cường độ hiển thị = cường độ ổn định", () => {
    const R1 = opticalPathToSlit(source, s1);
    const r1 = distanceFromSlit(s1, p);
    const arrival1 = totalOpticalPath(R1, r1) / v;
    const R2 = opticalPathToSlit(source, s2);
    const r2 = distanceFromSlit(s2, p);
    const arrival2 = totalOpticalPath(R2, r2) / v;
    const tLate = Math.max(arrival1, arrival2) + 10;
    const steady = averageIntensityCausal(p, source, s1, s2, baseParams);
    const revealed = averageIntensityWithReveal(p, source, s1, s2, tLate, baseParams);
    expect(revealed).toBeCloseTo(steady, 6);
  });
});

describe("singleSourceField / singleSourceIntensity — vùng giữa khe S và vách khe kép (Giai đoạn 3)", () => {
  const v = waveSpeed(baseParams.wavelength, baseParams.frequency);
  const pBetween: Point = { x: xSingleSlit + 50, y: 5 }; // nằm giữa khe S và vách khe kép

  it("trước khi sóng từ S tới điểm này → trường = 0", () => {
    const r = distanceFromSlit(source, pBetween);
    const arrival = r / v;
    const u = singleSourceField(pBetween, source, arrival * 0.3, baseParams);
    expect(u).toBeCloseTo(0, 9);
  });

  it("sau khi sóng tới đủ lâu → trường dao động khác 0", () => {
    const r = distanceFromSlit(source, pBetween);
    const arrival = r / v;
    let sawNonZero = false;
    for (let dt = 0; dt < 3; dt += 0.05) {
      if (Math.abs(singleSourceField(pBetween, source, arrival + 2 + dt, baseParams)) > 1e-6) sawNonZero = true;
    }
    expect(sawNonZero).toBe(true);
  });

  it("singleSourceIntensityWithReveal → 0 trước khi tới, tiến tới singleSourceIntensity khi ổn định", () => {
    const r = distanceFromSlit(source, pBetween);
    const arrival = r / v;
    expect(singleSourceIntensityWithReveal(pBetween, source, arrival * 0.1, baseParams)).toBeCloseTo(0, 9);
    const steady = singleSourceIntensity(pBetween, source, baseParams);
    const revealed = singleSourceIntensityWithReveal(pBetween, source, arrival + 10, baseParams);
    expect(revealed).toBeCloseTo(steady, 6);
  });
});

describe("calculateFringeSpacingApproximation — khoảng vân i ≈ λD/a", () => {
  it("a tăng → khoảng vân giảm; λ tăng → khoảng vân tăng; D tăng → khoảng vân tăng", () => {
    expect(calculateFringeSpacingApproximation(20, 350, 120)).toBeLessThan(calculateFringeSpacingApproximation(20, 350, 60));
    expect(calculateFringeSpacingApproximation(30, 350, 80)).toBeGreaterThan(calculateFringeSpacingApproximation(15, 350, 80));
    expect(calculateFringeSpacingApproximation(20, 500, 80)).toBeGreaterThan(calculateFringeSpacingApproximation(20, 200, 80));
  });
  it("khớp công thức i = λD/a", () => {
    expect(calculateFringeSpacingApproximation(20, 350, 80)).toBeCloseTo((20 * 350) / 80, 9);
  });
});

describe("phaseDifference", () => {
  it("ΔL = λ → Δφ = 2π; ΔL = λ/2 → Δφ = π", () => {
    expect(phaseDifference(20, 20)).toBeCloseTo(2 * Math.PI, 9);
    expect(phaseDifference(10, 20)).toBeCloseTo(Math.PI, 9);
  });
});

describe("screenAngle", () => {
  it("chính xác dùng atan2; gần đúng trả về y/D; 2 chế độ lệch nhau khi góc lớn", () => {
    expect(screenAngle(300, 350, false)).toBeCloseTo(Math.atan2(300, 350), 9);
    expect(screenAngle(300, 350, true)).toBeCloseTo(300 / 350, 9);
    expect(Math.abs(screenAngle(300, 350, false) - screenAngle(300, 350, true))).toBeGreaterThan(0.01);
  });
});

describe("singleSlitEnvelope (test 9 — độ rộng khe → bao nhiễu xạ)", () => {
  it("slitWidth ≤ 0 → luôn = 1 (khe lý tưởng)", () => {
    expect(singleSlitEnvelope(0.5, 0, 20)).toBe(1);
  });
  it("theta = 0 → envelope = 1 (đỉnh trung tâm)", () => {
    expect(singleSlitEnvelope(0, 8, 20)).toBeCloseTo(1, 9);
  });
  it("khe RỘNG hơn (b lớn hơn) → bao nhiễu xạ hẹp hơn (giảm nhanh hơn theo góc) — sóng ít loe hơn", () => {
    const theta = 0.15;
    const narrow = singleSlitEnvelope(theta, 4, 20);
    const wide = singleSlitEnvelope(theta, 16, 20);
    expect(wide).toBeLessThan(narrow);
  });
  it("envelope luôn trong [0, 1]", () => {
    for (const theta of [0.05, 0.1, 0.2, 0.4, 0.8]) {
      const e = singleSlitEnvelope(theta, 8, 20);
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(1);
    }
  });
});

describe("screenIntensity (công thức Fraunhofer gần đúng, để so sánh)", () => {
  it("theta = 0 → I = I0 khi tắt bao nhiễu xạ", () => {
    expect(screenIntensity(0, { ...baseParams, singleSlitDiffraction: false }, 1)).toBeCloseTo(1, 9);
  });
  it("bật bao nhiễu xạ → I luôn ≤ I không bao", () => {
    const theta = 0.15;
    const withEnvelope = screenIntensity(theta, { ...baseParams, slitWidth: 8, singleSlitDiffraction: true }, 1);
    const withoutEnvelope = screenIntensity(theta, { ...baseParams, singleSlitDiffraction: false }, 1);
    expect(withEnvelope).toBeLessThanOrEqual(withoutEnvelope + 1e-9);
  });
});
