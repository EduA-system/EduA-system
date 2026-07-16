import type { SlideItem } from "@/lib/api/slides";

export const SLIDE_LAYOUT_TEMPLATES = [
  "title",
  "content",
  "text-image",
  "comparison",
  "formula",
  "process",
  "exercise-quiz",
  "summary",
] as const;

export type SlideLayoutTemplate = (typeof SLIDE_LAYOUT_TEMPLATES)[number];

type ZoneId = "hero" | "body" | "aside" | "caption" | "formula";
type Zone = { id: ZoneId; x: number; y: number; w: number; h: number; maxChars: number; maxLines: number; hint: string };
type Structure = { x: number; y: number; w: number; h: number; kind: "card" | "rail" | "divider" | "panel" };
type LayoutRecipe = (top: number) => { zones: Zone[]; structures?: Structure[] };

export type SlideLayoutVariant = {
  id: string;
  template: SlideLayoutTemplate;
  label: string;
  requiresVisual?: boolean;
  recipe: LayoutRecipe;
};

export type SlideContentSlot = {
  id: string;
  kind: "text" | "image";
  zone: ZoneId;
  maxChars: number;
  maxLines: number;
  hint: string;
};

const HINT_TO_TEMPLATE: Record<string, SlideLayoutTemplate> = {
  title: "title", bullets: "content", formula: "formula", "image-focus": "text-image",
  comparison: "comparison", "worked-example": "exercise-quiz", process: "process", summary: "summary",
};

const z = (id: ZoneId, x: number, y: number, w: number, h: number, maxChars: number, maxLines: number, hint: string): Zone =>
  ({ id, x, y, w, h, maxChars, maxLines, hint });
const card = (x: number, y: number, w: number, h: number): Structure => ({ x, y, w, h, kind: "card" });
const rail = (x: number, y: number, w: number, h: number): Structure => ({ x, y, w, h, kind: "rail" });
const panel = (x: number, y: number, w: number, h: number): Structure => ({ x, y, w, h, kind: "panel" });
const divider = (x: number, y: number, w: number, h: number): Structure => ({ x, y, w, h, kind: "divider" });
const bottom = () => 520;
const h = (top: number) => bottom() - top;

