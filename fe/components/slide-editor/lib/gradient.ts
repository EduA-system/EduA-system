// Tiện ích gradient dùng chung cho ElementView (render) và ColorPicker (chỉnh).
// Tách riêng để tránh phụ thuộc vòng giữa hai file.

export type GradStop = { color: string; pos: number }; // pos 0-100

export type GradConfig = {
  type: "linear" | "radial";
  angle: number;
  stops: GradStop[];
};

export function buildGradCss(g: GradConfig): string {
  const stops = [...g.stops].sort((a, b) => a.pos - b.pos);
  const s = stops.map((st) => `${st.color} ${st.pos}%`).join(", ");
  return g.type === "radial"
    ? `radial-gradient(circle, ${s})`
    : `linear-gradient(${g.angle}deg, ${s})`;
}

export function isGradientCss(v: string | undefined): boolean {
  return !!v && (v.startsWith("linear-gradient") || v.startsWith("radial-gradient"));
}

export function parseGrad(v: string): GradConfig {
  try {
    const isRadial = v.startsWith("radial-gradient");
    let angle = 90;
    const stops: GradStop[] = [];
    const inner = v.slice(v.indexOf("(") + 1, v.lastIndexOf(")"));
    const parts = inner.split(/,(?![^(]*\))/).map((s) => s.trim());
    let i = 0;
    if (!isRadial && parts[0]?.includes("deg")) {
      angle = parseInt(parts[0]) || 90;
      i = 1;
    } else if (isRadial) {
      i = 1;
    }
    for (; i < parts.length; i++) {
      const m = parts[i].match(/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)\s+([\d.]+)%/);
      if (m) stops.push({ color: m[1], pos: parseFloat(m[2]) });
    }
    if (stops.length >= 2) return { type: isRadial ? "radial" : "linear", angle, stops };
  } catch {
    /* fall through */
  }
  return {
    type: "linear",
    angle: 135,
    stops: [
      { color: "#7c3aed", pos: 0 },
      { color: "#3b82f6", pos: 100 },
    ],
  };
}
