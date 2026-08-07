import type { Preset } from "./types";

const MIN_LENGTH = 0.4;
const MAX_LENGTH = 2.4;

function values(p: Record<string, number>) {
  const L = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, p.L ?? 1.2));
  const angleDeg = p.angle ?? 40;
  const m = p.m ?? 0.5;
  const g = p.g ?? 9.8;
  const th = (angleDeg * Math.PI) / 180;
  const hMax = L * (1 - Math.cos(th)); // độ cao của bob so với điểm thấp nhất
  const WtMax = m * g * hMax; // thế năng ở biên (cũng là cơ năng toàn phần)
  const vBottom = Math.sqrt(Math.max(0, 2 * g * hMax)); // tốc độ ở vị trí thấp nhất
  const WdBottom = 0.5 * m * vBottom * vBottom; // động năng ở đáy = Wt biên
  const T = 2 * Math.PI * Math.sqrt(L / g); // chu kỳ (con lắc, gần đúng biên nhỏ)
  return { L, angleDeg, m, g, th, hMax, WtMax, vBottom, WdBottom, T };
}

export const baoToanCoNangConLac: Preset = {
  id: "bao-toan-co-nang-con-lac",
  title: "Bảo toàn cơ năng: con lắc",
  domain: "Dao động & Sóng",
  grade: 10,
  desc: "Con lắc dao động quanh vị trí cân bằng, khảo sát sự chuyển hoá và bảo toàn cơ năng khi chỉ có trọng lực.",
  objective:
    "Chứng minh cơ năng W = Wđ + Wt được bảo toàn khi vật chỉ chịu trọng lực: tại biên Wt lớn nhất còn Wđ = 0, tại vị trí thấp nhất Wđ lớn nhất còn Wt = 0, và tổng cơ năng không đổi trong suốt quá trình dao động.",
  sgkRef: "Vật lí 10, Bài 26",
  minimalOverlay: true,
  paramGuide:
    "Quan sát quả nặng con lắc đổi qua lại giữa thế năng trọng trường và động năng. Ở biên, vật cao nhất nên thế năng lớn nhất; khi đi qua vị trí thấp nhất, tốc độ và động năng lớn nhất, còn cơ năng không đổi khi chỉ chịu tác động của trọng lực. Thay đổi các tham số bên dưới để xem cơ năng, tốc độ và chu kỳ dao động thay đổi như thế nào.",
  params: [
    {
      key: "L",
      label: "Chiều dài dây",
      unit: "m",
      min: 0.4,
      max: MAX_LENGTH,
      step: 0.1,
      default: 1.2,
      description: "Dây càng dài, con lắc dao động càng chậm và chu kỳ càng lớn. Với cùng góc thả, dây dài hơn cũng làm độ cao nâng lên lớn hơn.",
    },
    {
      key: "angle",
      label: "Góc thả",
      unit: "°",
      min: 5,
      max: 75,
      step: 1,
      default: 40,
      description: "Góc thả càng lớn, quả nặng được nâng cao hơn nên thế năng ban đầu và tốc độ khi qua vị trí thấp nhất càng lớn.",
    },
    {
      key: "m",
      label: "Khối lượng vật",
      unit: "kg",
      min: 0.1,
      max: 3,
      step: 0.1,
      default: 0.5,
      description: "Khối lượng càng lớn thì thế năng, động năng và cơ năng càng lớn; nếu bỏ qua ma sát, tốc độ của vật không phụ thuộc khối lượng.",
    },
    {
      key: "g",
      label: "Gia tốc trọng trường",
      unit: "m/s²",
      min: 1.6,
      max: 20,
      step: 0.1,
      default: 9.8,
      description: "g càng lớn, trọng lực càng mạnh: con lắc qua đáy nhanh hơn và chu kỳ dao động ngắn hơn.",
    },
  ],
  applyParams: (p) => {
    const { L, m, g, th } = values(p);
    const px = 0, py = L + 0.85;
    return {
      bodies: [
        {
          id: "pivot",
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          mass: 1,
          fixed: true,
          visual: { shape: "pendulumPivot", color: "#2dd4bf" },
        },
        {
          id: "bob",
          x: px + L * Math.sin(th),
          y: py - L * Math.cos(th),
          vx: 0,
          vy: 0,
          mass: m,
          radius: 0.16,
          visual: { shape: "pendulumBob", color: "#2dd4bf", label: "m" },
        },
      ],
      forces: [{ kind: "gravity", g }],
      constraints: [{ kind: "rod", a: "pivot", b: "bob", length: L, appearance: "pendulum" }],
      // Khung nhìn cố định theo chiều dài dây để con lắc dài không bị ép sát mép dưới.
      view: { minX: -L - 0.55, maxX: L + 0.55, minY: 0, maxY: py + 0.5 },
      groundPaddingRatio: 0.22,
      preferredScale: 150,
      disableDragging: true,
      conserveMechanicalEnergy: true,
    };
  },
  trackingLabels: { bob: "Quả nặng con lắc" },
  analysis: {
    landmarks: [
      {
        key: "extreme",
        label: "Tại biên (góc thả)",
        description: "Vị trí thả có góc lệch cực đại. Vật đứng yên nên động năng bằng 0, còn thế năng lớn nhất. Toàn bộ cơ năng lúc này là thế năng.",
        atTime: () => 0,
        values: (p) => {
          const { angleDeg, hMax, WtMax } = values(p);
          return [
            { label: "Góc thả", value: angleDeg.toFixed(0), unit: "°" },
            { label: "Độ cao h = ℓ(1 − cosα)", value: hMax.toFixed(3), unit: "m" },
            { label: "Thế năng Wt = mgh", value: WtMax.toFixed(3), unit: "J" },
            { label: "Động năng Wđ", value: "0", unit: "J" },
          ];
        },
      },
      {
        key: "lowest",
        label: "Vị trí thấp nhất",
        description: "Dây thẳng đứng, sau 1/4 chu kỳ: thế năng bằng 0 (mốc), động năng lớn nhất. Nếu chỉ có trọng lực, toàn bộ thế năng đã chuyển thành động năng nên v = √(2gℓ(1 − cosα)).",
        atTime: (p) => {
          const { T } = values(p);
          return T / 4;
        },
        values: (p) => {
          const { vBottom, WdBottom } = values(p);
          return [
            { label: "Thế năng Wt", value: "0", unit: "J" },
            { label: "Động năng Wđ = mgh", value: WdBottom.toFixed(3), unit: "J" },
            { label: "Tốc độ v = √(2gℓ(1−cosα))", value: vBottom.toFixed(2), unit: "m/s" },
          ];
        },
      },
      {
        key: "conservation",
        label: "Bảo toàn cơ năng",
        description: "Trong suốt dao động, cơ năng W = Wđ + Wt luôn không đổi (bằng thế năng ở biên) vì chỉ có trọng lực sinh công. Động năng và thế năng liên tục chuyển hoá cho nhau nhưng tổng của chúng giữ nguyên.",
        values: (p) => {
          const { WtMax, T } = values(p);
          return [
            { label: "Cơ năng W = mgℓ(1−cosα)", value: WtMax.toFixed(3), unit: "J" },
            { label: "Chu kỳ T = 2π√(ℓ/g)", value: T.toFixed(2), unit: "s" },
            { label: "Kết luận", value: "W = Wđ + Wt = const", unit: "" },
          ];
        },
      },
    ],
  },
};
