import { randomUUID } from "crypto";
import { ChatItem, RoomStateDTO, Settings } from "../types/game";
import { Player } from "./Player";
import { Game, IGameListener } from "../game/Game";

export interface IRoomBroadcaster {
  toRoom(roomId: string, event: string, data: any): void;
  toSocket(socketId: string, event: string, data: any): void;
}

/**
 * Encapsulates room participants, host assignment, chat history,
 * state broadcasting, and the composed Game instance.
 */
export class Room implements IGameListener {
  public readonly id: string;
  private _hostId: string;
  private _settings: Settings;
  private _players: Map<string, Player> = new Map();
  private _chat: ChatItem[] = [];
  private _isPublic: boolean;
  private _bannedPlayerIds: Set<string> = new Set();
  private _bannedNames: Set<string> = new Set();
  private _votekicks: Map<string, Set<string>> = new Map(); // targetId -> voterIds
  public readonly game: Game;

  constructor(
    id: string,
    hostId: string,
    settings: Settings,
    private readonly broadcaster: IRoomBroadcaster,
    isPublic = true
  ) {
    this.id = id;
    this._hostId = hostId;
    this._settings = settings;
    this._isPublic = isPublic;
    this.game = new Game(
      () => this.getPlayers(),
      () => this._settings,
      this
    );
  }

  get hostId(): string {
    return this._hostId;
  }

  get settings(): Settings {
    return this._settings;
  }

  get isPublic(): boolean {
    return this._isPublic;
  }

  setPublic(isPublic: boolean): void {
    this._isPublic = isPublic;
  }

  get playerCount(): number {
    return this._players.size;
  }

  // --- Participant Management ---

  addPlayer(player: Player): void {
    this._players.set(player.id, player);
  }

  removePlayer(playerId: string): { remainingCount: number; newHostId?: string } {
    this._players.delete(playerId);
    let newHostId: string | undefined;

    if (this._players.size > 0 && this._hostId === playerId) {
      const firstPlayer = this.getPlayers()[0];
      this._hostId = firstPlayer.id;
      newHostId = firstPlayer.id;
    }

    if (this.game.phase !== "lobby") {
      if (this._players.size < 2) {
        this.game.resetToLobby();
      } else {
        this.game.adjustDrawerIndex();
      }
    }

    return { remainingCount: this._players.size, newHostId };
  }

  getPlayer(playerId: string): Player | undefined {
    return this._players.get(playerId);
  }

  getPlayers(): Player[] {
    return Array.from(this._players.values());
  }

  hasPlayer(playerId: string): boolean {
    return this._players.has(playerId);
  }

  setPlayerReady(playerId: string, ready: boolean): boolean {
    const player = this._players.get(playerId);
    if (!player || this.game.phase !== "lobby") return false;
    player.setReady(ready);
    return true;
  }

  canStartGame(requesterId: string): { allowed: boolean; error?: string } {
    if (this._hostId !== requesterId) {
      return { allowed: false, error: "Only the host can start the game." };
    }
    if (this.game.phase !== "lobby") {
      return { allowed: false, error: "Game already started." };
    }
    if (this._players.size < 2) {
      return { allowed: false, error: "At least two players are required." };
    }
    const hasUnready = this.getPlayers().some((p) => !p.ready && p.id !== this._hostId);
    if (hasUnready) {
      return { allowed: false, error: "Wait for all players to ready up." };
    }
    return { allowed: true };
  }

  // --- Host Controls & Moderation ---

  isBanned(playerId: string, name: string): boolean {
    return this._bannedPlayerIds.has(playerId) || this._bannedNames.has(name.trim().toLowerCase());
  }

  kickPlayer(targetId: string, requesterId: string): { success: boolean; player?: Player; error?: string } {
    if (this._hostId !== requesterId) {
      return { success: false, error: "Only the host can kick players." };
    }
    if (targetId === requesterId) {
      return { success: false, error: "Host cannot kick themselves." };
    }
    const target = this.getPlayer(targetId);
    if (!target) {
      return { success: false, error: "Player not found." };
    }

    this.removePlayer(targetId);
    this._votekicks.delete(targetId);
    this.addChat(`${target.name} was kicked by the host.`, "system");
    this.broadcaster.toSocket(targetId, "kicked", { reason: "You were kicked by the host." });
    this.broadcast();
    return { success: true, player: target };
  }

  banPlayer(targetId: string, requesterId: string): { success: boolean; player?: Player; error?: string } {
    if (this._hostId !== requesterId) {
      return { success: false, error: "Only the host can ban players." };
    }
    if (targetId === requesterId) {
      return { success: false, error: "Host cannot ban themselves." };
    }
    const target = this.getPlayer(targetId);
    if (!target) {
      return { success: false, error: "Player not found." };
    }

    this._bannedPlayerIds.add(targetId);
    this._bannedNames.add(target.name.trim().toLowerCase());
    this.removePlayer(targetId);
    this._votekicks.delete(targetId);
    this.addChat(`${target.name} was banned by the host.`, "system");
    this.broadcaster.toSocket(targetId, "banned", { reason: "You have been banned from this room." });
    this.broadcast();
    return { success: true, player: target };
  }

