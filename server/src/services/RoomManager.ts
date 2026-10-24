import { randomBytes } from "crypto";
import { Server } from "socket.io";
import { Settings } from "../types/game";
import { Player } from "../models/Player";
import { IRoomBroadcaster, Room } from "../models/Room";

export const DEFAULT_SETTINGS: Settings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordCategory: "all",
  enableCustomWords: true,
};

export class RoomManager implements IRoomBroadcaster {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  constructor(private readonly io: Server) {}

  // --- IRoomBroadcaster Implementation ---

  toRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  toSocket(socketId: string, event: string, data: any): void {
    this.io.to(socketId).emit(event, data);
  }

  // --- Room Lifecycle & Management ---

  createRoom(
    hostSocketId: string,
    rawHostName: string,
    customSettings?: Partial<Settings>,
    isPublic = true
  ): { room: Room; host: Player } {
    const roomId = this.generateRoomCode();
    const settings = this.sanitizeSettings(customSettings);
    const host = new Player(hostSocketId, this.cleanName(rawHostName), 0, true, true);

    const room = new Room(roomId, hostSocketId, settings, this, isPublic);
    room.addPlayer(host);

    this.rooms.set(roomId, room);
    this.socketToRoom.set(hostSocketId, roomId);

    room.addChat(`${host.name} created the room.`);
    room.broadcast();
    this.broadcastPublicLobbies();

    return { room, host };
  }

  joinRoom(
    socketId: string,
    rawRoomId: string,
    rawPlayerName: string
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

    const player = new Player(socketId, this.cleanName(rawPlayerName), 0, false, true);
    room.addPlayer(player);
    this.socketToRoom.set(socketId, roomId);

    room.addChat(`${player.name} joined the room.`);
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
