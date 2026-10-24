import { randomBytes } from "crypto";
import { Server } from "socket.io";
import { AvatarData, Settings } from "../types/game";
import { Player } from "../models/Player";
import { IRoomBroadcaster, Room } from "../models/Room";

export const DEFAULT_SETTINGS: Settings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordCategory: "all",
  wordMode: "normal",
  language: "en",
  enableCustomWords: true,
};

export class RoomManager implements IRoomBroadcaster {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  constructor(private readonly io: Server) { }

  // --- IRoomBroadcaster Implementation ---

  toRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  toSocket(socketId: string, event: string, data: any): void {
    this.io.to(socketId).emit(event, data);
  }

  // --- Room Lifecycle & Management ---

  sanitizeAvatar(raw: any, name: string): AvatarData {
    return {
      eyes: typeof raw?.eyes === "number" && !isNaN(raw.eyes) ? Math.abs(Math.round(raw.eyes)) % 6 : Math.abs(name.charCodeAt(0) || 0) % 6,
      mouth: typeof raw?.mouth === "number" && !isNaN(raw.mouth) ? Math.abs(Math.round(raw.mouth)) % 8 : Math.abs((name.charCodeAt(1) || 0) + 1) % 8,
      color: typeof raw?.color === "number" && !isNaN(raw.color) ? Math.abs(Math.round(raw.color)) % 8 : Math.abs((name.charCodeAt(0) || 0) + 2) % 8,
      hat: typeof raw?.hat === "number" && !isNaN(raw.hat) ? Math.abs(Math.round(raw.hat)) % 7 : name.length % 7,
    };
  }

  createRoom(
    hostSocketId: string,
    rawHostName: string,
    customSettings?: Partial<Settings>,
    isPublic = true,
    avatar?: AvatarData,
    isSpectator = false
  ): { room: Room; host: Player } {
    const roomId = this.generateRoomCode();
    const settings = this.sanitizeSettings(customSettings);
    const hostName = this.cleanName(rawHostName);
    const host = new Player(
      hostSocketId,
      hostName,
      0,
      true,
      true,
      this.sanitizeAvatar(avatar, hostName),
      isSpectator
    );

    const room = new Room(roomId, hostSocketId, settings, this, isPublic);
    room.addPlayer(host);

    this.rooms.set(roomId, room);
    this.socketToRoom.set(hostSocketId, roomId);

    room.addChat(`${host.name} created the room.`);
    this.toRoom(room.id, "player_joined", {
      player: host.toJSON(),
      players: room.getPlayers().map((p) => p.toJSON()),
    });
    room.broadcast();
    this.broadcastPublicLobbies();

    return { room, host };
  }

