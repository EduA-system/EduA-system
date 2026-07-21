/** Types shared by simulation presets, renderers, and the page shell. */
export type SceneReadout = {
  bodies: { id: string; x: number; y: number; speed: number }[];
  energy: { ke: number; pe: number; total: number };
};

export type SceneAnnotation =
  | { kind: "arrow"; x1: number; y1: number; x2: number; y2: number; color?: string; arrowAt?: number; animated?: boolean }
  | { kind: "label"; x: number; y: number; text: string; color?: string; fontSize?: number; fontStyle?: string; fontFamily?: string }
  | { kind: "rect"; x: number; y: number; width: number; height: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { kind: "polygon"; points: { x: number; y: number }[]; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | {
      kind: "curve";
      x1: number;
      y1: number;
      cx1: number;
      cy1: number;
      cx2: number;
      cy2: number;
      x2: number;
      y2: number;
      color?: string;
      strokeWidth?: number;
      arrowAt?: number;
      animated?: boolean;
    };
