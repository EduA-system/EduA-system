// Thư viện hình SVG dựng sẵn (port từ /test-slide). Mỗi shape là 1 path trong
// viewBox 0 0 100 100 (trừ vài shape có viewBox riêng).

export interface ShapeSpec {
  id: string;
  label: string;
  path: string;
  viewBox?: string; // default "0 0 100 100"
  defaultFill?: string;
  defaultStroke?: string;
}

export interface ShapeCategory {
  id: string;
  label: string;
  shapes: ShapeSpec[];
}

// ── generators ────────────────────────────────────────────────────────────────

function polygon(n: number, cx = 50, cy = 50, r = 48, startDeg = -90): string {
  return (
    Array.from({ length: n }, (_, i) => {
      const a = ((startDeg + (i * 360) / n) * Math.PI) / 180;
      const x = (cx + r * Math.cos(a)).toFixed(2);
      const y = (cy + r * Math.sin(a)).toFixed(2);
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    }).join(" ") + " Z"
  );
}

function star(n: number, r1 = 48, r2 = 20, cx = 50, cy = 50, startDeg = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = ((startDeg + (i * 180) / n) * Math.PI) / 180;
    const x = (cx + r * Math.cos(a)).toFixed(2);
    const y = (cy + r * Math.sin(a)).toFixed(2);
    pts.push(`${i === 0 ? "M" : "L"}${x} ${y}`);
  }
  return pts.join(" ") + " Z";
}

// ── library ───────────────────────────────────────────────────────────────────

