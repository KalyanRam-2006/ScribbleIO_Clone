import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import fs from "fs";
import { Server } from "socket.io";
import { RoomManager } from "./services/RoomManager";
import { MessageHandler } from "./handlers/MessageHandler";

// Export domain classes for module consumers and unit testing
export { Player } from "./models/Player";
export { Room } from "./models/Room";
export { Game } from "./game/Game";
export { WordService } from "./game/WordService";
export { RoomManager } from "./services/RoomManager";
export { MessageHandler } from "./handlers/MessageHandler";
export * from "./types/game";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = Number(process.env.PORT || 3001);

// Initialize OOP service layers
const roomManager = new RoomManager(io);
const messageHandler = new MessageHandler(io, roomManager);

// Route incoming WebSocket connections through the MessageHandler
io.on("connection", (socket) => {
  messageHandler.register(socket);
});

// REST API endpoints
app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: roomManager.getRoomCount() });
});

app.get("/api/rooms", (_req, res) => {
  res.json(roomManager.getPublicLobbies());
});

// Serve static client bundle in production
const clientDist = path.resolve(__dirname, "../../client/dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

server.listen(PORT, () => {
  console.log(`Skribbl clone server listening on ${PORT}`);
});
