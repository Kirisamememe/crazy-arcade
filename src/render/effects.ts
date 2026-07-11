import type { GumBombSnapshot } from "../game/entities/GumBomb.ts";
import type { PowerUpSnapshot } from "../game/entities/PowerUp.ts";
import type { WaterBlastSnapshot } from "../game/entities/WaterBlast.ts";
import { THEME } from "./theme.ts";
import { cellRect, type BoardRect } from "./layout.ts";

/** Gum bomb: pulsing pink bubble with a glossy sparkle. */
export function drawBomb(ctx: CanvasRenderingContext2D, board: BoardRect, bomb: GumBombSnapshot): void {
  const cell = cellRect(board, bomb.x, bomb.y);
  const s = cell.size;
  const pulse = 1 + 0.055 * Math.sin(bomb.ageMs / 110);
  const radius = s * 0.34 * pulse;

  ctx.save();
  ctx.fillStyle = THEME.shadow;
  ctx.beginPath();
  ctx.ellipse(cell.centerX, cell.centerY + s * 0.32, radius * 0.82, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = THEME.bomb.body;
  ctx.strokeStyle = THEME.bomb.rim;
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.beginPath();
  ctx.arc(cell.centerX, cell.centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = THEME.bomb.gloss;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(
    cell.centerX - radius * 0.38,
    cell.centerY - radius * 0.42,
    radius * 0.26,
    radius * 0.16,
    -0.6,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(cell.centerX + radius * 0.34, cell.centerY + radius * 0.3, radius * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Water blast: one continuous capsule cross in the same water family as the
 * gum bubble. Each blast is drawn as two fully-rounded capsules (horizontal
 * and vertical arms through the center) plus a burst circle, so the surge
 * reads as a single organic stream instead of a row of tiles.
 */
export function drawBlast(
  ctx: CanvasRenderingContext2D,
  board: BoardRect,
  blast: WaterBlastSnapshot,
): void {
  const alpha = Math.min(1, blast.ageMs / 70, blast.ttlMs / 230);
  if (alpha <= 0) {
    return;
  }

  const center = blast.segments.find((segment) => segment.kind === "center") ?? blast.segments[0];
  const pulse = 1 + 0.05 * Math.sin(blast.ageMs / 75);

  ctx.save();
  ctx.globalAlpha = alpha;
  drawBlastCross(ctx, board, blast, center, 0.66 * pulse, THEME.blast.edge);
  drawBlastCross(ctx, board, blast, center, 0.5 * pulse, THEME.blast.body);

  // Bright burst at the bomb tile.
  const origin = cellRect(board, center.x, center.y);
  ctx.fillStyle = THEME.blast.core;
  ctx.beginPath();
  ctx.arc(origin.centerX, origin.centerY, origin.size * 0.27 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Drifting droplets give the stream sparkle without breaking its silhouette.
  ctx.fillStyle = THEME.blast.drop;
  for (const segment of blast.segments) {
    const cell = cellRect(board, segment.x, segment.y);
    const s = cell.size;
    const wave = blast.ageMs / 130 + segment.x * 1.7 + segment.y * 2.3;
    ctx.beginPath();
    ctx.arc(cell.centerX + Math.cos(wave) * s * 0.16, cell.centerY + Math.sin(wave * 1.3) * s * 0.14, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cell.centerX - Math.sin(wave) * s * 0.18, cell.centerY - Math.cos(wave) * s * 0.12, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBlastCross(
  ctx: CanvasRenderingContext2D,
  board: BoardRect,
  blast: WaterBlastSnapshot,
  center: { x: number; y: number },
  thicknessRatio: number,
  color: string,
): void {
  const s = board.cell;
  const thickness = s * thicknessRatio;
  const endPad = s * (1 - thicknessRatio) * 0.5;

  let minX = center.x;
  let maxX = center.x;
  let minY = center.y;
  let maxY = center.y;
  for (const segment of blast.segments) {
    if (segment.y === center.y) {
      minX = Math.min(minX, segment.x);
      maxX = Math.max(maxX, segment.x);
    }
    if (segment.x === center.x) {
      minY = Math.min(minY, segment.y);
      maxY = Math.max(maxY, segment.y);
    }
  }

  const origin = cellRect(board, center.x, center.y);
  ctx.fillStyle = color;

  // Horizontal capsule.
  const hLeft = cellRect(board, minX, center.y).x + endPad;
  const hRight = cellRect(board, maxX, center.y).x + s - endPad;
  ctx.beginPath();
  ctx.roundRect(hLeft, origin.centerY - thickness / 2, hRight - hLeft, thickness, thickness / 2);
  ctx.fill();

  // Vertical capsule.
  const vTop = cellRect(board, center.x, minY).y + endPad;
  const vBottom = cellRect(board, center.x, maxY).y + s - endPad;
  ctx.beginPath();
  ctx.roundRect(origin.centerX - thickness / 2, vTop, thickness, vBottom - vTop, thickness / 2);
  ctx.fill();
}

/** Power-up: floating white ticket card with a bold colored icon. */
export function drawPowerUp(ctx: CanvasRenderingContext2D, board: BoardRect, powerup: PowerUpSnapshot): void {
  const cell = cellRect(board, powerup.x, powerup.y);
  const s = cell.size;
  const bob = Math.sin(powerup.ageMs / 280) * s * 0.045;
  const cardSize = s * 0.62;
  const left = cell.centerX - cardSize / 2;
  const top = cell.centerY - cardSize / 2 + bob;
  const radius = cardSize * 0.24;

  ctx.save();
  ctx.fillStyle = THEME.shadow;
  ctx.beginPath();
  ctx.ellipse(cell.centerX, cell.centerY + s * 0.34, cardSize * 0.42, cardSize * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = THEME.item.cardSide;
  ctx.beginPath();
  ctx.roundRect(left, top + s * 0.05, cardSize, cardSize, radius);
  ctx.fill();

  ctx.fillStyle = THEME.item.card;
  ctx.beginPath();
  ctx.roundRect(left, top, cardSize, cardSize, radius);
  ctx.fill();

  drawPowerUpIcon(ctx, powerup.type, cell.centerX, cell.centerY + bob - s * 0.015, cardSize);
  ctx.restore();
}

function drawPowerUpIcon(
  ctx: CanvasRenderingContext2D,
  type: PowerUpSnapshot["type"],
  cx: number,
  cy: number,
  cardSize: number,
): void {
  const r = cardSize * 0.26;

  if (type === "range") {
    // Red burst: solid core with four rays.
    ctx.fillStyle = THEME.item.range;
    ctx.strokeStyle = THEME.item.range;
    ctx.lineWidth = Math.max(1.5, cardSize * 0.09);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      ctx.moveTo(cx + dx * r * 0.85, cy + dy * r * 0.85);
      ctx.lineTo(cx + dx * r * 1.45, cy + dy * r * 1.45);
    }
    ctx.stroke();
    return;
  }

  if (type === "gum") {
    // Pink bubble pair.
    ctx.fillStyle = THEME.item.gum;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy + r * 0.15, r * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.75, cy - r * 0.6, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = THEME.item.card;
    ctx.beginPath();
    ctx.arc(cx - r * 0.55, cy - r * 0.2, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Green lightning bolt.
  ctx.fillStyle = THEME.item.speed;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.45, cy - r * 1.3);
  ctx.lineTo(cx - r * 0.75, cy + r * 0.25);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.25);
  ctx.lineTo(cx - r * 0.45, cy + r * 1.3);
  ctx.lineTo(cx + r * 0.75, cy - r * 0.25);
  ctx.lineTo(cx + r * 0.1, cy - r * 0.25);
  ctx.closePath();
  ctx.fill();
}