export const SLIDE_LAYOUT_VARIANTS: readonly SlideLayoutVariant[] = [
  { id: "title-centered-focal", template: "title", label: "Centered focal", recipe: t => ({ zones: [z("hero", 120, t + 76, 720, 150, 90, 3, "central slide title"), z("caption", 205, t + 252, 550, 66, 150, 3, "short learning objective")], structures: [card(88, t + 48, 784, 300)] }) },
  { id: "title-offset-poster", template: "title", label: "Offset poster", recipe: t => ({ zones: [z("hero", 70, t + 56, 560, 184, 90, 3, "large editorial title"), z("caption", 76, t + 266, 390, 64, 120, 3, "short supporting line")], structures: [panel(650, t, 270, h(t)), rail(46, t + 58, 8, 278)] }) },
  { id: "title-split-color", template: "title", label: "Split color block", recipe: t => ({ zones: [z("hero", 88, t + 70, 420, 166, 85, 3, "slide title"), z("caption", 92, t + 260, 370, 62, 120, 3, "subtitle or objective")], structures: [panel(44, t + 26, 500, h(t) - 46), card(580, t + 64, 290, 260)] }) },
  { id: "title-image-strip", template: "title", label: "Image strip", requiresVisual: true, recipe: t => ({ zones: [z("hero", 72, t + 54, 530, 160, 90, 3, "slide title"), z("caption", 76, t + 238, 420, 66, 130, 3, "short subtitle"), z("aside", 650, t + 20, 240, h(t) - 40, 50, 2, "vertical supporting illustration")], structures: [rail(612, t + 20, 12, h(t) - 40)] }) },
  { id: "title-section-marker", template: "title", label: "Section marker", recipe: t => ({ zones: [z("caption", 76, t + 52, 180, 48, 60, 2, "section number or role"), z("hero", 76, t + 128, 690, 138, 95, 3, "section title")], structures: [card(52, t + 28, 840, 284), rail(800, t + 28, 92, 284)] }) },

  { id: "content-statement-rail", template: "content", label: "Statement + rail", recipe: t => ({ zones: [z("hero", 74, t + 30, 650, 88, 105, 2, "main statement"), z("body", 76, t + 146, 620, h(t) - 174, 650, 6, "main explanation")], structures: [rail(724, t + 30, 120, h(t) - 60)] }) },
  { id: "content-feature-card", template: "content", label: "Feature card", recipe: t => ({ zones: [z("hero", 92, t + 48, 710, 78, 105, 2, "main title"), z("body", 112, t + 154, 670, h(t) - 196, 700, 6, "key explanation")], structures: [card(70, t + 26, 820, h(t) - 48)] }) },
  { id: "content-offset-columns", template: "content", label: "Offset columns", recipe: t => ({ zones: [z("hero", 70, t + 24, 780, 76, 105, 2, "headline"), z("body", 70, t + 132, 470, h(t) - 162, 500, 6, "primary explanation"), z("caption", 594, t + 192, 260, 130, 180, 4, "key fact or result")], structures: [divider(560, t + 132, 2, h(t) - 162), card(580, t + 164, 294, 178)] }) },
  { id: "content-evidence-stack", template: "content", label: "Evidence stack", recipe: t => ({ zones: [z("hero", 84, t + 30, 530, 86, 105, 2, "main claim"), z("body", 84, t + 144, 470, 190, 520, 5, "supporting explanation"), z("caption", 606, t + 70, 230, 92, 120, 3, "evidence one"), z("caption", 606, t + 188, 230, 92, 120, 3, "evidence two")], structures: [card(580, t + 44, 282, 262)] }) },
  { id: "content-margin-note", template: "content", label: "Margin note", recipe: t => ({ zones: [z("caption", 72, t + 38, 150, 120, 100, 4, "small accent note"), z("hero", 264, t + 38, 570, 80, 105, 2, "headline"), z("body", 264, t + 148, 570, h(t) - 180, 650, 6, "main explanation")], structures: [rail(50, t + 24, 190, h(t) - 48)] }) },

  { id: "text-image-text-left", template: "text-image", label: "Text left, image right", requiresVisual: true, recipe: t => ({ zones: [z("hero", 56, t + 22, 440, 82, 90, 2, "slide title"), z("body", 56, t + 132, 410, h(t) - 160, 520, 6, "explanation"), z("aside", 530, t + 24, 360, h(t) - 48, 70, 2, "supporting illustration")], structures: [card(510, t + 16, 400, h(t) - 32)] }) },
  { id: "text-image-image-left", template: "text-image", label: "Image left, text right", requiresVisual: true, recipe: t => ({ zones: [z("aside", 52, t + 26, 350, h(t) - 52, 70, 2, "supporting illustration"), z("hero", 466, t + 44, 400, 90, 90, 2, "slide title"), z("body", 466, t + 164, 382, h(t) - 198, 500, 6, "explanation")], structures: [card(34, t + 10, 386, h(t) - 20)] }) },
  { id: "text-image-image-band", template: "text-image", label: "Image band", requiresVisual: true, recipe: t => ({ zones: [z("hero", 66, t + 28, 520, 82, 90, 2, "slide title"), z("body", 66, t + 138, 510, 136, 460, 4, "concise explanation"), z("aside", 620, t, 290, h(t), 60, 2, "full-height illustration")], structures: [rail(596, t, 10, h(t))] }) },
  { id: "text-image-overlay-plaque", template: "text-image", label: "Overlay plaque", requiresVisual: true, recipe: t => ({ zones: [z("aside", 72, t + 26, 790, h(t) - 52, 70, 2, "large supporting illustration"), z("hero", 100, t + 74, 430, 96, 85, 2, "title over image"), z("body", 100, t + 192, 390, 124, 420, 4, "short explanation panel")], structures: [card(78, t + 52, 470, 292)] }) },
  { id: "text-image-staggered-cards", template: "text-image", label: "Staggered cards", requiresVisual: true, recipe: t => ({ zones: [z("hero", 58, t + 34, 430, 82, 90, 2, "slide title"), z("body", 78, t + 154, 390, 180, 440, 5, "explanation"), z("aside", 532, t + 74, 330, 228, 60, 2, "supporting illustration"), z("caption", 548, t + 326, 292, 58, 120, 2, "image caption")], structures: [card(50, t + 128, 436, 230), card(512, t + 52, 370, 350)] }) },

  { id: "comparison-unequal-split", template: "comparison", label: "Unequal split", recipe: t => ({ zones: [z("hero", 62, t + 20, 800, 74, 100, 2, "comparison title"), z("body", 62, t + 126, 510, h(t) - 156, 480, 6, "primary comparison side"), z("body", 620, t + 158, 240, h(t) - 188, 300, 5, "secondary comparison side")], structures: [card(46, t + 108, 542, h(t) - 126), card(604, t + 140, 272, h(t) - 158)] }) },
  { id: "comparison-vs-spine", template: "comparison", label: "VS spine", recipe: t => ({ zones: [z("hero", 70, t + 20, 820, 74, 100, 2, "comparison title"), z("body", 58, t + 126, 360, h(t) - 156, 400, 6, "left comparison side"), z("caption", 448, t + 204, 64, 64, 20, 1, "versus marker"), z("body", 542, t + 126, 360, h(t) - 156, 400, 6, "right comparison side")], structures: [rail(466, t + 118, 28, h(t) - 140)] }) },
  { id: "comparison-elevated-cards", template: "comparison", label: "Elevated cards", recipe: t => ({ zones: [z("hero", 80, t + 22, 760, 72, 100, 2, "comparison title"), z("body", 78, t + 132, 348, 220, 400, 5, "first case"), z("body", 534, t + 168, 348, 220, 400, 5, "second case")], structures: [card(56, t + 112, 392, 266), card(512, t + 148, 392, 266)] }) },
  { id: "comparison-before-after", template: "comparison", label: "Before / after layers", recipe: t => ({ zones: [z("caption", 70, t + 118, 154, 42, 60, 2, "before label"), z("body", 70, t + 178, 330, 182, 380, 5, "before state"), z("caption", 542, t + 84, 154, 42, 60, 2, "after label"), z("body", 542, t + 144, 330, 216, 380, 5, "after state"), z("hero", 70, t + 22, 760, 62, 100, 2, "comparison title")], structures: [card(48, t + 100, 374, 286), card(520, t + 66, 374, 320)] }) },
  { id: "comparison-evidence-matrix", template: "comparison", label: "Evidence matrix", recipe: t => ({ zones: [z("hero", 72, t + 20, 780, 70, 100, 2, "comparison title"), z("body", 70, t + 124, 386, h(t) - 154, 420, 6, "first item with evidence"), z("body", 504, t + 124, 386, h(t) - 154, 420, 6, "second item with evidence")], structures: [divider(478, t + 116, 2, h(t) - 136), rail(70, t + 108, 820, 6)] }) },

  { id: "formula-spotlight", template: "formula", label: "Formula spotlight", recipe: t => ({ zones: [z("hero", 96, t + 24, 760, 68, 100, 2, "formula title"), z("formula", 150, t + 130, 660, 118, 160, 3, "main equation"), z("body", 158, t + 292, 644, 116, 460, 4, "meaning of symbols")], structures: [card(122, t + 108, 716, 166)] }) },
  { id: "formula-derivation-rail", template: "formula", label: "Derivation rail", recipe: t => ({ zones: [z("hero", 74, t + 22, 720, 66, 100, 2, "formula title"), z("formula", 100, t + 126, 516, 110, 160, 3, "main equation"), z("body", 100, t + 270, 510, 132, 440, 4, "derivation explanation"), z("caption", 682, t + 138, 138, 182, 150, 5, "important condition")], structures: [rail(650, t + 110, 202, 236)] }) },
  { id: "formula-cards", template: "formula", label: "Formula cards", recipe: t => ({ zones: [z("hero", 70, t + 20, 780, 68, 100, 2, "formula title"), z("formula", 86, t + 126, 350, 106, 130, 3, "main equation"), z("body", 86, t + 264, 350, 128, 360, 4, "symbol explanation"), z("formula", 526, t + 158, 350, 100, 130, 3, "related equation"), z("caption", 526, t + 290, 350, 72, 140, 3, "condition or takeaway")], structures: [card(62, t + 106, 398, 308), card(502, t + 138, 398, 248)] }) },
  { id: "formula-with-visual", template: "formula", label: "Formula + visual", requiresVisual: true, recipe: t => ({ zones: [z("hero", 62, t + 22, 470, 68, 100, 2, "formula title"), z("formula", 62, t + 126, 450, 110, 150, 3, "main equation"), z("body", 62, t + 270, 420, 112, 360, 4, "symbol explanation"), z("aside", 568, t + 32, 300, h(t) - 64, 60, 2, "supporting diagram")], structures: [card(544, t + 16, 348, h(t) - 32)] }) },
  { id: "formula-theorem-stage", template: "formula", label: "Theorem stage", recipe: t => ({ zones: [z("caption", 86, t + 40, 200, 42, 80, 2, "law or principle label"), z("hero", 86, t + 102, 700, 64, 100, 2, "formula title"), z("formula", 170, t + 212, 620, 102, 160, 3, "main equation"), z("caption", 270, t + 348, 420, 58, 150, 2, "interpretation")], structures: [panel(56, t + 22, 848, h(t) - 44)] }) },

  { id: "process-horizontal-path", template: "process", label: "Horizontal path", recipe: t => ({ zones: [z("hero", 70, t + 20, 800, 70, 100, 2, "process title"), z("body", 56, t + 156, 246, 172, 250, 5, "first process step"), z("body", 358, t + 156, 246, 172, 250, 5, "second process step"), z("body", 660, t + 156, 246, 172, 250, 5, "third process step")], structures: [rail(80, t + 126, 790, 8)] }) },
  { id: "process-zigzag-path", template: "process", label: "Zigzag path", recipe: t => ({ zones: [z("hero", 70, t + 18, 800, 70, 100, 2, "process title"), z("body", 70, t + 130, 240, 128, 230, 4, "first step"), z("body", 360, t + 228, 240, 128, 230, 4, "second step"), z("body", 650, t + 130, 240, 128, 230, 4, "third step")], structures: [card(48, t + 110, 284, 158), card(338, t + 208, 284, 158), card(628, t + 110, 284, 158)] }) },
  { id: "process-step-stack", template: "process", label: "Step stack", recipe: t => ({ zones: [z("hero", 70, t + 20, 780, 68, 100, 2, "process title"), z("body", 120, t + 122, 650, 70, 260, 3, "first step"), z("body", 170, t + 222, 650, 70, 260, 3, "second step"), z("body", 220, t + 322, 650, 70, 260, 3, "third step")], structures: [card(96, t + 104, 698, 106), card(146, t + 204, 698, 106), card(196, t + 304, 698, 106)] }) },
  { id: "process-milestone-rail", template: "process", label: "Milestone rail", recipe: t => ({ zones: [z("caption", 70, t + 128, 130, 46, 50, 2, "step one marker"), z("body", 224, t + 112, 610, 78, 240, 3, "first milestone"), z("caption", 70, t + 238, 130, 46, 50, 2, "step two marker"), z("body", 224, t + 222, 610, 78, 240, 3, "second milestone"), z("body", 224, t + 332, 610, 78, 240, 3, "third milestone"), z("hero", 70, t + 18, 780, 62, 100, 2, "process title")], structures: [rail(54, t + 104, 136, 316)] }) },
  { id: "process-outcome-ladder", template: "process", label: "Outcome ladder", recipe: t => ({ zones: [z("hero", 70, t + 18, 780, 66, 100, 2, "process title"), z("body", 68, t + 290, 240, 104, 220, 4, "first action"), z("body", 360, t + 204, 240, 104, 220, 4, "second action"), z("body", 652, t + 118, 240, 104, 220, 4, "final outcome")], structures: [card(50, t + 272, 276, 138), card(342, t + 186, 276, 138), card(634, t + 100, 276, 138)] }) },

  { id: "exercise-challenge-card", template: "exercise-quiz", label: "Challenge card", recipe: t => ({ zones: [z("hero", 80, t + 36, 650, 78, 130, 2, "challenge title"), z("body", 104, t + 150, 604, 176, 580, 6, "problem statement and choices"), z("caption", 140, t + 350, 520, 48, 150, 2, "hint or expected result")], structures: [card(60, t + 18, 700, h(t) - 36)] }) },
  { id: "exercise-question-sidebar", template: "exercise-quiz", label: "Question sidebar", recipe: t => ({ zones: [z("caption", 64, t + 54, 154, 86, 90, 3, "question number or objective"), z("hero", 270, t + 40, 570, 74, 130, 2, "exercise title"), z("body", 270, t + 144, 570, 194, 580, 6, "question and choices")], structures: [rail(44, t + 28, 194, h(t) - 56)] }) },
  { id: "exercise-choice-grid", template: "exercise-quiz", label: "Choice grid", recipe: t => ({ zones: [z("hero", 68, t + 22, 780, 68, 130, 2, "exercise question"), z("body", 68, t + 118, 410, 210, 420, 5, "problem statement"), z("caption", 536, t + 118, 312, 96, 180, 3, "choice group one"), z("caption", 536, t + 244, 312, 96, 180, 3, "choice group two")], structures: [card(512, t + 100, 360, 264)] }) },
  { id: "exercise-split-workspace", template: "exercise-quiz", label: "Split workspace", recipe: t => ({ zones: [z("hero", 64, t + 20, 800, 66, 130, 2, "exercise title"), z("body", 64, t + 120, 420, h(t) - 152, 480, 6, "problem statement"), z("caption", 558, t + 120, 292, h(t) - 152, 260, 5, "hint, answer, or workspace")], structures: [divider(518, t + 110, 2, h(t) - 132), panel(542, t + 106, 328, h(t) - 128)] }) },
  { id: "exercise-prompt-answer", template: "exercise-quiz", label: "Prompt + answer panel", recipe: t => ({ zones: [z("caption", 82, t + 42, 170, 40, 70, 2, "practice label"), z("hero", 82, t + 104, 700, 66, 130, 2, "exercise title"), z("body", 82, t + 202, 466, 160, 480, 5, "question prompt"), z("caption", 624, t + 220, 216, 118, 180, 4, "hint or answer")], structures: [card(598, t + 194, 268, 172)] }) },

  { id: "summary-takeaway-cards", template: "summary", label: "Takeaway cards", recipe: t => ({ zones: [z("hero", 72, t + 20, 780, 66, 110, 2, "summary title"), z("body", 58, t + 132, 254, 170, 240, 5, "takeaway one"), z("body", 354, t + 132, 254, 170, 240, 5, "takeaway two"), z("body", 650, t + 132, 254, 170, 240, 5, "takeaway three")], structures: [card(42, t + 112, 286, 206), card(338, t + 112, 286, 206), card(634, t + 112, 286, 206)] }) },
  { id: "summary-closing-statement", template: "summary", label: "Closing statement", recipe: t => ({ zones: [z("caption", 130, t + 54, 160, 42, 70, 2, "closing label"), z("hero", 130, t + 126, 650, 110, 110, 3, "main takeaway"), z("caption", 210, t + 272, 500, 60, 160, 3, "next step or conclusion")], structures: [panel(100, t + 30, 760, 334)] }) },
  { id: "summary-recap-ribbon", template: "summary", label: "Recap ribbon", recipe: t => ({ zones: [z("hero", 74, t + 24, 760, 66, 110, 2, "summary title"), z("body", 74, t + 130, 520, 190, 500, 5, "main recap"), z("caption", 650, t + 130, 190, 190, 180, 5, "final key result")], structures: [rail(626, t + 112, 240, 226)] }) },
  { id: "summary-two-plus-one", template: "summary", label: "2 + 1 synthesis", recipe: t => ({ zones: [z("hero", 68, t + 20, 790, 64, 110, 2, "summary title"), z("body", 68, t + 128, 350, 132, 340, 4, "first takeaway"), z("body", 68, t + 292, 350, 100, 300, 3, "second takeaway"), z("caption", 512, t + 174, 300, 120, 180, 4, "synthesis or conclusion")], structures: [card(490, t + 148, 344, 168)] }) },
  { id: "summary-next-step", template: "summary", label: "Next-step panel", recipe: t => ({ zones: [z("hero", 72, t + 24, 600, 66, 110, 2, "summary title"), z("body", 72, t + 126, 500, 184, 500, 5, "key recap"), z("caption", 650, t + 92, 190, 176, 180, 5, "next step or homework")], structures: [card(624, t + 68, 242, 224), rail(72, t + 336, 500, 8)] }) },
] as const;

