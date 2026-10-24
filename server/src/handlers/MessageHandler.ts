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
  ) { }

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
    socket.on("choose_custom_word", (word, ack) => this.handleCustomWordChosen(socket, word, ack));
    socket.on("kick_player", (targetId, ack) => this.handleKickPlayer(socket, targetId, ack));
    socket.on("ban_player", (targetId, ack) => this.handleBanPlayer(socket, targetId, ack));
    socket.on("votekick_player", (targetId, ack) => this.handleVoteKickPlayer(socket, targetId, ack));
    socket.on("report_player", (data, ack) => this.handleReportPlayer(socket, data, ack));
    socket.on("toggle_spectator", (isSpectator, ack) => this.handleToggleSpectator(socket, isSpectator, ack));
    socket.on("draw_start", (data, ack) => this.handleDrawStart(socket, data, ack));
    socket.on("draw_move", (data) => this.handleDrawMove(socket, data));
    socket.on("draw_end", () => this.handleDrawEnd(socket));
    socket.on("canvas_clear", () => this.handleCanvasClear(socket));
    socket.on("draw_undo", () => this.handleDrawUndo(socket));
    socket.on("guess", (raw) => this.handleGuess(socket, raw));
    socket.on("chat", (raw) => this.handleChat(socket, raw));
    socket.on("update_avatar", (avatar, ack) => this.handleUpdateAvatar(socket, avatar, ack));
    socket.on("rate_drawing", (type, ack) => this.handleRateDrawing(socket, type, ack));
    socket.on("disconnect", () => this.handleDisconnect(socket));
  }

  // --- Individual Event Handlers ---

  private handleCreateRoom(
    socket: Socket,
    payload: {
      hostName?: string;
      settings?: any;
      isPublic?: boolean;
      avatar?: any;
      isSpectator?: boolean;
    },
    ack?: (response: { ok: boolean; roomId?: string; error?: string }) => void
  ): void {
    const isPublic = payload?.isPublic !== false;
    const { room } = this.roomManager.createRoom(
      socket.id,
      payload?.hostName || "",
      payload?.settings,
      isPublic,
      payload?.avatar,
      Boolean(payload?.isSpectator)
    );
    socket.join(room.id);
    ack?.({ ok: true, roomId: room.id });
  }

  private handleJoinRoom(
    socket: Socket,
    payload: {
      roomId?: string;
      playerName?: string;
      avatar?: any;
      isSpectator?: boolean;
    },
    ack?: (response: { ok: boolean; roomId?: string; error?: string }) => void
  ): void {
    const result = this.roomManager.joinRoom(
      socket.id,
      payload?.roomId || "",
      payload?.playerName || "",
      payload?.avatar,
      Boolean(payload?.isSpectator)
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

  private handleToggleSpectator(
    socket: Socket,
    isSpectator: boolean,
    ack?: (response: { ok: boolean }) => void
  ): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room) {
      ack?.({ ok: false });
      return;
    }
    const success = room.setPlayerSpectator(socket.id, Boolean(isSpectator));
    ack?.({ ok: success });
  }

  private handleReportPlayer(
    socket: Socket,
    data: { targetId: string; reason?: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found." });
      return;
    }
    const res = room.reportPlayer(data.targetId, socket.id, data.reason || "Inappropriate behavior");
    ack?.({ ok: res.success, error: res.error });
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

  private handleCustomWordChosen(
    socket: Socket,
    word: string,
    ack?: (response: { ok: boolean; error?: string }) => void
  ): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found." });
      return;
    }

    const success = room.game.chooseCustomWord(word, socket.id);
    ack?.({
      ok: success,
      error: success ? undefined : "Word must be 2-30 letters or numbers.",
    });
  }

  private handleKickPlayer(
    socket: Socket,
    targetId: string,
    ack?: (response: { ok: boolean; error?: string }) => void
  ): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found." });
      return;
    }

    const result = room.kickPlayer(targetId, socket.id);
    if (result.success) {
      this.roomManager.removeSocketBinding(targetId);
      const targetSocket = this.io.sockets.sockets.get(targetId);
      targetSocket?.leave(room.id);
    }
    ack?.({ ok: result.success, error: result.error });
  }

  private handleBanPlayer(
    socket: Socket,
    targetId: string,
    ack?: (response: { ok: boolean; error?: string }) => void
  ): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found." });
      return;
    }

    const result = room.banPlayer(targetId, socket.id);
    if (result.success) {
      this.roomManager.removeSocketBinding(targetId);
      const targetSocket = this.io.sockets.sockets.get(targetId);
      targetSocket?.leave(room.id);
    }
    ack?.({ ok: result.success, error: result.error });
  }

  private handleVoteKickPlayer(
    socket: Socket,
    targetId: string,
    ack?: (response: { ok: boolean; error?: string; votes?: number; threshold?: number }) => void
  ): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found." });
      return;
    }

    const result = room.voteKickPlayer(targetId, socket.id);
    if (result.kicked) {
      this.roomManager.removeSocketBinding(targetId);
      const targetSocket = this.io.sockets.sockets.get(targetId);
      targetSocket?.leave(room.id);
    }
    ack?.({
      ok: result.success,
      error: result.error,
      votes: result.votes,
      threshold: result.threshold,
    });
  }

  private handleDrawStart(
    socket: Socket,
    data: { x: number; y: number; color?: string; size?: number; tool?: "pen" | "eraser" | "fill" },
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
      tool: data.tool === "eraser" ? "eraser" : data.tool === "fill" ? "fill" : "pen",
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
    const activeStrokeId = socket.data.activeStroke;
    delete socket.data.activeStroke;
    if (activeStrokeId) {
      const room = this.roomManager.getRoomBySocketId(socket.id);
      if (room) {
        const stroke = room.game.strokes.find((s) => s.id === activeStrokeId);
        if (stroke) {
          // Broadcast full stroke data as per PDF specification (draw_data)
          this.io.to(room.id).emit("draw_data", stroke);
        }
      }
    }
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

  private handleUpdateAvatar(
    socket: Socket,
    avatar: any,
    ack?: (response: { ok: boolean }) => void
  ): void {
    const ok = this.roomManager.updateAvatar(socket.id, avatar);
    ack?.({ ok });
  }

  private handleGuess(socket: Socket, raw: any): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    const player = room?.getPlayer(socket.id);
    if (!room || !player) return;

    // Issue 3: Spectators are strictly watching only and cannot guess or answer
    if (player.isSpectator) return;

    const rawText = typeof raw === "object" && raw !== null ? raw.text : raw;
    const text = String(rawText || "").trim().slice(0, 100);
    if (!text) return;

    // If it's the drawer's turn to draw, any message sent should not be seen by teammates
    if (
      (room.game.phase === "drawing" || room.game.phase === "choosing") &&
      room.game.currentDrawer?.id === socket.id
    ) {
      room.addDrawerChat(text, player);
      room.broadcast();
      return;
    }

    // Issue 4: If not in drawing phase (e.g. lobby, choosing, roundEnd) or player has already guessed,
    // the message should be broadcast as a regular chat message so players can chat freely!
    if (room.game.phase !== "drawing" || room.game.hasGuessed(player.id)) {
      room.addChat(text, "chat", player);
      room.broadcast();
      return;
    }

    const result = room.game.handleGuess(player, text);
    if (result.type === "ignored") {
      room.addChat(text, "chat", player);
      room.broadcast();
      return;
    }

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
    } else if (result.type === "close") {
      // In Skribbl.io: The guess text IS shown in chat, and a close toast/alert is sent privately to the guesser
      room.addChat(result.text, "chat", player);
      socket.emit("guess_result", {
        correct: false,
        close: true,
        playerId: player.id,
        playerName: player.name,
        text: result.text,
      });
      room.broadcast();
    } else {
      // Issue 4: Broadcast incorrect guesses in chat with player's message visible
      room.addChat(result.text, "chat", player);
      this.io.to(room.id).emit("guess_result", {
        correct: false,
        playerId: player.id,
        playerName: player.name,
        text: result.text,
      });
      room.broadcast();
    }
  }

  private handleChat(socket: Socket, raw: any): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    const player = room?.getPlayer(socket.id);
    if (!room || !player) return;

    // Issue 3: Spectators cannot chat or answer in the chatbox
    if (player.isSpectator) return;

    const rawText = typeof raw === "object" && raw !== null ? raw.text : raw;
    const text = String(rawText || "").trim().slice(0, 100);
    if (!text) return;

    // The person who is supposed to draw in his turn sends a message:
    // other teammates should not be able to see it.
    if (
      (room.game.phase === "drawing" || room.game.phase === "choosing") &&
      room.game.currentDrawer?.id === socket.id
    ) {
      room.addDrawerChat(text, player);
      room.broadcast();
      return;
    }

    room.addChat(text, "chat", player);
    room.broadcast();
  }


  private handleRateDrawing(
    socket: Socket,
    type: "like" | "dislike",
    ack?: (response: { ok: boolean; error?: string }) => void
  ): void {
    const room = this.roomManager.getRoomBySocketId(socket.id);
    const player = room?.getPlayer(socket.id);
    if (!room || !player) {
      ack?.({ ok: false, error: "Room or player not found." });
      return;
    }

    if (room.game.phase !== "drawing" && room.game.phase !== "roundEnd") {
      ack?.({ ok: false, error: "Rating is only allowed during drawing or round end." });
      return;
    }

    if (room.game.currentDrawer?.id === socket.id) {
      ack?.({ ok: false, error: "You cannot rate your own drawing." });
      return;
    }

    if (type !== "like" && type !== "dislike") {
      ack?.({ ok: false, error: "Invalid rating type." });
      return;
    }

    const result = room.game.rateDrawing(socket.id, type);
    if (!result.success) {
      ack?.({ ok: false, error: "Failed to rate drawing." });
      return;
    }

    if (result.changed) {
      if (result.type === "like") {
        room.addChat("liked the drawing!", "like", player);
      } else if (result.type === "dislike") {
        room.addChat("disliked the drawing!", "dislike", player);
      }
      room.broadcast();
    }

    ack?.({ ok: true });
  }

  private handleDisconnect(socket: Socket): void {
    this.roomManager.leaveRoom(socket.id);
  }

  private clamp(value: unknown): number {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }
}
