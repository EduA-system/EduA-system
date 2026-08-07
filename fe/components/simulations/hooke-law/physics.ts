export const GRAVITY = 9.8;
export const NATURAL_LENGTH = 0.24;

export type HookeLawParams = {
  springConstant: number;
  mass: number;
  compressionMass: number;
  naturalLength: number;
};

export type HookeLawScene = HookeLawParams;

// Giới hạn hình học của mô phỏng: phía kéo có biên độ quan sát lớn hơn phía
// nén để lò xo không bị xẹp sát thanh đỡ khi khối lượng tăng mạnh.
export const MAX_STRETCH_RATIO = 0.65;
export const MAX_COMPRESSION_RATIO = 0.4;

/** Độ nén tối đa (m) mà lò xo chịu được trước khi trở thành vật rắn. */
export function maxCompression(naturalLength: number) {
  return Math.max(0, naturalLength * MAX_COMPRESSION_RATIO);
}

/** Độ giãn tối đa còn nằm trong vùng quan sát của thí nghiệm kéo. */
export function maxStretch(naturalLength: number) {
  return Math.max(0, naturalLength * MAX_STRETCH_RATIO);
}

export type HookeMotion = {
  time: number;
  stretch: number;
  stretchVelocity: number;
  compression: number;
  compressionVelocity: number;
};

export type HookeLawValues = {
  weight: number;
  compressionWeight: number;
  stretchEquilibrium: number;
  compressionEquilibrium: number;
  stretchLength: number;
  compressionLength: number;
  stretchSpringForce: number;
  compressionSpringForce: number;
};

export const INITIAL_HOOKE_MOTION: HookeMotion = {
  time: 0,
  stretch: 0,
  stretchVelocity: 0,
  compression: 0,
  compressionVelocity: 0,
};

export function calculateHookeValues(
  params: HookeLawParams,
  motion: HookeMotion,
): HookeLawValues {
  const weight = params.mass * GRAVITY;
  // Thí nghiệm 2 chỉ dùng một vật m₂ đè lên lò xo đặt trên mặt đất.
  const compressionWeight = params.compressionMass * GRAVITY;
  const stretchEquilibrium = weight / params.springConstant;
  const compressionEquilibrium = Math.min(
    Math.max(0, compressionWeight / params.springConstant),
    maxCompression(params.naturalLength),
  );

  return {
    weight,
    compressionWeight,
    stretchEquilibrium,
    compressionEquilibrium,
    stretchLength:
      params.naturalLength +
      Math.min(maxStretch(params.naturalLength), motion.stretch),
    compressionLength: Math.max(
      params.naturalLength - Math.min(
        maxCompression(params.naturalLength),
        motion.compression,
      ),
    ),
    stretchSpringForce: params.springConstant * motion.stretch,
    compressionSpringForce: params.springConstant * motion.compression,
  };
}

function stepAxis({
  displacement,
  velocity,
  drivingForce,
  inertialMass,
  params,
  dt,
  maxDisplacement = Number.POSITIVE_INFINITY,
}: {
  displacement: number;
  velocity: number;
  drivingForce: number;
  inertialMass: number;
  params: HookeLawParams;
  dt: number;
  maxDisplacement?: number;
}) {
  const dampingRatio = 0.2;
  const damping =
    2 * dampingRatio * Math.sqrt(params.springConstant * inertialMass);
  const acceleration =
    (drivingForce - params.springConstant * displacement - damping * velocity) /
    inertialMass;
  const nextVelocity = velocity + acceleration * dt;
  const nextDisplacement = Math.min(
    maxDisplacement,
    Math.max(0, displacement + nextVelocity * dt),
  );

  return {
    displacement: nextDisplacement,
    velocity:
      nextDisplacement >= maxDisplacement && nextVelocity > 0
        ? 0
        : nextDisplacement === 0 && nextVelocity < 0
          ? 0
          : nextVelocity,
  };
}

export function stepHookeMotion(
  motion: HookeMotion,
  params: HookeLawParams,
  elapsedSeconds: number,
): HookeMotion {
  const total = Math.min(Math.max(elapsedSeconds, 0), 0.08);
  const substeps = Math.max(1, Math.ceil(total / (1 / 240)));
  const dt = total / substeps;
  let next = motion;
  // Thí nghiệm 2 chỉ dùng một vật m₂ đè lên lò xo; trọng lượng tạo lực nén
  // hướng xuống và được cân bằng bởi lực đàn hồi hướng lên.
  const compressionDrivingForce = params.compressionMass * GRAVITY;
  const compressionLimit = maxCompression(params.naturalLength);

  for (let index = 0; index < substeps; index += 1) {
    const stretch = stepAxis({
      displacement: next.stretch,
      velocity: next.stretchVelocity,
      drivingForce: params.mass * GRAVITY,
      inertialMass: params.mass,
      params,
      dt,
      maxDisplacement: maxStretch(params.naturalLength),
    });
    const compression = stepAxis({
      displacement: next.compression,
      velocity: next.compressionVelocity,
      drivingForce: compressionDrivingForce,
      inertialMass: params.compressionMass,
      params,
      dt,
      maxDisplacement: compressionLimit,
    });

    next = {
      time: next.time + dt,
      stretch: stretch.displacement,
      stretchVelocity: stretch.velocity,
      compression: compression.displacement,
      compressionVelocity: compression.velocity,
    };
  }

  return next;
}
