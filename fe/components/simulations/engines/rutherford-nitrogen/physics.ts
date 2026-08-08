import {
  DEFAULT_RUTHERFORD_PARAMS,
  EMPTY_GAS_STATS,
  GAS_DENSITY_FACTORS,
  MATERIAL_ATTENUATION,
  RUTHERFORD_VIEW,
  gasFromCode,
  materialFromCode,
} from "./constants";
import { resumeRutherford, transitionRutherford } from "./state-machine";
import type {
  GasType,
  NuclearTarget,
  ParticleType,
  RutherfordCommand,
  RutherfordMetrics,
  RutherfordParams,
  RutherfordParticle,
  RutherfordState,
  Vec2,
} from "./types";

const MAX_BATCH_SIZE = 120;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function nextRandom(state: RutherfordState): number {
  state.randomSeed = (Math.imul(state.randomSeed, 1664525) + 1013904223) >>> 0;
  return state.randomSeed / 4294967296;
}

function normalize(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function gasDensity(params: RutherfordParams, gas: GasType): number {
  return clamp(
    GAS_DENSITY_FACTORS[gas] * (params.gasPressure / 100) * (params.gasDensity / 100),
    0,
    1.8,
  );
}

export function createRutherfordState(
  params: RutherfordParams = DEFAULT_RUTHERFORD_PARAMS,
): RutherfordState {
  const gas = gasFromCode(params.gasCode);
  const state: RutherfordState = {
    phase: "idle",
    phaseBeforePause: "ready",
    phaseTime: 0,
    elapsed: 0,
    currentGas: gas,
    nuclearTargets: [],
    particles: [],
    flashes: [],
    counters: {
      alphasEmitted: 0,
      alphasAbsorbed: 0,
      nuclearCollisions: 0,
      protonsCreated: 0,
      protonsReached: 0,
      flashes: 0,
    },
    gasStats: EMPTY_GAS_STATS(),
    events: [],
    history: [],
    ranges: { alpha: [], proton: [], oxygen17: [] },
    reactions: [],
    pendingReaction: null,
    continuousEmission: false,
    singleEmissionRequested: false,
    emissionAccumulator: 0,
    emittedInBatch: 0,
    reactionPulse: 0,
    absorberPulse: 0,
    microscopeGlow: 0,
    sourcePulse: 0,
    randomSeed: 19190717,
    nextParticleId: 1,
  };
  state.nuclearTargets = createNuclearTargets(state, params, gas);
  return state;
}

function targetComposition(gas: GasType): Array<NuclearTarget["nucleusType"]> {
  if (gas === "vacuum") return [];
  if (gas === "nitrogen") return Array.from({ length: 28 }, () => "nitrogen14" as const);
  if (gas === "air") return Array.from(
    { length: 28 },
    (_, index) => (index % 4 === 2 ? "nitrogen14" : "oxygen16") as NuclearTarget["nucleusType"],
  );
  if (gas === "oxygen") return Array.from({ length: 28 }, () => "oxygen16" as const);
  return Array.from(
    { length: 27 },
    (_, index) => (index % 3 === 1 ? "carbon12" : "oxygen16") as NuclearTarget["nucleusType"],
  );
}

function createNuclearTargets(
  state: RutherfordState,
  params: RutherfordParams,
  gas: GasType,
): NuclearTarget[] {
  const composition = targetComposition(gas);
  const densityScale = clamp(0.48 + params.gasDensity / 145, 0.45, 1.25);
  const count = Math.min(composition.length, Math.max(0, Math.round(composition.length * densityScale)));
  return composition.slice(0, count).map((nucleusType, index) => {
    const column = index % 7;
    const row = Math.floor(index / 7);
    const position = {
      x: 280 + column * 59 + (nextRandom(state) - 0.5) * 24,
      y: 202 + row * 70 + (nextRandom(state) - 0.5) * 28,
    };
    const displayRadius = nucleusType === "carbon12" ? 6 : nucleusType === "oxygen16" ? 6.5 : 6.2;
    return {
      id: `target-${gas}-${index}`,
      nucleusType,
      position: { ...position },
      basePosition: position,
      displayRadius,
      collisionRadius: displayRadius * 0.88,
      driftPhase: nextRandom(state) * Math.PI * 2,
      driftSpeed: 0.28 + nextRandom(state) * 0.22,
      driftAmplitude: 2.2 + nextRandom(state) * 2.4,
      pulse: 0,
    };
  });
}

export function loadRutherfordGas(
  state: RutherfordState,
  gas: GasType,
  params: RutherfordParams,
  forceRebuild = false,
): void {
  if (!forceRebuild && state.currentGas === gas && (gas === "vacuum" || state.nuclearTargets.length > 0)) return;
  state.currentGas = gas;
  state.nuclearTargets = createNuclearTargets(state, params, gas);
  state.particles = [];
  state.flashes = [];
  state.pendingReaction = null;
  state.emissionAccumulator = 0;
  state.emittedInBatch = 0;
  transitionRutherford(state, "loadingGas");
}

export function handleRutherfordCommand(
  state: RutherfordState,
  command: RutherfordCommand,
): void {
  if (command === "pause") {
    transitionRutherford(state, "paused");
    return;
  }
  if (command === "resume") {
    resumeRutherford(state);
    state.continuousEmission = true;
    if (state.phase === "idle" || state.phase === "ready" || state.phase === "observing" || state.phase === "completed") {
      state.emittedInBatch = state.phase === "completed" ? 0 : state.emittedInBatch;
      transitionRutherford(state, "emittingAlpha");
    }
    return;
  }
  if (command === "start") {
    state.continuousEmission = true;
    state.singleEmissionRequested = false;
    if (state.phase === "idle" || state.phase === "ready" || state.phase === "observing" || state.phase === "completed") {
      state.emittedInBatch = state.phase === "completed" ? 0 : state.emittedInBatch;
      transitionRutherford(state, "emittingAlpha");
    }
    return;
  }
  if (command === "emitOne") {
    state.continuousEmission = false;
    state.singleEmissionRequested = true;
    if (state.phase === "paused") resumeRutherford(state);
    if (!state.particles.some((particle) => particle.active) && !state.pendingReaction) {
      transitionRutherford(state, "emittingAlpha");
    }
    return;
  }
  if (command === "reset") transitionRutherford(state, "resetting");
}

function makeParticle(
  state: RutherfordState,
  particleType: ParticleType,
  position: Vec2,
  direction: Vec2,
  energy: number,
  range: number,
  velocity: number,
  parentEventId: string,
  gas: GasType,
): RutherfordParticle {
  const id = `${particleType}-${state.nextParticleId++}`;
  return {
    id,
    particleType,
    position: { ...position },
    direction: normalize(direction),
    velocity: clamp(velocity, 20, 780),
    energy: clamp(energy, 0, 1.4),
    remainingRange: clamp(range, 0, 1200),
    radius: particleType === "alpha" ? 5 : particleType === "proton" ? 3.2 : 7,
    active: true,
    opacity: 1,
    parentEventId,
    hasReacted: false,
    hasReachedScreen: false,
    trail: [{ ...position }],
    distanceTraveled: 0,
    gasAtEmission: gas,
    willReact: false,
    reactionPoint: null,
    scatterPoint: null,
    targetNucleusId: null,
    absorberHandled: false,
    hasScattered: false,
  };
}

function spawnAlpha(
  state: RutherfordState,
  params: RutherfordParams,
): void {
  const eventId = `event-${state.nextParticleId}`;
  const energy = clamp(params.alphaEnergy / 100, 0.25, 1.1);
  const direction = normalize({ x: 1, y: (nextRandom(state) - 0.5) * 0.12 });
  const alpha = makeParticle(
    state,
    "alpha",
    { x: RUTHERFORD_VIEW.sourceX + 24, y: RUTHERFORD_VIEW.beamY + (nextRandom(state) - 0.5) * 4 },
    direction,
    energy,
    710 + energy * 190,
    330 + energy * 150,
    eventId,
    state.currentGas,
  );
  state.particles.push(alpha);
  state.counters.alphasEmitted += 1;
  state.gasStats[state.currentGas].emitted += 1;
  state.emittedInBatch += 1;
  state.sourcePulse = 1;
  state.singleEmissionRequested = false;
  transitionRutherford(state, "alphaTraveling");
}

function spawnProducts(state: RutherfordState): void {
  const pending = state.pendingReaction;
  if (!pending) return;
  const bend = (nextRandom(state) - 0.5) * 0.22;
  const protonEnergy = clamp(pending.alphaEnergy * 1.02 + 0.18, 0.45, 1.25);
  const proton = makeParticle(
    state,
    "proton",
    pending.point,
    { x: 1, y: bend },
    protonEnergy,
    720 + protonEnergy * 210,
    480 + protonEnergy * 170,
    pending.eventId,
    pending.gas,
  );
  const oxygen = makeParticle(
    state,
    "oxygen17",
    pending.point,
    { x: -0.38, y: bend >= 0 ? -0.92 : 0.92 },
    clamp(pending.alphaEnergy * 0.28, 0.12, 0.34),
    54 + pending.alphaEnergy * 32,
    92 + pending.alphaEnergy * 35,
    pending.eventId,
    pending.gas,
  );
  proton.hasReacted = true;
  oxygen.hasReacted = true;
  state.particles.push(proton, oxygen);
  state.counters.protonsCreated += 1;
  state.gasStats[pending.gas].protonsCreated += 1;
  state.reactions.push({
    eventId: pending.eventId,
    gas: pending.gas,
    point: { ...pending.point },
    time: state.elapsed,
    protonInitialEnergy: proton.energy,
    protonTransmittedEnergy: null,
    reachedScreen: false,
  });
  if (state.reactions.length > 30) state.reactions.shift();
  state.pendingReaction = null;
  transitionRutherford(state, "productsEmitted");
}

function recordRange(state: RutherfordState, particle: RutherfordParticle): void {
  const values = state.ranges[particle.particleType];
  values.push(particle.distanceTraveled);
  if (values.length > 120) values.shift();
}

function stopParticle(state: RutherfordState, particle: RutherfordParticle): void {
  if (!particle.active) return;
  particle.active = false;
  particle.opacity = 0;
  recordRange(state, particle);
}

function updateTrail(particle: RutherfordParticle): void {
  const previous = particle.trail[particle.trail.length - 1];
  if (!previous || Math.hypot(particle.position.x - previous.x, particle.position.y - previous.y) >= 7) {
    particle.trail.push({ ...particle.position });
  }
  const limit = particle.particleType === "proton" ? 15 : 10;
  if (particle.trail.length > limit) particle.trail.shift();
}

function segmentDistance(point: Vec2, start: Vec2, end: Vec2): { distance: number; progress: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const progress = lengthSquared <= 0.0001
    ? 0
    : clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  const closestX = start.x + dx * progress;
  const closestY = start.y + dy * progress;
  return { distance: Math.hypot(point.x - closestX, point.y - closestY), progress };
}

function findNuclearTargetHit(
  state: RutherfordState,
  start: Vec2,
  end: Vec2,
): NuclearTarget | null {
  const hits = state.nuclearTargets
    .map((target) => ({ target, ...segmentDistance(target.position, start, end) }))
    .filter(({ target, distance }) => distance <= target.collisionRadius)
    .sort((first, second) => first.progress - second.progress);
  return hits[0]?.target ?? null;
}

function updateAlpha(
  state: RutherfordState,
  particle: RutherfordParticle,
  params: RutherfordParams,
  previousPosition: Vec2,
): void {
  if (!particle.willReact && !particle.hasScattered) {
    const hitTarget = findNuclearTargetHit(state, previousPosition, particle.position);
    if (hitTarget) {
      particle.position = { ...hitTarget.position };
      particle.targetNucleusId = hitTarget.id;
      if (hitTarget.nucleusType === "nitrogen14") {
        particle.willReact = true;
        particle.reactionPoint = { ...hitTarget.position };
      } else {
        particle.scatterPoint = { ...hitTarget.position };
      }
    }
  }
  const reactionPoint = particle.reactionPoint;
  if (particle.willReact && reactionPoint && particle.position.x >= reactionPoint.x) {
    particle.position = { ...reactionPoint };
    particle.hasReacted = true;
    stopParticle(state, particle);
    state.counters.nuclearCollisions += 1;
    state.gasStats[particle.gasAtEmission].collisions += 1;
    state.pendingReaction = {
      eventId: particle.parentEventId,
      gas: particle.gasAtEmission,
      point: { ...reactionPoint },
      alphaEnergy: particle.energy,
    };
    const target = state.nuclearTargets.find((item) => item.id === particle.targetNucleusId);
    if (target) target.pulse = 1;
    state.reactionPulse = 1;
    transitionRutherford(state, "nuclearCollision");
    return;
  }

  if (!particle.willReact && !particle.hasScattered && particle.scatterPoint && particle.position.x >= particle.scatterPoint.x) {
    particle.position = { ...particle.scatterPoint };
    particle.hasScattered = true;
    particle.direction = normalize({ x: 1, y: particle.direction.y + (nextRandom(state) - 0.5) * 0.09 });
    const target = state.nuclearTargets.find((item) => item.id === particle.targetNucleusId);
    if (target) target.pulse = 0.72;
    particle.scatterPoint = null;
    transitionRutherford(state, "alphaScattering");
  }

  if (particle.position.x >= RUTHERFORD_VIEW.absorberX) {
    particle.position.x = RUTHERFORD_VIEW.absorberX;
    const material = materialFromCode(params.absorberMaterialCode);
    const coefficient = 6.2 * MATERIAL_ATTENUATION[material] * clamp(params.absorberCoefficient / 100, 0.25, 1.8);
    particle.energy = clamp(
      particle.energy * Math.exp(-coefficient * clamp(params.absorberThickness, 0.1, 3)),
      0,
      particle.energy,
    );
    stopParticle(state, particle);
    state.counters.alphasAbsorbed += 1;
    state.gasStats[particle.gasAtEmission].absorbed += 1;
    state.absorberPulse = 1;
    transitionRutherford(state, "alphaAbsorbed");
  }
}

function updateProton(
  state: RutherfordState,
  particle: RutherfordParticle,
  params: RutherfordParams,
): void {
  if (!particle.absorberHandled && particle.position.x >= RUTHERFORD_VIEW.absorberX) {
    particle.position.x = RUTHERFORD_VIEW.absorberX;
    particle.absorberHandled = true;
    const material = materialFromCode(params.absorberMaterialCode);
    const coefficient = 0.34 * MATERIAL_ATTENUATION[material] * clamp(params.absorberCoefficient / 100, 0.25, 1.8);
    const transmittedEnergy = clamp(
      particle.energy * Math.exp(-coefficient * clamp(params.absorberThickness, 0.1, 3)),
      0,
      particle.energy,
    );
    particle.energy = transmittedEnergy;
    particle.velocity *= 0.72 + transmittedEnergy * 0.18;
    particle.remainingRange *= 0.72 + transmittedEnergy * 0.22;
    const reaction = state.reactions.find((item) => item.eventId === particle.parentEventId);
    if (reaction) reaction.protonTransmittedEnergy = transmittedEnergy;
    state.absorberPulse = 0.45;
    if (transmittedEnergy <= 0.1 || particle.remainingRange <= 28) {
      stopParticle(state, particle);
      transitionRutherford(state, "observing");
      return;
    }
    transitionRutherford(state, "protonPassingAbsorber");
  }

  if (particle.position.x >= RUTHERFORD_VIEW.screenX && !particle.hasReachedScreen) {
    particle.position.x = RUTHERFORD_VIEW.screenX;
    particle.hasReachedScreen = true;
    stopParticle(state, particle);
    state.counters.protonsReached += 1;
    state.counters.flashes += 1;
    state.gasStats[particle.gasAtEmission].protonsReached += 1;
    state.gasStats[particle.gasAtEmission].flashes += 1;
    state.flashes.push({
      id: `flash-${particle.id}`,
      position: { x: RUTHERFORD_VIEW.screenX, y: clamp(particle.position.y, 210, 406) },
      age: 0,
      lifetime: clamp(params.flashLifetime, 0.2, 2.2),
    });
    const reaction = state.reactions.find((item) => item.eventId === particle.parentEventId);
    if (reaction) reaction.reachedScreen = true;
    state.microscopeGlow = 1;
    transitionRutherford(state, "scintillation");
  }
}

function updateParticle(
  state: RutherfordState,
  particle: RutherfordParticle,
  params: RutherfordParams,
  dt: number,
): void {
  if (!particle.active) return;
  const previousPosition = { ...particle.position };
  const distance = clamp(particle.velocity, 0, 780) * dt;
  particle.position.x += particle.direction.x * distance;
  particle.position.y += particle.direction.y * distance;
  particle.distanceTraveled += distance;
  particle.remainingRange = clamp(particle.remainingRange - distance, 0, 1400);

  const insideGas = particle.position.x >= RUTHERFORD_VIEW.chamberLeft && particle.position.x <= RUTHERFORD_VIEW.chamberRight;
  const density = insideGas ? gasDensity(params, particle.gasAtEmission) : 0;
  const typeFactor = particle.particleType === "alpha" ? 1.35 : particle.particleType === "proton" ? 0.45 : 2.4;
  const distanceFactor = clamp(params.sourceScreenDistance / 82, 0.55, 1.45);
  const energyLoss = 0.075 * density * typeFactor * distanceFactor * dt;
  particle.energy = clamp(particle.energy - energyLoss, 0, 1.4);
  particle.opacity = clamp(0.28 + particle.energy * 0.75, 0.22, 1);
  updateTrail(particle);

  if (particle.particleType === "alpha") updateAlpha(state, particle, params, previousPosition);
  else if (particle.particleType === "proton") updateProton(state, particle, params);

  if (!particle.active) return;
  const outside = particle.position.x > 940 || particle.position.x < 35 || particle.position.y < 150 || particle.position.y > 465;
  if (particle.energy <= 0 || particle.remainingRange <= 0 || outside) stopParticle(state, particle);
}

function updateTransientEffects(state: RutherfordState, dt: number): void {
  state.reactionPulse = clamp(state.reactionPulse - dt * 0.72, 0, 1);
  state.absorberPulse = clamp(state.absorberPulse - dt * 3.1, 0, 1);
  state.microscopeGlow = clamp(state.microscopeGlow - dt * 2.2, 0, 1);
  state.sourcePulse = clamp(state.sourcePulse - dt * 4.2, 0, 1);
  for (const target of state.nuclearTargets) target.pulse = clamp(target.pulse - dt * 0.9, 0, 1);
  for (const flash of state.flashes) flash.age += dt;
  state.flashes = state.flashes.filter((flash) => flash.age < flash.lifetime);
}

function updateNuclearTargetPositions(state: RutherfordState): void {
  for (const target of state.nuclearTargets) {
    const phase = state.elapsed * target.driftSpeed + target.driftPhase;
    target.position.x = target.basePosition.x + Math.sin(phase) * target.driftAmplitude;
    target.position.y = target.basePosition.y + Math.cos(phase * 0.83) * target.driftAmplitude * 0.72;
  }
}

function updateHistory(state: RutherfordState): void {
  const last = state.history[state.history.length - 1];
  if (last && state.elapsed - last.time < 0.35) return;
  state.history.push({
    time: state.elapsed,
    emitted: state.counters.alphasEmitted,
    protonsReached: state.counters.protonsReached,
    flashes: state.counters.flashes,
  });
  if (state.history.length > 160) state.history.shift();
}

export function stepRutherford(
  state: RutherfordState,
  params: RutherfordParams,
  rawDt: number,
): void {
  if (state.phase === "paused" || state.phase === "resetting") return;
  const dt = clamp(rawDt, 0, 0.04);
  if (dt <= 0) return;
  state.elapsed += dt;
  state.phaseTime += dt;
  updateTransientEffects(state, dt);
  updateNuclearTargetPositions(state);

  if (state.phase === "idle") {
    transitionRutherford(state, "ready");
    return;
  }
  if (state.phase === "loadingGas") {
    if (state.phaseTime >= 0.42) transitionRutherford(state, "ready");
    return;
  }

  if (state.phase === "emittingAlpha" && state.phaseTime >= 0.13) {
    spawnAlpha(state, params);
  }

  if (state.pendingReaction && state.phase === "nuclearCollision" && state.phaseTime >= 0.13) {
    spawnProducts(state);
  }

  const particlesAtStart = [...state.particles];
  for (const particle of particlesAtStart) updateParticle(state, particle, params, dt);
  state.particles = state.particles.filter((particle) => particle.active || particle.opacity > 0.04);

  if (state.phase === "productsEmitted" && state.phaseTime >= 0.1) {
    transitionRutherford(state, "protonTraveling");
  }

  const hasActive = state.particles.some((particle) => particle.active);
  if (!hasActive && !state.pendingReaction && state.phase !== "emittingAlpha") {
    const eventHasSettled = state.phaseTime >= (state.phase === "scintillation" ? 0.32 : 0.22);
    if (eventHasSettled && state.phase !== "ready" && state.phase !== "completed") {
      transitionRutherford(state, "observing");
    }
  }

  if (!hasActive && !state.pendingReaction && state.phase !== "emittingAlpha") {
    if (state.continuousEmission && state.emittedInBatch >= MAX_BATCH_SIZE) {
      state.continuousEmission = false;
      transitionRutherford(state, "completed");
    } else if (state.continuousEmission || state.singleEmissionRequested) {
      const intensityFactor = Math.pow(clamp(100 / Math.max(20, params.sourceIntensity), 0.7, 1.7), 0.35);
      const interval = clamp((1 / Math.max(0.4, params.emissionRate)) * intensityFactor, 0.2, 2.5);
      state.emissionAccumulator += dt;
      if (state.singleEmissionRequested || state.emissionAccumulator >= interval) {
        state.emissionAccumulator = 0;
        transitionRutherford(state, "emittingAlpha");
      }
    }
  }

  updateHistory(state);
}

function cloneGasStats(state: RutherfordState): RutherfordMetrics["gasStats"] {
  return {
    vacuum: { ...state.gasStats.vacuum },
    oxygen: { ...state.gasStats.oxygen },
    carbonDioxide: { ...state.gasStats.carbonDioxide },
    air: { ...state.gasStats.air },
    nitrogen: { ...state.gasStats.nitrogen },
  };
}

export function rutherfordMetrics(
  state: RutherfordState,
  params: RutherfordParams,
): RutherfordMetrics {
  const active = state.particles.find((particle) => particle.active);
  return {
    phase: state.phase,
    elapsed: state.elapsed,
    currentGas: state.currentGas,
    counters: { ...state.counters },
    gasStats: cloneGasStats(state),
    events: state.events.map((event) => ({ ...event })),
    history: state.history.map((sample) => ({ ...sample })),
    ranges: {
      alpha: [...state.ranges.alpha],
      proton: [...state.ranges.proton],
      oxygen17: [...state.ranges.oxygen17],
    },
    reactions: state.reactions.map((reaction) => ({ ...reaction, point: { ...reaction.point } })),
    currentEnergy: active?.energy ?? 0,
    absorberThickness: params.absorberThickness,
    reactionRate: state.counters.alphasEmitted > 0
      ? state.counters.nuclearCollisions / state.counters.alphasEmitted
      : 0,
  };
}
