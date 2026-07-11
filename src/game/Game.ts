import {
  BLAST_TTL_MS,
  EMPTY_INPUT,
  ROUND_RESET_DELAY_MS,
  TILE,
  TILE_SIZE,
  TRAP_DURATION_MS,
  type GamePhase,
  type InputState,
  type LevelSummary,
  type PlayerId,
  type Point,
  type PowerUpType,
} from "./constants.ts";
import { LEVEL_CATALOG, Level, createDefaultLevel } from "./Level.ts";
import { GumBomb, type GumBombSnapshot } from "./entities/GumBomb.ts";
import { Player, type PlayerConfig, type PlayerSnapshot } from "./entities/Player.ts";
import { PowerUp, type PowerUpSnapshot } from "./entities/PowerUp.ts";
import { WaterBlast, type WaterBlastSnapshot } from "./entities/WaterBlast.ts";

const DEFAULT_PLAYERS: PlayerConfig[] = [
  {
    id: "p1",
    name: "P1",
    color: "#4da3ff",
    accentColor: "#a8d4ff",
    bubbleColor: "#ff7fae",
  },
  {
    id: "p2",
    name: "P2",
    color: "#52c977",
    accentColor: "#b0ecc4",
    bubbleColor: "#ff7fae",
  },
];

export interface GameOptions {
  levels?: Level[];
  winningScore?: number;
}

export interface GameSnapshot {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[];
  level: LevelSummary;
  phase: GamePhase;
  round: number;
  timeMs: number;
  roundWinnerId: PlayerId | null;
  winnerId: PlayerId | null;
  roundMessage: string;
  players: PlayerSnapshot[];
  gums: GumBombSnapshot[];
  waterBlasts: WaterBlastSnapshot[];
  bubbles: [];
  powerups: PowerUpSnapshot[];
}

export class Game {
  readonly levels: Level[];
  readonly winningScore: number;

  level: Level;
  currentLevelIndex = 0;
  phase: GamePhase = "playing";
  round = 1;
  timeMs = 0;
  roundOverAt = 0;
  roundWinnerId: PlayerId | null = null;
  winnerId: PlayerId | null = null;
  roundMessage = "Round ready.";
  players: Player[] = [];
  gums: GumBomb[] = [];
  waterBlasts: WaterBlast[] = [];
  powerups: PowerUp[] = [];

  constructor({ levels, winningScore = 3 }: GameOptions = {}) {
    this.levels = levels?.length ? levels.map((level) => level.clone()) : LEVEL_CATALOG.map(Level.fromDefinition);
    this.winningScore = winningScore;
    this.level = this.levels[0]?.clone() || createDefaultLevel();
    this.roundMessage = `Level ${this.currentLevelIndex + 1}: ${this.level.name}`;
    this.players = DEFAULT_PLAYERS.map((config) => new Player(config, this.level.spawns[config.id]));
  }

  get width(): number {
    return this.level.width;
  }

  get height(): number {
    return this.level.height;
  }

  get tiles(): number[] {
    return this.level.tiles;
  }

  get canAutoRestartRound(): boolean {
    return this.phase === "roundOver" && this.timeMs - this.roundOverAt >= ROUND_RESET_DELAY_MS;
  }

  getPlayer(id: PlayerId): Player {
    const player = this.players.find((item) => item.id === id);
    if (!player) {
      throw new Error(`Unknown player "${id}"`);
    }
    return player;
  }

  step(input: InputState = EMPTY_INPUT, deltaMs = 16): this {
    if (deltaMs <= 0) {
      return this;
    }

    this.timeMs += deltaMs;
    this.updateWaterBlasts(deltaMs);

    if (this.phase !== "playing") {
      return this;
    }

    this.updateGums(deltaMs);
    this.updatePlayers(input, deltaMs);
    this.resolveRescues();
    this.resolveTrapTimers();
    this.resolveRoundState();
    return this;
  }

  restartRound({ advanceLevel = true }: { advanceLevel?: boolean } = {}): void {
    const scores = new Map(this.players.map((player) => [player.id, player.score]));
    if (advanceLevel) {
      this.currentLevelIndex = (this.currentLevelIndex + 1) % this.levels.length;
    }

    this.level = this.levels[this.currentLevelIndex].clone();
    this.phase = "playing";
    this.round += 1;
    this.timeMs = 0;
    this.roundOverAt = 0;
    this.roundWinnerId = null;
    this.winnerId = null;
    this.roundMessage = `Level ${this.currentLevelIndex + 1}: ${this.level.name}`;
    this.gums = [];
    this.waterBlasts = [];
    this.powerups = [];

    for (const config of DEFAULT_PLAYERS) {
      const player = this.getPlayer(config.id);
      player.reset(this.level.spawns[config.id], scores.get(config.id) || 0);
    }
  }

