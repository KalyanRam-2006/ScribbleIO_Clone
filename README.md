# Skribbl.io Clone — Full-Stack Multiplayer Game

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-brightgreen?style=for-the-badge&logo=render)](https://skribbl-clone-live.onrender.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

A feature-complete, production-ready, full-stack real-time multiplayer drawing and guessing game modeled after **skribbl.io**. Built strictly to fulfill every requirement, specification, and bonus objective of the **Intern Assignment: skribbl.io Clone** specification.

---

## 🌐 Live Deployment & Hosted Links

| Component | Platform | URL / Access | Status |
| :--- | :--- | :--- | :--- |
| **Full-Stack Live Game** (Frontend + WebSocket Backend) | Render | [https://skribbl-clone-live.onrender.com](https://skribbl-clone-live.onrender.com) | 🟢 Live |
| **Frontend Client** | Netlify | [https://scribbleio-clone.netlify.app](https://scribbleio-clone.netlify.app) | 🟢 Supported (`netlify.toml` included) |
| **GitHub Repository** | GitHub | [https://github.com/KalyanRam-2006/ScribbleIO_Clone](https://github.com/KalyanRam-2006/ScribbleIO_Clone) | 🟢 Main Branch |

> [!NOTE]
> **Architecture Note on Deployment**:
> This game uses **real-time bidirectional WebSockets (`Socket.IO`)** for zero-latency stroke synchronization, drawer rotations, countdown timers, and live guesses.
> - **Unified Full-Stack Hosting (Recommended - Render / Railway / Fly.io)**: Runs the continuous Node.js process and serves the compiled React client simultaneously from a single origin on one port.
> - **Split Hosting with Netlify**: The React Vite client can be hosted on **Netlify** using the included [`netlify.toml`](file:///c:/Users/saika/Downloads/skribblio-clone-project/skribblio-clone/netlify.toml). Simply configure the `VITE_SERVER_URL` environment variable in the Netlify site settings to point to your live backend server URL (e.g., `https://skribbl-clone-live.onrender.com`).

---

## 📋 PDF Requirements Compliance Matrix

### 1. Must Haves (All Fully Implemented & Tested)
- [x] **Create room with configurable settings**: Max players (2–20), rounds (2–10), draw time (15–240s), word choices (1–5), hints (0–5), word modes, categories, and languages.
- [x] **Join room via link or room code**: Direct 6-character room codes (`ABC123`) or 1-click sharable URL (`/?room=ABC123`).
- [x] **Lobby with player list**: Live player grid, host crown badge, ready/unready toggles, and host-controlled start.
- [x] **Turn-based rounds**: One drawer per turn, rotating sequentially among active players; spectators are safely excluded.
- [x] **Real-time drawing sync**: Smooth vector strokes with stroke begin, continuous interpolation, end, and flood fill.
- [x] **Word selection for drawer**: Drawer chooses 1 out of $N$ words (1–5 choices) within a 15-second choosing phase.
- [x] **Guessing**: Real-time chat guesses evaluated on the server with decaying point rewards.
- [x] **Scoring and leaderboard**: Real-time rank calculation with live crown indicator and point animations.
- [x] **Game end with winner**: Winner banner, final podium presentation (🥇, 🥈, 🥉), and replay trigger.
- [x] **Drawing tools**: Pen/brush, multi-color palette (10 curated tones), brush size slider (2–24px), eraser tool, flood fill bucket, undo stroke, and clear canvas.

### 2. Should Haves
- [x] **Hints**: Server schedules letter reveals progressively over time (e.g., at 60%, 40%, 20% remaining time).
- [x] **Chat**: Guesses automatically separated from general chat; correct answers masked to prevent spoilers; drawer chat isolated during drawing phase.
- [x] **Draw time countdown**: Real-time synchronized clock with visual alert styling under 15 seconds.
- [x] **Private rooms**: Secret rooms accessible only via code or invite link.

### 3. Nice to Haves
- [x] **Word categories**: Categorized dictionaries for `All`, `Animals`, `Objects`, and `Food`.
- [x] **Eraser tool**: Seamless stroke eraser with adjustable brush radius.
- [x] **Host moderation (Kick/Ban)**: Host can kick or permanently ban disruptive players by IP/ID.
- [x] **Votekick system**: Democratic vote kick triggered by non-host players requiring majority approval ($>50\%$).
- [x] **Multiple languages for word list**: Full multilingual word banks in English (`en`), Spanish (`es`), French (`fr`), German (`de`), Portuguese (`pt`), and Hindi (`hi`).

### 4. Bonus Ideas & Innovations
- [x] **Object-Oriented Programming (OOP) Architecture**: Strict encapsulation across `Player`, `Room`, `Game`, `WordService`, `RoomManager`, and `MessageHandler`.
- [x] **Configurable Word Modes**:
  - `Normal`: Standard masked blank tiles (`_ _ _ _`).
  - `Hidden`: Blanks are completely hidden (`??? (Hidden Word)`).
  - `Combination`: Complex compound and multi-word challenges.
- [x] **Custom Word Bank**: Host can supply comma-separated custom words, and drawer can input custom words during word selection.
- [x] **Interactive Cartoon Avatars**: Procedural SVG avatars with customizable eye expressions, mouth styles, body colors, and hats rendered across lobby, scoreboard, drawer banner, and podium.
- [x] **Spectator Mode**: Users can join as a spectator or toggle spectating live. Spectators watch real-time strokes and chat without interrupting the drawer rotation or guess thresholds.
- [x] **Drawing Replay**: Complete vector stroke replay modal of the last round with Play/Pause, reset, and 1x/2x/4x speed controls.
- [x] **Drawing Reactions**: Live audience thumbs-up (👍) and thumbs-down (👎) reactions displayed live to the artist with aggregate summary at round completion.
- [x] **Partial Word Guess Detection ("You are close!")**: Levenshtein edit-distance calculation notifies players when their guess is off by 1–2 letters.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | Component hierarchy, fast HMR, reactive state management |
| **Canvas** | HTML5 Canvas 2D Context | High-performance stroke rasterization, quadratic Bezier smoothing, flood fill |
| **Styling** | Vanilla Modern CSS | Design tokens, dark glassmorphism, responsive grid & flexbox, micro-animations |
| **Backend** | Node.js (v20+) + Express | HTTP REST endpoints, static production bundle serving |
| **Real-Time** | Socket.IO (v4) | Low-latency bidirectional WebSocket events with automatic fallback to polling |
| **Architecture** | Pure OOP Domain Model | Clean separation of business rules, entity models, and transport routing |

---

## 🔌 WebSocket Events Contract

The WebSocket event system strictly implements the specifications defined in the PDF:

### Room & Lobby Events
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `create_room` | Client ➔ Server | `{ hostName, settings }` | Creates room with specified settings and host avatar |
| `join_room` | Client ➔ Server | `{ roomId, playerName, isSpectator, avatar }` | Joins an existing room |
| `player_joined` | Server ➔ Clients | `{ player, players }` | Broadcasts new player arrival |
| `player_left` | Server ➔ Clients | `{ playerId, players }` | Broadcasts player departure |
| `start_game` | Client ➔ Server | `{}` | Host initiates game start |

### Game State Events
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `game_state` | Server ➔ Clients | `{ phase, round, drawerId, word, hints }` | Complete room/game snapshot sync |
| `round_start` | Server ➔ Clients | `{ drawerId, wordOptions, drawTime }` | Begins round and transmits words to drawer |
| `word_chosen` | Client ➔ Server | `{ word }` or string | Drawer selects chosen word; timer starts |
| `round_end` | Server ➔ Clients | `{ word, scores, nextDrawer }` | Concludes round, reveals word, updates score |
| `game_over` | Server ➔ Clients | `{ winner, leaderboard }` | Concludes game and crowns winner |

### Drawing Events
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `draw_start` | Client ➔ Server | `{ x, y, color, size, tool }` | Drawer initiates stroke or flood fill |
| `draw_move` | Client ➔ Server | `{ x, y }` | Drawer appends point to active path |
| `draw_end` | Client ➔ Server | `{}` | Drawer completes current stroke |
| `draw_data` | Server ➔ Clients | `{ ...stroke }` | Real-time stroke broadcast to all players |
| `canvas_clear`| Client ➔ Server | `{}` | Drawer clears the canvas |
| `draw_undo` | Client ➔ Server | `{}` | Drawer undoes the last stroke |

### Chat, Guessing & Moderation Events
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `guess` | Client ➔ Server | `{ text }` | Guess submission |
| `guess_result`| Server ➔ Clients | `{ correct, playerId, playerName, points }` | Evaluated guess notification |
| `chat` | Client ➔ Server | `{ text }` | General chat message |
| `chat_message`| Server ➔ Clients | `{ playerId, playerName, text, kind }` | Broadcast chat message |
| `toggle_spectator` | Client ➔ Server | `{}` | Toggles spectator mode live |
| `report_player`| Client ➔ Server | `{ targetId, reason, details }` | Submits moderation report |
| `rate_drawing` | Client ➔ Server | `{ rating: 'like' \| 'dislike' }` | Audience feedback on active drawing |

---

## 🏗️ Architectural Overview & Deep Dive

### 1. Drawing Stroke Capture, Sync & Rendering
1. **Coordinate Normalization**: Canvas resolution is fixed internally to $1000 \times 620$ logical pixels. Physical pointer coordinates from mouse/touch/stylus events are mapped via `canvas.getBoundingClientRect()` and scaled:
   $$x_{\text{canvas}} = (e.\text{clientX} - \text{rect.left}) \times \frac{1000}{\text{rect.width}}$$
2. **Smooth Vector Interpolation**: Strokes are represented as sequences of $\{x, y\}$ coordinate points. Drawing rendering uses quadratic Bezier mid-point interpolation:
   ```typescript
   ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
   ```
   This prevents angular or jagged lines regardless of the client's mouse sampling rate.
3. **Stroke Replay Buffer**: The `Game` class stores every completed stroke in memory. When a player connects mid-round or replays the round, the stroke history is replayed onto the canvas in sequence.

### 2. Authoritative Game State Management
All game state is maintained server-side to prevent client tampering:
- **State Machine**: Transitions through `lobby` ➔ `choosing` (15s) ➔ `drawing` (15–240s) ➔ `roundEnd` (10s) ➔ `gameOver`.
- **Spectator Isolation**: Active player queries (`getActivePlayers()`) exclude spectators from drawer turn rotation, ready requirements, and guess completion thresholds.
- **Dynamic Hints**: Letters are revealed based on word length and configured hint count. Reveal intervals are calculated as:
  $$t_{\text{hint}} = \text{drawTime} \times \left(1 - \frac{i}{\text{hintsCount} + 1}\right)$$
- **Skribbl Scoring Algorithm**: Points decay with remaining time:
  $$\text{Guesser Points} = 100 + \left\lfloor \frac{t_{\text{remaining}}}{t_{\text{total}}} \times 400 \right\rfloor$$
  The drawer earns a proportional bonus for each player who guesses correctly.

### 3. Word-Matching & Close Guess Logic
1. **Sanitization**: Guesses and secret words are stripped of leading/trailing whitespace and converted to lower case.
2. **Exact Match**: If `guess === word`, points are awarded, the guesser is added to `guessedPlayers`, and the chat masks the message to other guessers.
3. **Partial / Close Match Detection**:
   If the guess does not match, the server computes the Levenshtein distance between `guess` and `word`:
   - If distance $\le 1$ (or distance $\le 2$ for words with $\ge 6$ letters), or if the word contains the guess as a major substring, the server emits a private `"close"` notification:
     > 🔥 *"You are close to the word!"*
   This guides players without revealing the solution to others in the room.

### 4. OOP WebSocket Server Structure
```
server/src/
├── types/
│   └── game.ts             # Domain interfaces, AvatarData, WordMode, DTO contracts
├── models/
│   ├── Player.ts           # Player domain entity (avatar, spectator, score, state)
│   └── Room.ts             # Room aggregate (participants, chat, moderation, broadcasting)
├── game/
│   ├── Game.ts             # Encapsulates turn rotation, strokes, hints, scoring & timers
│   └── WordService.ts      # Multi-language word bank, categories & combination generator
├── services/
│   └── RoomManager.ts      # Room registry, code generation, and socket-to-room mappings
├── handlers/
│   └── MessageHandler.ts   # Decoupled WebSocket routing with validated domain calls
└── index.ts                # Bootstrap, Express server & Socket.IO initialization
```

### 5. Deployment Setup & Platform Constraints
- **Why Persistent WebSocket Support is Required**:
  Serverless platforms like Vercel and Netlify use short-lived, stateless AWS Lambda / Cloudflare Workers. These environments freeze or terminate execution after responding to HTTP requests, making them unable to maintain persistent TCP WebSocket connections or in-memory game state.
- **Recommended Platform**: Render, Railway, or Fly.io running a continuous Node.js process. In this setup, Express serves the compiled Vite static assets from `client/dist` on the same port as the Socket.IO HTTP server, eliminating cross-origin latency.

---

## 🚀 Local Development Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) v20 or newer
- [npm](https://www.npmjs.com/) v10 or newer

### Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/KalyanRam-2006/ScribbleIO_Clone.git
cd ScribbleIO_Clone

# Install root, server, and client dependencies
npm install
npm --prefix server install
npm --prefix client install
```

### Start Development Server
```bash
npm run dev
```
- Client runs on: `http://localhost:5173`
- Server runs on: `http://localhost:3001`
- Open multiple browser tabs at `http://localhost:5173` to test multiplayer interactions!

### Production Build & Test
```bash
# Build both frontend and backend
npm run build

# Start the unified production server
npm start
```
Open `http://localhost:3001` to view the production build.

---

## 🧪 Verification & Testing Commands

To verify TypeScript compilation and production builds across both modules:
```bash
# Client Typecheck & Build
npm --prefix client run build

# Server Typecheck & Build
npm --prefix server run build
```

---

## 📜 License
This project is developed as an educational internship assignment. Free to use and inspect.
