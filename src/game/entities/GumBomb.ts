import { GUM_FUSE_MS, type OwnedTimedPointSnapshot, type PlayerId } from "../constants.ts";
import type { Player } from "./Player.ts";

export interface GumBombSnapshot extends OwnedTimedPointSnapshot {
  fuseMs: number;
  range: number;
}

export class GumBomb {
  readonly x: number;
  readonly y: number;
  readonly ownerId: PlayerId;
  readonly range: number;
  fuseMs = GUM_FUSE_MS;
  ageMs = 0;
  passableBy: PlayerId | null;

  constructor({ x, y, ownerId, range }: { x: number; y: number; ownerId: PlayerId; range: number }) {
    this.x = x;
    this.y = y;
    this.ownerId = ownerId;
    this.range = range;
    this.passableBy = ownerId;
  }

  update(deltaMs: number, players: Player[]): void {
    this.ageMs += deltaMs;
    this.fuseMs -= deltaMs;

    if (!this.passableBy) {
      return;
    }

    const owner = players.find((player) => player.id === this.passableBy);
    if (!owner || Math.hypot(owner.x - this.x, owner.y - this.y) > 0.95) {
      this.passableBy = null;
    }
  }

  get ready(): boolean {
    return this.fuseMs <= 0;
  }

  snapshot(): GumBombSnapshot {
    return {
      x: this.x,
      y: this.y,
      ownerId: this.ownerId,
      fuseMs: this.fuseMs,
      range: this.range,
      ageMs: this.ageMs,
    };
  }
}
