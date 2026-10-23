import { Phase, Point, Settings, Stroke } from "../types/game";
import { Player } from "../models/Player";
import { WordService } from "./WordService";

export interface IGameListener {
  onRoundStart(drawer: Player, round: number, drawTime: number, wordOptions: string[]): void;
  onRoundBegun(drawer: Player | undefined, wordLength: number, drawTime: number): void;
  onHint(revealed: number, pattern: string): void;
  onRoundEnd(word: string, players: Player[], nextDrawerId?: string): void;
  onGameOver(winner: Player | undefined, leaderboard: Player[]): void;
  onSystemMessage(message: string): void;
  onBroadcastState(): void;
}

export type GuessResult =
  | { type: "ignored" }
  | { type: "incorrect"; text: string }
  | { type: "correct"; points: number; allGuessed: boolean };

/**
 * Encapsulates game lifecycle, round progression, turn rotation,
 * timer management, hints, canvas strokes, and scoring rules.
 */
export class Game {
  private _phase: Phase = "lobby";
  private _round = 1;
  private _drawerIndex = 0;
  private _word?: string;
  private _wordOptions: string[] = [];
  private _strokes: Stroke[] = [];
  private _guessedPlayerIds: Set<string> = new Set();
  private _roundStartedAt?: number;
  private _revealed = 0;
  private _hintOrder: number[] = [];

  private timer?: NodeJS.Timeout;
  private hintTimer?: NodeJS.Timeout;

  constructor(
    private readonly getPlayers: () => Player[],
    private readonly getSettings: () => Settings,
    private readonly listener: IGameListener,
    private readonly wordService: WordService = new WordService()
  ) {}

  get phase(): Phase {
    return this._phase;
  }

  get round(): number {
    return this._round;
  }

  get drawerIndex(): number {
    return this._drawerIndex;
  }

  get word(): string | undefined {
    return this._word;
  }

  get wordOptions(): readonly string[] {
    return this._wordOptions;
  }

  get strokes(): readonly Stroke[] {
    return this._strokes;
  }

  get revealed(): number {
    return this._revealed;
  }

  get guessed(): string[] {
    return Array.from(this._guessedPlayerIds);
  }

  get roundStartedAt(): number | undefined {
    return this._roundStartedAt;
  }

  get currentDrawer(): Player | undefined {
    const players = this.getPlayers();
    return players[this._drawerIndex];
  }

  getRemainingMs(): number {
    if (this._phase === "drawing" && this._roundStartedAt) {
      const durationMs = this.getSettings().drawTime * 1000;
      return Math.max(0, durationMs - (Date.now() - this._roundStartedAt));
    }
    return 0;
  }

  /**
   * Resets scores and begins round 1.
   */
  start(): void {
    const players = this.getPlayers();
    players.forEach((p) => p.resetScore());
    this._round = 1;
    this.startRound();
  }

  /**
   * Begins a new round or ends the game if rounds are exhausted or not enough players.
   */
  startRound(): void {
    this.clearTimers();
    const players = this.getPlayers();
    const settings = this.getSettings();

    if (this._round > settings.rounds || players.length < 2) {
      this._phase = "gameOver";
      const leaderboard = [...players].sort((a, b) => b.score - a.score);
      const winner = leaderboard[0];
      this.listener.onSystemMessage(winner ? `${winner.name} wins the game!` : "Game over!");
      this.listener.onGameOver(winner, leaderboard);
      this.listener.onBroadcastState();
      return;
    }

    this._drawerIndex = (this._round - 1) % players.length;
    this._phase = "choosing";
    this._word = undefined;
    this._revealed = 0;
    this._hintOrder = [];
    this._guessedPlayerIds.clear();
    this._strokes = [];
    this._wordOptions = this.wordService.getRandomOptions(settings.wordCount);

    const drawer = this.currentDrawer;
    if (!drawer) return;

    this.listener.onSystemMessage(`Round ${this._round}: ${drawer.name} is drawing.`);
    this.listener.onRoundStart(drawer, this._round, settings.drawTime, this._wordOptions);
    this.listener.onBroadcastState();

    // Auto-pick first word if drawer fails to choose within 20s
    this.timer = setTimeout(() => {
      if (this._phase === "choosing" && this._wordOptions.length > 0) {
        this.chooseWord(this._wordOptions[0], drawer.id);
      }
    }, 20000);
  }

  /**
   * Called when the active drawer selects a word from the offered options.
   */
  chooseWord(word: string, playerId: string): boolean {
    if (this._phase !== "choosing") return false;
    if (this.currentDrawer?.id !== playerId) return false;
    if (!this._wordOptions.includes(word)) return false;

    this._word = word;
    this.beginDrawing();
    return true;
  }

