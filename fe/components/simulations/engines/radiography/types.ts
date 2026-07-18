export type BecquerelPhase = "introduction" | "preparingPlate" | "wrappingPlate" | "placingMetalObject" | "placingUranium" | "configuringExposure" | "exposing" | "paused" | "exposureComplete" | "developing" | "result" | "comparison" | "completed";

export type BecquerelParams = { activity: number; distance: number; exposureTime: number; sensitivity: number; material: number; thickness: number; lightCondition: number; contrast: number; noise: number; sourceSize: number; wrapped: number };
export type ExposureMap = { width: number; height: number; values: Float32Array };
export type BecquerelState = { phase: BecquerelPhase; resumePhase: Exclude<BecquerelPhase, "paused">; time: number; phaseStartedAt: number; exposureElapsed: number; developProgress: number; wrapped: boolean; hasUranium: boolean; sourceX: number };
export type BecquerelMetrics = { phase: BecquerelPhase; time: number; exposureElapsed: number; progress: number; intensityAtPlate: number; transmission: number; meanExposure: number; predictedDarkness: number; latentReady: boolean; developed: boolean; lightLeak: boolean; developProgress: number };
export type BecquerelChartPoint = { time: number; exposure: number; intensity: number; darkness: number };
