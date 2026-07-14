import type { Preset } from "./types";

function collisionResult(p: Record<string, number>) {
  const mA = p.mA ?? 1;
  const mB = p.mB ?? 1;
  const vA = p.vA ?? 4;
  const vAfterA = ((mA - mB) / (mA + mB)) * vA;
  const vAfterB = ((2 * mA) / (mA + mB)) * vA;
  return { mA, mB, vA, vAfterA, vAfterB };
}

function caseLabel(mA: number, mB: number): string {
  const ratio = mA / mB;
  if (ratio > 1.5) return "A nặng hơn B: cả hai cùng đi về phía trước";
  if (ratio < 1 / 1.5) return "A nhẹ hơn B: A bật ngược lại, B nhích về phía trước";
  return "Hai vật gần bằng nhau: A gần như dừng, B đi về phía trước";
}

export const lucTuongTacHaiXe: Preset = {
  id: "luc-tuong-tac-hai-xe",
  title: "Lực tương tác giữa hai xe",
  domain: "Cơ học",
  grade: 10,
  desc: "Vật A chuyển động tới va chạm vật B đứng yên, quan sát vận tốc sau va chạm theo khối lượng hai vật.",
  objective: "Hiểu định luật III Newton trong va chạm: trong lúc tương tác, hai lực luôn cùng độ lớn và ngược chiều; chuyển động sau va chạm phụ thuộc khối lượng mỗi vật.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "mA", label: "Khối lượng vật A", unit: "kg", min: 0.5, max: 8, step: 0.1, default: 1 },
    { key: "mB", label: "Khối lượng vật B", unit: "kg", min: 0.5, max: 8, step: 0.1, default: 1 },
    { key: "vA", label: "Vận tốc ban đầu của A", unit: "m/s", min: 1, max: 8, step: 0.5, default: 4 },
    { key: "friction", label: "Hệ số ma sát", unit: "", min: 0, max: 0.4, step: 0.02, default: 0 },
  ],
  applyParams: (p) => {
    const { mA, mB, vA } = collisionResult(p);
    const friction = p.friction ?? 0;
    return {
      restitution: 1,
      bodies: [
        { id: "vat-a", x: -3, y: 0.32, vx: vA, vy: 0, mass: mA, radius: 0.32 },
        { id: "vat-b", x: 1, y: 0.32, vx: 0, vy: 0, mass: mB, radius: 0.32 },
      ],
      forces: [{ kind: "gravity", g: 9.8 }],
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction }],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "before-collision",
        label: "Trước va chạm",
        description: "Vật A chuyển động về phía vật B; vật B đứng yên. Đây là va chạm một chiều trên mặt phẳng gần như nhẵn.",
        atTime: () => 0,
        values: (p) => {
          const { mA, mB, vA } = collisionResult(p);
          return [
            { label: "mA", value: mA.toFixed(1), unit: "kg" },
            { label: "mB", value: mB.toFixed(1), unit: "kg" },
            { label: "vA ban đầu", value: vA.toFixed(2), unit: "m/s" },
            { label: "vB ban đầu", value: "0.00", unit: "m/s" },
          ];
        },
      },
      {
        key: "interaction-pair",
        label: "Trong lúc va chạm",
        description: "Theo định luật III Newton, lực A tác dụng lên B và lực B tác dụng lên A có cùng độ lớn, cùng phương, ngược chiều. Hai lực này đặt lên hai vật khác nhau.",
        values: () => [
          { label: "Quan hệ lực", value: "FAB = -FBA", unit: "" },
          { label: "Độ lớn", value: "|FAB| = |FBA|", unit: "" },
          { label: "Lưu ý", value: "lực bằng nhau, gia tốc có thể khác nhau", unit: "" },
        ],
      },
      {
        key: "after-collision",
        label: "Sau va chạm đàn hồi",
        description: "Kết quả phụ thuộc vào tỉ lệ khối lượng. Nếu hai vật bằng nhau, A dừng và B đi tiếp; nếu A nặng hơn, cả hai cùng tiến; nếu A nhẹ hơn, A bật ngược lại.",
        atTime: (p) => {
          const vA = p.vA ?? 4;
          return vA > 0 ? 3.36 / vA + 0.2 : 0;
        },
        values: (p) => {
          const { mA, mB, vAfterA, vAfterB } = collisionResult(p);
          return [
            { label: "vA'", value: vAfterA.toFixed(2), unit: "m/s" },
            { label: "vB'", value: vAfterB.toFixed(2), unit: "m/s" },
            { label: "Trường hợp", value: caseLabel(mA, mB), unit: "" },
          ];
        },
      },
      {
        key: "momentum-energy",
        label: "Động lượng và động năng",
        description: "Trong mô hình đàn hồi lí tưởng trên mặt nhẵn, động lượng và động năng của hệ được bảo toàn.",
        values: (p) => {
          const { mA, mB, vA, vAfterA, vAfterB } = collisionResult(p);
          const p0 = mA * vA;
          const p1 = mA * vAfterA + mB * vAfterB;
          const e0 = 0.5 * mA * vA * vA;
          const e1 = 0.5 * mA * vAfterA * vAfterA + 0.5 * mB * vAfterB * vAfterB;
          return [
            { label: "Động lượng đầu", value: p0.toFixed(2), unit: "kg·m/s" },
            { label: "Động lượng sau", value: p1.toFixed(2), unit: "kg·m/s" },
            { label: "Động năng đầu", value: e0.toFixed(2), unit: "J" },
            { label: "Động năng sau", value: e1.toFixed(2), unit: "J" },
          ];
        },
      },
    ],
  },
};