export function getLayoutVariants(template: SlideLayoutTemplate): readonly SlideLayoutVariant[] {
  return SLIDE_LAYOUT_VARIANTS.filter((variant) => variant.template === template);
}

function bodyTop(skinHtml: string): number {
  const match = /data-body-top="(\d+)"/.exec(skinHtml);
  const value = match ? Number(match[1]) : 80;
  return Number.isFinite(value) && value >= 40 && value <= 160 ? value : 80;
}

export function selectSlideLayout(slide: SlideItem): SlideLayoutTemplate {
  const requestedVariant = slide.layoutVariant?.trim();
  const variantTemplate = requestedVariant ? SLIDE_LAYOUT_VARIANTS.find((variant) => variant.id === requestedVariant)?.template : undefined;
  if (variantTemplate) return variantTemplate;
  const explicit = slide.layoutHint?.trim().toLowerCase();
  if (explicit && HINT_TO_TEMPLATE[explicit]) return HINT_TO_TEMPLATE[explicit];
  if (slide.quizItems?.length || slide.pedagogicalRole === "practice") return "exercise-quiz";
  if (slide.visual?.type === "formula" || slide.kind === "formula" || slide.pedagogicalRole === "derive") return "formula";
  if (slide.visual?.type === "image" || slide.visual?.type === "table" || slide.pedagogicalRole === "demonstrate") return "text-image";
  if (slide.pedagogicalRole === "recap" || slide.kind === "summary") return "summary";
  if (slide.pedagogicalRole === "hook" || slide.kind === "intro") return "title";
  return "content";
}

