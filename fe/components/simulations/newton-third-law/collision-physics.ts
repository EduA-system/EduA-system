export type CollisionParams = {
  mA: number;
  mB: number;
  speedA: number;
  speedB: number;
};

export type CollisionOutcome = CollisionParams & {
  uA: number;
  uB: number;
  vA: number;
  vB: number;
  impulse: number;
  momentumBefore: number;
  momentumAfter: number;
};

export type WallMotion = {
  position: number;
  velocity: number;
  hitTime: number;
  timeSinceHit: number;
  hit: boolean;
};

// Fixed visual/physical damping for the educational impact model. It is not
// exposed as a user parameter: the lesson keeps the focus on force pairs.
const CART_BOUNCE_RETENTION = 0.62;
const WALL_BOUNCE_RETENTION = 0.52;
const SETTLING_DECELERATION = 0.1;
const STOP_SPEED = 0.015;
const SIMULATION_STEP = 1 / 240;

export type TrackSimulationInput = CollisionParams & {
  time: number;
  initialXA: number;
  initialXB: number;
  minCenter: number;
  maxCenter: number;
  cartWidth: number;
  pixelsPerMeter: number;
};

export type TrackSimulationState = {
  xA: number;
  xB: number;
  velocityA: number;
  velocityB: number;
  accelerationA: number;
  accelerationB: number;
  settled: boolean;
  cartCollisionCount: number;
  wallCollisionCount: number;
  firstCartImpactTime: number | null;
  wallHitA: boolean;
  wallHitB: boolean;
  lastCartImpactTime: number | null;
  lastCartImpulse: number;
  lastCartDeltaVelocityA: number;
  lastCartDeltaVelocityB: number;
  lastWallImpactTimeA: number | null;
  lastWallImpactTimeB: number | null;
  lastWallPositionA: number | null;
  lastWallPositionB: number | null;
  lastWallImpulseA: number;
  lastWallImpulseB: number;
  lastWallDeltaVelocityA: number;
  lastWallDeltaVelocityB: number;
};

export function collisionParams(values: Record<string, number>): CollisionParams {
  return {
    mA: Math.max(0.5, values.mA ?? 1),
    mB: Math.max(0.5, values.mB ?? 1),
    speedA: Math.max(0.1, values.speedA ?? 2.2),
    speedB: Math.max(0.1, values.speedB ?? 2.2),
  };
}

export function collisionOutcome(input: CollisionParams): CollisionOutcome {
  const { mA, mB, speedA, speedB } = input;
  const uA = speedA;
  const uB = -speedB;
  const totalMass = mA + mB;
  const relativeSpeed = uA - uB;
  const vA = (mA * uA + mB * uB - mB * CART_BOUNCE_RETENTION * relativeSpeed) / totalMass;
  const vB = (mA * uA + mB * uB + mA * CART_BOUNCE_RETENTION * relativeSpeed) / totalMass;
  const momentumBefore = mA * uA + mB * uB;
  const momentumAfter = mA * vA + mB * vB;
  return {
    ...input,
    uA,
    uB,
    vA,
    vB,
    impulse: Math.abs(mA * (vA - uA)),
    momentumBefore,
    momentumAfter,
  };
}

function resolveCartCollision(mA: number, mB: number, velocityA: number, velocityB: number) {
  const totalMass = mA + mB;
  const relativeSpeed = velocityA - velocityB;
  return {
    velocityA: (mA * velocityA + mB * velocityB - mB * CART_BOUNCE_RETENTION * relativeSpeed) / totalMass,
    velocityB: (mA * velocityA + mB * velocityB + mA * CART_BOUNCE_RETENTION * relativeSpeed) / totalMass,
  };
}

function slowTowardRest(velocity: number, dt: number) {
  const speed = Math.max(0, Math.abs(velocity) - SETTLING_DECELERATION * dt);
  return speed <= STOP_SPEED ? 0 : Math.sign(velocity) * speed;
}

