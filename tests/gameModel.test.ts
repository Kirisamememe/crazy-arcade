import { describe, expect, test } from "bun:test";
import { Game } from "../src/game/Game.ts";
import { Level } from "../src/game/Level.ts";
import {
  BLAST_TTL_MS,
  GUM_FUSE_MS,
  PLAYER_SPEED_TILES_PER_SECOND,
  TILE,
  TRAP_DURATION_MS,
  type DirectionKey,
  type InputState,
} from "../src/game/constants.ts";
import { PowerUp } from "../src/game/entities/PowerUp.ts";

function levelFromRows(rows: string[], spawns = { p1: { x: 1, y: 1 }, p2: { x: 5, y: 3 } }) {
  return Level.fromRows({
    id: "test",
    name: "Test Arena",
    rows,
    spawns,
  });
}

interface InputOptions {
  /** Held directions, most-recently-pressed first. A bare `direction` is shorthand for a single-entry list. */
  direction?: DirectionKey;
  directions?: DirectionKey[];
  action?: boolean;
}

function inputFor(playerId: "p1" | "p2", { direction, directions, action = false }: InputOptions = {}): InputState {
  const resolvedDirections = directions ?? (direction ? [direction] : []);
  return {
    p1: { action: false, directions: [] },
    p2: { action: false, directions: [] },
    [playerId]: { action, directions: resolvedDirections },
  };
}

interface CornerAssistCase {
  name: string;
  rows: string[];
  start: { x: number; y: number };
  direction: DirectionKey;
  assert: (player: ReturnType<Game["getPlayer"]>) => void;
}

