export type ElectricBellPhase =
  | "idle"
  | "circuitClosed"
  | "magnetizing"
  | "armatureAttracting"
  | "contactOpening"
  | "hammerStriking"
  | "circuitOpen"
  | "demagnetizing"
  | "armatureReturning"
  | "contactClosing"
  | "paused";

export type ElectricBellParams = {
  voltage: number;
  coilResistance: number;
  wireResistance: number;
  turns: number;
  gapMm: number;
  springConstant: number;
  massGrams: number;
  damping: number;
  contactPositionMm: number;
  bellDistanceMm: number;
  magneticCoefficient: number;
  forceCoefficient: number;
  coilLength: number;
  polarity: 1 | -1;
  masterSwitchClosed: boolean;
  showCurrent: boolean;
  showField: boolean;
  showLabels: boolean;
};

export type ElectricBellEventType = "contact-open" | "contact-close" | "strike";
export type ElectricBellEvent = {
  id: number;
  type: ElectricBellEventType;
  time: number;
};

export type ElectricBellState = {
  time: number;
  phase: ElectricBellPhase;
  current: number;
  fieldRelative: number;
  magneticForce: number;
  springForce: number;
  displacement: number;
  velocity: number;
  contactClosed: boolean;
  strikeCount: number;
  lastStrikeTime: number;
  strikeFrequency: number;
  bellImpulse: number;
  eventSerial: number;
  lastEvent: ElectricBellEvent | null;
};

export type ElectricBellSnapshot = ElectricBellState & {
  gapCurrentMm: number;
  currentDirection: 1 | -1;
};

export type ElectricBellChartPoint = Pick<
  ElectricBellSnapshot,
  | "time"
  | "current"
  | "fieldRelative"
  | "magneticForce"
  | "springForce"
  | "displacement"
  | "strikeCount"
>;