  resetMatch(levelIndex = 0): void {
    this.currentLevelIndex = clampIndex(levelIndex, this.levels.length);
    this.level = this.levels[this.currentLevelIndex].clone();
    this.phase = "playing";
    this.round = 1;
    this.timeMs = 0;
    this.roundOverAt = 0;
    this.roundWinnerId = null;
    this.winnerId = null;
    this.roundMessage = `Level ${this.currentLevelIndex + 1}: ${this.level.name}`;
    this.gums = [];
    this.waterBlasts = [];
    this.powerups = [];
    this.players = DEFAULT_PLAYERS.map((config) => new Player(config, this.level.spawns[config.id]));
  }

  goToLevel(levelIndex: number): void {
    this.resetMatch(levelIndex);
  }

  getSnapshot(): GameSnapshot {
    return {
      width: this.width,
      height: this.height,
      tileSize: TILE_SIZE,
      tiles: [...this.tiles],
      level: {
        id: String(this.level.id),
        name: this.level.name,
        index: this.currentLevelIndex,
        total: this.levels.length,
      },
      phase: this.phase,
      round: this.round,
      timeMs: this.timeMs,
      roundWinnerId: this.roundWinnerId,
      winnerId: this.winnerId,
      roundMessage: this.roundMessage,
      players: this.players.map((player) => player.snapshot()),
      gums: this.gums.map((gum) => gum.snapshot()),
      waterBlasts: this.waterBlasts.map((blast) => blast.snapshot()),
      bubbles: [],
      powerups: this.powerups.map((powerup) => powerup.snapshot(this.timeMs)),
    };
  }

  private updateWaterBlasts(deltaMs: number): void {
    for (const blast of this.waterBlasts) {
      blast.update(deltaMs);
    }
    this.waterBlasts = this.waterBlasts.filter((blast) => blast.active);
  }

  private updateGums(deltaMs: number): void {
    const ready: Array<{ gum: GumBomb; overshootMs: number; explodedAtMs: number }> = [];

    for (const gum of this.gums) {
      const fuseBeforeTick = gum.fuseMs;
      gum.update(deltaMs, this.players);
      if (gum.ready) {
        const overshootMs = Math.max(0, deltaMs - fuseBeforeTick);
        ready.push({ gum, overshootMs, explodedAtMs: this.timeMs - overshootMs });
      }
    }

    for (const { gum, overshootMs, explodedAtMs } of ready) {
      if (this.gums.includes(gum)) {
        this.detonate(gum, overshootMs, explodedAtMs);
      }
    }
  }

  private updatePlayers(input: InputState, deltaMs: number): void {
    for (const player of this.players) {
      const playerInput = input[player.id] || EMPTY_INPUT[player.id];
      this.maybeDropGum(player, playerInput.action);
      player.updateMovement(playerInput, deltaMs, this.timeMs, (x, y, radius, playerId) =>
        this.canOccupy(x, y, radius, playerId),
      );
      this.collectPowerUp(player);
    }
    this.resolveActiveWaterHazards();
  }

  private maybeDropGum(player: Player, wantsAction: boolean): void {
    if (player.eliminated || player.isTrapped(this.timeMs)) {
      player.actionHeld = wantsAction;
      return;
    }

    if (!wantsAction) {
      player.actionHeld = false;
      return;
    }

    if (player.actionHeld || player.activeGums >= player.maxGums) {
      return;
    }

    player.actionHeld = true;
    const tile = player.gumTile();

    if (this.level.getTile(tile.x, tile.y) !== TILE.FLOOR || this.gumAt(tile.x, tile.y)) {
      return;
    }

    this.gums.push(new GumBomb({ ...tile, ownerId: player.id, range: player.power }));
    player.activeGums += 1;
  }

  private detonate(gum: GumBomb, overshootMs = 0, explodedAtMs = this.timeMs): void {
    this.gums = this.gums.filter((item) => item !== gum);
    const owner = this.getPlayer(gum.ownerId);
    owner.activeGums = Math.max(0, owner.activeGums - 1);

    const ttlMs = Math.max(0, BLAST_TTL_MS - overshootMs);
    const { blast, brokenTiles } = WaterBlast.fromBomb(this.level, gum, ttlMs);
    if (blast.active) {
      this.waterBlasts.push(blast);
    }

    for (const tile of brokenTiles) {
      this.level.setTile(tile.x, tile.y, TILE.FLOOR);
      this.maybeSpawnPowerUp(tile);
    }

    const chained = this.gums.filter((other) => blast.coversTile(other.x, other.y));
    for (const chainedGum of chained) {
      this.detonate(chainedGum, 0, explodedAtMs);
    }

    this.trapPlayersInBlast(blast, explodedAtMs + TRAP_DURATION_MS, { extendExisting: true });
  }

