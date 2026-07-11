import { Game, type GameSnapshot } from "../game/Game.ts";
import { KeyboardInput } from "../input/KeyboardInput.ts";
import { CanvasRenderer, type RenderFrame } from "./CanvasRenderer.ts";

const MAX_FRAME_DELTA_MS = 64;
const SIMULATION_STEP_MS = 8;
const MAX_PIXEL_RATIO = 3;

export interface GameAppOptions {
  onSnapshot: (snapshot: GameSnapshot) => void;
}

export interface GameApp {
  requestRestart: () => void;
  destroy: () => void;
}

/**
 * Owns the whole browser runtime: canvas element, requestAnimationFrame
 * loop, keyboard input, fixed-step simulation, and the renderer. The game
 * model stays pure; this is the only place wiring it to the DOM.
 */
export function createGameApp(host: HTMLElement, options: GameAppOptions): GameApp {
  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  host.appendChild(canvas);

  const model = new Game({ winningScore: 3 });
  const keyboard = new KeyboardInput(window);
  const renderer = new CanvasRenderer(canvas);

  let frame: RenderFrame = { width: 0, height: 0, pixelRatio: 1 };
  let restartQueued = false;
  let rafId = 0;
  let lastTime = 0;

  const resize = (): void => {
    const width = Math.max(1, Math.round(host.clientWidth));
    const height = Math.max(1, Math.round(host.clientHeight));
    const pixelRatio = Math.min(MAX_PIXEL_RATIO, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    frame = { width, height, pixelRatio };
  };

  const handleControls = (): void => {
    if (keyboard.consumeRestart()) {
      restartQueued = true;
    }
    if (keyboard.consumeNextLevel()) {
      model.goToLevel(model.currentLevelIndex + 1);
    }
    if (keyboard.consumePreviousLevel()) {
      model.goToLevel(model.currentLevelIndex - 1);
    }

    if (!restartQueued) {
      return;
    }
    restartQueued = false;
    if (model.phase === "matchOver") {
      model.resetMatch(model.currentLevelIndex);
    } else {
      model.restartRound({ advanceLevel: false });
    }
  };

  const tick = (time: number): void => {
    rafId = requestAnimationFrame(tick);
    const deltaMs = Math.min(MAX_FRAME_DELTA_MS, lastTime === 0 ? 16 : time - lastTime);
    lastTime = time;

    handleControls();
    const input = keyboard.frameInput();

    let remainingMs = deltaMs;
    while (remainingMs > 0) {
      const stepMs = Math.min(SIMULATION_STEP_MS, remainingMs);
      model.step(model.phase === "playing" ? input : undefined, stepMs);
      if (model.canAutoRestartRound) {
        model.restartRound();
      }
      remainingMs -= stepMs;
    }

    const snapshot = model.getSnapshot();
    renderer.render(snapshot, frame);
    options.onSnapshot(snapshot);
  };

  resize();
  const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(host);
  rafId = requestAnimationFrame(tick);
  options.onSnapshot(model.getSnapshot());

  return {
    requestRestart: () => {
      restartQueued = true;
    },
    destroy: () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      keyboard.destroy();
      canvas.remove();
    },
  };
}
