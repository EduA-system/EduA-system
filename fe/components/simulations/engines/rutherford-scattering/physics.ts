import { DEFAULT_RUTHERFORD_SCATTERING_PARAMS, SCATTERING_VIEW } from "./constants";
import { resumeScattering, transitionScattering } from "./state-machine";
import type {
  GoldNucleus,
  RutherfordScatteringCommand,
  RutherfordScatteringMetrics,
  RutherfordScatteringParams,
  RutherfordScatteringState,
  ScatteringCategory,
  ScatteringParticle,
  Vector2,
} from "./types";

const MAX_PARTICLES_PER_RUN = 180;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function nextRandom(state: RutherfordScatteringState): number {
  state.randomSeed = (Math.imul(state.randomSeed, 1664525) + 1013904223) >>> 0;
  return state.randomSeed / 4294967296;
}

function normalize(vector: Vector2): Vector2 {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function createNuclei(): GoldNucleus[] {
  return Array.from({ length: 25 }, (_, index) => ({
    id: `au-${index}`,
    position: { x: SCATTERING_VIEW.foil.x, y: 182 + index * 10.65 },
    baseY: 182 + index * 10.65,
    phase: index * 1.71,
    pulse: 0,
  }));
}

export function createRutherfordScatteringState(): RutherfordScatteringState {
  return {
    phase: "idle",
    phaseBeforePause: "ready",
    elapsed: 0,
    phaseTime: 0,
    particles: [],
    nuclei: createNuclei(),
    flashes: [],
    counters: { emitted: 0, straight: 0, smallAngle: 0, largeAngle: 0, backscattered: 0, detected: 0 },
    observations: [],
    events: [],
    continuousEmission: false,
    singleEmissionRequested: false,
    emissionAccumulator: 0,
    sourcePulse: 0,
    foilPulse: 0,
    detectorPulse: 0,
    randomSeed: 19110307,
    nextId: 1,
  };
}

export function handleScatteringCommand(
  state: RutherfordScatteringState,
  command: RutherfordScatteringCommand,
): void {
  if (command === "pause") {
    transitionScattering(state, "paused");
    return;
  }
  if (command === "resume") {
    resumeScattering(state);
    state.continuousEmission = true;
    return;
  }
  if (command === "start") {
    if (state.phase === "completed") {
      state.particles = [];
      state.flashes = [];
      state.observations = [];
      state.events = [];
      state.counters = { emitted: 0, straight: 0, smallAngle: 0, largeAngle: 0, backscattered: 0, detected: 0 };
    }
    state.continuousEmission = true;
    state.singleEmissionRequested = false;
    if (state.phase === "idle" || state.phase === "ready" || state.phase === "observing" || state.phase === "completed") {
      transitionScattering(state, "emitting");
    }
    return;
  }
  if (command === "emitOne") {
    if (state.phase === "paused") resumeScattering(state);
    state.continuousEmission = false;
    state.singleEmissionRequested = true;
    transitionScattering(state, "emitting");
    return;
  }
  if (command === "reset") transitionScattering(state, "resetting");
}

function makeParticle(
  state: RutherfordScatteringState,
  params: RutherfordScatteringParams,
): ScatteringParticle {
  const y = SCATTERING_VIEW.source.y + (nextRandom(state) - 0.5) * clamp(params.beamWidth, 4, 72);
  return {
    id: `alpha-${state.nextId++}`,
    position: { x: SCATTERING_VIEW.source.x + 30, y },
    direction: normalize({ x: 1, y: (nextRandom(state) - 0.5) * 0.012 }),
    velocity: 330 + clamp(params.alphaEnergy, 25, 100) * 2.15,
    energy: clamp(params.alphaEnergy / 100, 0.2, 1),
    active: true,
    opacity: 1,
    hasScattered: false,
    hasReachedScreen: false,
    impactParameter: null,
    scatteringAngle: null,
    category: null,
    targetNucleusId: null,
    trail: [{ x: SCATTERING_VIEW.source.x + 30, y }],
  };
}

function categoryFromAngle(angle: number): ScatteringCategory {
  if (angle < 5) return "straight";
  if (angle < 30) return "small";
  if (angle < 90) return "large";
  return "backscatter";
}

function scatterAtFoil(
  state: RutherfordScatteringState,
  particle: ScatteringParticle,
  params: RutherfordScatteringParams,
  yAtFoil: number,
): void {
  const nucleus = state.nuclei.reduce((closest, candidate) => (
    Math.abs(candidate.position.y - yAtFoil) < Math.abs(closest.position.y - yAtFoil)
      ? candidate
      : closest
  ));
  const signedImpact = yAtFoil - nucleus.position.y;
  const impactParameter = Math.max(0.055, Math.abs(signedImpact));
  const energyFactor = clamp(params.alphaEnergy / 82, 0.32, 1.35);
  const chargeFactor = clamp(params.atomicNumber / 79, 0.12, 1.15);
  const coulombScale = 0.082 * chargeFactor / energyFactor;
  const singleScattering = 2 * Math.atan(coulombScale / impactParameter);
  const multipleScattering = (nextRandom(state) - 0.5) * (Math.PI / 180) * clamp(params.foilThickness, 0.2, 3.2) * 1.1;
  const magnitude = clamp(Math.abs(singleScattering + multipleScattering), 0, Math.PI - 0.025);
  const sign = signedImpact === 0 ? (nextRandom(state) < 0.5 ? -1 : 1) : Math.sign(signedImpact);
  const incomingAngle = Math.atan2(particle.direction.y, particle.direction.x);
  const outgoingAngle = incomingAngle + sign * magnitude;
  const angleDegrees = magnitude * 180 / Math.PI;
  const category = categoryFromAngle(angleDegrees);

  particle.position = { x: SCATTERING_VIEW.foil.x, y: yAtFoil };
  particle.direction = { x: Math.cos(outgoingAngle), y: Math.sin(outgoingAngle) };
  particle.energy = clamp(particle.energy * Math.exp(-0.018 * params.foilThickness), 0.08, 1);
  particle.velocity *= 0.94 + particle.energy * 0.04;
  particle.hasScattered = true;
  particle.impactParameter = impactParameter;
  particle.scatteringAngle = angleDegrees;
  particle.category = category;
  particle.targetNucleusId = nucleus.id;
  nucleus.pulse = 1;
  state.foilPulse = Math.max(state.foilPulse, category === "backscatter" ? 1 : category === "large" ? 0.72 : 0.38);
  if (category === "straight") state.counters.straight += 1;
  else if (category === "small") state.counters.smallAngle += 1;
  else if (category === "large") state.counters.largeAngle += 1;
  else state.counters.backscattered += 1;
  transitionScattering(state, "scattering");
}

function updateTrail(particle: ScatteringParticle, persistence: number): void {
  const previous = particle.trail[particle.trail.length - 1];
  if (!previous || Math.hypot(previous.x - particle.position.x, previous.y - particle.position.y) >= 7) {
    particle.trail.push({ ...particle.position });
  }
  const limit = Math.round(10 + clamp(persistence, 10, 100) * 0.28);
  if (particle.trail.length > limit) particle.trail.shift();
}

function registerScreenHit(
  state: RutherfordScatteringState,
  particle: ScatteringParticle,
  params: RutherfordScatteringParams,
): void {
  if (!particle.category || particle.scatteringAngle === null || particle.impactParameter === null) return;
  const dx = particle.position.x - SCATTERING_VIEW.foil.x;
  const dy = particle.position.y - SCATTERING_VIEW.foil.y;
  const distance = Math.hypot(dx, dy) || 1;
  particle.position = {
    x: SCATTERING_VIEW.foil.x + dx / distance * SCATTERING_VIEW.screenRadius,
    y: SCATTERING_VIEW.foil.y + dy / distance * SCATTERING_VIEW.screenRadius,
  };
  particle.hasReachedScreen = true;
  particle.active = false;
  particle.opacity = 0;
  const detected = nextRandom(state) <= clamp(params.detectorSensitivity / 100, 0.2, 1);
  state.observations.push({
    time: state.elapsed,
    angle: particle.scatteringAngle,
    impactParameter: particle.impactParameter,
    category: particle.category,
    detected,
  });
  if (state.observations.length > 260) state.observations.shift();
  if (!detected) return;
  state.counters.detected += 1;
  state.detectorPulse = 1;
  state.flashes.push({
    id: `flash-${particle.id}`,
    position: { ...particle.position },
    age: 0,
    lifetime: clamp(params.flashLifetime, 0.2, 2),
    category: particle.category,
  });
  transitionScattering(state, "scintillation");
}

function updateParticle(
  state: RutherfordScatteringState,
  particle: ScatteringParticle,
  params: RutherfordScatteringParams,
  dt: number,
): void {
  if (!particle.active) return;
  const previous = { ...particle.position };
  const distance = clamp(particle.velocity, 80, 620) * dt;
  particle.position.x += particle.direction.x * distance;
  particle.position.y += particle.direction.y * distance;

  if (!particle.hasScattered && previous.x < SCATTERING_VIEW.foil.x && particle.position.x >= SCATTERING_VIEW.foil.x) {
    const progress = (SCATTERING_VIEW.foil.x - previous.x) / Math.max(0.001, particle.position.x - previous.x);
    const yAtFoil = previous.y + (particle.position.y - previous.y) * progress;
    scatterAtFoil(state, particle, params, yAtFoil);
  }

  if (particle.hasScattered) {
    const radialDistance = Math.hypot(
      particle.position.x - SCATTERING_VIEW.foil.x,
      particle.position.y - SCATTERING_VIEW.foil.y,
    );
    if (radialDistance >= SCATTERING_VIEW.screenRadius) registerScreenHit(state, particle, params);
    else if (state.phase !== "scattering" && state.phase !== "scintillation") transitionScattering(state, "travelingToScreen");
  }

  if (particle.active) {
    particle.opacity = clamp(0.35 + particle.energy * 0.65, 0.25, 1);
    updateTrail(particle, params.trailPersistence);
  }
  if (particle.position.x < 15 || particle.position.x > 985 || particle.position.y < 12 || particle.position.y > 608) {
    particle.active = false;
    particle.opacity = 0;
  }
}

function updateNuclei(state: RutherfordScatteringState, dt: number): void {
  for (const nucleus of state.nuclei) {
    nucleus.position.y = nucleus.baseY + Math.sin(state.elapsed * 0.45 + nucleus.phase) * 1.3;
    nucleus.pulse = clamp(nucleus.pulse - dt * 1.4, 0, 1);
  }
}

function updateEffects(state: RutherfordScatteringState, dt: number): void {
  state.sourcePulse = clamp(state.sourcePulse - dt * 4.5, 0, 1);
  state.foilPulse = clamp(state.foilPulse - dt * 2.1, 0, 1);
  state.detectorPulse = clamp(state.detectorPulse - dt * 2.4, 0, 1);
  for (const flash of state.flashes) flash.age += dt;
  state.flashes = state.flashes.filter((flash) => flash.age < flash.lifetime);
}

function emitParticle(state: RutherfordScatteringState, params: RutherfordScatteringParams): void {
  state.particles.push(makeParticle(state, params));
  state.counters.emitted += 1;
  state.sourcePulse = 1;
  state.singleEmissionRequested = false;
  transitionScattering(state, "approachingFoil");
}

export function stepRutherfordScattering(
  state: RutherfordScatteringState,
  params: RutherfordScatteringParams,
  rawDt: number,
): void {
  if (state.phase === "paused" || state.phase === "resetting") return;
  const dt = clamp(rawDt, 0, 0.045);
  if (dt <= 0) return;
  state.elapsed += dt;
  state.phaseTime += dt;
  updateNuclei(state, dt);
  updateEffects(state, dt);

  if (state.phase === "idle") transitionScattering(state, "ready");
  if (state.phase === "emitting" && state.phaseTime >= 0.08) emitParticle(state, params);

  for (const particle of [...state.particles]) updateParticle(state, particle, params, dt);
  state.particles = state.particles.filter((particle) => particle.active);

  const canEmit = state.counters.emitted < MAX_PARTICLES_PER_RUN;
  if (state.continuousEmission && canEmit) {
    const intensityFactor = Math.pow(100 / Math.max(20, params.sourceIntensity), 0.3);
    const interval = clamp((1 / Math.max(0.5, params.emissionRate)) * intensityFactor, 0.12, 1.8);
    state.emissionAccumulator += dt;
    if (state.emissionAccumulator >= interval) {
      state.emissionAccumulator = 0;
      emitParticle(state, params);
    }
  } else if (state.singleEmissionRequested) {
    emitParticle(state, params);
  }

  if (!canEmit && state.particles.length === 0 && state.continuousEmission) {
    state.continuousEmission = false;
    transitionScattering(state, "completed");
  } else if (state.particles.length === 0 && !state.continuousEmission && !state.singleEmissionRequested && state.phaseTime > 0.25) {
    transitionScattering(state, "observing");
  }
}

export function rutherfordScatteringMetrics(
  state: RutherfordScatteringState,
): RutherfordScatteringMetrics {
  const latest = state.observations[state.observations.length - 1];
  const meanAngle = state.observations.length > 0
    ? state.observations.reduce((sum, observation) => sum + observation.angle, 0) / state.observations.length
    : 0;
  return {
    phase: state.phase,
    elapsed: state.elapsed,
    counters: { ...state.counters },
    observations: state.observations.map((observation) => ({ ...observation })),
    events: state.events.map((event) => ({ ...event })),
    currentEnergy: state.particles.find((particle) => particle.active)?.energy ?? 0,
    latestAngle: latest?.angle ?? null,
    latestImpactParameter: latest?.impactParameter ?? null,
    meanAngle,
    detectionRate: state.counters.emitted > 0 ? state.counters.detected / state.counters.emitted : 0,
  };
}

export { DEFAULT_RUTHERFORD_SCATTERING_PARAMS };
