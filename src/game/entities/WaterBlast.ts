import { BLAST_TTL_MS, DIRECTIONS, TILE, type BlastSegmentSnapshot, type PlayerId } from "../constants.ts";
import type { Level } from "../Level.ts";
import type { GumBomb } from "./GumBomb.ts";

interface BlastBuildResult {
  blast: WaterBlast;
  brokenTiles: Array<{ x: number; y: number }>;
}

export interface WaterBlastSnapshot {
  ownerId: PlayerId;
  ageMs: number;
  ttlMs: number;
  progress: number;
  segments: BlastSegmentSnapshot[];
}

export class WaterBlast {
  readonly ownerId: PlayerId;
  readonly segments: BlastSegmentSnapshot[];
  readonly totalTtlMs: number;
  ageMs = 0;
  ttlMs: number;

  constructor(ownerId: PlayerId, segments: BlastSegmentSnapshot[], ttlMs = BLAST_TTL_MS) {
    this.ownerId = ownerId;
    this.segments = segments;
    this.totalTtlMs = ttlMs;
    this.ttlMs = ttlMs;
  }

  static fromBomb(level: Level, bomb: GumBomb, ttlMs = BLAST_TTL_MS): BlastBuildResult {
    const segments: BlastSegmentSnapshot[] = [
      { x: bomb.x, y: bomb.y, axis: "both", kind: "center", terminal: false },
    ];
    const brokenTiles: Array<{ x: number; y: number }> = [];

    for (const [directionName, direction] of Object.entries(DIRECTIONS)) {
      for (let distance = 1; distance <= bomb.range; distance += 1) {
        const x = bomb.x + direction.x * distance;
        const y = bomb.y + direction.y * distance;
        const tile = level.getTile(x, y);

        if (tile === TILE.WALL) {
          markSegmentTerminal(segments, direction.axis, x - direction.x, y - direction.y);
          break;
        }

        const terminal = distance === bomb.range || tile === TILE.BRICK;
        segments.push({
          x,
          y,
          axis: direction.axis,
          kind: terminal ? "cap" : "body",
          terminal,
        });

        if (tile === TILE.BRICK) {
          brokenTiles.push({ x, y });
          break;
        }

        if (terminal && distance === bomb.range) {
          break;
        }

        void directionName;
      }
    }

    return {
      blast: new WaterBlast(bomb.ownerId, segments, ttlMs),
      brokenTiles,
    };
  }

  update(deltaMs: number): void {
    this.ageMs += deltaMs;
    this.ttlMs -= deltaMs;
  }

  get active(): boolean {
    return this.ttlMs > 0;
  }

  coversTile(x: number, y: number): boolean {
    return this.segments.some((segment) => segment.x === x && segment.y === y);
  }

  snapshot(): WaterBlastSnapshot {
    return {
      ownerId: this.ownerId,
      ageMs: this.ageMs,
      ttlMs: this.ttlMs,
      progress: this.totalTtlMs <= 0 ? 1 : Math.min(1, this.ageMs / this.totalTtlMs),
      segments: this.segments.map((segment) => ({ ...segment })),
    };
  }
}

function markSegmentTerminal(segments: BlastSegmentSnapshot[], axis: "horizontal" | "vertical", x: number, y: number): void {
  const segment = segments.find((item) => item.axis === axis && item.x === x && item.y === y);
  if (!segment) {
    return;
  }

  segment.terminal = true;
  segment.kind = "cap";
}
