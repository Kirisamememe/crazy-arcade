/**
 * Design tokens for the "soft blueprint" art direction.
 *
 * Flat shapes with one step of depth (a darker "side" face below each block)
 * and soft shadows. Every gameplay element owns a distinct hue family so it
 * can be recognized at a glance:
 *
 *   floor        light checkerboard, tinted per level (lowest visual weight)
 *   wall         deep cold block, tinted per level (heavy, clearly solid)
 *   brick        warm crate, tinted per level (clearly breakable)
 *   bomb+blast   one shared teal water family; the trap bubble uses it too
 *   item         white ticket card with a colored icon
 *   player one   sky blue
 *   player two   mint green
 *
 * Level themes restyle the environment (floor, wall, brick colors plus a
 * decorative motif) so each map has its own place identity — city, forest,
 * village, night market, laboratory — while actors and effects keep fixed
 * colors for readability.
 */

/** Water family shared by gum bubbles, blasts, and the trap bubble. */
const WATER = {
  edge: "#18b2ac",
  body: "#3fd9cc",
  core: "#c9f7f2",
  drop: "#ffffff",
} as const;

export const THEME = {
  name: "soft blueprint",

  ink: "#222840",
  paper: "#ffffff",

  board: {
    frame: "#222840",
    cornerRadius: 0.22,
  },

  floor: {
    dot: "rgba(34, 40, 64, 0.05)",
  },

  wall: {
    highlight: "rgba(255, 255, 255, 0.14)",
  },

  brick: {
    highlight: "rgba(255, 255, 255, 0.42)",
  },

  bomb: {
    body: WATER.body,
    rim: WATER.edge,
    gloss: "#ffffff",
  },

  blast: WATER,

  item: {
    card: "#ffffff",
    cardSide: "#dbe1f0",
    range: "#ff5d5d",
    gum: WATER.body,
    speed: "#2ec27e",
  },

  hero: {
    ink: "#222840",
    visor: "#1c2238",
    face: "#ffffff",
    blush: "#ffb3c1",
    ghost: "#b9c0d2",
  },

  trap: {
    fill: "rgba(63, 217, 204, 0.28)",
    rim: WATER.edge,
    gloss: "rgba(255, 255, 255, 0.85)",
  },

  players: {
    p1: { body: "#4da3ff", shade: "#2b6fd4", light: "#a8d4ff" },
    p2: { body: "#52c977", shade: "#2f9e55", light: "#b0ecc4" },
  },

  overlay: {
    scrim: "rgba(34, 40, 64, 0.38)",
    card: "#ffffff",
    title: "#222840",
    subtitle: "#6b7390",
  },

  shadow: "rgba(34, 40, 64, 0.16)",
} as const;

/** Decorative identity applied to walls and bricks. */
export type LevelMotif = "city" | "forest" | "village" | "market" | "lab";

export interface LevelTheme {
  motif: LevelMotif;
  /** Motif detail color (lit windows, moss, straw, lanterns, portholes). */
  accent: string;
  floor: { light: string; dark: string };
  wall: { top: string; side: string };
  brick: { top: string; side: string; seam: string };
}

/** One environment identity per authored level. */
export const LEVEL_THEMES: Record<string, LevelTheme> = {
  "downtown-blocks": {
    motif: "city",
    accent: "#ffd966",
    floor: { light: "#f0f0ee", dark: "#e5e5e1" },
    wall: { top: "#5c6273", side: "#414659" },
    brick: { top: "#dfa963", side: "#b97f39", seam: "#cf974e" },
  },
  "mossy-forest": {
    motif: "forest",
    accent: "#a8d879",
    floor: { light: "#eaf2e2", dark: "#dde9cf" },
    wall: { top: "#707c6a", side: "#525d4c" },
    brick: { top: "#c98d5a", side: "#9c6635", seam: "#b57a46" },
  },
  "harvest-village": {
    motif: "village",
    accent: "#fff0b3",
    floor: { light: "#f7efdc", dark: "#efe4c6" },
    wall: { top: "#8a7f70", side: "#6b6154" },
    brick: { top: "#f2c94c", side: "#cf9f2a", seam: "#e0b53a" },
  },
  "moonlit-market": {
    motif: "market",
    accent: "#ffd166",
    floor: { light: "#ece4f2", dark: "#ded2e9" },
    wall: { top: "#453a6b", side: "#302852" },
    brick: { top: "#ef6f6f", side: "#c74848", seam: "#dd5c5c" },
  },
  "bubble-lab": {
    motif: "lab",
    accent: "#9fe8ff",
    floor: { light: "#e9f2f8", dark: "#dbe8f2" },
    wall: { top: "#4a6a8f", side: "#33506f" },
    brick: { top: "#ff9668", side: "#d96a3a", seam: "#eb8250" },
  },
};

export const DEFAULT_LEVEL_THEME: LevelTheme = LEVEL_THEMES["downtown-blocks"];

export function levelTheme(levelId: string): LevelTheme {
  return LEVEL_THEMES[levelId] ?? DEFAULT_LEVEL_THEME;
}

export type PlayerPalette = (typeof THEME.players)[keyof typeof THEME.players];

export function playerPalette(playerId: string): PlayerPalette {
  return playerId === "p2" ? THEME.players.p2 : THEME.players.p1;
}

/** Distinct hero identity colors, mirrored into the game player config. */
export const HERO_COLORS = {
  p1: THEME.players.p1.body,
  p2: THEME.players.p2.body,
} as const;
