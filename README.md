# Skribbl.io Clone

A full-stack multiplayer drawing and guessing game built with React, TypeScript, Vite, Node.js, Express and Socket.IO.

## Features
- Create private/public rooms and join with a room code or sharable invite link
- Real-time open public rooms directory with one-click joining and instant updates
- Multiple language compatibility (English, Spanish, French, German, Portuguese, Hindi)
- Host moderation controls: Kick and Ban; player-driven Votekick system
- Custom word selection: Room-wide custom word bank and in-game custom word input for drawers
- Drawing replay: Watch smooth animated replays of the previous player's drawing with play/pause and 1x/2x/4x speed controls
- Timely hint reveals: masked blanks and scheduled hint letters
- Lobby with player list, ready status, host-controlled start
- Configurable max players, rounds, draw time, word choices and hints
- Rotating drawer, word selection, hidden word blanks and timed rounds
- Real-time canvas strokes, color and brush size, eraser, undo and clear
- Chat and guesses, server-side answer checking, points and leaderboard
- Correct-guess notifications, countdown, round summaries and final winner
- Reconnect-friendly room state while the server process remains alive

## Requirements
- Node.js 20 or newer
- npm

## Run locally
From the project root:

```bash
npm install
npm --prefix server install
npm --prefix client install
npm run dev
```

Open http://localhost:5173 in two or more browser tabs. Create a room in one tab and join with the room code in the others.

The Vite dev server proxies `/socket.io` to the server at `http://localhost:3001`.

## Production build
```bash
npm run build
npm start
```
The server serves the built client from `client/dist` when that folder exists. Set `PORT` if your host requires a specific port.

## Deployment (Render example)
1. Push this repository to GitHub.
2. Create a **Web Service** on Render using the repository.
3. Build command: `npm install && npm --prefix server install && npm --prefix client install && npm run build`
4. Start command: `npm start`
5. Set `NODE_ENV=production`.
6. Use the resulting public URL. Socket.IO uses the same origin, so no separate WebSocket service is required.

A single instance is recommended because room state is stored in server memory. For multiple instances, add a shared Socket.IO adapter and persistent/shared game state.

## Project structure
```
client/  React + TypeScript + Vite interface
server/  Express + Socket.IO game server
```

## Game rules / architecture
- The server is authoritative for room membership, drawer turns, timers, word selection, scoring, hints and game transitions.
- The drawer sends `draw_start`, `draw_move` and `draw_end`; the server validates the current drawer and broadcasts stroke data.
- Guesses are normalized with trim and case-insensitive exact matching. The secret word is never sent to guessers until the round ends.
- The first correct guess gets the highest available score; later correct guesses get fewer points. The drawer receives a bonus when others guess correctly.
- The server stores room/game state in memory. Restarting the server clears active rooms.

## Notes
This is an educational assignment project, not an exact reproduction of the commercial skribbl.io service. Review and test all features before submitting.

## Server-side OOP structure

The WebSocket server is structured using modular Object-Oriented Programming (OOP) with strict encapsulation, separation of concerns, and dependency injection:

```
server/src/
├── types/
│   └── game.ts             # Domain types, settings, and DTO contracts
├── models/
│   ├── Player.ts           # Player domain entity (identity, score, ready state)
│   └── Room.ts             # Room aggregate (participants, chat, broadcast, Game composition)
├── game/
│   ├── Game.ts             # Encapsulates round progression, turns, hints, strokes, timers & scoring
│   └── WordService.ts      # Word bank and randomized selection service
├── services/
│   └── RoomManager.ts      # Active room collections, code generation, and socket-to-room mappings
├── handlers/
│   └── MessageHandler.ts   # Decoupled WebSocket message routing with dedicated handler methods
└── index.ts                # Application bootstrap and dependency injection
```

- **`Player`** encapsulates player identity and state (`id`, `name`, `score`, `ready`, `connected`). State changes are performed through encapsulated methods (`addScore()`, `setReady()`, `resetScore()`).
- **`Room`** models the room aggregate. It manages participants (`addPlayer()`, `removePlayer()`), host reassignment, chat history, public state projections, and socket broadcasting via the injected `IRoomBroadcaster` interface.
- **`Game`** fully encapsulates the game rules, state machine (`lobby`, `choosing`, `drawing`, `roundEnd`, `gameOver`), turn rotation, drawing countdowns, hint calculations, canvas stroke history, guess evaluation, and Skribbl scoring algorithms.
- **`WordService`** encapsulates word bank management and random option generation.
- **`RoomManager`** manages the lifecycle of all active rooms, generates unique room codes, resolves socket-to-room lookups, and cleans up empty rooms.
- **`MessageHandler`** isolates transport concerns from business logic, translating incoming Socket.IO events into validated domain method calls through dedicated handler methods.

### Run and verify

```bash
npm install
npm run build
npm run dev
```

The server listens on port `3001` by default and exposes `GET /health`.
