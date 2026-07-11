import type { GameSnapshot } from "../game/Game.ts";
import type { PlayerSnapshot } from "../game/entities/Player.ts";

export interface HudViewElements {
  scoreboard: HTMLElement;
  status: HTMLElement;
  restartButton: HTMLButtonElement;
}

export class HudView {
  constructor(private readonly elements: HudViewElements) {
    this.elements.status.classList.add("hud-status");
    this.elements.restartButton.classList.add("hud-action");
  }

  render(snapshot: GameSnapshot): void {
    this.elements.scoreboard.replaceChildren(
      ...snapshot.players.map((player) => this.createPlayerChip(player)),
      this.createLevelChip(snapshot),
    );
    this.elements.status.textContent = `Round ${snapshot.round} - ${phaseLabel(snapshot)}`;
    this.elements.restartButton.textContent = snapshot.phase === "matchOver" ? "New Match" : "Restart Round";
    this.elements.restartButton.setAttribute("aria-label", this.elements.restartButton.textContent);
  }

  onRestart(handler: () => void): void {
    this.elements.restartButton.addEventListener("click", handler);
  }

  private createPlayerChip(player: PlayerSnapshot): HTMLElement {
    const chip = this.createChip(["hud-chip", "hud-chip--player", player.id]);
    const icon = this.element("span", "hud-chip__icon");
    icon.style.background = player.color;
    const label = this.element("span", "hud-chip__label", player.name);
    const score = this.element("strong", "hud-chip__score", String(player.score));

    chip.replaceChildren(icon, label, score);
    return chip;
  }

  private createLevelChip(snapshot: GameSnapshot): HTMLElement {
    const chip = this.createChip(["hud-chip", "hud-chip--level"]);
    const icon = this.element("span", "hud-chip__icon hud-chip__icon--level");
    const label = this.element("span", "hud-chip__label", `${snapshot.level.index + 1}/${snapshot.level.total}`);
    const name = this.element("strong", "hud-chip__score", snapshot.level.name);

    chip.replaceChildren(icon, label, name);
    return chip;
  }

  private createChip(classNames: string[]): HTMLElement {
    const chip = this.element("div", classNames.join(" "));
    chip.setAttribute("role", "group");
    return chip;
  }

  private element<TagName extends keyof HTMLElementTagNameMap>(
    tagName: TagName,
    className: string,
    textContent = "",
  ): HTMLElementTagNameMap[TagName] {
    const element = this.elements.scoreboard.ownerDocument.createElement(tagName);
    element.className = className;
    element.textContent = textContent;
    return element;
  }
}

function phaseLabel(snapshot: GameSnapshot): string {
  if (snapshot.phase === "matchOver") {
    return `${snapshot.roundMessage} Match ready.`;
  }
  if (snapshot.phase === "roundOver") {
    return `${snapshot.roundMessage} Arena shifting.`;
  }
  return snapshot.roundMessage;
}
