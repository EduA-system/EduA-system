import {
  FIELD_LEFT,
  FIXED_STEP,
  MAX_DELTA_TIME,
  PARTICLE_START,
  SCREEN_X,
  TRACK_BOTTOM,
  TRACK_TOP,
  fieldRight,
} from "./constants";
import {
  pauseMagneticState,
  resumeMagneticState,
  transitionMagneticPhase,
} from "./state-machine";
import type {
  MagneticDeflectionCommand,
  MagneticDeflectionMetrics,
  MagneticDeflectionParams,
  MagneticDeflectionState,
  MagneticDeflectionStepResult,
  RadiationParticle,
  RadiationType,
  ScreenImpact,
  Vector2,
} from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function curvatureFor(type: RadiationType, params: MagneticDeflectionParams): number {
  const field = clamp(params.magneticField, 0, 1.2);
  const direction = params.fieldDirection >= 0 ? 1 : -1;
  if (type === "gamma" || field <= 1e-8) return 0;
  if (type === "alpha") {
    const momentum = clamp(params.alphaMomentum / 100, 0.4, 1.6);
    return -direction * field * 0.00055 / momentum;
  }
  const momentum = clamp(params.betaMomentum / 100, 0.4, 1.6);
  return direction * field * 0.00135 / momentum;
}

export function radiusFor(type: RadiationType, params: MagneticDeflectionParams): number {
  const curvature = Math.abs(curvatureFor(type, params));
  return curvature <= 1e-9 ? Number.POSITIVE_INFINITY : 1 / curvature;
}

function createParticles(params: MagneticDeflectionParams): RadiationParticle[] {
  const speed = 145 + clamp(params.beamSpeed, 40, 160) * 0.9;
  const make = (
    type: RadiationType,
    charge: RadiationParticle["charge"],
    rigidity: number,
  ): RadiationParticle => ({
    id: `${type}-beam`,
    type,
    position: { ...PARTICLE_START },
    direction: { x: 1, y: 0 },
    speed,
    charge,
    rigidity,
    active: true,
    enteredField: false,
    exitedField: false,
    path: [{ ...PARTICLE_START }],
  });
  return [
    make("alpha", 2, params.alphaMomentum),
    make("beta", -1, params.betaMomentum),
    make("gamma", 0, Number.POSITIVE_INFINITY),
  ];
}

export function createMagneticDeflectionState(): MagneticDeflectionState {
  return {
    phase: "idle",
    resumePhase: "idle",
    time: 0,
    phaseTime: 0,
    particles: [],
    impacts: [],
    events: [],
    emissionPulse: 0,
  };
}

export function applyMagneticCommand(
  state: MagneticDeflectionState,
  command: MagneticDeflectionCommand,
): MagneticDeflectionState {
  if (command === "pause") return pauseMagneticState(state);
  if (command === "resume") return resumeMagneticState(state);
  if (command === "start" && (state.phase === "idle" || state.phase === "complete")) {
    return transitionMagneticPhase(createMagneticDeflectionState(), "emitting");
  }
  return state;
}

function appendPath(path: Vector2[], position: Vector2, force = false): Vector2[] {
  const previous = path.at(-1);
  if (!force && previous && Math.hypot(position.x - previous.x, position.y - previous.y) < 3.2) return path;
  const next = [...path, { ...position }];
  return next.length > 360 ? next.slice(next.length - 360) : next;
}

function moveParticle(
  particle: RadiationParticle,
  params: MagneticDeflectionParams,
  dt: number,
): { particle: RadiationParticle; impact: ScreenImpact | null } {
  if (!particle.active) return { particle, impact: null };
  const distance = Math.max(0, particle.speed * dt);
  const right = fieldRight(params);
  const inField = particle.position.x >= FIELD_LEFT && particle.position.x <= right;
  const curvature = inField ? curvatureFor(particle.type, params) : 0;
  const angle = Math.atan2(particle.direction.y, particle.direction.x) + curvature * distance;
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const position = {
    x: particle.position.x + direction.x * distance,
    y: particle.position.y + direction.y * distance,
  };
  const enteredField = particle.enteredField || position.x >= FIELD_LEFT;
  const exitedField = particle.exitedField || (enteredField && position.x > right);
  const hitsScreen = particle.position.x < SCREEN_X && position.x >= SCREEN_X;
  const leavesView = position.y < TRACK_TOP || position.y > TRACK_BOTTOM || position.x < 170;
  const finalPosition = hitsScreen
    ? {
        x: SCREEN_X,
        y: particle.position.y +
          (position.y - particle.position.y) *
            ((SCREEN_X - particle.position.x) / Math.max(1e-6, position.x - particle.position.x)),
      }
    : position;
  const active = !hitsScreen && !leavesView && position.x < SCREEN_X + 4;
  const nextParticle: RadiationParticle = {
    ...particle,
    position: finalPosition,
    direction,
    active,
    enteredField,
    exitedField,
    path: appendPath(particle.path, finalPosition, !active),
  };
  return {
    particle: nextParticle,
    impact: hitsScreen
      ? { particleType: particle.type, position: finalPosition, time: 0 }
      : null,
  };
}

