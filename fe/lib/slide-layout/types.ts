export type SlideType =
  | "intro"
  | "section"
  | "concept"
  | "text-image"
  | "experiment"
  | "comparison"
  | "table"
  | "process"
  | "formula"
  | "exercise"
  | "quiz"
  | "summary";

export type HeaderMode = "fixed" | "hidden";
export type ContentPriority = "primary" | "secondary" | "supporting";
export type ContentRole = "hero" | "body" | "caption" | "formula" | "visual";

export type BaseContentBlock = {
  id: string;
  role: ContentRole;
  semanticType: string;
  priority: ContentPriority;
  required: boolean;
  groupId?: string;
};

export type TextContentBlock = BaseContentBlock & {
  kind: "text";
  semanticType: "title" | "subtitle" | "description" | "definition" | "explanation" | "result" | "takeaway" | "note";
  text: string;
};

export type VisualContentBlock = BaseContentBlock & {
  kind: "visual";
  role: "visual";
  semanticType: "image" | "diagram" | "chart" | "experiment-apparatus";
  description: string;
  requirement: "optional" | "required";
  preferredAspectRatio?: "landscape" | "portrait" | "square";
  illustratesBlockId?: string;
};

export type MoleculeContentBlock = BaseContentBlock & {
  kind: "molecule";
  role: "visual";
  semanticType: "molecule-3d";
  chemicalRequest: string;
};

export type ComparisonContentBlock = BaseContentBlock & {
  kind: "comparison";
  role: "body";
  semanticType: "comparison";
  items: Array<{ id: string; label: string }>;
  criteria: Array<{ id: string; label: string }>;
  values: string[][];
  preferredPresentation: "auto" | "table" | "panels";
};

export type TableContentBlock = BaseContentBlock & {
  kind: "table";
  role: "body";
  semanticType: "data-table";
  columns: Array<{ id: string; label: string }>;
  rows: Array<{ id: string; cells: string[] }>;
};

export type SequenceContentBlock = BaseContentBlock & {
  kind: "sequence";
  role: "body";
  semanticType: "procedure" | "process";
  steps: Array<{ id: string; label?: string; text: string }>;
};

export type FormulaContentBlock = BaseContentBlock & {
  kind: "formula";
  role: "formula";
  semanticType: "formula";
  expression: string;
  explanation?: string;
};

export type QuizContentBlock = BaseContentBlock & {
  kind: "quiz";
  role: "body";
  semanticType: "quiz" | "exercise";
  question: string;
  choices?: string[];
  answer?: string;
  explanation?: string;
};

export type ContentBlock =
  | TextContentBlock
  | VisualContentBlock
  | MoleculeContentBlock
  | ComparisonContentBlock
  | TableContentBlock
  | SequenceContentBlock
  | FormulaContentBlock
  | QuizContentBlock;

export type ContentRelationship =
  | { type: "illustrates"; visualBlockId: string; targetBlockId: string }
  | { type: "supports"; supportingBlockId: string; targetBlockId: string }
  | { type: "follows"; beforeBlockId: string; afterBlockId: string };

export type SlideContentPlan = {
  slideType: SlideType;
  headerMode: HeaderMode;
  blocks: ContentBlock[];
  relationships: ContentRelationship[];
};

export type SlideLayoutInput = SlideContentPlan & {
  schemaVersion: 1;
  slideId: string;
  deckSeed: string;
  runNonce: number;
  algorithmVersion: number;
  canvas: { width: 960; height: 540 };
  bodyTop: number;
  density: "sparse" | "normal" | "dense";
};

export type Rect = { x: number; y: number; w: number; h: number };
export type LayoutZone = "hero" | "body" | "aside" | "caption" | "formula";

export type LayoutStructure = {
  id: string;
  kind: "card" | "panel" | "divider" | "rail" | "table-grid";
  rect: Rect;
  styleToken: string;
  zIndex: number;
  rows?: number;
  columns?: number;
};

export type LayoutSlot = {
  id: string;
  sourceBlockId: string;
  sourcePartId?: string;
  sourceText: string;
  zone: LayoutZone;
  kind: "text" | "image" | "molecule";
  rect: Rect;
  maxChars: number;
  maxLines: number;
  contentHint: string;
  defaultStyleToken: string;
  zIndex: number;
};

export type LayoutScore = {
  total: number;
  readability: number;
  contentFit: number;
  visualBalance: number;
  spaceCoverage: number;
  semanticMatch: number;
  variety: number;
};

export type LayoutWarning = {
  code: "FALLBACK_TOPOLOGY" | "DENSE_CONTENT" | "VISUAL_TOO_SMALL" | "TEXT_NEAR_CAPACITY" | "OPTIONAL_BLOCK_OMITTED";
  message: string;
  blockId?: string;
};

export type SlideLayoutResult = {
  schemaVersion: 1;
  slideId: string;
  algorithmVersion: number;
  seed: number;
  family: SlideType;
  topology: string;
  headerMode: HeaderMode;
  contentBounds: Rect;
  structures: LayoutStructure[];
  slots: LayoutSlot[];
  score: LayoutScore;
  warnings: LayoutWarning[];
};
