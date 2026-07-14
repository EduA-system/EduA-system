import type { FluidSim } from "./types";

// p = p0 + ρgh. Áp suất khí quyển mặc định (Pa).
const P0 = 101325;

function values(p: Record<string, number>) {
  const rho = p.rho ?? 1000; // khối lượng riêng (kg/m³)
  const depth = p.depth ?? 1.5; // độ sâu điểm đo (m)
  const g = p.g ?? 9.8;
  const total = p.total ?? 3; // độ sâu tổng của bể (m)
  const pGauge = rho * g * depth; // áp suất do cột chất lỏng (áp suất dư)
  const pAbs = P0 + pGauge; // áp suất tuyệt đối
  return { rho, depth, g, total, pGauge, pAbs };
}

export const apSuatChatLong: FluidSim = {
  id: "ap-suat-chat-long",
  title: "Áp suất chất lỏng theo độ sâu",
  domain: "Nhiệt & Khí",
  grade: 10,
  desc: "Đo áp suất tại một điểm trong lòng chất lỏng, khảo sát sự phụ thuộc của áp suất vào độ sâu và khối lượng riêng.",
  objective:
    "Hiểu áp suất trong lòng chất lỏng tăng theo độ sâu: p = ρgh (áp suất dư), hay p = p₀ + ρgh nếu tính cả áp suất khí quyển. Áp suất tại một điểm tác dụng theo mọi hướng và chỉ phụ thuộc độ sâu, không phụ thuộc hình dạng bình.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "depth", label: "Độ sâu điểm đo", unit: "m", min: 0, max: 3, step: 0.1, default: 1.5 },
    { key: "rho", label: "Khối lượng riêng", unit: "kg/m³", min: 700, max: 13600, step: 100, default: 1000 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
    { key: "total", label: "Độ sâu bể", unit: "m", min: 1, max: 3, step: 0.1, default: 3 },
  ],
  Stage: ({ params, width, height }) => {
    const { depth, total, pGauge } = values(params);
    const pad = 40;
    const tankW = width - 2 * pad;
    const surfaceY = pad;
    const bottomY = height - pad;
    const tankH = bottomY - surfaceY;
    // Ánh xạ độ sâu (m) → toạ độ y (px). Điểm đo kẹp trong [0, total].
    const d = Math.max(0, Math.min(depth, total));
    const yOf = (dep: number) => surfaceY + (dep / total) * tankH;
    const probeY = yOf(d);
    const probeX = pad + tankW * 0.5;
    // Độ dài mũi tên áp suất tỉ lệ áp suất (chuẩn hoá theo áp suất ở đáy).
    const pBottom = values({ ...params, depth: total }).pGauge || 1;
    const arrowLen = 10 + 34 * (pGauge / pBottom);

    return (
      <>
        {/* Thành bể */}
        <rect x={pad} y={surfaceY} width={tankW} height={tankH} fill="#0b2a3a" stroke="#475569" strokeWidth={2} />
        {/* Nước */}
        <rect x={pad} y={surfaceY} width={tankW} height={tankH} fill="#1d4ed8" opacity={0.35} />
        {/* Mặt thoáng */}
        <line x1={pad} y1={surfaceY} x2={pad + tankW} y2={surfaceY} stroke="#93c5fd" strokeWidth={2} />
        <text x={pad + 6} y={surfaceY - 8} fontSize={12} fill="#93c5fd">Mặt thoáng (h = 0)</text>

        {/* Đường độ sâu nét đứt + nhãn h */}
        <line x1={pad} y1={probeY} x2={pad + tankW} y2={probeY} stroke="#34d399" strokeWidth={1.5} strokeDasharray="5 4" />
        <line x1={pad + 14} y1={surfaceY} x2={pad + 14} y2={probeY} stroke="#34d399" strokeWidth={1.5} />
        <text x={pad + 20} y={(surfaceY + probeY) / 2} fontSize={12} fontWeight={700} fill="#34d399">
          h = {d.toFixed(2)} m
        </text>

        {/* Điểm đo + mũi tên áp suất theo mọi hướng */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={probeX}
              y1={probeY}
              x2={probeX + Math.cos(rad) * arrowLen}
              y2={probeY + Math.sin(rad) * arrowLen}
              stroke="#fbbf24"
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={probeX} cy={probeY} r={5} fill="#fbbf24" />

        {/* Số chỉ áp suất dư (kPa) */}
        <rect x={probeX + 46} y={probeY - 16} width={104} height={32} rx={6} fill="#111827" stroke="#fbbf24" strokeWidth={1.5} />
        <text x={probeX + 98} y={probeY + 5} fontSize={13} fontWeight={700} fill="#fde68a" textAnchor="middle">
          {(pGauge / 1000).toFixed(2)} kPa
        </text>
      </>
    );
  },
  analysis: {
    readings: [
      {
        key: "pressure",
        label: "Áp suất tại điểm đo",
        description: "Áp suất do cột chất lỏng gây ra (áp suất dư) tỉ lệ thuận với độ sâu và khối lượng riêng: p = ρgh. Càng xuống sâu áp suất càng lớn.",
        values: (p) => {
          const { rho, depth, pGauge } = values(p);
          return [
            { label: "Khối lượng riêng ρ", value: rho.toFixed(0), unit: "kg/m³" },
            { label: "Độ sâu h", value: depth.toFixed(2), unit: "m" },
            { label: "Áp suất dư p = ρgh", value: (pGauge / 1000).toFixed(2), unit: "kPa" },
          ];
        },
      },
      {
        key: "absolute",
        label: "Áp suất tuyệt đối",
        description: "Nếu tính cả áp suất khí quyển tác dụng lên mặt thoáng, áp suất tuyệt đối tại điểm đo là p = p₀ + ρgh với p₀ ≈ 101,3 kPa.",
        values: (p) => {
          const { pGauge, pAbs } = values(p);
          return [
            { label: "Áp suất khí quyển p₀", value: (P0 / 1000).toFixed(1), unit: "kPa" },
            { label: "Áp suất dư ρgh", value: (pGauge / 1000).toFixed(2), unit: "kPa" },
            { label: "Áp suất tuyệt đối p₀ + ρgh", value: (pAbs / 1000).toFixed(2), unit: "kPa" },
          ];
        },
      },
      {
        key: "direction",
        label: "Đặc điểm áp suất chất lỏng",
        description: "Tại một điểm trong lòng chất lỏng, áp suất tác dụng theo mọi hướng với độ lớn như nhau và chỉ phụ thuộc độ sâu — không phụ thuộc hình dạng hay bề rộng của bình.",
        values: (p) => {
          const { depth } = values(p);
          return [
            { label: "Hướng tác dụng", value: "mọi phương, cùng độ lớn", unit: "" },
            { label: "Phụ thuộc", value: "chỉ độ sâu h", unit: "" },
            { label: "Độ sâu hiện tại", value: depth.toFixed(2), unit: "m" },
          ];
        },
      },
    ],
  },
};