describe("Game model", () => {
  test("starts as a class-backed model with player objects and a snapshot contract", () => {
    const level = levelFromRows([
      "#######",
      "#.....#",
      "#.#.#.#",
      "#.....#",
      "#######",
    ]);

    const game = new Game({ levels: [level], winningScore: 3 });
    const snapshot = game.getSnapshot();

    expect(game).toBeInstanceOf(Game);
    expect(game.players[0].constructor.name).toBe("Player");
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.level.name).toBe("Test Arena");
    expect(snapshot.players.map((player) => [player.id, player.x, player.y, player.score])).toEqual([
      ["p1", 1, 1, 0],
      ["p2", 5, 3, 0],
    ]);
    expect(snapshot.waterBlasts).toEqual([]);
  });

  test("moves players linearly across tiles instead of teleporting by grid cell", () => {
    const level = levelFromRows([
      "#######",
      "#.....#",
      "#.#.#.#",
      "#.....#",
      "#######",
    ]);
    const game = new Game({ levels: [level] });

    game.step(inputFor("p1", { direction: "right" }), 80);

    const firstStep = game.getPlayer("p1");
    expect(firstStep.x).toBeGreaterThan(1);
    expect(firstStep.x).toBeLessThan(2);
    expect(firstStep.y).toBe(1);

    game.step(inputFor("p1", { direction: "right" }), 400);
    expect(game.getPlayer("p1").x).toBeGreaterThan(2.6);
  });

  test("follows the most recently pressed direction when several are held", () => {
    const level = levelFromRows(
      [
        "#######",
        "#.....#",
        "#.....#",
        "#.....#",
        "#.....#",
        "#######",
      ],
      {
        p1: { x: 2, y: 2 },
        p2: { x: 5, y: 4 },
      },
    );
    const game = new Game({ levels: [level] });
    const player = game.getPlayer("p1");
    const input = inputFor("p1", { directions: ["right", "down"] });
    const expectedDelta = PLAYER_SPEED_TILES_PER_SECOND * 0.016;

    for (let frame = 0; frame < 8; frame += 1) {
      const before = { x: player.x, y: player.y };
      game.step(input, 16);

      expect(player.x).toBeGreaterThan(before.x);
      expect(player.y).toBe(before.y);
    }

    expect(player.x - 2).toBeCloseTo(expectedDelta * 8, 3);
    expect(player.y).toBe(2);
  });

  test("keeps movement stable across large and small frame slices", () => {
    const level = levelFromRows(
      [
        "#######",
        "#.....#",
        "#.....#",
        "#.....#",
        "#.....#",
        "#######",
      ],
      {
        p1: { x: 2, y: 2 },
        p2: { x: 5, y: 4 },
      },
    );
    const oneLargeStep = new Game({ levels: [level] });
    const manySmallSteps = new Game({ levels: [level] });
    const input = inputFor("p1", { directions: ["right", "down"] });

    oneLargeStep.step(input, 160);
    for (let frame = 0; frame < 10; frame += 1) {
      manySmallSteps.step(input, 16);
    }

    expect(manySmallSteps.getPlayer("p1").x).toBeCloseTo(oneLargeStep.getPlayer("p1").x, 4);
    expect(manySmallSteps.getPlayer("p1").y).toBeCloseTo(oneLargeStep.getPlayer("p1").y, 4);
  });

  test("smooth movement still respects wall, brick, and active gum collision", () => {
    const level = levelFromRows([
      "#######",
      "#..B..#",
      "#.#...#",
      "#.....#",
      "#######",
    ]);
    const game = new Game({ levels: [level] });

    game.step(inputFor("p1", { direction: "right" }), 260);
    expect(game.getPlayer("p1").x).toBeGreaterThan(1.8);
    expect(game.getPlayer("p1").x).toBeLessThan(2.25);

    game.step(inputFor("p1", { direction: "right" }), 500);
    expect(game.getPlayer("p1").x).toBeLessThan(2.55);

    game.step(inputFor("p1", { action: true }), 16);
    const gumX = game.gums[0].x;

    game.step(inputFor("p1", { direction: "left" }), 260);
    game.step(inputFor("p1", { direction: "right" }), 400);
    expect(game.getPlayer("p1").x).toBeLessThan(gumX - 0.35);
  });

  test("keeps the player centered in a corridor without forced repositioning", () => {
    const level = levelFromRows(
      [
        "#####",
        "#...#",
        "###.#",
        "#...#",
        "#####",
      ],
      {
        p1: { x: 1, y: 1 },
        p2: { x: 3, y: 3 },
      },
    );
    const game = new Game({ levels: [level] });
    const player = game.getPlayer("p1");

    player.x = 3;
    player.y = 1;

    for (let i = 0; i < 20; i += 1) {
      game.step(inputFor("p1", { direction: "down" }), 16);
    }

    expect(player.x).toBe(3);
    expect(player.y).toBeGreaterThan(1.35);
  });

  test("moves smoothly through perpendicular corridors at each cardinal approach", () => {
    const cases: CornerAssistCase[] = [
      {
        name: "down",
        rows: ["#####", "#...#", "###.#", "#...#", "#####"],
        start: { x: 3, y: 1 },
        direction: "down",
        assert: (player) => {
          expect(player.x).toBe(3);
          expect(player.y).toBeGreaterThan(1.35);
        },
      },
      {
        name: "up",
        rows: ["#####", "#...#", "###.#", "#...#", "#####"],
        start: { x: 3, y: 3 },
        direction: "up",
        assert: (player) => {
          expect(player.x).toBe(3);
          expect(player.y).toBeLessThan(2.65);
        },
      },
      {
        name: "right",
        rows: ["#####", "#...#", "#.###", "#...#", "#####"],
        start: { x: 1, y: 3 },
        direction: "right",
        assert: (player) => {
          expect(player.x).toBeGreaterThan(1.35);
          expect(player.y).toBe(3);
        },
      },
      {
        name: "left",
        rows: ["#####", "#...#", "###.#", "#...#", "#####"],
        start: { x: 3, y: 3 },
        direction: "left",
        assert: (player) => {
          expect(player.x).toBeLessThan(2.65);
          expect(player.y).toBe(3);
        },
      },
    ];

    for (const item of cases) {
      const level = levelFromRows(item.rows, {
        p1: { x: 1, y: 1 },
        p2: { x: 3, y: 3 },
      });
      const game = new Game({ levels: [level] });
      const player = game.getPlayer("p1");
      player.x = item.start.x;
      player.y = item.start.y;

      for (let i = 0; i < 20; i += 1) {
        game.step(inputFor("p1", { direction: item.direction }), 16);
      }

      try {
        item.assert(player);
      } catch (error) {
        throw new Error(`Corridor movement failed for ${item.name}`, { cause: error });
      }
    }
  });

  test("auto-aligns a slightly off-center player into a single-tile gap instead of requiring pixel-perfect aim", () => {
    // Wide open lanes on either side of the pinch so the test only exercises
    // tolerance at the single-tile gap, not incidental clipping against the
    // arena's outer walls.
    const rows = ["#######", "#.....#", "###.###", "#.....#", "#######"];

    for (const offset of [-0.3, -0.15, 0.15, 0.3]) {
      const level = levelFromRows(rows, { p1: { x: 1, y: 1 }, p2: { x: 5, y: 3 } });
      const game = new Game({ levels: [level] });
      const player = game.getPlayer("p1");
      player.x = 3 + offset;
      player.y = 1;

      for (let i = 0; i < 60; i += 1) {
        game.step(inputFor("p1", { direction: "down" }), 16);
      }

      expect(player.y, `offset ${offset} should still pass through the gap`).toBeGreaterThan(2.5);
      expect(player.x, `offset ${offset} should settle back onto the lane`).toBeCloseTo(3, 1);
    }
  });

  test("keeps moving along the open axis when the freshest direction is blocked", () => {
    const level = levelFromRows(
      [
        "#####",
        "#.#.#",
        "#.#.#",
        "#...#",
        "#####",
      ],
      {
        p1: { x: 1, y: 1 },
        p2: { x: 3, y: 3 },
      },
    );
    const game = new Game({ levels: [level] });
    const player = game.getPlayer("p1");

    game.step(inputFor("p1", { directions: ["right", "down"] }), 160);

    expect(player.x).toBeLessThan(1.18);
    expect(player.y).toBeGreaterThan(1.42);
  });

  test("keeps walking on the old axis and cuts into the next corridor as soon as the opening is reachable", () => {
    const level = levelFromRows(
      [
        "#####",
        "#.#.#",
        "#.#.#",
        "#...#",
        "#####",
      ],
      {
        p1: { x: 1, y: 1 },
        p2: { x: 3, y: 3 },
      },
    );
    const game = new Game({ levels: [level] });
    const player = game.getPlayer("p1");

    game.step(inputFor("p1", { directions: ["down", "right"] }), 600);

    expect(player.x).toBeGreaterThan(1.3);
    expect(player.y).toBeGreaterThan(2.7);
  });

  test("keeps the player position stable without forced recentering", () => {
    const level = levelFromRows(
      [
        "#####",
        "#.#.#",
        "#.#.#",
        "#...#",
        "#####",
      ],
      {
        p1: { x: 1, y: 1 },
        p2: { x: 3, y: 3 },
      },
    );
    const game = new Game({ levels: [level] });
    const player = game.getPlayer("p1");
    player.x = 1;
    player.y = 1;

    game.step(inputFor("p1", { direction: "down" }), 80);

    expect(player.x).toBe(1);
    expect(player.y).toBeGreaterThan(1.08);
  });

  test("explosions create animated water pillar segments, break bricks, and trap players", () => {
    const level = levelFromRows(
      [
        "#########",
        "#.......#",
        "#...B...#",
        "#.......#",
        "#########",
      ],
      {
        p1: { x: 2, y: 2 },
        p2: { x: 2, y: 1 },
      },
    );
    const game = new Game({ levels: [level] });
    game.getPlayer("p1").power = 3;

    game.step(inputFor("p1", { action: true }), 16);
    game.step(inputFor("p1"), GUM_FUSE_MS);

    const snapshot = game.getSnapshot();
    expect(snapshot.waterBlasts).toHaveLength(1);
    expect(snapshot.waterBlasts[0].segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 2, y: 2, kind: "center" }),
        expect.objectContaining({ x: 2, y: 1, axis: "vertical" }),
        expect.objectContaining({ x: 4, y: 2, axis: "horizontal", terminal: true }),
      ]),
    );
    expect(snapshot.bubbles).toEqual([]);
    expect(game.level.getTile(4, 2)).toBe(TILE.FLOOR);
    expect(game.getPlayer("p2").trappedUntil).toBe(game.timeMs + TRAP_DURATION_MS);

    game.step(inputFor("p1"), BLAST_TTL_MS);
    expect(game.getSnapshot().waterBlasts).toEqual([]);
  });

  test("marks blast caps when water stops against walls", () => {
    const level = levelFromRows(
      [
        "#####",
        "#...#",
        "#...#",
        "#...#",
        "#####",
      ],
      {
        p1: { x: 2, y: 2 },
        p2: { x: 1, y: 1 },
      },
    );
    const game = new Game({ levels: [level] });
    game.getPlayer("p1").power = 3;

    game.step(inputFor("p1", { action: true }), 16);
    game.step(inputFor("p1"), GUM_FUSE_MS);

    expect(game.getSnapshot().waterBlasts[0].segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 3, y: 2, axis: "horizontal", kind: "cap", terminal: true }),
        expect.objectContaining({ x: 1, y: 2, axis: "horizontal", kind: "cap", terminal: true }),
        expect.objectContaining({ x: 2, y: 1, axis: "vertical", kind: "cap", terminal: true }),
        expect.objectContaining({ x: 2, y: 3, axis: "vertical", kind: "cap", terminal: true }),
      ]),
    );
  });

  test("moving into an active water column traps the player during its ttl", () => {
    const level = levelFromRows(
      [
        "#######",
        "#.....#",
        "#.....#",
        "#.....#",
        "#######",
      ],
      {
        p1: { x: 2, y: 2 },
        p2: { x: 4, y: 3 },
      },
    );
    const game = new Game({ levels: [level] });
    game.getPlayer("p1").power = 3;

    game.step(inputFor("p1", { action: true }), 16);
    game.step(inputFor("p1"), GUM_FUSE_MS);

    expect(game.getPlayer("p2").trappedUntil).toBe(0);

    game.step(inputFor("p2", { direction: "up" }), 260);

    expect(game.getPlayer("p2").trappedUntil).toBeGreaterThan(game.timeMs);
  });

  test("scores trapped players and cycles to the next level between rounds", () => {
    const levelA = levelFromRows(
      [
        "#######",
        "#.....#",
        "#.....#",
        "#.....#",
        "#######",
      ],
      {
        p1: { x: 2, y: 2 },
        p2: { x: 4, y: 2 },
      },
    );
    const levelB = levelFromRows(
      [
        "#######",
        "#.....#",
        "#.#.#.#",
        "#.....#",
        "#######",
      ],
      {
        p1: { x: 1, y: 1 },
        p2: { x: 5, y: 3 },
      },
    );
    const game = new Game({ levels: [levelA, levelB], winningScore: 2 });
    game.getPlayer("p1").power = 3;

    game.step(inputFor("p1", { action: true }), 16);
    game.step(inputFor("p1", { direction: "up" }), 260);
    game.step(inputFor("p1", { direction: "left" }), 260);
    game.step(inputFor("p1"), GUM_FUSE_MS + TRAP_DURATION_MS);

    expect(game.phase).toBe("roundOver");
    expect(game.getPlayer("p1").score).toBe(1);

    game.restartRound();

    expect(game.phase).toBe("playing");
    expect(game.getSnapshot().level.name).toBe("Test Arena");
    expect(game.getPlayer("p1").x).toBe(1);
    expect(game.getPlayer("p2").x).toBe(5);
  });

  test("collects typed power-ups through the object model", () => {
    const level = levelFromRows([
      "#######",
      "#.....#",
      "#.#.#.#",
      "#.....#",
      "#######",
    ]);
    const game = new Game({ levels: [level] });
    const player = game.getPlayer("p1");

    game.powerups.push(new PowerUp({ x: 1, y: 1, type: "range", createdAtMs: 0 }));
    game.step(inputFor("p1"), 16);

    expect(player.power).toBe(3);
    expect(game.getSnapshot().powerups).toEqual([]);

    game.powerups.push(new PowerUp({ x: 1, y: 1, type: "gum", createdAtMs: 16 }));
    game.step(inputFor("p1"), 16);

    expect(player.maxGums).toBe(2);
  });

  test("speed power-up increases player movement speed", () => {
    const level = levelFromRows([
      "#######",
      "#.....#",
      "#.#.#.#",
      "#.....#",
      "#######",
    ]);
    const boosted = new Game({ levels: [level] });
    const baseline = new Game({ levels: [level] });

    boosted.powerups.push(new PowerUp({ x: 1, y: 1, type: "speed", createdAtMs: 0 }));
    boosted.step(inputFor("p1"), 16);

    baseline.step(inputFor("p1", { direction: "right" }), 160);
    boosted.step(inputFor("p1", { direction: "right" }), 160);

    expect(boosted.getPlayer("p1").x).toBeGreaterThan(baseline.getPlayer("p1").x + 0.08);
  });

  test("places gum on the nearest occupied tile while moving", () => {
    const level = levelFromRows([
      "#######",
      "#.....#",
      "#.#.#.#",
      "#.....#",
      "#######",
    ]);
    const game = new Game({ levels: [level] });
    const player = game.getPlayer("p1");
    player.x = 1.62;
    player.y = 1;

    game.step(inputFor("p1", { action: true }), 16);

    expect(game.gums[0]).toMatchObject({ x: 2, y: 1 });
  });

  test("queued turn snaps into a perpendicular corridor smoothly via corner-assist movement", () => {
    const level = levelFromRows(
      [
        "#######",
        "#.....#",
        "#.###.#",
        "#.....#",
        "#######",
      ],
      {
        p1: { x: 1, y: 1 },
        p2: { x: 5, y: 3 },
      },
    );
    const game = new Game({ levels: [level] });
    const player = game.getPlayer("p1");

    game.step(inputFor("p1", { directions: ["down", "right"] }), 700);

    expect(player.x).toBeGreaterThan(1.5);
    expect(player.y).toBeGreaterThan(2.5);
  });
});
