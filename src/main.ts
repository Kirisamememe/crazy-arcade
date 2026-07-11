import { createGameApp } from "./render/GameApp.ts";
import { HudView } from "./ui/HudView.ts";

const gameHost = document.querySelector<HTMLElement>("#game");
const scoreboard = document.querySelector<HTMLElement>("#scoreboard");
const statusText = document.querySelector<HTMLElement>("#status");
const restartButton = document.querySelector<HTMLButtonElement>("#restart");

if (!gameHost || !scoreboard || !statusText || !restartButton) {
  throw new Error("Game DOM is incomplete");
}

const hud = new HudView({
  scoreboard,
  status: statusText,
  restartButton,
});

const app = createGameApp(gameHost, {
  onSnapshot: (snapshot) => hud.render(snapshot),
});

hud.onRestart(() => {
  app.requestRestart();
});

window.addEventListener("beforeunload", () => app.destroy(), { once: true });