export const SHAPE_LIBRARY: ShapeCategory[] = [
  {
    id: "basic",
    label: "Cơ bản",
    shapes: [
      { id: "triangle", label: "Tam giác", path: "M50 2 L98 95 L2 95Z" },
      { id: "right-triangle", label: "Tam giác vuông", path: "M2 2 L98 2 L2 95Z" },
      { id: "diamond", label: "Thoi", path: "M50 2 L98 50 L50 98 L2 50Z" },
      { id: "parallelogram", label: "Bình hành", path: "M20 2 L98 2 L80 98 L2 98Z" },
      { id: "trapezoid", label: "Hình thang", path: "M15 2 L85 2 L98 98 L2 98Z" },
      { id: "pentagon", label: "Ngũ giác", path: polygon(5) },
      { id: "hexagon", label: "Lục giác", path: polygon(6) },
      { id: "octagon", label: "Bát giác", path: polygon(8) },
      { id: "l-shape", label: "Chữ L", path: "M2 2 L42 2 L42 58 L98 58 L98 98 L2 98Z" },
      { id: "t-shape", label: "Chữ T", path: "M2 2 L98 2 L98 40 L62 40 L62 98 L38 98 L38 40 L2 40Z" },
    ],
  },
  {
    id: "stars",
    label: "Sao & Bùng nổ",
    shapes: [
      { id: "star4", label: "Sao 4 cánh", path: star(4, 48, 16) },
      { id: "star5", label: "Sao 5 cánh", path: star(5, 48, 20) },
      { id: "star6", label: "Sao 6 cánh", path: star(6, 48, 24) },
      { id: "star8", label: "Sao 8 cánh", path: star(8, 48, 28) },
      { id: "burst8", label: "Bùng nổ 8", path: star(8, 48, 38) },
      { id: "burst12", label: "Bùng nổ 12", path: star(12, 48, 40) },
    ],
  },
  {
    id: "arrows",
    label: "Mũi tên",
    shapes: [
      { id: "arrow-right", label: "Mũi tên phải", path: "M2 32 L62 32 L62 12 L98 50 L62 88 L62 68 L2 68Z" },
      { id: "arrow-left", label: "Mũi tên trái", path: "M98 32 L38 32 L38 12 L2 50 L38 88 L38 68 L98 68Z" },
      { id: "arrow-up", label: "Mũi tên lên", path: "M50 2 L88 40 L68 40 L68 98 L32 98 L32 40 L12 40Z" },
      { id: "arrow-down", label: "Mũi tên xuống", path: "M50 98 L12 60 L32 60 L32 2 L68 2 L68 60 L88 60Z" },
      { id: "arrow-double-h", label: "Mũi tên 2 chiều ngang", path: "M2 50 L24 22 L24 38 L76 38 L76 22 L98 50 L76 78 L76 62 L24 62 L24 78Z" },
      { id: "arrow-double-v", label: "Mũi tên 2 chiều dọc", path: "M50 2 L78 24 L62 24 L62 76 L78 76 L50 98 L22 76 L38 76 L38 24 L22 24Z" },
      { id: "chevron-right", label: "Dấu ngoặc phải", path: "M2 2 L68 2 L98 50 L68 98 L2 98 L32 50Z" },
      { id: "chevron-left", label: "Dấu ngoặc trái", path: "M98 2 L32 2 L2 50 L32 98 L98 98 L68 50Z" },
      { id: "notched-arrow", label: "Mũi tên có rãnh", path: "M2 50 L2 30 L70 30 L70 10 L98 50 L70 90 L70 70 L2 70Z" },
    ],
  },
  {
    id: "callouts",
    label: "Bong bóng",
    shapes: [
      { id: "speech-round", label: "Bong bóng thoại tròn", path: "M10 2 Q2 2 2 10 L2 60 Q2 70 10 70 L33 70 L20 90 L52 70 L90 70 Q98 70 98 60 L98 10 Q98 2 90 2Z" },
      { id: "speech-rect", label: "Bong bóng thoại vuông", path: "M2 2 L98 2 L98 70 L55 70 L40 90 L40 70 L2 70Z" },
      { id: "speech-oval", label: "Bong bóng suy nghĩ", path: "M12 2 Q2 2 2 12 L2 58 Q2 68 12 68 L30 68 L25 82 L15 92 L40 75 L88 75 Q98 75 98 65 L98 12 Q98 2 88 2Z" },
      { id: "callout-bottom", label: "Callout dưới", path: "M2 2 L98 2 L98 65 L58 65 L50 88 L42 65 L2 65Z" },
      { id: "callout-right", label: "Callout phải", path: "M2 2 L72 2 L72 35 L88 28 L78 50 L88 72 L72 65 L72 98 L2 98Z" },
    ],
  },
  {
    id: "special",
    label: "Đặc biệt",
    shapes: [
      { id: "heart", label: "Trái tim", path: "M50 35 C50 27 42 20 32 20 C18 20 18 38 18 38 C18 56 34 66 50 82 C66 66 82 56 82 38 C82 38 82 20 68 20 C58 20 50 27 50 35Z", defaultFill: "#ef4444" },
      { id: "cross", label: "Dấu cộng", path: "M35 2 L65 2 L65 35 L98 35 L98 65 L65 65 L65 98 L35 98 L35 65 L2 65 L2 35 L35 35Z" },
      { id: "cloud", label: "Đám mây", path: "M22 56 C8 56 2 44 8 34 C4 22 14 14 28 16 C32 6 44 2 56 8 C62 2 76 2 82 12 C94 12 100 24 96 34 C102 42 98 58 86 60 L22 60Z", viewBox: "0 0 104 64" },
      { id: "crescent", label: "Lưỡi liềm", path: "M50 2 C76 2 95 23 95 50 C95 77 76 98 50 98 C65 86 74 69 74 50 C74 31 65 14 50 2Z" },
      { id: "frame", label: "Khung viền", path: "M2 2 L98 2 L98 98 L2 98Z M15 15 L15 85 L85 85 L85 15Z", defaultFill: "#7c3aed" },
      { id: "donut", label: "Vòng tròn rỗng", path: "M50 2 A48 48 0 1 1 49.9 2Z M50 22 A28 28 0 1 0 50.1 22Z", viewBox: "0 0 100 100", defaultFill: "#0ea5e9" },
    ],
  },
  {
    id: "flowchart",
    label: "Lưu đồ",
    shapes: [
      { id: "fc-process", label: "Quy trình", path: "M2 2 L98 2 L98 98 L2 98Z" },
      { id: "fc-decision", label: "Quyết định", path: "M50 2 L98 50 L50 98 L2 50Z" },
      { id: "fc-terminal", label: "Bắt đầu / Kết thúc", path: "M30 2 Q2 2 2 50 Q2 98 30 98 L70 98 Q98 98 98 50 Q98 2 70 2Z" },
      { id: "fc-document", label: "Tài liệu", path: "M2 2 L98 2 L98 80 Q75 65 50 80 Q25 95 2 80Z" },
      { id: "fc-manual", label: "Nhập thủ công", path: "M2 20 L98 2 L98 98 L2 98Z" },
      { id: "fc-cylinder", label: "Cơ sở dữ liệu", path: "M2 20 Q2 2 50 2 Q98 2 98 20 L98 80 Q98 98 50 98 Q2 98 2 80Z M2 20 Q2 38 50 38 Q98 38 98 20" },
    ],
  },
];

export function getShape(id: string): ShapeSpec | undefined {
  for (const cat of SHAPE_LIBRARY) {
    const found = cat.shapes.find((s) => s.id === id);
    if (found) return found;
  }
  return undefined;
}
