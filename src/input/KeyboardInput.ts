import type { DirectionKey, InputState, PlayerId, PlayerInput } from "../game/constants.ts";

interface KeyboardTarget {
  addEventListener: (type: string, listener: (event: KeyboardEventLike) => void) => void;
  removeEventListener: (type: string, listener: (event: KeyboardEventLike) => void) => void;
}

export interface KeyboardEventLike {
  code?: string;
  key?: string;
  repeat?: boolean;
  preventDefault?: () => void;
}

type PlayerAction = DirectionKey | "action";

interface KeyBinding {
  playerId: PlayerId;
  action: PlayerAction;
}

const PLAYER_KEYS = new Map<string, KeyBinding>([
  ["KeyW", { playerId: "p1", action: "up" }],
  ["KeyA", { playerId: "p1", action: "left" }],
  ["KeyS", { playerId: "p1", action: "down" }],
  ["KeyD", { playerId: "p1", action: "right" }],
  ["Space", { playerId: "p1", action: "action" }],
  ["ArrowUp", { playerId: "p2", action: "up" }],
  ["ArrowLeft", { playerId: "p2", action: "left" }],
  ["ArrowDown", { playerId: "p2", action: "down" }],
  ["ArrowRight", { playerId: "p2", action: "right" }],
  ["Enter", { playerId: "p2", action: "action" }],
]);

const KEY_FALLBACKS = new Map<string, string>([
  ["w", "KeyW"],
  ["a", "KeyA"],
  ["s", "KeyS"],
  ["d", "KeyD"],
  [" ", "Space"],
  ["spacebar", "Space"],
  ["arrowup", "ArrowUp"],
  ["arrowleft", "ArrowLeft"],
  ["arrowdown", "ArrowDown"],
  ["arrowright", "ArrowRight"],
  ["enter", "Enter"],
  ["r", "KeyR"],
  ["]", "BracketRight"],
  ["[", "BracketLeft"],
]);

/**
 * Tracks keyboard state for both players and turns it into the per-frame
 * `InputState` the game model consumes. Movement keys are kept as an ordered
 * "most recently pressed direction first" stack per player rather than four
 * independent booleans — see `PlayerInput.directions` — so the model itself
 * decides how to resolve held/opposite/turning keys instead of this class
 * pre-judging it.
 */
export class KeyboardInput {
  private readonly heldDirections: Record<PlayerId, DirectionKey[]> = { p1: [], p2: [] };
  private readonly actionHeld: Record<PlayerId, boolean> = { p1: false, p2: false };
  private readonly bufferedTaps: Record<PlayerId, boolean> = { p1: false, p2: false };
  private restartQueued = false;
  private nextLevelQueued = false;
  private previousLevelQueued = false;
  private readonly onKeyDown = (event: KeyboardEventLike) => this.handleKeyDown(event);
  private readonly onKeyUp = (event: KeyboardEventLike) => this.handleKeyUp(event);
  private readonly onFocusLost = () => this.resetControls();

  constructor(
    private readonly target: KeyboardTarget = globalThis.window as unknown as KeyboardTarget,
    private readonly visibilityTarget: KeyboardTarget | null = defaultVisibilityTarget(),
  ) {
    this.target?.addEventListener?.("keydown", this.onKeyDown);
    this.target?.addEventListener?.("keyup", this.onKeyUp);
    this.target?.addEventListener?.("blur", this.onFocusLost);
    this.visibilityTarget?.addEventListener?.("visibilitychange", this.onFocusLost);
  }

  consumeRestart(): boolean {
    const consumed = this.restartQueued;
    this.restartQueued = false;
    return consumed;
  }

  consumeNextLevel(): boolean {
    const consumed = this.nextLevelQueued;
    this.nextLevelQueued = false;
    return consumed;
  }

  consumePreviousLevel(): boolean {
    const consumed = this.previousLevelQueued;
    this.previousLevelQueued = false;
    return consumed;
  }

