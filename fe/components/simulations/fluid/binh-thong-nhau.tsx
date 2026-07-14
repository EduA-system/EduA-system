import type { FluidSim } from "./types";

function values(p: Record<string, number>) {
  const level = p.level ?? 1.6; // mực chất lỏng chung khi cùng loại (m)
  const rhoLeft = p.rhoLeft ?? 1000; // khối lượng riêng nhánh trái
  const rhoRight = p.rhoRight ?? 1000; // khối lượng riêng nhánh phải
  const g = p.g ?? 9.8;
  // Khi hai nhánh chứa hai chất lỏng khác nhau không trộn, tại đáy áp suất bằng
  // nhau: ρ_trái·g·h_trái = ρ_phải·g·h_phải. Lấy mực trái = level làm chuẩn,
  // suy ra mực phải để cân bằng áp suất đáy.
  const hLeft = level;
  const hRight = (rhoLeft * hLeft) / rhoRight;
  const same = Math.abs(rhoLeft - rhoRight) < 1e-6;
  return { level, rhoLeft, rhoRight, g, hLeft, hRight, same };
}

export const binhThongNhau: FluidSim = {
  id: "binh-thong-nhau",
  title: "Bình thông nhau",
  domain: "Nhiệt & Khí",
  grade: 10,
  desc: "Hai nhánh bình nối nhau ở đáy; khảo sát mực chất lỏng khi cùng một chất và khi hai chất lỏng khác nhau.",
  objective:
    "Hiểu trong bình thông nhau chứa cùng một chất lỏng đứng yên, mặt thoáng ở các nhánh luôn ngang nhau bất kể tiết diện hay hình dạng nhánh. Với hai chất lỏng khác nhau không trộn, cột chất lỏng cân bằng khi áp suất tại đáy bằng nhau: ρ₁h₁ = ρ₂h₂.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "level", label: "Mực nhánh trái", unit: "m", min: 0.6, max: 2.4, step: 0.1, default: 1.6 },
    { key: "rhoLeft", label: "Khối lượng riêng nhánh trái", unit: "kg/m³", min: 200, max: 1800, step: 50, default: 1000 },
    { key: "rhoRight", label: "Khối lượng riêng nhánh phải", unit: "kg/m³", min: 200, max: 1800, step: 50, default: 1000 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  Stage: ({ params, width, height }) => {
    const { hLeft, hRight, same } = values(params);
    const pad = 36;
    const bottomY = height - pad;
    const topY = pad;
    const usableH = bottomY - topY;
    const maxLevel = 2.7; // độ cao tối đa quy đổi để ánh xạ mét → px
    const yOfLevel = (h: number) => bottomY - (Math.min(h, maxLevel) / maxLevel) * usableH;

    // Hình chữ U: hai ống đứng nối bằng ống ngang ở đáy.
    const tubeW = 46;
    const leftX = pad + 30;
    const rightX = width - pad - 30 - tubeW;
    const colLeft = leftX;
    const colRight = rightX;
    const baseY = bottomY;

    const leftTop = yOfLevel(hLeft);
    const rightTop = yOfLevel(hRight);
    const fillLeft = same ? "#1d4ed8" : "#1d4ed8"; // trái luôn xanh
    const fillRight = same ? "#1d4ed8" : "#d97706"; // phải đổi màu khi khác chất

    return (
      <>
        {/* Khung ống hình chữ U (viền) */}
        <path
          d={`M${colLeft} ${topY} V${baseY} H${colRight + tubeW} V${topY}`}
          fill="none"
          stroke="#475569"
          strokeWidth={2}
        />
        <path
          d={`M${colLeft + tubeW} ${topY} V${baseY - 0} H${colRight} V${topY}`}
          fill="none"
          stroke="#475569"
          strokeWidth={2}
        />

        {/* Chất lỏng nhánh trái */}
        <rect x={colLeft} y={leftTop} width={tubeW} height={baseY - leftTop} fill={fillLeft} opacity={0.4} />
        {/* Chất lỏng nhánh phải */}
        <rect x={colRight} y={rightTop} width={tubeW} height={baseY - rightTop} fill={fillRight} opacity={0.4} />
        {/* Chất lỏng đáy nối hai nhánh (dùng màu trái) */}
        <rect x={colLeft} y={baseY - 18} width={colRight + tubeW - colLeft} height={18} fill={fillLeft} opacity={0.4} />

        {/* Mặt thoáng hai nhánh */}
        <line x1={colLeft} y1={leftTop} x2={colLeft + tubeW} y2={leftTop} stroke="#93c5fd" strokeWidth={2} />
        <line x1={colRight} y1={rightTop} x2={colRight + tubeW} y2={rightTop} stroke={same ? "#93c5fd" : "#fbbf24"} strokeWidth={2} />

        {/* Đường ngang chuẩn nối hai mặt thoáng khi cùng chất → thẳng hàng */}
        {same && (
          <line
            x1={colLeft + tubeW}
            y1={leftTop}
            x2={colRight}
            y2={rightTop}
            stroke="#34d399"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        )}

        {/* Nhãn mực */}
        <text x={colLeft} y={leftTop - 8} fontSize={12} fontWeight={700} fill="#93c5fd">
          {hLeft.toFixed(2)} m
        </text>
        <text x={colRight} y={rightTop - 8} fontSize={12} fontWeight={700} fill={same ? "#93c5fd" : "#fbbf24"}>
          {hRight.toFixed(2)} m
        </text>

        {/* Chú thích trạng thái */}
        <text x={width / 2} y={height - 10} fontSize={12} fontWeight={700} fill={same ? "#34d399" : "#fbbf24"} textAnchor="middle">
          {same ? "Cùng chất lỏng → hai mặt thoáng ngang nhau" : "Hai chất khác nhau → ρ₁h₁ = ρ₂h₂"}
        </text>
      </>
    );
  },
  analysis: {
    readings: [
      {
        key: "same",
        label: "Cùng một chất lỏng",
        description: "Khi hai nhánh chứa cùng một chất lỏng đứng yên, mặt thoáng ở hai nhánh luôn ngang nhau, bất kể tiết diện hay hình dạng nhánh — vì áp suất tại đáy phải bằng nhau mà khối lượng riêng như nhau.",
        values: (p) => {
          const { rhoLeft, rhoRight, same, hLeft } = values(p);
          return [
            { label: "ρ hai nhánh", value: same ? `bằng nhau (${rhoLeft.toFixed(0)})` : `${rhoLeft.toFixed(0)} vs ${rhoRight.toFixed(0)}`, unit: same ? "kg/m³" : "kg/m³" },
            { label: "Mực khi cùng chất", value: same ? "ngang nhau" : "xem mục dưới", unit: "" },
            { label: "Độ cao chung", value: same ? hLeft.toFixed(2) : "—", unit: same ? "m" : "" },
          ];
        },
      },
      {
        key: "different",
        label: "Hai chất lỏng khác nhau",
        description: "Với hai chất lỏng khác nhau không trộn, tại mặt phân cách ở đáy áp suất hai bên bằng nhau: ρ₁·g·h₁ = ρ₂·g·h₂, nên ρ₁h₁ = ρ₂h₂. Chất nhẹ hơn dâng cao hơn.",
        values: (p) => {
          const { rhoLeft, rhoRight, hLeft, hRight } = values(p);
          return [
            { label: "Cột trái ρ₁h₁", value: (rhoLeft * hLeft).toFixed(0), unit: "kg/m²" },
            { label: "Cột phải ρ₂h₂", value: (rhoRight * hRight).toFixed(0), unit: "kg/m²" },
            { label: "Mực phải h₂ = ρ₁h₁/ρ₂", value: hRight.toFixed(2), unit: "m" },
          ];
        },
      },
      {
        key: "pascal",
        label: "Nguyên lý",
        description: "Bình thông nhau là hệ quả của việc áp suất trong lòng chất lỏng chỉ phụ thuộc độ sâu. Đây cũng là cơ sở của máy nén thuỷ lực (nguyên lý Pascal): áp suất truyền nguyên vẹn trong chất lỏng.",
        values: () => [
          { label: "Cơ sở", value: "áp suất chỉ phụ thuộc độ sâu", unit: "" },
          { label: "Ứng dụng", value: "máy nén thuỷ lực (Pascal)", unit: "" },
        ],
      },
    ],
  },
};
