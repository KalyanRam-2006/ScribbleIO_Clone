import { Phase, Point, PreviousDrawing, Settings, Stroke } from "../types/game";
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
  private _choosingStartedAt?: number;
  private _revealed = 0;
  private _hintOrder: number[] = [];
  private _previousDrawing: PreviousDrawing | null = null;
  private _likes: Set<string> = new Set();
  private _dislikes: Set<string> = new Set();

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

  get likes(): string[] {
    return Array.from(this._likes);
  }

  get dislikes(): string[] {
    return Array.from(this._dislikes);
  }

  get roundStartedAt(): number | undefined {
    return this._roundStartedAt;
  }

  get currentDrawer(): Player | undefined {
    const players = this.getPlayers();
    return players[this._drawerIndex];
  }

  get previousDrawing(): PreviousDrawing | null {
    return this._previousDrawing;
  }

  getRemainingMs(): number {
    if (this._phase === "drawing" && this._roundStartedAt) {
      const durationMs = this.getSettings().drawTime * 1000;
      return Math.max(0, durationMs - (Date.now() - this._roundStartedAt));
    }
    if (this._phase === "choosing" && this._choosingStartedAt) {
      const durationMs = 15 * 1000;
      return Math.max(0, durationMs - (Date.now() - this._choosingStartedAt));
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
    this._drawerIndex = 0;
    this.startTurn();
  }

  /**
   * Begins a new turn for the current drawer, or ends the game if rounds are exhausted.
   */
  startTurn(): void {
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

    this.wordService.setCategory(settings.wordCategory);
    if (settings.customWords && settings.customWords.length > 0) {
      this.wordService.setCustomWords(settings.customWords, settings.customWordsOnly);
    }

    if (this._drawerIndex >= players.length) {
      this._drawerIndex = 0;
    }

    this._phase = "choosing";
    this._choosingStartedAt = Date.now();
    this._word = undefined;
    this._revealed = 0;
    this._hintOrder = [];
    this._guessedPlayerIds.clear();
    this._likes.clear();
    this._dislikes.clear();
    this._strokes = [];
    this._wordOptions = this.wordService.getRandomOptions(settings.wordCount);

    const drawer = this.currentDrawer;
    if (!drawer) return;

    this.listener.onSystemMessage(`Round ${this._round}: ${drawer.name} is drawing.`);
    this.listener.onRoundStart(drawer, this._round, settings.drawTime, this._wordOptions);
    this.listener.onBroadcastState();

    // Auto-pick first word if drawer fails to choose within 15s
    this.timer = setTimeout(() => {
      if (this._phase === "choosing" && this._wordOptions.length > 0) {
        this.chooseWord(this._wordOptions[0], drawer.id);
      }
    }, 15000);
  }

  startRound(): void {
    this.startTurn();
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
   * Called when the active drawer enters their own custom word to draw.
   */
  chooseCustomWord(rawWord: string, playerId: string): boolean {
    if (this._phase !== "choosing") return false;
    if (this.currentDrawer?.id !== playerId) return false;
    if (this.getSettings().enableCustomWords === false) return false;
    const cleaned = String(rawWord || "").trim().slice(0, 30);
    if (cleaned.length < 2 || !/^[a-zA-Z0-9\s-]+$/.test(cleaned)) return false;

    this._word = cleaned;
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
    this._choosingStartedAt = undefined;
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

    const drawer = this.currentDrawer;
    const finalWord = this._word || "";

    // Record previous drawing for replay
    if (drawer && finalWord && this._strokes.length > 0) {
      this._previousDrawing = {
        drawerName: drawer.name,
        word: finalWord,
        strokes: JSON.parse(JSON.stringify(this._strokes)),
        round: this._round,
      };
    }

    const players = this.getPlayers();
    const nextIndex = this._drawerIndex + 1;
    const isRoundComplete = nextIndex >= players.length;
    const nextDrawerId = isRoundComplete ? players[0]?.id : players[nextIndex]?.id;

    this.listener.onRoundEnd(finalWord, players, nextDrawerId);
    this.listener.onSystemMessage(`The word was "${finalWord}".`);

    if (isRoundComplete) {
      this.listener.onSystemMessage(`✦ Round ${this._round} completed!`);
    }

    this.listener.onBroadcastState();

    this.timer = setTimeout(() => {
      if (isRoundComplete) {
        this._round++;
        this._drawerIndex = 0;
      } else {
        this._drawerIndex = nextIndex;
      }
      this.startTurn();
    }, 4500);
  }

  /**
   * Adjusts drawer index if players list changed.
   */
  adjustDrawerIndex(): void {
    const players = this.getPlayers();
    if (players.length > 0 && this._drawerIndex >= players.length) {
      this._drawerIndex = 0;
    }
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
    this._drawerIndex = 0;
    this._word = undefined;
    this._choosingStartedAt = undefined;
    this._wordOptions = [];
    this._strokes = [];
    this._guessedPlayerIds.clear();
    this._likes.clear();
    this._dislikes.clear();
  }

  /**
   * Records a player's like or dislike rating for the current drawing.
   */
  rateDrawing(
    playerId: string,
    type: "like" | "dislike"
  ): { success: boolean; changed: boolean; type?: "like" | "dislike" | "removed" } {
    if (this._phase !== "drawing" && this._phase !== "roundEnd") {
      return { success: false, changed: false };
    }
    if (this.currentDrawer?.id === playerId) {
      return { success: false, changed: false };
    }

    if (type === "like") {
      if (this._likes.has(playerId)) {
        this._likes.delete(playerId);
        return { success: true, changed: true, type: "removed" };
      }
      this._dislikes.delete(playerId);
      this._likes.add(playerId);
      return { success: true, changed: true, type: "like" };
    }

    if (type === "dislike") {
      if (this._dislikes.has(playerId)) {
        this._dislikes.delete(playerId);
        return { success: true, changed: true, type: "removed" };
      }
      this._likes.delete(playerId);
      this._dislikes.add(playerId);
      return { success: true, changed: true, type: "dislike" };
    }

    return { success: false, changed: false };
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
