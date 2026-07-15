import type { Preset } from "./types";
import type { SceneAnnotation } from "../shared/scene-types";

// Thí nghiệm kinh điển SGK: hạt mang điện q bay vào giữa 2 bản phẳng song song
// tích điện trái dấu, vận tốc đầu v0 CÙNG PHƯƠNG với đường sức (khác trường
// hợp lệch ngang kiểu CRT — v0 vuông góc E) → hạt chuyển động THẲNG, biến đổi
// đều dọc trục x. Dùng lực "applied" không đổi (F = qE, giống
// dinh-luat-2-newton.ts) trong 1 "kênh" giới hạn bởi 2 SurfaceConstraint
// thẳng đứng đóng vai trò 2 bản tụ.
//
// Bỏ qua trọng lực: đúng mô hình SGK cho hạt mang điện trong điện trường (lực
// điện áp đảo trọng lực ở thang điện tích/khối lượng này); thêm gravity sẽ kéo
// hạt lệch khỏi trục ngang, sai với đề bài và hình gốc.
//
// Lưu ý giới hạn mô hình: lực "applied" của kernel không tự tắt khi ra khỏi
// vùng 2 bản — nếu q âm đủ mạnh khiến hạt dừng và đảo chiều TRƯỚC khi chạm bản
// đối diện, hạt sẽ quay lại và áp sát bản nó xuất phát cạnh, thay vì "thoát ra
// ngoài qua lỗ đã đi vào" như thực tế. Chấp nhận đơn giản hoá này (giống
// nhiem-dien-hut.ts) vì phần vật lý đáng quan sát — giảm tốc, dừng lại — đã
// thể hiện đầy đủ trước khi hạt chạm bản.
//
// CỰC 2 BẢN: `U` là hiệu điện thế QUY ƯỚC = V(trái) − V(phải), có dấu. U > 0
// → bản trái (+), phải (−), điện trường/đường sức hướng trái→phải (đúng hình
// gốc). U < 0 → đảo cực hoàn toàn (bản trái thành −, phải thành +, đường sức
// đổi chiều) — dùng cho quickPreset "Đảo cực 2 bản". Công thức lực F = qE với
// E = U/d đã tự động đổi dấu đúng theo U, annotations bên dưới tính lại
// `polarity = sign(U)` để vẽ nhãn +/− và mũi tên đường sức khớp thực tế.
//
// BỐ CỤC DỌC: hạt và 2 bản đặt ở y ∈ [0.08, 0.92] (không chạm y=0 hay y=1).
// Lý do: fitBox() trong scene-konva-2d.tsx chỉ đo toạ độ VẬT (không đọc
// constraints/annotations) và luôn ép minY=0, đồng thời cho khung nhìn CHÍNH
// XÁC 1 đơn vị world phía trên y=0 (Math.max(box.maxY,1)) — nội dung ngoài dải
// [0,1] gần như chắc chắn bị nén mất/khuất dưới mép canvas. Đặt hạt tại y=0.5
// (không phải y=0) để hạt hiện đúng giữa 2 bản như hình tham chiếu, và chừa lề
// 0.08 ở 2 đầu [0,1] làm chỗ cho 2 đường sức cong hiệu ứng rìa nở ra mà vẫn
// nằm trong khung hình đảm bảo.
export const dienTruong2BanSongSong: Preset = {
  id: "dien-truong-2-ban-song-song",
  title: "Điện trường giữa 2 bản song song",
  domain: "Điện & Từ",
  grade: 11,
  desc: "Hạt mang điện chuyển động thẳng dọc theo đường sức giữa 2 bản phẳng song song tích điện trái dấu — khảo sát điện trường đều, lực điện và chuyển động biến đổi đều.",
  objective:
    "Xác định điện trường đều E = U/d, lực điện F = qE, gia tốc a = F/m, và áp dụng chuyển động biến đổi đều để tìm vận tốc/thời điểm hạt chạm bản đối diện.",
  sgkRef: "Vật lí 11 — Điện trường",
  params: [
    { key: "d", label: "Khoảng cách 2 bản", unit: "cm", min: 5, max: 40, step: 1, default: 20 },
    { key: "U", label: "Hiệu điện thế U = V(trái) − V(phải)", unit: "V", min: -200, max: 200, step: 5, default: 30 },
    { key: "q", label: "Điện tích q (dấu quyết định chiều lực)", unit: "µC", min: -3, max: 3, step: 0.1, default: 1 },
    { key: "m", label: "Khối lượng hạt", unit: "g", min: 1, max: 20, step: 0.5, default: 5 },
    { key: "v0", label: "Vận tốc đầu v0 (cùng chiều E)", unit: "m/s", min: 0, max: 1, step: 0.01, default: 0.05 },
  ],
  applyParams: (p) => {
    const d = (p.d ?? 20) / 100; // cm → m
    const U = p.U ?? 30; // V(trái) − V(phải), có dấu
    const q = (p.q ?? 1) * 1e-6; // µC → C, có dấu
    const m = (p.m ?? 5) / 1000; // g → kg
    const v0 = p.v0 ?? 0.05;
    const E = U / d; // V/m, có dấu — dương: hướng +x (trái→phải)
    const Fx = q * E; // N, có dấu
    const radius = Math.min(0.015, Math.max(0.005, d * 0.05)); // bán kính hạt (m), tỉ lệ khe hở —
    // công thức mặc định của renderer (0.25 + mass·0.04) sẽ to hơn cả khe hở 2 bản nên phải khai báo rõ.
    // Luôn < 0.02 (radius tối đa 0.015 tại d tối đa 0.4) nên hằng số eps bên
    // dưới (khớp CHÍNH XÁC eps trong analysis.landmarks) luôn đủ chỗ cho hạt.
    const eps = 0.02; // nhô vào trong từ bản trái để hạt không chớm chạm bản ngay tại t=0.
    const xLeft = -d / 2;
    const xRight = d / 2;
    return {
      bodies: [{ id: "particle", x: xLeft + eps, y: 0.5, vx: v0, vy: 0, mass: m, radius }],
      forces: [{ kind: "applied", body: "particle", fx: Fx, fy: 0 }],
      constraints: [
        { kind: "surface", x: xLeft, y: 0.5, angle: -90, length: 0.84, friction: 0 },
        { kind: "surface", x: xRight, y: 0.5, angle: 90, length: 0.84, friction: 0 },
      ],
    };
  },
  // Ẩn lưới/trục/toạ độ debug của kernel sandbox — sơ đồ này tự vẽ mọi thứ
  // (bản, dấu +/−, đường sức) qua `annotations`, giống hình SGK tối giản.
  minimalOverlay: true,
  // Hạt màu xanh dương (không phải hồng mặc định) + ký hiệu/nhãn bám theo hạt
  // khi chạy, đều là HÀM của params (không phải object tĩnh) để phản ánh NGAY
  // khi người dùng kéo slider q/U/d/m hay bấm quickPreset — trước đó nhãn "q"
  // cố định không cho thấy gì đổi khi chỉnh điện tích.
  bodyColors: { particle: "#60a5fa" },
  // Dấu +/−/0 đè lên TÂM hạt — ký hiệu trực quan ngay trên hạt giống SGK,
  // khác nhãn chữ bên dưới (bodyLabels).
  bodySigns: (p) => {
    const q = p.q ?? 1;
    return { particle: q > 0 ? "+" : q < 0 ? "−" : "0" };
  },
  // Nhãn dưới hạt: CHỈ trạng thái chuyển động — dấu điện tích đã có ký hiệu
  // +/−/0 ngay trên hạt (bodySigns) nên không lặp lại ở đây (chuỗi ngắn hơn,
  // tránh tràn ra ngoài canvas khi hạt ở gần mép trái/phải). Trạng thái suy từ
  // dấu gia tốc a = qE/m so với chiều v0 (luôn ≥ 0, tức +x): a>0 cùng chiều
  // v0 → tăng tốc; a<0 ngược chiều → giảm tốc; a=0 (q=0 hoặc U=0) → đều.
  bodyLabels: (p) => {
    const q = p.q ?? 1;
    const d = (p.d ?? 20) / 100;
    const U = p.U ?? 30;
    const m = (p.m ?? 5) / 1000;
    const a = (q * 1e-6 * (U / d)) / m;
    const motion = a > 1e-9 ? "Tăng tốc" : a < -1e-9 ? "Giảm tốc" : "Đều";
    return { particle: motion };
  },
  // "Đảo cực" và "Cực bình thường" đi CẶP (giống dương/âm ở trên) — trước đây
  // chỉ có 1 nút "Đảo cực" luôn set U=-30, bấm lại lần 2 không đổi gì (không
  // phải toggle) nên không có cách quay lại cực ban đầu từ nút bấm nhanh.
  quickPresets: [
    { label: "Điện tích dương – tăng tốc", params: { q: 1 } },
    { label: "Điện tích âm – giảm tốc", params: { q: -1 } },
    { label: "Điện tích trung hoà", params: { q: 0 } },
    { label: "Cực bình thường (trái +)", params: { U: 30 } },
    { label: "Đảo cực 2 bản (trái −)", params: { U: -30 } },
  ],
  // Sơ đồ giáo khoa: 2 bản kim loại (rect) + dấu +/− (đổi bên theo cực) + 9
  // đường sức thẳng song song giữa 2 bản + 2 đường sức cong nhẹ ở mép (hiệu
  // ứng rìa) + vector v0. Toạ độ world tĩnh (không bám hạt di chuyển) — v0 thể
  // hiện vận tốc BAN ĐẦU, không phải vận tốc tức thời.
  annotations: (p) => {
    const d = (p.d ?? 20) / 100;
    const U = p.U ?? 30;
    const xLeft = -d / 2;
    const xRight = d / 2;
    const polarity = U >= 0 ? 1 : -1; // 1: trái(+)/phải(−) — như hình gốc. -1: đảo cực.

    const plateThk = Math.min(0.025, Math.max(0.006, d * 0.08));
    const plateTop = 0.92;
    const plateBottom = 0.08;
    const plateCenterY = 0.5;
    const plateHeight = plateTop - plateBottom;
    const signGap = Math.max(0.018, plateThk * 0.9);

    const posColor = "#f87171"; // đỏ sáng — dấu "+" (nền tối)
    const negColor = "#cbd5e1"; // trắng xám nhạt — dấu "−" (dịu hơn trắng thuần, đỡ chói trên nền tối)
    const fieldColor = "#e8724a"; // cam — đường sức (tông accent chính của app, không dùng cam neon)

    const leftPlate: SceneAnnotation = {
      kind: "rect",
      x: xLeft - plateThk / 2,
      y: plateCenterY,
      width: plateThk,
      height: plateHeight,
      fill: "#e2e8f0",
      stroke: "#64748b",
    };
    const rightPlate: SceneAnnotation = {
      kind: "rect",
      x: xRight + plateThk / 2,
      y: plateCenterY,
      width: plateThk,
      height: plateHeight,
      fill: "#e2e8f0",
      stroke: "#64748b",
    };

    // 11 dấu +/− dọc mặt ngoài mỗi bản, căn đều, đổi bên theo cực.
    const signRows = Array.from({ length: 11 }, (_, i) => plateBottom + (plateHeight * i) / 10);
    const leftText = polarity === 1 ? "+" : "−";
    const rightText = polarity === 1 ? "−" : "+";
    const leftColor = polarity === 1 ? posColor : negColor;
    const rightColor = polarity === 1 ? negColor : posColor;
    const leftSignX = xLeft - plateThk - signGap;
    const rightSignX = xRight + plateThk + signGap;
    const signs: SceneAnnotation[] = signRows.flatMap((y) => [
      { kind: "label", x: leftSignX, y, text: leftText, color: leftColor, fontSize: 15, fontStyle: "bold" },
      { kind: "label", x: rightSignX, y, text: rightText, color: rightColor, fontSize: 15, fontStyle: "bold" },
    ]);

    // 9 đường sức thẳng song song ở giữa, CĂN ĐỀU trong khoảng [0.12, 0.88] —
    // mũi tên ở 55% chiều dài (không sát bản), bắt đầu/kết thúc đúng mặt trong
    // 2 bản, hướng từ (+) sang (−), nét đứt "chảy" (animated) theo chiều đó.
    const N_STRAIGHT = 9;
    const straightRows = Array.from({ length: N_STRAIGHT }, (_, i) => 0.12 + (0.76 * i) / (N_STRAIGHT - 1));
    const srcX = polarity === 1 ? xLeft : xRight;
    const dstX = polarity === 1 ? xRight : xLeft;
    const fieldLines: SceneAnnotation[] = straightRows.map((y) => ({
      kind: "arrow",
      x1: srcX,
      y1: y,
      x2: dstX,
      y2: y,
      color: fieldColor,
      arrowAt: 0.55,
      animated: true,
    }));

    // 2 đường sức cong nhẹ ở mép trên/dưới (hiệu ứng rìa) — Bézier bậc 3, độ
    // cong ~6% chiều cao, đổi hướng theo cực giống đường sức thẳng.
    const fringeAmount = 0.06;
    const cx1 = xLeft + (xRight - xLeft) * 0.35;
    const cx2 = xLeft + (xRight - xLeft) * 0.65;
    const topY = plateTop - 0.02;
    const bottomY = plateBottom + 0.02;
    const top = polarity === 1 ? { x1: xLeft, x2: xRight } : { x1: xRight, x2: xLeft };
    const bottom = polarity === 1 ? { x1: xLeft, x2: xRight } : { x1: xRight, x2: xLeft };
    const fringeCurves: SceneAnnotation[] = [
      {
        kind: "curve",
        x1: top.x1,
        y1: topY,
        cx1,
        cy1: topY + fringeAmount,
        cx2,
        cy2: topY + fringeAmount,
        x2: top.x2,
        y2: topY,
        color: fieldColor,
        arrowAt: 0.55,
        animated: true,
      },
      {
        kind: "curve",
        x1: bottom.x1,
        y1: bottomY,
        cx1,
        cy1: bottomY - fringeAmount,
        cx2,
        cy2: bottomY - fringeAmount,
        x2: bottom.x2,
        y2: bottomY,
        color: fieldColor,
        arrowAt: 0.55,
        animated: true,
      },
    ];

    // Vector vận tốc đầu v0 (xanh lá — KHÔNG dùng tím/magenta, dễ nhầm với các
    // sắc tím/hồng khác trong sơ đồ) — độ dài tỉ lệ khe hở (an toàn với mọi d,
    // không bao giờ chạm bản đối diện), gắn tại vị trí BAN ĐẦU của hạt (khớp
    // eps=0.02 trong applyParams/analysis.landmarks).
    const startX = xLeft + 0.02;
    const v0Len = Math.min(0.3 * d, 0.12);
    const v0Color = "#34d399"; // xanh lá — tách biệt rõ với cam (đường sức), đỏ (bản +), xanh dương (hạt)
    const v0: SceneAnnotation[] = [
      { kind: "arrow", x1: startX, y1: plateCenterY, x2: startX + v0Len, y2: plateCenterY, color: v0Color },
      {
        kind: "label",
        x: startX + v0Len / 2,
        y: plateCenterY + 0.07,
        text: "v₀",
        color: v0Color,
        fontSize: 18,
        fontStyle: "italic",
        fontFamily: "Georgia, serif",
      },
    ];

    return [...fieldLines, ...fringeCurves, leftPlate, rightPlate, ...signs, ...v0];
  },
  analysis: {
    landmarks: [
      {
        key: "luc-dien",
        label: "Phân tích lực (lúc bắt đầu)",
        description: "Điện trường đều giữa 2 bản, lực điện không đổi tác dụng lên hạt.",
        atTime: () => 0,
        values: (p) => {
          const d = (p.d ?? 20) / 100;
          const U = p.U ?? 30;
          const q = (p.q ?? 1) * 1e-6;
          const m = (p.m ?? 5) / 1000;
          const E = U / d;
          const F = q * E;
          const a = F / m;
          return [
            { label: "Cường độ điện trường E = U/d", value: E.toFixed(1), unit: "V/m" },
            { label: "Lực điện F = qE", value: (F * 1000).toFixed(2), unit: "mN" },
            { label: "Gia tốc a = F/m", value: a.toFixed(3), unit: "m/s²" },
          ];
        },
      },
      {
        key: "cham-ban-doi-dien",
        label: "Chạm bản đối diện",
        description: "Chuyển động biến đổi đều — giải s = v0t + ½at² để tìm thời điểm hạt chạm bản kia.",
        atTime: (p) => {
          const d = (p.d ?? 20) / 100;
          const U = p.U ?? 30;
          const q = (p.q ?? 1) * 1e-6;
          const m = (p.m ?? 5) / 1000;
          const v0 = p.v0 ?? 0.05;
          const E = U / d;
          const a = (q * E) / m;
          const eps = 0.02;
          const s = d - eps;
          if (a === 0) return v0 > 0 ? s / v0 : 0;
          const disc = v0 * v0 + 2 * a * s;
          if (disc >= 0) return (-v0 + Math.sqrt(disc)) / a;
          return -v0 / a; // không tới bản kia → mốc lúc hạt dừng xa nhất
        },
        values: (p) => {
          const d = (p.d ?? 20) / 100;
          const U = p.U ?? 30;
          const q = (p.q ?? 1) * 1e-6;
          const m = (p.m ?? 5) / 1000;
          const v0 = p.v0 ?? 0.05;
          const E = U / d;
          const a = (q * E) / m;
          const eps = 0.02;
          const s = d - eps;
          const disc = v0 * v0 + 2 * a * s;
          if (a !== 0 && disc < 0) {
            return [
              { label: "Kết quả", value: "Không tới được bản đối diện — hạt đảo chiều rồi quay lại bản xuất phát" },
              { label: "Thời gian dừng lại (xa nhất)", value: (-v0 / a).toFixed(2), unit: "s" },
            ];
          }
          const t = a === 0 ? s / v0 : (-v0 + Math.sqrt(disc)) / a;
          const vExit = v0 + a * t;
          return [
            { label: "Thời gian chạm bản t", value: t.toFixed(2), unit: "s" },
            { label: "Vận tốc lúc chạm v = v0 + at", value: vExit.toFixed(3), unit: "m/s" },
          ];
        },
      },
      {
        key: "cong-luc-dien",
        label: "Công của lực điện",
        description:
          "Công của lực điện khi điện tích dịch chuyển hết bề rộng d (A = qU, không phụ thuộc dạng đường đi) — liên hệ định lí động năng A = ΔWđ.",
        values: (p) => {
          const U = p.U ?? 30;
          const q = (p.q ?? 1) * 1e-6;
          const A = q * U;
          return [{ label: "Công A = qU", value: (A * 1e6).toFixed(2), unit: "µJ" }];
        },
      },
    ],
  },
};