  /** Snapshots current input for one simulation frame and clears one-shot taps. */
  frameInput(): InputState {
    const snapshot: InputState = {
      p1: this.snapshotPlayerInput("p1"),
      p2: this.snapshotPlayerInput("p2"),
    };
    this.bufferedTaps.p1 = false;
    this.bufferedTaps.p2 = false;
    return snapshot;
  }

  destroy(): void {
    this.target?.removeEventListener?.("keydown", this.onKeyDown);
    this.target?.removeEventListener?.("keyup", this.onKeyUp);
    this.target?.removeEventListener?.("blur", this.onFocusLost);
    this.visibilityTarget?.removeEventListener?.("visibilitychange", this.onFocusLost);
    this.resetControls();
  }

  private snapshotPlayerInput(playerId: PlayerId): PlayerInput {
    return {
      action: this.actionHeld[playerId] || this.bufferedTaps[playerId],
      directions: [...this.heldDirections[playerId]],
    };
  }

  private resetControls(): void {
    this.heldDirections.p1.length = 0;
    this.heldDirections.p2.length = 0;
    this.actionHeld.p1 = false;
    this.actionHeld.p2 = false;
    this.bufferedTaps.p1 = false;
    this.bufferedTaps.p2 = false;
    this.restartQueued = false;
    this.nextLevelQueued = false;
    this.previousLevelQueued = false;
  }

  private handleKeyDown(event: KeyboardEventLike): void {
    const code = normalizeCode(event);
    const binding = PLAYER_KEYS.get(code);

    if (binding) {
      event.preventDefault?.();
      if (binding.action === "action") {
        this.actionHeld[binding.playerId] = true;
        if (!event.repeat) {
          this.bufferedTaps[binding.playerId] = true;
        }
        return;
      }

      if (!event.repeat) {
        pushDirection(this.heldDirections[binding.playerId], binding.action);
      }
      return;
    }

    if (code === "KeyR") {
      event.preventDefault?.();
      if (!event.repeat) {
        this.restartQueued = true;
      }
    }

    if (code === "BracketRight") {
      event.preventDefault?.();
      if (!event.repeat) {
        this.nextLevelQueued = true;
      }
    }

    if (code === "BracketLeft") {
      event.preventDefault?.();
      if (!event.repeat) {
        this.previousLevelQueued = true;
      }
    }
  }

  private handleKeyUp(event: KeyboardEventLike): void {
    const code = normalizeCode(event);
    const binding = PLAYER_KEYS.get(code);

    if (binding) {
      event.preventDefault?.();
      if (binding.action === "action") {
        this.actionHeld[binding.playerId] = false;
        return;
      }

      removeDirection(this.heldDirections[binding.playerId], binding.action);
      return;
    }

    if (code === "KeyR" || code === "BracketRight" || code === "BracketLeft") {
      event.preventDefault?.();
    }
  }
}

export function createKeyboardInput(target?: KeyboardTarget): KeyboardInput {
  return new KeyboardInput(target);
}

function defaultVisibilityTarget(): KeyboardTarget | null {
  return "document" in globalThis ? (globalThis.document as unknown as KeyboardTarget) : null;
}

/** Moves `direction` to the front of the stack (most recently pressed). */
function pushDirection(stack: DirectionKey[], direction: DirectionKey): void {
  const index = stack.indexOf(direction);
  if (index !== -1) {
    stack.splice(index, 1);
  }
  stack.unshift(direction);
}

function removeDirection(stack: DirectionKey[], direction: DirectionKey): void {
  const index = stack.indexOf(direction);
  if (index !== -1) {
    stack.splice(index, 1);
  }
}

function normalizeCode(event: KeyboardEventLike): string {
  if (event?.code) {
    return event.code;
  }

  const key = String(event?.key || "").toLowerCase();
  return KEY_FALLBACKS.get(key) || "";
}
