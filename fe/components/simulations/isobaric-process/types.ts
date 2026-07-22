export type IsobaricParams = {
  temperatureC: number;
  comparisonTemperatureC: number;
  pressure: number;
};

export type IsobaricState = {
  temperatureC: number;
  temperatureK: number;
  pressure: number;
  volume: number;
  volumeTemperatureRatio: number;
  status: "cooling" | "reference" | "heating";
};

export type IsobaricProcessScene = Record<string, never>;
