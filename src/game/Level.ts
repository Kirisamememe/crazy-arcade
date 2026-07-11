import { TILE, type Point, type Tile } from "./constants.ts";

export type LevelId =
  | "downtown-blocks"
  | "mossy-forest"
  | "harvest-village"
  | "moonlit-market"
  | "bubble-lab"
  | string;

export interface LevelSpawns {
  p1: Point;
  p2: Point;
}

export interface LevelDefinition {
  id: LevelId;
  name: string;
  rows: string[];
  spawns: LevelSpawns;
}

const TILE_BY_CHAR: Record<string, Tile> = {
  ".": TILE.FLOOR,
  "#": TILE.WALL,
  B: TILE.BRICK,
};

export class Level {
  readonly id: LevelId;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly tiles: Tile[];
  readonly spawns: LevelSpawns;

  private constructor(definition: LevelDefinition, tiles: Tile[]) {
    this.id = definition.id;
    this.name = definition.name;
    this.width = definition.rows[0].length;
    this.height = definition.rows.length;
    this.tiles = tiles;
    this.spawns = {
      p1: { ...definition.spawns.p1 },
      p2: { ...definition.spawns.p2 },
    };
  }

  static fromDefinition(definition: LevelDefinition): Level {
    return Level.fromRows(definition);
  }

  static fromRows(definition: LevelDefinition): Level {
    const width = definition.rows[0]?.length || 0;
    if (width === 0) {
      throw new Error(`Level "${definition.name}" must contain at least one row`);
    }

    const tiles = definition.rows.flatMap((row, y) => {
      if (row.length !== width) {
        throw new Error(`Level "${definition.name}" row ${y} has width ${row.length}, expected ${width}`);
      }

      return [...row].map((char) => {
        const tile = TILE_BY_CHAR[char];
        if (tile === undefined) {
          throw new Error(`Level "${definition.name}" contains unknown tile "${char}"`);
        }
        return tile;
      });
    });

    const level = new Level(definition, tiles);
    validateSpawn(level, "p1");
    validateSpawn(level, "p2");
    return level;
  }

  clone(): Level {
    const clone = new Level(
      {
        id: this.id,
        name: this.name,
        rows: Array.from({ length: this.height }, () => ".".repeat(this.width)),
        spawns: this.spawns,
      },
      [...this.tiles],
    );
    return clone;
  }

  tileIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  isInside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  getTile(x: number, y: number): Tile {
    if (!this.isInside(x, y)) {
      return TILE.WALL;
    }

    return this.tiles[this.tileIndex(x, y)];
  }

  setTile(x: number, y: number, tile: Tile): void {
    if (!this.isInside(x, y)) {
      throw new RangeError(`Tile coordinate (${x}, ${y}) is outside level "${this.name}"`);
    }

    this.tiles[this.tileIndex(x, y)] = tile;
  }

  isBlockingAt(x: number, y: number): boolean {
    return isBlockingTile(this.getTile(x, y));
  }

  isDestructibleAt(x: number, y: number): boolean {
    return isDestructibleTile(this.getTile(x, y));
  }
}

function validateSpawn(level: Level, playerId: keyof LevelSpawns): void {
  const spawn = level.spawns[playerId];
  if (!spawn || level.getTile(spawn.x, spawn.y) !== TILE.FLOOR) {
    throw new Error(`Level "${level.name}" has an invalid ${playerId} spawn`);
  }
}

export const LEVEL_CATALOG: LevelDefinition[] = [
  // City: 2x2 building blocks with a street grid and crates along the avenues.
  {
    id: "downtown-blocks",
    name: "Downtown Blocks",
    spawns: { p1: { x: 1, y: 1 }, p2: { x: 13, y: 9 } },
    rows: [
      "###############",
      "#..BB.....BB..#",
      "#.B##B...B##B.#",
      "#..##B...B##..#",
      "#.....B.B.....#",
      "#.BB.B###B.BB.#",
      "#.....B.B.....#",
      "#..##B...B##..#",
      "#.B##B...B##B.#",
      "#..BB.....BB..#",
      "###############",
    ],
  },
  // Forest: scattered boulders and bush clumps, winding organic paths.
  {
    id: "mossy-forest",
    name: "Mossy Forest",
    spawns: { p1: { x: 1, y: 1 }, p2: { x: 13, y: 9 } },
    rows: [
      "###############",
      "#..B..BB......#",
      "#.#.B...#..B..#",
      "#.B..#B.B..#B.#",
      "#B..B...B.#..B#",
      "#..B.#...#.B..#",
      "#B..#.B...B..B#",
      "#.B#..B.B#..B.#",
      "#..B..#...B.#.#",
      "#......BB..B..#",
      "###############",
    ],
  },
  // Village: horizontal crop rows of hay bales with open walking lanes.
  {
    id: "harvest-village",
    name: "Harvest Village",
    spawns: { p1: { x: 1, y: 1 }, p2: { x: 13, y: 9 } },
    rows: [
      "###############",
      "#.............#",
      "#.BBBB.B.BBBB.#",
      "#.....#.#.....#",
      "#.BBBB.B.BBBB.#",
      "#..B...#...B..#",
      "#.BBBB.B.BBBB.#",
      "#.....#.#.....#",
      "#.BBBB.B.BBBB.#",
      "#.............#",
      "###############",
    ],
  },
  // Night market: vertical stall aisles with goods stacked between them.
  {
    id: "moonlit-market",
    name: "Moonlit Market",
    spawns: { p1: { x: 1, y: 1 }, p2: { x: 13, y: 9 } },
    rows: [
      "###############",
      "#..B.......B..#",
      "#.B.#.BBB.#.B.#",
      "#...#B...B#...#",
      "#.B.#.B.B.#.B.#",
      "#....B.B.B....#",
      "#.B.#.B.B.#.B.#",
      "#...#B...B#...#",
      "#.B.#.BBB.#.B.#",
      "#..B.......B..#",
      "###############",
    ],
  },
  // Laboratory: sealed corner chambers around a central reactor core.
  {
    id: "bubble-lab",
    name: "Bubble Lab",
    spawns: { p1: { x: 1, y: 1 }, p2: { x: 13, y: 9 } },
    rows: [
      "###############",
      "#.....B.B.....#",
      "#.##.B.#.B.##.#",
      "#.#B.......B#.#",
      "#..B.#.B.#.B..#",
      "#.B...B#B...B.#",
      "#..B.#.B.#.B..#",
      "#.#B.......B#.#",
      "#.##.B.#.B.##.#",
      "#.....B.B.....#",
      "###############",
    ],
  },
];

export function createDefaultLevel(): Level {
  return Level.fromDefinition(LEVEL_CATALOG[0]);
}

export function createLevelById(id: LevelId): Level {
  const definition = LEVEL_CATALOG.find((level) => level.id === id);
  if (!definition) {
    throw new Error(`Unknown level id "${id}"`);
  }
  return Level.fromDefinition(definition);
}

export function tileIndex(level: Level, x: number, y: number): number {
  return level.tileIndex(x, y);
}

export function isInside(level: Level, x: number, y: number): boolean {
  return level.isInside(x, y);
}

export function getTile(level: Level, x: number, y: number): Tile {
  return level.getTile(x, y);
}

export function setTile(level: Level, x: number, y: number, tile: Tile): void {
  level.setTile(x, y, tile);
}

export function isBlockingTile(tile: Tile): boolean {
  return tile === TILE.WALL || tile === TILE.BRICK;
}

export function isDestructibleTile(tile: Tile): boolean {
  return tile === TILE.BRICK;
}
