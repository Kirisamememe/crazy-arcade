import { TILE } from "../game/constants.ts";
import type { GameSnapshot } from "../game/Game.ts";
import { drawBoardBase, drawBrick, drawFloor, drawWall } from "./board.ts";
import { drawBlast, drawBomb, drawPowerUp } from "./effects.ts";
import { drawHeroes } from "./heroes.ts";
import { boardRect, type BoardRect } from "./layout.ts";
import { THEME, levelTheme, type LevelTheme } from "./theme.ts";

export interface RenderFrame {
  width: number;
  height: number;
  pixelRatio: number;
}

const FONT_STACK = '"Avenir Next", "PingFang SC", "Hiragino Sans", system-ui, sans-serif';

/**
 * Full-scene Canvas 2D renderer. Consumes a GameSnapshot each frame and owns
 * no game state; draw order is floor, tiles, blasts, items, bombs, heroes,
 * then the phase overlay.
 */
export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable");
    }
    this.ctx = ctx;
  }

  render(game: GameSnapshot, frame: RenderFrame): void {
    const ctx = this.ctx;
    ctx.setTransform(frame.pixelRatio, 0, 0, frame.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, frame.width, frame.height);

    const board = boardRect(game.width, game.height, frame.width, frame.height);
    const theme = levelTheme(game.level.id);

    drawBoardBase(ctx, board);
    drawFloor(ctx, board, game.width, game.height, theme);
    this.renderTiles(game, board, theme);

    for (const blast of game.waterBlasts) {
      drawBlast(ctx, board, blast);
    }
    for (const powerup of game.powerups) {
      drawPowerUp(ctx, board, powerup);
    }
    for (const bomb of game.gums) {
      drawBomb(ctx, board, bomb);
    }

    drawHeroes(ctx, board, game.players, game.timeMs);
    this.renderOverlay(game, board);
  }

  private renderTiles(game: GameSnapshot, board: BoardRect, theme: LevelTheme): void {
    for (let y = 0; y < game.height; y += 1) {
      for (let x = 0; x < game.width; x += 1) {
        const tile = game.tiles[y * game.width + x];
        if (tile === TILE.WALL) {
          drawWall(this.ctx, board, x, y, theme);
        } else if (tile === TILE.BRICK) {
          drawBrick(this.ctx, board, x, y, theme);
        }
      }
    }
  }

  private renderOverlay(game: GameSnapshot, board: BoardRect): void {
    if (game.phase === "playing") {
      return;
    }

    const ctx = this.ctx;
    const cardWidth = Math.min(board.width * 0.72, board.cell * 9);
    const cardHeight = board.cell * 2.4;
    const x = board.x + (board.width - cardWidth) / 2;
    const y = board.y + (board.height - cardHeight) / 2;
    const winner = game.players.find((player) => player.id === (game.winnerId ?? game.roundWinnerId));

    ctx.save();
    ctx.fillStyle = THEME.overlay.scrim;
    ctx.fillRect(board.x, board.y, board.width, board.height);

    ctx.fillStyle = THEME.shadow;
    ctx.beginPath();
    ctx.roundRect(x, y + board.cell * 0.12, cardWidth, cardHeight, board.cell * 0.4);
    ctx.fill();

    ctx.fillStyle = THEME.overlay.card;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, board.cell * 0.4);
    ctx.fill();

    if (winner) {
      ctx.fillStyle = winner.color;
      ctx.beginPath();
      ctx.roundRect(x, y, cardWidth, board.cell * 0.18, [board.cell * 0.4, board.cell * 0.4, 0, 0]);
      ctx.fill();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = THEME.overlay.title;
    ctx.font = `700 ${Math.round(board.cell * 0.52)}px ${FONT_STACK}`;
    ctx.fillText(game.roundMessage, x + cardWidth / 2, y + cardHeight * 0.42);

    ctx.fillStyle = THEME.overlay.subtitle;
    ctx.font = `600 ${Math.round(board.cell * 0.28)}px ${FONT_STACK}`;
    const hint = game.phase === "matchOver" ? "按 R 开始新的一局" : "即将进入下一张地图…";
    ctx.fillText(hint, x + cardWidth / 2, y + cardHeight * 0.74);
    ctx.restore();
  }
}