  /**
   * Enters drawing phase, starts the round countdown, and initializes hints.
   */
  beginDrawing(): void {
    this.clearTimers();
    const settings = this.getSettings();

    this._phase = "drawing";
    this._roundStartedAt = Date.now();
    this._strokes = [];
    this._revealed = 0;

    // Precalculate random hint order for consistent letter reveals
    if (this._word) {
      const validIndices = [...this._word]
        .map((char, index) => (char !== " " ? index : -1))
        .filter((i) => i >= 0);
      this._hintOrder = [...validIndices].sort(() => Math.random() - 0.5);
    }

    const drawer = this.currentDrawer;
    const wordLength = this._word?.length || 0;

    this.listener.onRoundBegun(drawer, wordLength, settings.drawTime);
    this.listener.onBroadcastState();

    // Setup periodic hints if configured
    if (settings.hints > 0 && this._word) {
      const interval = Math.max(
        2000,
        Math.floor((settings.drawTime * 1000) / (settings.hints + 1))
      );
      const maxPossibleHints = Math.min(
        settings.hints,
        Math.max(0, this._word.replace(/ /g, "").length - 1)
      );

      this.hintTimer = setInterval(() => {
        if (this._phase !== "drawing" || !this._word) {
          if (this.hintTimer) clearInterval(this.hintTimer);
          return;
        }
        if (this._revealed < maxPossibleHints) {
          this._revealed++;
          const currentPattern = this.makePattern(false);
          this.listener.onHint(this._revealed, currentPattern);
          this.listener.onBroadcastState();
          if (this._revealed >= maxPossibleHints && this.hintTimer) {
            clearInterval(this.hintTimer);
            this.hintTimer = undefined;
          }
        }
      }, interval);
    }

    // Round duration countdown
    this.timer = setTimeout(() => {
      this.endRound();
    }, settings.drawTime * 1000);
  }

  /**
   * Generates a masked word pattern with underscores for unrevealed letters.
   */
  makePattern(showAll = false): string {
    if (!this._word) return "";
    if (showAll) return this._word;

    const revealedPositions = new Set(this._hintOrder.slice(0, this._revealed));
    return [...this._word]
      .map((char, index) => {
        if (char === " ") return "  ";
        return revealedPositions.has(index) ? char : "_";
      })
      .join(" ");
  }

  /**
   * Processes a player's guess according to Skribbl scoring rules.
   */
  handleGuess(player: Player, rawGuess: string): GuessResult {
    if (this._phase !== "drawing") return { type: "ignored" };
    if (this.currentDrawer?.id === player.id) return { type: "ignored" };
    if (this._guessedPlayerIds.has(player.id)) return { type: "ignored" };

    const text = String(rawGuess || "").trim().slice(0, 100);
    if (!text) return { type: "ignored" };

    const isMatch = Boolean(
      this._word && text.toLocaleLowerCase() === this._word.toLocaleLowerCase()
    );

    if (isMatch) {
      const rank = this._guessedPlayerIds.size;
      const points = Math.max(100, 500 - rank * 100);
      player.addScore(points);
      this.currentDrawer?.addScore(50);
      this._guessedPlayerIds.add(player.id);

      const eligibleGuessers = Math.max(1, this.getPlayers().length - 1);
      const allGuessed = this._guessedPlayerIds.size >= eligibleGuessers;

      return { type: "correct", points, allGuessed };
    }

    return { type: "incorrect", text };
  }

  /**
   * Concludes the drawing phase, reveals the word, and queues the next round.
   */
  endRound(): void {
    if (this._phase !== "drawing") return;
    this.clearTimers();
    this._phase = "roundEnd";

    const players = this.getPlayers();
    const nextDrawer = players[(this._drawerIndex + 1) % players.length]?.id;
    const finalWord = this._word || "";

    this.listener.onRoundEnd(finalWord, players, nextDrawer);
    this.listener.onSystemMessage(`The word was "${finalWord}".`);
    this.listener.onBroadcastState();

    this.timer = setTimeout(() => {
      this._round++;
      this.startRound();
    }, 4500);
  }

  /**
   * Canvas drawing stroke mutations.
   */
  addStroke(stroke: Stroke): void {
    this._strokes.push(stroke);
  }

  appendStrokePoint(strokeId: string, point: Point): boolean {
    const stroke = this._strokes.find((s) => s.id === strokeId);
    if (!stroke) return false;
    stroke.points.push(point);
    return true;
  }

  undoStroke(): Stroke[] {
    this._strokes.pop();
    return [...this._strokes];
  }

  clearCanvas(): void {
    this._strokes = [];
  }

  /**
   * Resets the game to the lobby phase (e.g. when player count drops below 2).
   */
  resetToLobby(): void {
    this.clearTimers();
    this._phase = "lobby";
    this._round = 1;
    this._word = undefined;
    this._wordOptions = [];
    this._strokes = [];
    this._guessedPlayerIds.clear();
  }

  /**
   * Cancels any active round or hint timers.
   */
  clearTimers(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.hintTimer) {
      clearInterval(this.hintTimer);
      this.hintTimer = undefined;
    }
  }
}
