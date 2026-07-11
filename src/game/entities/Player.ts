import {
  CORNER_ASSIST_TILES_PER_SECOND,
  DIRECTIONS,
  PLAYER_RADIUS,
  PLAYER_SPEED_TILES_PER_SECOND,
  PLAYER_STEP_MS,
  type DirectionKey,
  type PlayerIdentity,
  type PlayerInput,
  type Point,
} from "../constants.ts";

type CanOccupy = (x: number, y: number, radius: number, playerId: PlayerIdentity["id"]) => boolean;

export interface PlayerConfig extends PlayerIdentity {}

export interface PlayerSnapshot extends PlayerIdentity {
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  score: number;
  power: number;
  maxGums: number;
  activeGums: number;
  trappedUntil: number;
  eliminated: boolean;
  facing: DirectionKey;
  walkTimeMs: number;
  radius: number;
  speedMultiplier: number;
}

export class Player {
  readonly id: PlayerIdentity["id"];
  readonly name: string;
  readonly color: string;
  readonly accentColor: string;
  readonly bubbleColor: string;
  readonly radius = PLAYER_RADIUS;

  x: number;
  y: number;
  score = 0;
  power = 2;
  maxGums = 1;
  activeGums = 0;
  trappedUntil = 0;
  eliminated = false;
  actionHeld = false;
  facing: DirectionKey = "down";
  walkTimeMs = 0;
  speedMultiplier = 1;

  constructor(config: PlayerConfig, spawn: Point, score = 0) {
    this.id = config.id;
    this.name = config.name;
    this.color = config.color;
    this.accentColor = config.accentColor;
    this.bubbleColor = config.bubbleColor;
    this.x = spawn.x;
    this.y = spawn.y;
    this.score = score;
  }

  reset(spawn: Point, score = this.score): void {
    this.x = spawn.x;
    this.y = spawn.y;
    this.score = score;
    this.power = 2;
    this.maxGums = 1;
    this.activeGums = 0;
    this.trappedUntil = 0;
    this.eliminated = false;
    this.actionHeld = false;
    this.facing = "down";
    this.walkTimeMs = 0;
    this.speedMultiplier = 1;
  }

  isTrapped(timeMs: number): boolean {
    return this.trappedUntil > timeMs;
  }

  tilePosition(): Point {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
    };
  }

  gumTile(): Point {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
    };
  }

  increaseSpeed(): void {
    this.speedMultiplier = Math.min(1.45, this.speedMultiplier + 0.18);
  }

  updateMovement(input: PlayerInput, deltaMs: number, timeMs: number, canOccupy: CanOccupy): void {
    if (this.eliminated || this.isTrapped(timeMs)) {
      this.actionHeld = input.action;
      return;
    }

    if (input.directions.length === 0) {
      return;
    }

    this.facing = input.directions[0];
    let remainingMs = deltaMs;

    while (remainingMs > 0) {
      const stepMs = Math.min(PLAYER_STEP_MS, remainingMs);
      const distance = PLAYER_SPEED_TILES_PER_SECOND * this.speedMultiplier * (stepMs / 1000);
      this.stepMovement(input.directions, distance, stepMs, canOccupy);
      remainingMs -= stepMs;
    }

    this.walkTimeMs += deltaMs;
  }

  snapshot(): PlayerSnapshot {
    return {
      id: this.id,
      name: this.name,
      x: round3(this.x),
      y: round3(this.y),
      tileX: Math.round(this.x),
      tileY: Math.round(this.y),
      color: this.color,
      accentColor: this.accentColor,
      bubbleColor: this.bubbleColor,
      score: this.score,
      power: this.power,
      maxGums: this.maxGums,
      activeGums: this.activeGums,
      trappedUntil: this.trappedUntil,
      eliminated: this.eliminated,
      facing: this.facing,
      walkTimeMs: this.walkTimeMs,
      radius: this.radius,
      speedMultiplier: round3(this.speedMultiplier),
    };
  }

  /**
   * Tries each held direction in recency order and takes the first one that
   * can move straight ahead. This lets a queued turn (the most recently
   * pressed key) take over the instant it opens up, while still walking
   * forward on the previous axis in the meantime instead of freezing in
   * place. Corner assist only kicks in afterwards, and only for the primary
   * (most recent) direction — applying it any earlier would let a blocked
   * direction's alignment nudge fight the progress a different, already-open
   * direction just made on the very same axis.
   */
  private stepMovement(directions: DirectionKey[], distance: number, stepMs: number, canOccupy: CanOccupy): void {
    for (const direction of directions) {
      if (this.tryMoveDirect(direction, distance, canOccupy)) {
        return;
      }
    }

    const primary = directions[0];
    if (primary) {
      this.tryMoveWithAssist(primary, distance, stepMs, canOccupy);
    }
  }

  private tryMoveDirect(direction: DirectionKey, distance: number, canOccupy: CanOccupy): boolean {
    const dir = DIRECTIONS[direction];
    const forwardX = this.x + dir.x * distance;
    const forwardY = this.y + dir.y * distance;

    if (canOccupy(forwardX, forwardY, this.radius, this.id)) {
      this.x = forwardX;
      this.y = forwardY;
      return true;
    }
    return false;
  }

  private tryMoveWithAssist(direction: DirectionKey, distance: number, stepMs: number, canOccupy: CanOccupy): boolean {
    const dir = DIRECTIONS[direction];
    const forwardX = this.x + dir.x * distance;
    const forwardY = this.y + dir.y * distance;
    return this.tryCornerAssist(dir, forwardX, forwardY, stepMs, canOccupy);
  }

  /**
   * A straight move got blocked. Rather than requiring the player to be
   * pixel-perfectly centered on the lane before a turn or a narrow gap will
   * accept them, gently slide the cross-axis coordinate toward the nearest
   * tile center and retry. If that alone (without forward progress) is at
   * least legal, apply it so the player visibly slides into alignment against
   * the wall/brick edge they bumped into, ready to walk through next frame.
   */
  private tryCornerAssist(
    dir: (typeof DIRECTIONS)[DirectionKey],
    forwardX: number,
    forwardY: number,
    stepMs: number,
    canOccupy: CanOccupy,
  ): boolean {
    const maxAssist = CORNER_ASSIST_TILES_PER_SECOND * (stepMs / 1000);

    if (dir.axis === "horizontal") {
      const nudgedY = nudgeToward(this.y, maxAssist);
      if (nudgedY === this.y) {
        return false;
      }
      if (canOccupy(forwardX, nudgedY, this.radius, this.id)) {
        this.x = forwardX;
        this.y = nudgedY;
        return true;
      }
      if (canOccupy(this.x, nudgedY, this.radius, this.id)) {
        this.y = nudgedY;
      }
      return false;
    }

    const nudgedX = nudgeToward(this.x, maxAssist);
    if (nudgedX === this.x) {
      return false;
    }
    if (canOccupy(nudgedX, forwardY, this.radius, this.id)) {
      this.x = nudgedX;
      this.y = forwardY;
      return true;
    }
    if (canOccupy(nudgedX, this.y, this.radius, this.id)) {
      this.x = nudgedX;
    }
    return false;
  }
}

/** Moves `value` toward the nearest integer (tile center) by at most `maxStep`. */
function nudgeToward(value: number, maxStep: number): number {
  const target = Math.round(value);
  const diff = target - value;
  if (diff === 0) {
    return value;
  }
  const step = Math.sign(diff) * Math.min(Math.abs(diff), maxStep);
  return value + step;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
