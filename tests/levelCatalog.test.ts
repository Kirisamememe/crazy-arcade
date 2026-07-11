import { describe, expect, test } from "bun:test";
import {
  LEVEL_CATALOG,
  Level,
  createDefaultLevel,
  createLevelById,
  getTile,
  isBlockingTile,
  isDestructibleTile,
  isInside,
  setTile,
  tileIndex,
} from "../src/game/Level.ts";
import { TILE } from "../src/game/constants.ts";

describe("level catalog", () => {
  test("contains at least five named hand-authored arenas", () => {
    expect(LEVEL_CATALOG.length).toBeGreaterThanOrEqual(5);
    expect(new Set(LEVEL_CATALOG.map((level) => level.id)).size).toBe(LEVEL_CATALOG.length);
    expect(LEVEL_CATALOG.map((level) => level.name)).toEqual(
      expect.arrayContaining([
        "Downtown Blocks",
        "Mossy Forest",
        "Harvest Village",
        "Moonlit Market",
        "Bubble Lab",
      ]),
    );
  });

  test("each level has stable dimensions, safe spawns, and destructible bricks", () => {
    for (const definition of LEVEL_CATALOG) {
      const level = Level.fromDefinition(definition);

      expect(level.width).toBe(15);
      expect(level.height).toBe(11);
      expect(level.tiles).toHaveLength(15 * 11);
      expect(level.getTile(level.spawns.p1.x, level.spawns.p1.y)).toBe(TILE.FLOOR);
      expect(level.getTile(level.spawns.p2.x, level.spawns.p2.y)).toBe(TILE.FLOOR);
      expect(level.tiles.filter(isDestructibleTile).length).toBeGreaterThan(8);
    }
  });

  test("arena layouts are structurally distinct from each other", () => {
    const levels = LEVEL_CATALOG.map(Level.fromDefinition);

    for (let i = 0; i < levels.length; i += 1) {
      for (let j = i + 1; j < levels.length; j += 1) {
        const differing = levels[i].tiles.filter((tile, index) => tile !== levels[j].tiles[index]).length;
        expect(
          differing,
          `${levels[i].name} vs ${levels[j].name} should differ in many tiles`,
        ).toBeGreaterThan(30);
      }
    }
  });

  test("factory helpers keep a small compatibility surface around Level", () => {
    const level = createDefaultLevel();
    const clone = createLevelById(level.id).clone();

    setTile(clone, 1, 1, TILE.BRICK);

    expect(level).toBeInstanceOf(Level);
    expect(tileIndex(level, 3, 2)).toBe(33);
    expect(isInside(level, 14, 10)).toBe(true);
    expect(isInside(level, 15, 0)).toBe(false);
    expect(getTile(clone, 1, 1)).toBe(TILE.BRICK);
    expect(getTile(level, 1, 1)).toBe(TILE.FLOOR);
    expect(isBlockingTile(TILE.WALL)).toBe(true);
    expect(isBlockingTile(TILE.FLOOR)).toBe(false);
  });
});
