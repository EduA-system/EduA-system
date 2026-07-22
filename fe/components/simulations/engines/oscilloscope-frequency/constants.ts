import type { OscilloscopeFrequencyParams } from "./types";

export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 620;
export const SCREEN_DIVISIONS_X = 10;
export const SCREEN_DIVISIONS_Y = 8;
export const SOUND_SPEED = 343;

export const DEFAULT_OSCILLOSCOPE_PARAMS: OscilloscopeFrequencyParams = {
  frequency: 440,
  sourceAmplitude: 76,
  damping: 12,
  microphoneDistance: 22,
  microphoneGain: 100,
  timePerDivision: 1,
  voltsPerDivision: 0.5,
  noise: 3,
};
