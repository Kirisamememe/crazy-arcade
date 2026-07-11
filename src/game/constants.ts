export const TILE = Object.freeze({
  FLOOR: 0,
  WALL: 1,
  BRICK: 2,
});

export type Tile = (typeof TILE)[keyof typeof TILE];
export type PlayerId = "p1" | "p2";
export type DirectionKey = "up" | "down" | "left" | "right";
export type PowerUpType = "range" | "gum" | "speed";
export type GamePhase = "playing" | "roundOver" | "matchOver";

export interface Point {
  x: number;
  y: number;
}

export interface TimedPointSnapshot extends Point {
  ageMs: number;
}

export interface OwnedTimedPointSnapshot extends TimedPointSnapshot {
  ownerId: PlayerId;
}

export interface PlayerIdentity {
  id: PlayerId;
  name: string;
  color: string;
  accentColor: string;
  bubbleColor: string;
}

/**
 * `directions` lists every currently-held direction key, most-recently-pressed
 * first. Movement always tries the front of the list; if that is blocked it
 * falls back to the next entry so a player can keep walking on their old axis
 * while a turn they just queued up is still approaching an opening. Using a
 * single ordered list (instead of four independent booleans) means opposite
 * keys held together resolve themselves automatically — whichever was pressed
 * more recently simply sits at the front.
 */
export interface PlayerInput {
  action: boolean;
  directions: DirectionKey[];
}

export interface InputState {
  p1: PlayerInput;
  p2: PlayerInput;
}

export type BlastAxis = "horizontal" | "vertical" | "both";
export type BlastSegmentKind = "center" | "body" | "cap";

export interface BlastSegmentSnapshot extends Point {
  axis: BlastAxis;
  kind: BlastSegmentKind;
  terminal: boolean;
}

export interface LevelSummary {
  id: string;
  name: string;
  index: number;
  total: number;
}

export const GUM_FUSE_MS = 1_600;
export const BLAST_TTL_MS = 900;
export const TRAP_DURATION_MS = 2_700;
export const ROUND_RESET_DELAY_MS = 1_400;
export const TILE_SIZE = 64;

export const PLAYER_RADIUS = 0.38;
export const PLAYER_SPEED_TILES_PER_SECOND = 4.25;
export const PLAYER_STEP_MS = 16;

/**
 * How fast (in tiles/second) a blocked player gets nudged sideways toward the
 * center of a lane while trying to turn into it. This is what lets a player
 * cut into a perpendicular corridor without stopping dead-on the tile center
 * first — see `Player.tryCornerAssist` for where it's used.
 */
export const CORNER_ASSIST_TILES_PER_SECOND = 7.5;

const NO_DIRECTIONS: DirectionKey[] = [];

export const EMPTY_INPUT: InputState = Object.freeze({
  p1: Object.freeze({ action: false, directions: NO_DIRECTIONS }),
  p2: Object.freeze({ action: false, directions: NO_DIRECTIONS }),
});

export const DIRECTIONS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1, axis: "vertical" as const }),
  down: Object.freeze({ x: 0, y: 1, axis: "vertical" as const }),
  left: Object.freeze({ x: -1, y: 0, axis: "horizontal" as const }),
  right: Object.freeze({ x: 1, y: 0, axis: "horizontal" as const }),
});