function stepOnce(
  input: MagneticDeflectionState,
  params: MagneticDeflectionParams,
  dt: number,
): MagneticDeflectionStepResult {
  if (input.phase === "idle" || input.phase === "paused" || input.phase === "complete") {
    return { state: input, completed: false };
  }
  let state: MagneticDeflectionState = {
    ...input,
    time: input.time + dt,
    phaseTime: input.phaseTime + dt,
    emissionPulse: Math.max(0, input.emissionPulse - dt * 1.8),
  };
  let completed = false;

  if (state.phase === "emitting") {
    state = { ...state, emissionPulse: Math.sin(Math.min(1, state.phaseTime / 0.34) * Math.PI) };
    if (state.phaseTime >= 0.34) {
      state = transitionMagneticPhase(
        { ...state, particles: createParticles(params), emissionPulse: 0.45 },
        "traversing",
      );
    }
  } else if (state.phase === "traversing" || state.phase === "impacting") {
    const impacts: ScreenImpact[] = [];
    const particles = state.particles.map((particle) => {
      const result = moveParticle(particle, params, dt);
      if (result.impact) impacts.push({ ...result.impact, time: state.time });
      return result.particle;
    });
    state = {
      ...state,
      particles,
      impacts: [
        ...state.impacts,
        ...impacts.filter(
          (impact) => !state.impacts.some((old) => old.particleType === impact.particleType),
        ),
      ],
    };
    if (impacts.length > 0 && state.phase === "traversing") {
      state = transitionMagneticPhase(state, "impacting");
    }
    if (particles.length > 0 && particles.every((particle) => !particle.active)) {
      state = transitionMagneticPhase(state, "complete");
      completed = true;
    }
  }
  return { state, completed };
}

export function stepMagneticDeflection(
  previous: MagneticDeflectionState,
  params: MagneticDeflectionParams,
  rawDt: number,
): MagneticDeflectionStepResult {
  let state = previous;
  let remaining = clamp(rawDt, 0, MAX_DELTA_TIME);
  let completed = false;
  while (remaining > 1e-8) {
    const dt = Math.min(FIXED_STEP, remaining);
    remaining -= dt;
    const result = stepOnce(state, params, dt);
    state = result.state;
    completed ||= result.completed;
  }
  return { state, completed };
}

function pathFor(state: MagneticDeflectionState, type: RadiationType): Vector2[] {
  return state.particles.find((particle) => particle.type === type)?.path ?? [];
}

function deflectionFor(state: MagneticDeflectionState, type: RadiationType): number {
  const impact = state.impacts.find((item) => item.particleType === type);
  const last = impact?.position ?? pathFor(state, type).at(-1) ?? PARTICLE_START;
  return last.y - PARTICLE_START.y;
}

export function magneticDeflectionMetrics(
  state: MagneticDeflectionState,
  params: MagneticDeflectionParams,
): MagneticDeflectionMetrics {
  const alphaRadius = radiusFor("alpha", params);
  const betaRadius = radiusFor("beta", params);
  const speedFactor = clamp(params.beamSpeed / 100, 0.4, 1.6);
  return {
    phase: state.phase,
    time: state.time,
    fieldStrength: clamp(params.magneticField, 0, 1.2),
    fieldDirection: params.fieldDirection >= 0 ? "out" : "into",
    alphaRadius,
    betaRadius,
    alphaDeflection: deflectionFor(state, "alpha"),
    betaDeflection: deflectionFor(state, "beta"),
    gammaDeflection: deflectionFor(state, "gamma"),
    alphaForce: 2 * clamp(params.magneticField, 0, 1.2) * speedFactor,
    betaForce: clamp(params.magneticField, 0, 1.2) * speedFactor,
    impacts: state.impacts.map((impact) => ({ ...impact, position: { ...impact.position } })),
    events: state.events.map((event) => ({ ...event })),
    paths: {
      alpha: pathFor(state, "alpha").map((point) => ({ ...point })),
      beta: pathFor(state, "beta").map((point) => ({ ...point })),
      gamma: pathFor(state, "gamma").map((point) => ({ ...point })),
    },
  };
}