function stableIndex(seed: string, size: number): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return (hash >>> 0) % size;
}

export function selectSlideLayoutVariant(slide: SlideItem, template = selectSlideLayout(slide)): SlideLayoutVariant {
  const requested = slide.layoutVariant?.trim();
  const explicit = requested ? SLIDE_LAYOUT_VARIANTS.find((variant) => variant.id === requested) : undefined;
  if (explicit && (!explicit.requiresVisual || slide.visual?.type === "image" || slide.visual?.type === "table")) return explicit;
  const supportsVisual = slide.visual?.type === "image" || slide.visual?.type === "table";
  const candidates = getLayoutVariants(template).filter((variant) => !variant.requiresVisual || supportsVisual);
  const fallback = candidates.length ? candidates : getLayoutVariants(template);
  return fallback[stableIndex(slide.id || slide.title, fallback.length)];
}

function isDarkSkin(skinHtml: string): boolean {
  const colors = skinHtml.match(/#[0-9a-fA-F]{6}/g) ?? [];
  const first = colors[0];
  if (!first) return /background\s*:\s*(?:#0|rgb\(0|black)/i.test(skinHtml);
  const value = Number.parseInt(first.slice(1), 16);
  return ((value >> 16) & 255) * 0.299 + ((value >> 8) & 255) * 0.587 + (value & 255) * 0.114 < 115;
}

function structureHtml(structure: Structure, dark: boolean): string {
  const base = "position:absolute;z-index:42;";
  const geometry = `left:${structure.x}px;top:${structure.y}px;width:${structure.w}px;height:${structure.h}px;`;
  const light = "background:rgba(255,255,255,.48);border:1px solid rgba(15,23,42,.10);";
  const darkStyle = "background:rgba(226,232,240,.08);border:1px solid rgba(226,232,240,.18);";
  const surface = dark ? darkStyle : light;
  const detail = structure.kind === "card" ? "border-radius:22px;box-shadow:0 10px 28px rgba(15,23,42,.06);" : structure.kind === "rail" ? "border-radius:999px;opacity:.85;" : structure.kind === "divider" ? "opacity:.55;" : "border-radius:14px;";
  return `<div data-layer="struct" data-region="body" data-slide-el="shape" style="${base}${geometry}${surface}${detail}"></div>`;
}

function zoneHtml(zone: Zone, slotId: string, dark: boolean): string {
  const outline = dark ? "rgba(226,232,240,0.55)" : "rgba(15,23,42,0.45)";
  const background = dark ? "rgba(226,232,240,0.06)" : "rgba(15,23,42,0.04)";
  const color = dark ? "rgba(226,232,240,0.75)" : "rgba(15,23,42,0.65)";
  return `<div data-layer="zone" data-region="body" data-zone="${zone.id}" data-slot="${slotId}" data-bbox-x="${zone.x}" data-bbox-y="${zone.y}" data-bbox-w="${zone.w}" data-bbox-h="${zone.h}" data-max-chars="${zone.maxChars}" data-max-lines="${zone.maxLines}" data-content-hint="${zone.hint}" style="position:absolute;left:${zone.x}px;top:${zone.y}px;width:${zone.w}px;height:${zone.h}px;z-index:45;outline:2px dashed ${outline};outline-offset:-2px;background:${background};display:flex;flex-direction:column;justify-content:flex-start;align-items:flex-start;padding:6px 8px;color:${color};font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.3;pointer-events:none;overflow:hidden;"><span style="font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">zone: ${zone.id}</span><span style="opacity:0.75;">${zone.w}×${zone.h} · max ${zone.maxChars} chars · ${zone.maxLines} lines</span></div>`;
}

function fitLayoutToBody(layout: { zones: Zone[]; structures?: Structure[] }, top: number) {
  // Recipes are drawn for a comfortable ~420px body. Tall headers reduce the
  // available body height, so compact vertical geometry instead of letting a
  // lower card leak below the 540px canvas.
  const scale = Math.min(1, (520 - top) / 420);
  const compactY = (y: number) => Math.round(top + (y - top) * scale);
  const compactH = (height: number) => Math.max(24, Math.round(height * scale));
  return {
    zones: layout.zones.map((zone) => ({ ...zone, y: compactY(zone.y), h: compactH(zone.h) })),
    structures: layout.structures?.map((structure) => ({ ...structure, y: compactY(structure.y), h: compactH(structure.h) })),
  };
}

export function buildStructuralTemplateHtml(skinHtml: string, slide: SlideItem): { html: string; template: SlideLayoutTemplate; variant: SlideLayoutVariant; slots: SlideContentSlot[] } {
  const closingIndex = skinHtml.lastIndexOf("</div>");
  if (closingIndex < 0) throw new Error("Bước 1 không trả về HTML deck hợp lệ.");
  const template = selectSlideLayout(slide);
  const variant = selectSlideLayoutVariant(slide, template);
  const dark = isDarkSkin(skinHtml);
  const top = bodyTop(skinHtml);
  const layout = fitLayoutToBody(variant.recipe(top), top);
  const structures = (layout.structures ?? []).map((structure) => structureHtml(structure, dark)).join("");
  const zoneCounts = new Map<ZoneId, number>();
  const slots = layout.zones.map((zone) => {
    const index = (zoneCounts.get(zone.id) ?? 0) + 1;
    zoneCounts.set(zone.id, index);
    return {
      id: `${zone.id}-${index}`,
      kind: zone.id === "aside" ? "image" : "text",
      zone: zone.id,
      maxChars: zone.maxChars,
      maxLines: zone.maxLines,
      hint: zone.hint,
    } as SlideContentSlot;
  });
  const zones = layout.zones.map((zone, index) => zoneHtml(zone, slots[index].id, dark)).join("");
  return { html: `${skinHtml.slice(0, closingIndex)}${structures}${zones}${skinHtml.slice(closingIndex)}`, template, variant, slots };
}
