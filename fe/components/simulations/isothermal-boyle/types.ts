export type BoyleParams = {
  volumeA: number;
  volumeB: number;
  temperature: number;
  showMolecules: boolean;
};

export type BoyleState = {
  pressure: number;
  volume: number;
  temperature: number;
  constant: number;
  status: "compressed" | "expanded" | "reference";
};

export type IsothermalBoyleScene = Record<string, never>;
