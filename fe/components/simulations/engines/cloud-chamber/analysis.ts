import type { CloudChamberObservation, CloudChamberState, ParticleType } from "./types";

export function createObservation(
  state: CloudChamberState,
  imageDataUrl: string,
): CloudChamberObservation {
  return {
    eventType: state.isBlackettEvent ? "blackett" : "normal",
    capturedAt: state.time,
    imageDataUrl,
    tracks: state.tracks.map((track) => ({
      id: track.id,
      particleType: track.particleType,
      start: { ...track.startPosition },
      end: { ...track.position },
      length: track.distanceTraveled,
      width: track.width,
      ionizationDensity: track.ionizationDensity,
    })),
    events: [...state.events],
  };
}

export const TRACK_NAMES: Record<ParticleType, string> = {
  alpha: "Hạt α tới",
  proton: "Proton",
  oxygen17: "Hạt nhân oxygen-17",
};