export function simulateCollisionTrack(input: TrackSimulationInput): TrackSimulationState {
  const targetTime = Math.max(0, input.time);
  let elapsed = 0;
  let xA = input.initialXA;
  let xB = input.initialXB;
  let velocityA = input.speedA;
  let velocityB = -input.speedB;
  let settlingActive = false;
  let cartCollisionCount = 0;
  let wallCollisionCount = 0;
  let firstCartImpactTime: number | null = null;
  let wallHitA = false;
  let wallHitB = false;
  let lastCartImpactTime: number | null = null;
  let lastCartImpulse = 0;
  let lastCartDeltaVelocityA = 0;
  let lastCartDeltaVelocityB = 0;
  let lastWallImpactTimeA: number | null = null;
  let lastWallImpactTimeB: number | null = null;
  let lastWallPositionA: number | null = null;
  let lastWallPositionB: number | null = null;
  let lastWallImpulseA = 0;
  let lastWallImpulseB = 0;
  let lastWallDeltaVelocityA = 0;
  let lastWallDeltaVelocityB = 0;

  const resolveWallA = (impactTime: number, wallPosition: number) => {
    const before = velocityA;
    velocityA = -before * WALL_BOUNCE_RETENTION;
    const delta = velocityA - before;
    wallHitA = true;
    settlingActive = true;
    wallCollisionCount += 1;
    lastWallImpactTimeA = impactTime;
    lastWallPositionA = wallPosition;
    lastWallImpulseA = Math.abs(input.mA * delta);
    lastWallDeltaVelocityA = delta;
  };
  const resolveWallB = (impactTime: number, wallPosition: number) => {
    const before = velocityB;
    velocityB = -before * WALL_BOUNCE_RETENTION;
    const delta = velocityB - before;
    wallHitB = true;
    settlingActive = true;
    wallCollisionCount += 1;
    lastWallImpactTimeB = impactTime;
    lastWallPositionB = wallPosition;
    lastWallImpulseB = Math.abs(input.mB * delta);
    lastWallDeltaVelocityB = delta;
  };

  while (elapsed < targetTime) {
    const dt = Math.min(SIMULATION_STEP, targetTime - elapsed);
    if (settlingActive) {
      velocityA = slowTowardRest(velocityA, dt);
      velocityB = slowTowardRest(velocityB, dt);
    }
    xA += velocityA * input.pixelsPerMeter * dt;
    xB += velocityB * input.pixelsPerMeter * dt;
    elapsed += dt;

    if (xA <= input.minCenter && velocityA < 0) {
      xA = input.minCenter;
      resolveWallA(elapsed, input.minCenter);
    } else if (xA >= input.maxCenter && velocityA > 0) {
      xA = input.maxCenter;
      resolveWallA(elapsed, input.maxCenter);
    }
    if (xB <= input.minCenter && velocityB < 0) {
      xB = input.minCenter;
      resolveWallB(elapsed, input.minCenter);
    } else if (xB >= input.maxCenter && velocityB > 0) {
      xB = input.maxCenter;
      resolveWallB(elapsed, input.maxCenter);
    }

    const distance = xB - xA;
    if (distance <= input.cartWidth && velocityA > velocityB) {
      const overlap = input.cartWidth - distance;
      xA = Math.max(input.minCenter, xA - overlap / 2);
      xB = Math.min(input.maxCenter, xB + overlap / 2);
      const beforeA = velocityA;
      const beforeB = velocityB;
      const resolved = resolveCartCollision(input.mA, input.mB, beforeA, beforeB);
      velocityA = resolved.velocityA;
      velocityB = resolved.velocityB;
      lastCartDeltaVelocityA = velocityA - beforeA;
      lastCartDeltaVelocityB = velocityB - beforeB;
      lastCartImpulse = Math.abs(input.mA * lastCartDeltaVelocityA);
      lastCartImpactTime = elapsed;
      cartCollisionCount += 1;
      if (firstCartImpactTime === null) {
        firstCartImpactTime = elapsed;
        // Sau va chạm đầu tiên, lực cản lăn bắt đầu làm hai xe chậm dần.
        // Xung lực va chạm vẫn được giải tức thời ở phía trên, nên quan hệ
        // lực–phản lực và bảo toàn động lượng tại thời điểm tiếp xúc không đổi.
        settlingActive = true;
      }
    }
  }

  if (settlingActive) {
    if (Math.abs(velocityA) <= STOP_SPEED) velocityA = 0;
    if (Math.abs(velocityB) <= STOP_SPEED) velocityB = 0;
  }
  return {
    xA,
    xB,
    velocityA,
    velocityB,
    accelerationA: settlingActive && velocityA !== 0 ? -Math.sign(velocityA) * SETTLING_DECELERATION : 0,
    accelerationB: settlingActive && velocityB !== 0 ? -Math.sign(velocityB) * SETTLING_DECELERATION : 0,
    settled: settlingActive && velocityA === 0 && velocityB === 0,
    cartCollisionCount,
    wallCollisionCount,
    firstCartImpactTime,
    wallHitA,
    wallHitB,
    lastCartImpactTime,
    lastCartImpulse,
    lastCartDeltaVelocityA,
    lastCartDeltaVelocityB,
    lastWallImpactTimeA,
    lastWallImpactTimeB,
    lastWallPositionA,
    lastWallPositionB,
    lastWallImpulseA,
    lastWallImpulseB,
    lastWallDeltaVelocityA,
    lastWallDeltaVelocityB,
  };
}

export function motionWithWall(
  startPosition: number,
  initialVelocity: number,
  elapsed: number,
  minPosition: number,
  maxPosition: number,
  pixelsPerMeter: number,
): WallMotion {
  const wallPosition = initialVelocity < 0 ? minPosition : maxPosition;
  const distanceToWall = Math.abs(wallPosition - startPosition);
  const speedPixels = Math.abs(initialVelocity) * pixelsPerMeter;
  const hitTime = speedPixels > 0 ? distanceToWall / speedPixels : Number.POSITIVE_INFINITY;
  if (elapsed <= hitTime) {
    return {
      position: startPosition + initialVelocity * elapsed * pixelsPerMeter,
      velocity: initialVelocity,
      hitTime,
      timeSinceHit: 0,
      hit: false,
    };
  }
  const bouncedVelocity = -initialVelocity * WALL_BOUNCE_RETENTION;
  const timeSinceHit = elapsed - hitTime;
  return {
    position: wallPosition + bouncedVelocity * timeSinceHit * pixelsPerMeter,
    velocity: bouncedVelocity,
    hitTime,
    timeSinceHit,
    hit: true,
  };
}