  private maybeSpawnPowerUp(tile: Point): void {
    const roll = (tile.x * 17 + tile.y * 31 + this.round + this.currentLevelIndex) % 6;
    if (roll > 2) {
      return;
    }

    const type: PowerUpType = ["range", "gum", "speed"][roll] as PowerUpType;
    this.powerups.push(new PowerUp({ ...tile, type, createdAtMs: this.timeMs }));
  }

  private collectPowerUp(player: Player): void {
    const tile = player.tilePosition();
    const index = this.powerups.findIndex((powerup) => powerup.x === tile.x && powerup.y === tile.y);

    if (index === -1) {
      return;
    }

    const [powerup] = this.powerups.splice(index, 1);
    if (powerup.type === "range") {
      player.power = Math.min(6, player.power + 1);
    }
    if (powerup.type === "gum") {
      player.maxGums = Math.min(4, player.maxGums + 1);
    }
    if (powerup.type === "speed") {
      player.increaseSpeed();
    }
  }

  private resolveActiveWaterHazards(): void {
    for (const blast of this.waterBlasts.filter((item) => item.active)) {
      this.trapPlayersInBlast(blast, this.timeMs + TRAP_DURATION_MS, { extendExisting: false });
    }
  }

  private trapPlayersInBlast(
    blast: WaterBlast,
    trappedUntil: number,
    { extendExisting }: { extendExisting: boolean },
  ): void {
    for (const player of this.players) {
      const tile = player.tilePosition();
      if (player.eliminated || !blast.coversTile(tile.x, tile.y)) {
        continue;
      }

      if (extendExisting || !player.isTrapped(this.timeMs)) {
        player.trappedUntil = Math.max(player.trappedUntil, trappedUntil);
      }
    }
  }

  private resolveRescues(): void {
    for (const trapped of this.players.filter((player) => player.isTrapped(this.timeMs))) {
      const rescuer = this.players.find(
        (player) =>
          player.id !== trapped.id &&
          !player.eliminated &&
          !player.isTrapped(this.timeMs) &&
          Math.hypot(player.x - trapped.x, player.y - trapped.y) < 0.58,
      );

      if (rescuer) {
        trapped.trappedUntil = 0;
        this.roundMessage = `${rescuer.name} popped ${trapped.name}'s bubble.`;
      }
    }
  }

  private resolveTrapTimers(): void {
    for (const player of this.players) {
      if (!player.eliminated && player.trappedUntil > 0 && this.timeMs >= player.trappedUntil) {
        player.eliminated = true;
        player.trappedUntil = 0;
      }
    }
  }

  private resolveRoundState(): void {
    const survivors = this.players.filter((player) => !player.eliminated);

    if (survivors.length > 1) {
      return;
    }

    this.roundOverAt = this.timeMs;

    if (survivors.length === 1) {
      const winner = survivors[0];
      winner.score += 1;
      this.roundWinnerId = winner.id;

      if (winner.score >= this.winningScore) {
        this.phase = "matchOver";
        this.winnerId = winner.id;
        this.roundMessage = `${winner.name} wins the match.`;
        return;
      }

      this.phase = "roundOver";
      this.roundMessage = `${winner.name} wins the round.`;
      return;
    }

    this.phase = "roundOver";
    this.roundWinnerId = null;
    this.roundMessage = "Draw round.";
  }

  private canOccupy(x: number, y: number, radius: number, playerId: PlayerId): boolean {
    const minX = Math.round(x - radius);
    const maxX = Math.round(x + radius);
    const minY = Math.round(y - radius);
    const maxY = Math.round(y + radius);

    for (let tileY = minY; tileY <= maxY; tileY += 1) {
      for (let tileX = minX; tileX <= maxX; tileX += 1) {
        if (this.level.isBlockingAt(tileX, tileY)) {
          return false;
        }
      }
    }

    return !this.gumBlocksPosition(x, y, radius, playerId);
  }

  private gumBlocksPosition(x: number, y: number, radius: number, playerId: PlayerId): boolean {
    return this.gums.some((gum) => {
      if (gum.passableBy === playerId) {
        return false;
      }
      return Math.abs(x - gum.x) < 0.5 + radius && Math.abs(y - gum.y) < 0.5 + radius;
    });
  }

  private gumAt(x: number, y: number): boolean {
    return this.gums.some((gum) => gum.x === x && gum.y === y);
  }
}

export function createGame(options: GameOptions = {}): Game {
  return new Game(options);
}

export function stepGame(game: Game, input: InputState = EMPTY_INPUT, deltaMs = 16): Game {
  return game.step(input, deltaMs);
}

export function restartRound(game: Game): Game {
  game.restartRound();
  return game;
}

export function canRestartRound(game: Game): boolean {
  return game.canAutoRestartRound;
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return ((Math.trunc(index) % length) + length) % length;
}
