import { describe, expect, test } from "bun:test";
import { createGame } from "../src/game/Game.ts";
import { LEVEL_CATALOG } from "../src/game/Level.ts";
import { HERO_COLORS, LEVEL_THEMES, THEME, levelTheme, playerPalette } from "../src/render/theme.ts";

/** Perceptual-ish distance so "distinct" means visibly different, not just unequal strings. */
function colorDistance(a: string, b: string): number {
  const parse = (hex: string): [number, number, number] => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

describe("soft blueprint theme", () => {
  test("bombs and water blasts share the same water color family", () => {
    expect(THEME.bomb.body).toBe(THEME.blast.body);
    expect(THEME.bomb.rim).toBe(THEME.blast.edge);
  });

  test("every level keeps floor, wall, brick, water, and both players distinct", () => {
    for (const [levelId, theme] of Object.entries(LEVEL_THEMES)) {
      const elements: Record<string, string> = {
        floor: theme.floor.light,
        wall: theme.wall.top,
        brick: theme.brick.top,
        water: THEME.blast.body,
        playerOne: THEME.players.p1.body,
        playerTwo: THEME.players.p2.body,
      };

      const names = Object.keys(elements);
      for (let i = 0; i < names.length; i += 1) {
        for (let j = i + 1; j < names.length; j += 1) {
          const distance = colorDistance(elements[names[i]], elements[names[j]]);
          expect(distance, `${levelId}: ${names[i]} vs ${names[j]} should be visually distinct`).toBeGreaterThan(60);
        }
      }
    }
  });

  test("gives every authored level its own environment palette", () => {
    const themeIds = Object.keys(LEVEL_THEMES).sort();
    expect(themeIds).toEqual(LEVEL_CATALOG.map((level) => level.id).sort());

    const signatures = Object.values(LEVEL_THEMES).map(
      (theme) => `${theme.floor.light}/${theme.wall.top}/${theme.brick.top}`,
    );
    expect(new Set(signatures).size).toBe(signatures.length);

    const wallTops = Object.values(LEVEL_THEMES).map((theme) => theme.wall.top);
    expect(new Set(wallTops).size).toBe(wallTops.length);
  });

  test("falls back to a default theme for unknown level ids", () => {
    expect(levelTheme("downtown-blocks")).toBe(LEVEL_THEMES["downtown-blocks"]);
    expect(levelTheme("unknown-level")).toBe(LEVEL_THEMES["downtown-blocks"]);
  });

  test("power-up icon colors are distinct from each other", () => {
    expect(colorDistance(THEME.item.range, THEME.item.gum)).toBeGreaterThan(60);
    expect(colorDistance(THEME.item.range, THEME.item.speed)).toBeGreaterThan(60);
    expect(colorDistance(THEME.item.gum, THEME.item.speed)).toBeGreaterThan(60);
  });

  test("maps each player id onto its own palette", () => {
    expect(playerPalette("p1")).toBe(THEME.players.p1);
    expect(playerPalette("p2")).toBe(THEME.players.p2);
    expect(playerPalette("p1")).not.toBe(playerPalette("p2"));
  });

  test("game player identity colors stay in sync with the render palette", () => {
    const snapshot = createGame().getSnapshot();
    const p1 = snapshot.players.find((player) => player.id === "p1");
    const p2 = snapshot.players.find((player) => player.id === "p2");

    expect(p1?.color).toBe(HERO_COLORS.p1);
    expect(p2?.color).toBe(HERO_COLORS.p2);
  });
});
