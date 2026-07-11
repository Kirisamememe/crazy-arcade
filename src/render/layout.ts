/** Pure board layout math shared by every draw pass. */

export interface BoardRect {
  x: number;
  y: number;
  width: number;
  height: number;
  cell: number;
}

export interface CellRect {
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  size: number;
}

/**
 * Fits a `cols x rows` tile board into the given pixel area, centered,
 * with whole-pixel cells so tile seams stay crisp.
 */
export function boardRect(cols: number, rows: number, width: number, height: number): BoardRect {
  const cell = Math.max(1, Math.floor(Math.min(width / cols, height / rows)));
  const boardWidth = cell * cols;
  const boardHeight = cell * rows;

  return {
    x: Math.round((width - boardWidth) / 2),
    y: Math.round((height - boardHeight) / 2),
    width: boardWidth,
    height: boardHeight,
    cell,
  };
}

/** Converts a (possibly fractional) tile coordinate into pixel space. */
export function cellRect(board: BoardRect, tileX: number, tileY: number): CellRect {
  const x = board.x + tileX * board.cell;
  const y = board.y + tileY * board.cell;

  return {
    x,
    y,
    centerX: x + board.cell / 2,
    centerY: y + board.cell / 2,
    size: board.cell,
  };
}