  joinRoom(
    socketId: string,
    rawRoomId: string,
    rawPlayerName: string,
    avatar?: AvatarData,
    isSpectator = false
  ): { ok: true; room: Room; player: Player } | { ok: false; error: string } {
    const roomId = String(rawRoomId || "").trim().toUpperCase();
    const room = this.rooms.get(roomId);

    if (!room) {
      return { ok: false, error: "Room not found. Check the code and try again." };
    }
    if (room.game.phase !== "lobby") {
      return { ok: false, error: "This game has already started." };
    }
    if (room.isBanned(socketId, rawPlayerName)) {
      return { ok: false, error: "You have been banned from this room." };
    }
    if (room.playerCount >= room.settings.maxPlayers) {
      return { ok: false, error: "This room is full." };
    }

    const playerName = this.cleanName(rawPlayerName);
    const player = new Player(
      socketId,
      playerName,
      0,
      false,
      true,
      this.sanitizeAvatar(avatar, playerName),
      isSpectator
    );
    room.addPlayer(player);
    this.socketToRoom.set(socketId, roomId);

    room.addChat(`${player.name} joined the room.`);
    this.toRoom(room.id, "player_joined", {
      player: player.toJSON(),
      players: room.getPlayers().map((p) => p.toJSON()),
    });
    room.broadcast();
    this.broadcastPublicLobbies();

    return { ok: true, room, player };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomBySocketId(socketId: string): Room | undefined {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  updateAvatar(socketId: string, rawAvatar: any): boolean {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return false;
    const player = room.getPlayer(socketId);
    if (!player) return false;
    player.setAvatar(this.sanitizeAvatar(rawAvatar, player.name));
    room.broadcast();
    return true;
  }

  removeSocketBinding(socketId: string): void {
    this.socketToRoom.delete(socketId);
    this.broadcastPublicLobbies();
  }

  leaveRoom(socketId: string): { room?: Room; leftPlayer?: Player; roomDestroyed: boolean } {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return { roomDestroyed: false };

    this.socketToRoom.delete(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return { roomDestroyed: false };

    const player = room.getPlayer(socketId);
    const { remainingCount } = room.removePlayer(socketId);

    if (remainingCount === 0) {
      room.destroy();
      this.rooms.delete(roomId);
      this.broadcastPublicLobbies();
      return { room, leftPlayer: player, roomDestroyed: true };
    }

    this.toRoom(roomId, "player_left", {
      playerId: socketId,
      players: room.getPlayers().map((p) => p.toJSON()),
    });
    room.addChat("A player left the room.");
    room.broadcast();
    this.broadcastPublicLobbies();
    return { room, leftPlayer: player, roomDestroyed: false };
  }

  broadcastPublicLobbies(): void {
    if (typeof this.io?.emit === "function") {
      this.io.emit("public_rooms", this.getPublicLobbies());
    }
  }

  getPublicLobbies(): { id: string; players: number; maxPlayers: number }[] {
    return Array.from(this.rooms.values())
      .filter((r) => r.isPublic && r.game.phase === "lobby" && r.playerCount < r.settings.maxPlayers)
      .map((r) => ({
        id: r.id,
        players: r.playerCount,
        maxPlayers: r.settings.maxPlayers,
      }));
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  // --- Helper Utilities ---

  private generateRoomCode(): string {
    let code: string;
    do {
      code = randomBytes(3).toString("hex").toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  private cleanName(name: unknown): string {
    return String(name ?? "").trim().replace(/[<>]/g, "").slice(0, 18) || "Player";
  }

  private sanitizeSettings(custom?: Partial<Settings>): Settings {
    const settings: Settings = { ...DEFAULT_SETTINGS, ...(custom || {}) };
    settings.maxPlayers = Math.max(2, Math.min(20, Number(settings.maxPlayers) || DEFAULT_SETTINGS.maxPlayers));
    settings.rounds = Math.max(2, Math.min(10, Number(settings.rounds) || DEFAULT_SETTINGS.rounds));
    settings.drawTime = Math.max(15, Math.min(240, Number(settings.drawTime) || DEFAULT_SETTINGS.drawTime));
    settings.wordCount = Math.max(1, Math.min(5, Number(settings.wordCount) || DEFAULT_SETTINGS.wordCount));
    settings.hints = Math.max(0, Math.min(5, Number(settings.hints) ?? DEFAULT_SETTINGS.hints));

    const validWordModes = ["normal", "hidden", "combination"];
    settings.wordMode = validWordModes.includes(String(custom?.wordMode))
      ? (custom!.wordMode as any)
      : "normal";

    const validLanguages = ["en", "es", "fr", "de", "pt", "hi"];
    settings.language = validLanguages.includes(String(custom?.language))
      ? String(custom!.language)
      : "en";

    if (Array.isArray(custom?.customWords)) {
      settings.customWords = custom.customWords
        .map((w) => String(w || "").trim())
        .filter((w) => w.length >= 2 && w.length <= 30 && /^[a-zA-Z0-9\s-]+$/.test(w));
    }
    settings.customWordsOnly = Boolean(custom?.customWordsOnly);

    const validCategories = ["all", "animals", "objects", "food"];
    const category = String(custom?.wordCategory || "all").toLowerCase();
    settings.wordCategory = validCategories.includes(category) ? category : "all";
    settings.enableCustomWords = custom?.enableCustomWords !== false;

    return settings;
  }
}

