import { randomUUID } from "crypto";
import { Server, Socket } from "socket.io";
import { RoomManager } from "../services/RoomManager";
import { Stroke } from "../types/game";

/**
 * Encapsulates WebSocket message routing, decoupling transport concerns
 * from domain models and dispatching to dedicated handler methods.
 */
export class MessageHandler {
  constructor(
    private readonly io: Server,
    private readonly roomManager: RoomManager
  ) {}

  /**
   * Registers all socket event listeners for an incoming connection.
   */
  register(socket: Socket): void {
    socket.on("create_room", (payload, ack) => this.handleCreateRoom(socket, payload, ack));
    socket.on("join_room", (payload, ack) => this.handleJoinRoom(socket, payload, ack));
    socket.on("get_rooms", (ack) => {
      const lobbies = this.roomManager.getPublicLobbies();
      ack?.(lobbies);
      socket.emit("public_rooms", lobbies);
    });
    socket.on("set_ready", (ready) => this.handleSetReady(socket, ready));
    socket.on("start_game", (_payload, ack) => this.handleStartGame(socket, ack));
    socket.on("word_chosen", (word, ack) => this.handleWordChosen(socket, word, ack));
    socket.on("draw_start", (data, ack) => this.handleDrawStart(socket, data, ack));
    socket.on("draw_move", (data) => this.handleDrawMove(socket, data));
    socket.on("draw_end", () => this.handleDrawEnd(socket));
    socket.on("canvas_clear", () => this.handleCanvasClear(socket));
    socket.on("draw_undo", () => this.handleDrawUndo(socket));
    socket.on("guess", (raw) => this.handleGuess(socket, raw));
    socket.on("chat", (raw) => this.handleChat(socket, raw));
    socket.on("disconnect", () => this.handleDisconnect(socket));
  }

  // --- Individual Event Handlers ---

  private handleCreateRoom(
    socket: Socket,
    payload: { hostName?: string; settings?: any; isPublic?: boolean },
    ack?: (response: { ok: boolean; roomId?: string; error?: string }) => void
  ): void {
    const isPublic = payload?.isPublic !== false;
    const { room } = this.roomManager.createRoom(
      socket.id,
      payload?.hostName || "",
      payload?.settings,
      isPublic
    );
    socket.join(room.id);
    ack?.({ ok: true, roomId: room.id });
  }

  private handleJoinRoom(
    socket: Socket,
    payload: { roomId?: string; playerName?: string },
    ack?: (response: { ok: boolean; roomId?: string; error?: string }) => void
  ): void {
    const result = this.roomManager.joinRoom(
      socket.id,
      payload?.roomId || "",
      payload?.playerName || ""
    );
    if (!result.ok) {
      ack?.({ ok: false, error: result.error });
      return;
    }
    socket.join(result.room.id);
    ack?.({ ok: true, roomId: result.room.id });
  }

  private handleSetReady(socket: Socket, ready: boolean): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room) return;
    if (room.setPlayerReady(socket.id, ready)) {
      room.broadcast();
    }
  }

  private handleStartGame(
    socket: Socket,
    ack?: (response: { ok: boolean; error?: string }) => void
  ): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found." });
      return;
    }

    const check = room.canStartGame(socket.id);
    if (!check.allowed) {
      ack?.({ ok: false, error: check.error });
      return;
    }

    room.game.start();
    this.roomManager.broadcastPublicLobbies();
    ack?.({ ok: true });
  }

  private handleWordChosen(
    socket: Socket,
    word: string,
    ack?: (response: { ok: boolean }) => void
  ): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room) {
      ack?.({ ok: false });
      return;
    }

    const success = room.game.chooseWord(word, socket.id);
    ack?.({ ok: success });
  }

  private handleDrawStart(
    socket: Socket,
    data: { x: number; y: number; color?: string; size?: number; tool?: "pen" | "eraser" },
    ack?: (response: { ok: boolean; strokeId?: string }) => void
  ): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room || room.game.phase !== "drawing" || room.game.currentDrawer?.id !== socket.id) {
      return;
    }

    const stroke: Stroke = {
      id: randomUUID(),
      points: [{ x: this.clamp(data.x), y: this.clamp(data.y) }],
      color: String(data.color || "#111827").slice(0, 24),
      size: Math.max(1, Math.min(40, Number(data.size) || 4)),
      tool: data.tool === "eraser" ? "eraser" : "pen",
    };

    room.game.addStroke(stroke);
    socket.data.activeStroke = stroke.id;
    this.io.to(room.id).emit("draw_start", stroke);
    ack?.({ ok: true, strokeId: stroke.id });
  }

  private handleDrawMove(socket: Socket, data: { x: number; y: number }): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room || room.game.phase !== "drawing" || room.game.currentDrawer?.id !== socket.id) {
      return;
    }

    const activeStrokeId = socket.data.activeStroke;
    if (!activeStrokeId) return;

    const point = { x: this.clamp(data.x), y: this.clamp(data.y) };
    if (room.game.appendStrokePoint(activeStrokeId, point)) {
      this.io.to(room.id).emit("draw_move", { strokeId: activeStrokeId, point });
    }
  }

  private handleDrawEnd(socket: Socket): void {
    delete socket.data.activeStroke;
  }

  private handleCanvasClear(socket: Socket): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room || room.game.phase !== "drawing" || room.game.currentDrawer?.id !== socket.id) {
      return;
    }

    room.game.clearCanvas();
    this.io.to(room.id).emit("canvas_cleared");
  }

  private handleDrawUndo(socket: Socket): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room || room.game.phase !== "drawing" || room.game.currentDrawer?.id !== socket.id) {
      return;
    }

    const remainingStrokes = room.game.undoStroke();
    this.io.to(room.id).emit("canvas_snapshot", remainingStrokes);
  }

  private handleGuess(socket: Socket, raw: string): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    const player = room?.getPlayer(socket.id);
    if (!room || !player) return;

    const result = room.game.handleGuess(player, raw);
    if (result.type === "ignored") return;

    if (result.type === "correct") {
      room.addChat(`${player.name} guessed the word! (+${result.points})`, "correct", player);
      this.io.to(room.id).emit("guess_result", {
        correct: true,
        playerId: player.id,
        playerName: player.name,
        points: result.points,
      });

      if (result.allGuessed) {
        room.game.endRound();
      } else {
        room.broadcast();
      }
    } else {
      // Broadcast incorrect guesses in chat
      room.addChat(result.text, "chat", player);
    }
  }

  private handleChat(socket: Socket, raw: string): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    const player = room?.getPlayer(socket.id);
    if (!room || !player) return;

    const text = String(raw || "").trim().slice(0, 100);
    // Disallow drawer from chatting during drawing to prevent leaking the word
    if (!text || (room.game.phase === "drawing" && room.game.currentDrawer?.id === socket.id)) {
      return;
    }

    room.addChat(text, "chat", player);
  }

  private handleDisconnect(socket: Socket): void {
    this.roomManager.leaveRoom(socket.id);
  }

  private clamp(value: unknown): number {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }
}
