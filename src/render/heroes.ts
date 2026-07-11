import type { PlayerSnapshot } from "../game/entities/Player.ts";
import type { DirectionKey } from "../game/constants.ts";
import { THEME, playerPalette } from "./theme.ts";
import { cellRect, type BoardRect } from "./layout.ts";

const FACING: Record<DirectionKey, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Draws all heroes back-to-front so the lower one overlaps naturally. */
export function drawHeroes(
  ctx: CanvasRenderingContext2D,
  board: BoardRect,
  players: PlayerSnapshot[],
  timeMs: number,
): void {
  for (const player of [...players].sort((a, b) => a.y - b.y)) {
    drawHero(ctx, board, player, timeMs);
  }
}

/**
 * "Bubble diver" mascot: one clean capsule silhouette in the player color
 * with a two-tone suit, a dark helmet visor holding bright tracking eyes,
 * a sharp dorsal fin, and stubby paddling feet. Flat shapes, no outlines,
 * one accent sheen — closer to a modern vinyl toy than a plush baby.
 */
export function drawHero(ctx: CanvasRenderingContext2D, board: BoardRect, hero: PlayerSnapshot, timeMs: number): void {
  const cell = cellRect(board, hero.x, hero.y);
  const s = cell.size;
  const palette = playerPalette(hero.id);
  const facing = FACING[hero.facing];
  const trapped = hero.trappedUntil > timeMs;

  const walkPhase = Math.sin(hero.walkTimeMs / 85);
  const bob = trapped ? Math.sin(timeMs / 260) * s * 0.05 : Math.abs(walkPhase) * -s * 0.028;
  const cx = cell.centerX;
  const cy = cell.centerY + bob - (trapped ? s * 0.06 : 0);
  const lean = trapped ? 0 : facing.x * 0.07 + walkPhase * facing.x * 0.02;

  ctx.save();
  if (hero.eliminated) {
    ctx.globalAlpha = 0.3;
  }

  // Ground shadow (drawn unrotated).
  ctx.fillStyle = THEME.shadow;
  ctx.beginPath();
  ctx.ellipse(cell.centerX, cell.centerY + s * 0.36, s * 0.23, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = hero.eliminated ? THEME.hero.ghost : palette.body;
  const shade = hero.eliminated ? THEME.hero.ghost : palette.shade;
  const light = hero.eliminated ? THEME.paper : palette.light;

  ctx.translate(cx, cy);
  ctx.rotate(lean);

  drawFeet(ctx, s, shade, trapped ? 0 : walkPhase);
  drawSuit(ctx, s, body, shade, light);
  drawVisor(ctx, s, hero, facing, timeMs);

  ctx.restore();

  if (trapped && !hero.eliminated) {
    drawTrapBubble(ctx, cx, cy - s * 0.08, s, timeMs);
  }
}

function drawFeet(ctx: CanvasRenderingContext2D, s: number, shade: string, walkPhase: number): void {
  const footW = s * 0.16;
  const footH = s * 0.1;
  const baseY = s * 0.28;
  const lift = s * 0.055;

  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.roundRect(-s * 0.2, baseY - Math.max(0, walkPhase) * lift, footW, footH, footH * 0.5);
  ctx.roundRect(s * 0.04, baseY - Math.max(0, -walkPhase) * lift, footW, footH, footH * 0.5);
  ctx.fill();
}

function drawSuit(ctx: CanvasRenderingContext2D, s: number, body: string, shade: string, light: string): void {
  const w = s * 0.54;
  const h = s * 0.72;
  const top = -s * 0.44;
  const radiusTop = w * 0.5;
  const radiusBottom = w * 0.3;

  // Dorsal fin: sharp crest, gives the silhouette a direction.
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(0, top - s * 0.1);
  ctx.quadraticCurveTo(s * 0.13, top - s * 0.02, s * 0.05, top + s * 0.08);
  ctx.quadraticCurveTo(-s * 0.02, top + s * 0.02, 0, top - s * 0.1);
  ctx.fill();

  // Capsule body.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-w / 2, top, w, h, [radiusTop, radiusTop, radiusBottom, radiusBottom]);
  ctx.fill();

  // Lower suit: darker wetsuit band with a rounded hem.
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.roundRect(-w / 2, top + h * 0.66, w, h * 0.34, [0, 0, radiusBottom, radiusBottom]);
  ctx.fill();

  // Chest sheen: single crisp highlight along the helmet edge.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = Math.max(1.2, s * 0.03);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, top + w * 0.5, w * 0.36, -2.55, -1.75);
  ctx.stroke();

  // Belt light: tiny accent dot where suit tones meet.
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(0, top + h * 0.66, s * 0.035, 0, Math.PI * 2);
  ctx.fill();
}

function drawVisor(
  ctx: CanvasRenderingContext2D,
  s: number,
  hero: PlayerSnapshot,
  facing: { x: number; y: number },
  timeMs: number,
): void {
  const w = s * 0.4;
  const h = s * 0.21;
  const centerY = -s * 0.2 + facing.y * s * 0.03;
  const centerX = facing.x * s * 0.045;
  const radius = h * 0.5;

  ctx.fillStyle = THEME.hero.visor;
  ctx.beginPath();
  ctx.roundRect(centerX - w / 2, centerY - h / 2, w, h, radius);
  ctx.fill();

  // Eyes inside the visor track the facing direction.
  const eyeGap = w * 0.24;
  const eyeX = centerX + facing.x * w * 0.08;
  const eyeY = centerY + facing.y * h * 0.16;
  const eyeW = s * 0.05;
  const eyeH = hero.eliminated ? s * 0.05 : s * 0.1;
  const blink = !hero.eliminated && timeMs % 3400 < 120;

  if (hero.eliminated) {
    ctx.strokeStyle = THEME.paper;
    ctx.lineWidth = Math.max(1, s * 0.024);
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      const ex = eyeX + side * eyeGap;
      ctx.beginPath();
      ctx.moveTo(ex - eyeW * 0.8, eyeY - eyeW * 0.8);
      ctx.lineTo(ex + eyeW * 0.8, eyeY + eyeW * 0.8);
      ctx.moveTo(ex + eyeW * 0.8, eyeY - eyeW * 0.8);
      ctx.lineTo(ex - eyeW * 0.8, eyeY + eyeW * 0.8);
      ctx.stroke();
    }
    return;
  }

  ctx.fillStyle = THEME.paper;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    if (blink) {
      ctx.roundRect(eyeX + side * eyeGap - eyeW / 2, eyeY - s * 0.012, eyeW, s * 0.024, s * 0.012);
    } else {
      ctx.roundRect(eyeX + side * eyeGap - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH, eyeW / 2);
    }
    ctx.fill();
  }

  // Visor sheen: one diagonal glint at the upper corner.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = Math.max(1, s * 0.022);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(centerX + w * 0.24, centerY - h * 0.34);
  ctx.lineTo(centerX + w * 0.38, centerY - h * 0.06);
  ctx.stroke();
}

function drawTrapBubble(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, timeMs: number): void {
  const wobble = 1 + Math.sin(timeMs / 210) * 0.035;
  const r = s * 0.46 * wobble;

  ctx.save();
  ctx.fillStyle = THEME.trap.fill;
  ctx.strokeStyle = THEME.trap.rim;
  ctx.lineWidth = Math.max(1.5, s * 0.04);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = THEME.trap.gloss;
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, -2.3, -1.45);
  ctx.stroke();
  ctx.restore();
}
