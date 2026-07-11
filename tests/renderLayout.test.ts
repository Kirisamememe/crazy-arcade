import { describe, expect, test } from "bun:test";
import { boardRect, cellRect } from "../src/render/layout.ts";

describe("board layout", () => {
  test("fits and centers a 15x11 board inside the canvas with whole-pixel cells", () => {
    const board = boardRect(15, 11, 960, 704);

    expect(board.cell).toBe(64);
    expect(board.width).toBe(960);
    expect(board.height).toBe(704);
    expect(board.x).toBe(0);
    expect(board.y).toBe(0);
  });

  test("letterboxes when the canvas aspect does not match the board", () => {
    const board = boardRect(15, 11, 1000, 704);

    expect(board.cell).toBe(64);
    expect(board.x).toBe(20);
    expect(board.y).toBe(0);
  });

  test("never returns a zero-sized cell for tiny canvases", () => {
    const board = boardRect(15, 11, 4, 4);
    expect(board.cell).toBeGreaterThanOrEqual(1);
  });

  test("converts fractional tile coordinates for smooth player motion", () => {
    const board = boardRect(15, 11, 960, 704);
    const cell = cellRect(board, 3.5, 2.25);

    expect(cell.x).toBe(224);
    expect(cell.y).toBe(144);
    expect(cell.centerX).toBe(256);
    expect(cell.centerY).toBe(176);
    expect(cell.size).toBe(64);
  });
});
