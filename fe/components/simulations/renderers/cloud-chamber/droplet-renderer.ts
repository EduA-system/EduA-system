import { PARTICLE_COLORS } from "../../engines/cloud-chamber/constants";
import type { ParticleType, TrackSegment } from "../../engines/cloud-chamber/types";

const CAPACITY = 1800;
const TYPE_CODE: Record<ParticleType, number> = { alpha: 0, proton: 1, oxygen17: 2 };
const CODE_TYPE: ParticleType[] = ["alpha", "proton", "oxygen17"];

function randomFrom(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export class DropletBuffer {
  private readonly x = new Float32Array(CAPACITY);
  private readonly y = new Float32Array(CAPACITY);
  private readonly radius = new Float32Array(CAPACITY);
  private readonly opacity = new Float32Array(CAPACITY);
  private readonly born = new Float32Array(CAPACITY);
  private readonly lifetime = new Float32Array(CAPACITY);
  private readonly type = new Uint8Array(CAPACITY);
  private count = 0;
  private cursor = 0;

  clear(): void {
    this.count = 0;
    this.cursor = 0;
  }

  addSegment(
    segment: TrackSegment,
    time: number,
    sensitivity: number,
    trackLifetime: number,
  ): void {
    const dx = segment.to.x - segment.from.x;
    const dy = segment.to.y - segment.from.y;
    const length = Math.hypot(dx, dy);
    if (length <= 1e-5 || sensitivity <= 0.02) return;
    const nx = -dy / length;
    const ny = dx / length;
    const expected = length * segment.ionizationDensity * 0.9 * sensitivity;
    const amount = Math.max(0, Math.min(48, Math.floor(expected + randomFrom(segment.dropletSeed + 3.1))));
    if (amount === 0) return;
    for (let index = 0; index < amount; index += 1) {
      const seed = segment.dropletSeed + index * 17.13;
      const along = (index + randomFrom(seed)) / amount;
      const jitter = (randomFrom(seed + 4.7) - 0.5) * segment.width * 2.25;
      const slot = this.cursor;
      this.x[slot] = segment.from.x + dx * along + nx * jitter;
      this.y[slot] = segment.from.y + dy * along + ny * jitter;
      this.radius[slot] = 0.55 + segment.width * 0.22 + randomFrom(seed + 9.1) * 0.95;
      this.opacity[slot] = segment.opacity * (0.56 + randomFrom(seed + 12.4) * 0.4);
      this.born[slot] = time + along * 0.045;
      this.lifetime[slot] = Math.max(1, trackLifetime * (0.78 + randomFrom(seed + 18.2) * 0.34));
      this.type[slot] = TYPE_CODE[segment.particleType];
      this.cursor = (this.cursor + 1) % CAPACITY;
      this.count = Math.min(CAPACITY, this.count + 1);
    }
  }

  draw(
    context: CanvasRenderingContext2D,
    time: number,
    classificationColors: boolean,
    globalFade = 1,
  ): void {
    context.save();
    context.shadowBlur = 4;
    context.shadowColor = "rgba(248,250,252,0.2)";
    for (let offset = 0; offset < this.count; offset += 1) {
      const index = this.count === CAPACITY ? (this.cursor + offset) % CAPACITY : offset;
      const age = time - this.born[index]!;
      const lifetime = this.lifetime[index]!;
      if (age < 0 || age > lifetime) continue;
      const fadeIn = Math.min(1, age / 0.09);
      const fadeOut = age < lifetime * 0.68 ? 1 : 1 - (age - lifetime * 0.68) / (lifetime * 0.32);
      const alpha = Math.max(0, this.opacity[index]! * fadeIn * fadeOut * globalFade);
      if (alpha <= 0.005) continue;
      const particleType = CODE_TYPE[this.type[index]!] ?? "alpha";
      const color = classificationColors ? PARTICLE_COLORS[particleType] : "#f8fafc";
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.beginPath();
      context.arc(this.x[index]!, this.y[index]!, this.radius[index]!, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}
