import { THEME, type LevelTheme } from "./theme.ts";
import { cellRect, type BoardRect, type CellRect } from "./layout.ts";

/** Rounded frame + soft drop shadow behind the whole play field. */
export function drawBoardBase(ctx: CanvasRenderingContext2D, board: BoardRect): void {
  const pad = Math.max(4, board.cell * 0.18);
  const radius = board.cell * THEME.board.cornerRadius + pad * 0.6;

  ctx.save();
  ctx.fillStyle = THEME.shadow;
  ctx.beginPath();
  ctx.roundRect(board.x - pad, board.y - pad + pad * 0.9, board.width + pad * 2, board.height + pad * 2, radius);
  ctx.fill();

  ctx.fillStyle = THEME.board.frame;
  ctx.beginPath();
  ctx.roundRect(board.x - pad, board.y - pad, board.width + pad * 2, board.height + pad * 2, radius);
  ctx.fill();
  ctx.restore();
}

/** Level-tinted checkerboard with a faint dot at every intersection. */
export function drawFloor(
  ctx: CanvasRenderingContext2D,
  board: BoardRect,
  cols: number,
  rows: number,
  theme: LevelTheme,
): void {
  ctx.fillStyle = theme.floor.light;
  ctx.fillRect(board.x, board.y, board.width, board.height);

  ctx.fillStyle = theme.floor.dark;
  for (let y = 0; y < rows; y += 1) {
    for (let x = (y % 2 === 0 ? 1 : 0); x < cols; x += 2) {
      const cell = cellRect(board, x, y);
      ctx.fillRect(cell.x, cell.y, cell.size, cell.size);
    }
  }

  ctx.fillStyle = THEME.floor.dot;
  const dot = Math.max(1, board.cell * 0.045);
  for (let y = 1; y < rows; y += 1) {
    for (let x = 1; x < cols; x += 1) {
      ctx.beginPath();
      ctx.arc(board.x + x * board.cell, board.y + y * board.cell, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Indestructible wall: shared heavy block silhouette (extruded base) plus a
 * motif overlay that gives each map its own architecture — city buildings,
 * forest boulders, village stone fences, market stalls, lab machinery.
 */
export function drawWall(
  ctx: CanvasRenderingContext2D,
  board: BoardRect,
  x: number,
  y: number,
  theme: LevelTheme,
): void {
  const cell = cellRect(board, x, y);
  const s = cell.size;
  const lift = s * 0.16;
  const radius = theme.motif === "forest" ? s * 0.3 : s * 0.16;

  ctx.fillStyle = theme.wall.side;
  ctx.beginPath();
  ctx.roundRect(cell.x + s * 0.03, cell.y + s * 0.06, s * 0.94, s * 0.91, radius);
  ctx.fill();

  ctx.fillStyle = theme.wall.top;
  ctx.beginPath();
  ctx.roundRect(cell.x + s * 0.03, cell.y + s * 0.03, s * 0.94, s * 0.94 - lift, radius);
  ctx.fill();

  drawWallMotif(ctx, cell, theme, x, y);
}

function drawWallMotif(
  ctx: CanvasRenderingContext2D,
  cell: CellRect,
  theme: LevelTheme,
  tileX: number,
  tileY: number,
): void {
  const s = cell.size;

  if (theme.motif === "city") {
    // Building facade: 2x2 windows, some lit depending on tile position.
    const winW = s * 0.17;
    const winH = s * 0.2;
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const lit = (tileX * 5 + tileY * 3 + row * 2 + col) % 3 !== 0;
        ctx.fillStyle = lit ? theme.accent : "rgba(255, 255, 255, 0.18)";
        ctx.beginPath();
        ctx.roundRect(
          cell.x + s * (0.22 + col * 0.4),
          cell.y + s * (0.16 + row * 0.32),
          winW,
          winH,
          s * 0.03,
        );
        ctx.fill();
      }
    }
    return;
  }

  if (theme.motif === "forest") {
    // Mossy boulder: soft moss cap and lichen speckles.
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.ellipse(cell.centerX - s * 0.12, cell.y + s * 0.24, s * 0.3, s * 0.14, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cell.x + s * 0.72, cell.y + s * 0.52, s * 0.05, 0, Math.PI * 2);
    ctx.arc(cell.x + s * 0.3, cell.y + s * 0.62, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (theme.motif === "village") {
    // Stone masonry: mortar lines with offset joints.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(cell.x + s * 0.08, cell.y + s * 0.32);
    ctx.lineTo(cell.x + s * 0.92, cell.y + s * 0.32);
    ctx.moveTo(cell.x + s * 0.08, cell.y + s * 0.58);
    ctx.lineTo(cell.x + s * 0.92, cell.y + s * 0.58);
    ctx.moveTo(cell.centerX, cell.y + s * 0.08);
    ctx.lineTo(cell.centerX, cell.y + s * 0.32);
    ctx.moveTo(cell.x + s * 0.3, cell.y + s * 0.32);
    ctx.lineTo(cell.x + s * 0.3, cell.y + s * 0.58);
    ctx.moveTo(cell.x + s * 0.7, cell.y + s * 0.32);
    ctx.lineTo(cell.x + s * 0.7, cell.y + s * 0.58);
    ctx.stroke();
    return;
  }

  if (theme.motif === "market") {
    // Stall with a striped awning across the top.
    const awningTop = cell.y + s * 0.08;
    const awningH = s * 0.24;
    const stripes = 4;
    const stripeW = (s * 0.84) / stripes;
    for (let i = 0; i < stripes; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? theme.accent : "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      const left = cell.x + s * 0.08 + i * stripeW;
      ctx.roundRect(left, awningTop, stripeW, awningH, [i === 0 ? s * 0.08 : 0, i === stripes - 1 ? s * 0.08 : 0, s * 0.06, s * 0.06]);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.beginPath();
    ctx.roundRect(cell.x + s * 0.24, cell.y + s * 0.46, s * 0.52, s * 0.3, s * 0.06);
    ctx.fill();
    return;
  }

  // Lab: metal housing with corner rivets and a status light.
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  for (const [dx, dy] of [[0.16, 0.14], [0.84, 0.14], [0.16, 0.68], [0.84, 0.68]] as const) {
    ctx.beginPath();
    ctx.arc(cell.x + s * dx, cell.y + s * dy, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(cell.centerX, cell.y + s * 0.41, s * 0.09, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Destructible obstacle: shared warm crate silhouette plus a motif overlay —
 * taped parcels, leafy bushes, strapped hay bales, market goods, capsule pods.
 */
export function drawBrick(
  ctx: CanvasRenderingContext2D,
  board: BoardRect,
  x: number,
  y: number,
  theme: LevelTheme,
): void {
  const cell = cellRect(board, x, y);
  const s = cell.size;
  const inset = s * 0.07;
  const w = s - inset * 2;
  const lift = s * 0.14;
  const round = theme.motif === "forest" || theme.motif === "village";
  const radius = round ? w * 0.34 : s * 0.14;

  ctx.fillStyle = theme.brick.side;
  ctx.beginPath();
  ctx.roundRect(cell.x + inset, cell.y + inset + s * 0.04, w, w, radius);
  ctx.fill();

  ctx.fillStyle = theme.brick.top;
  ctx.beginPath();
  ctx.roundRect(cell.x + inset, cell.y + inset, w, w - lift, radius);
  ctx.fill();

  drawBrickMotif(ctx, cell, theme, inset, w, lift);
}

function drawBrickMotif(
  ctx: CanvasRenderingContext2D,
  cell: CellRect,
  theme: LevelTheme,
  inset: number,
  w: number,
  lift: number,
): void {
  const s = cell.size;
  const top = cell.y + inset;
  const faceH = w - lift;
  const seamWidth = Math.max(1, s * 0.035);

  if (theme.motif === "city") {
    // Cardboard parcel: tape cross and a small label.
    ctx.strokeStyle = theme.brick.seam;
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(cell.centerX, top + faceH * 0.06);
    ctx.lineTo(cell.centerX, top + faceH * 0.94);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(cell.x + inset + w * 0.1, top + faceH * 0.5);
    ctx.lineTo(cell.x + inset + w * 0.9, top + faceH * 0.5);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.beginPath();
    ctx.roundRect(cell.x + inset + w * 0.62, top + faceH * 0.12, w * 0.24, faceH * 0.18, s * 0.02);
    ctx.fill();
    return;
  }

  if (theme.motif === "forest") {
    // Bush: leafy lobes on top and a couple of berries.
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(cell.centerX - w * 0.22, top + faceH * 0.28, w * 0.2, 0, Math.PI * 2);
    ctx.arc(cell.centerX + w * 0.14, top + faceH * 0.2, w * 0.17, 0, Math.PI * 2);
    ctx.arc(cell.centerX + w * 0.3, top + faceH * 0.4, w * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e05d5d";
    ctx.beginPath();
    ctx.arc(cell.centerX - w * 0.1, top + faceH * 0.6, w * 0.07, 0, Math.PI * 2);
    ctx.arc(cell.centerX + w * 0.24, top + faceH * 0.68, w * 0.06, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (theme.motif === "village") {
    // Hay bale: two straps and straw stubble.
    ctx.strokeStyle = theme.brick.seam;
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(cell.x + inset + w * 0.32, top + faceH * 0.05);
    ctx.lineTo(cell.x + inset + w * 0.32, top + faceH * 0.95);
    ctx.moveTo(cell.x + inset + w * 0.68, top + faceH * 0.05);
    ctx.lineTo(cell.x + inset + w * 0.68, top + faceH * 0.95);
    ctx.stroke();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cell.x + inset + w * 0.12, top + faceH * 0.3);
    ctx.lineTo(cell.x + inset + w * 0.2, top + faceH * 0.24);
    ctx.moveTo(cell.x + inset + w * 0.46, top + faceH * 0.62);
    ctx.lineTo(cell.x + inset + w * 0.54, top + faceH * 0.56);
    ctx.moveTo(cell.x + inset + w * 0.78, top + faceH * 0.4);
    ctx.lineTo(cell.x + inset + w * 0.86, top + faceH * 0.34);
    ctx.stroke();
    return;
  }

  if (theme.motif === "market") {
    // Goods stall box: hanging lantern over a wrapped parcel.
    ctx.strokeStyle = theme.brick.seam;
    ctx.lineWidth = seamWidth;
    ctx.beginPath();
    ctx.moveTo(cell.x + inset + w * 0.12, top + faceH * 0.66);
    ctx.lineTo(cell.x + inset + w * 0.88, top + faceH * 0.66);
    ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.ellipse(cell.centerX, top + faceH * 0.36, w * 0.17, w * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = Math.max(1, s * 0.025);
    ctx.beginPath();
    ctx.moveTo(cell.centerX, top + faceH * 0.16);
    ctx.lineTo(cell.centerX, top + faceH * 0.56);
    ctx.stroke();
    return;
  }

  // Lab: capsule pod with a glass porthole.
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(cell.centerX, top + faceH * 0.44, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.brick.seam;
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.beginPath();
  ctx.arc(cell.centerX, top + faceH * 0.44, w * 0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(cell.centerX - w * 0.06, top + faceH * 0.38, w * 0.07, 0, Math.PI * 2);
  ctx.fill();
}
