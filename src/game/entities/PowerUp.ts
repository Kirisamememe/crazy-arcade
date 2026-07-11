import type { PowerUpType, TimedPointSnapshot } from "../constants.ts";

export interface PowerUpSnapshot extends TimedPointSnapshot {
  type: PowerUpType;
}

export class PowerUp {
  readonly x: number;
  readonly y: number;
  readonly type: PowerUpType;
  readonly createdAtMs: number;

  constructor({ x, y, type, createdAtMs }: { x: number; y: number; type: PowerUpType; createdAtMs: number }) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.createdAtMs = createdAtMs;
  }

  snapshot(timeMs: number): PowerUpSnapshot {
    return {
      x: this.x,
      y: this.y,
      type: this.type,
      ageMs: Math.max(0, timeMs - this.createdAtMs),
    };
  }
}