  voteKickPlayer(targetId: string, voterId: string): { success: boolean; votes: number; threshold: number; kicked: boolean; player?: Player; error?: string } {
    if (!this.hasPlayer(voterId)) {
      return { success: false, votes: 0, threshold: 0, kicked: false, error: "You are not in this room." };
    }
    const target = this.getPlayer(targetId);
    if (!target) {
      return { success: false, votes: 0, threshold: 0, kicked: false, error: "Target player not found." };
    }
    if (targetId === voterId) {
      return { success: false, votes: 0, threshold: 0, kicked: false, error: "You cannot vote to kick yourself." };
    }
    if (targetId === this._hostId) {
      return { success: false, votes: 0, threshold: 0, kicked: false, error: "The room host cannot be votekicked." };
    }

    const voter = this.getPlayer(voterId);
    const votesSet = this._votekicks.get(targetId) || new Set<string>();
    votesSet.add(voterId);
    this._votekicks.set(targetId, votesSet);

    // Majority threshold (at least 2 votes)
    const threshold = Math.max(2, Math.floor(this.playerCount / 2) + 1);

    if (votesSet.size >= threshold) {
      this.removePlayer(targetId);
      this._votekicks.delete(targetId);
      this.addChat(`${target.name} was votekicked from the room (${votesSet.size}/${threshold} votes).`, "system");
      this.broadcaster.toSocket(targetId, "kicked", { reason: "You were votekicked by other players." });
      this.broadcast();
      return { success: true, votes: votesSet.size, threshold, kicked: true, player: target };
    }

    this.addChat(`${voter?.name || "A player"} voted to kick ${target.name} (${votesSet.size}/${threshold} votes).`, "system");
    return { success: true, votes: votesSet.size, threshold, kicked: false, player: target };
  }

  // --- Chat Management ---

  addChat(text: string, kind: ChatItem["kind"] = "system", player?: Player): ChatItem {
    const item: ChatItem = {
      id: randomUUID(),
      playerId: player?.id,
      playerName: player?.name || "Game",
      text,
      kind,
    };
    this._chat.push(item);
    if (this._chat.length > 100) {
      this._chat = this._chat.slice(-100);
    }
    this.broadcaster.toRoom(this.id, "chat_message", item);
    return item;
  }

  addDrawerChat(text: string, player: Player): ChatItem {
    const item: ChatItem = {
      id: randomUUID(),
      playerId: player.id,
      playerName: player.name,
      text,
      kind: "chat",
      drawerOnly: true,
    };
    this._chat.push(item);
    if (this._chat.length > 100) {
      this._chat = this._chat.slice(-100);
    }
    // Broadcast ONLY to the drawer socket! Other teammates do not receive this.
    this.broadcaster.toSocket(player.id, "chat_message", item);
    return item;
  }

  // --- Projection and Broadcasting ---

  getPublicState(viewerId?: string): RoomStateDTO {
    const currentDrawer = this.game.currentDrawer;
    const isViewerDrawer = Boolean(viewerId && currentDrawer?.id === viewerId);

    // Teammates should not be able to see drawerOnly messages
    const filteredChat = this._chat.filter(
      (m) => !m.drawerOnly || m.playerId === viewerId
    );

    return {
      id: this.id,
      hostId: this._hostId,
      settings: this._settings,
      players: this.getPlayers().map((p) => p.toJSON()),
      phase: this.game.phase,
      round: this.game.round,
      drawerId: currentDrawer?.id,
      word: isViewerDrawer ? this.game.word : undefined,
      wordOptions: isViewerDrawer && this.game.phase === "choosing" ? [...this.game.wordOptions] : [],
      wordLength: this.game.word?.length || this.game.wordOptions[0]?.length || 0,
      revealed: this.game.revealed,
      guessed: this.game.guessed,
      strokes: [...this.game.strokes],
      chat: filteredChat.slice(-80),
      remainingMs: this.game.getRemainingMs(),
      hintPattern: this.game.phase === "drawing"
        ? (isViewerDrawer ? this.game.word : this.game.makePattern(false))
        : undefined,
      isPublic: this._isPublic,
      previousDrawing: this.game.previousDrawing,
      likes: this.game.likes,
      dislikes: this.game.dislikes,
    };
  }

  broadcast(): void {
    for (const player of this.getPlayers()) {
      this.broadcaster.toSocket(player.id, "room_state", this.getPublicState(player.id));
    }
  }

  // --- IGameListener Implementation ---

  onRoundStart(drawer: Player, round: number, drawTime: number, wordOptions: string[]): void {
    this.broadcaster.toSocket(drawer.id, "choose_word", { words: wordOptions, drawTime, chooseTime: 15 });
    this.broadcaster.toRoom(this.id, "round_start", { drawerId: drawer.id, drawTime, round, chooseTime: 15 });
  }

  onRoundBegun(drawer: Player | undefined, wordLength: number, drawTime: number): void {
    this.broadcaster.toRoom(this.id, "round_begun", {
      drawerId: drawer?.id,
      wordLength,
      drawTime,
    });
  }

  onHint(revealed: number, pattern: string): void {
    this.broadcaster.toRoom(this.id, "hint", { revealed, pattern });
  }

  onRoundEnd(word: string, players: Player[], nextDrawerId?: string): void {
    this.broadcaster.toRoom(this.id, "round_end", {
      word,
      scores: players.map((p) => p.toJSON()),
      nextDrawer: nextDrawerId,
    });
  }

  onGameOver(winner: Player | undefined, leaderboard: Player[]): void {
    this.broadcaster.toRoom(this.id, "game_over", {
      winner: winner?.toJSON(),
      leaderboard: leaderboard.map((p) => p.toJSON()),
    });
  }

  onSystemMessage(message: string): void {
    this.addChat(message, "system");
  }

  onBroadcastState(): void {
    this.broadcast();
  }

  destroy(): void {
    this.game.clearTimers();
  }
}
