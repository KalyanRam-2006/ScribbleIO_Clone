import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Settings = { maxPlayers: number; rounds: number; drawTime: number; wordCount: number; hints: number };
type Player = { id: string; name: string; score: number; ready: boolean };
type Stroke = { id: string; points: { x: number; y: number }[]; color: string; size: number; tool: "pen" | "eraser" };
type ChatItem = { id: string; playerId?: string; playerName: string; text: string; kind: "chat" | "system" | "correct" };
type RoomState = {
  id: string;
  hostId: string;
  settings: Settings;
  players: Player[];
  phase: "lobby" | "choosing" | "drawing" | "roundEnd" | "gameOver";
  round: number;
  drawerId: string;
  word?: string;
  wordOptions: string[];
  wordLength: number;
  revealed: number;
  guessed: string[];
  strokes: Stroke[];
  chat: ChatItem[];
  remainingMs: number;
  hintPattern?: string;
  isPublic?: boolean;
};

const socket: Socket = io({ autoConnect: true });
const initialSettings: Settings = { maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hints: 2 };

export default function App() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [isPublic, setIsPublic] = useState(true);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [color, setColor] = useState("#172033");
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [guess, setGuess] = useState("");
  const [chatText, setChatText] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [publicRooms, setPublicRooms] = useState<{ id: string; players: number; maxPlayers: number }[]>([]);
  const [hintPattern, setHintPattern] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [invitedFromUrl, setInvitedFromUrl] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const activeStroke = useRef<string | null>(null);
  const strokeMeta = useRef<Map<string, Stroke>>(new Map());
  const [roundWord, setRoundWord] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  const me = room?.players.find((p) => p.id === socket.id);
  const isDrawer = room?.drawerId === socket.id;
  const canDraw = Boolean(room && room.phase === "drawing" && isDrawer);

  // Check URL query parameters on load for sharable invite links (?room=CODE or ?code=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room") || params.get("code") || window.location.hash.replace("#", "");
    if (code) {
      const cleanCode = code.trim().toUpperCase();
      setRoomCode(cleanCode);
      setInvitedFromUrl(true);
    }
  }, []);

  // Compute displayed pattern: drawer sees word; guessers see timely hint pattern with blanks
  const pattern = useMemo(() => {
    if (!room || !room.wordLength) return "";
    if (room.word) return room.word;
    if (hintPattern) return hintPattern;
    if (room.hintPattern) return room.hintPattern;
    return Array.from({ length: room.wordLength }, () => "_").join(" ");
  }, [room?.word, room?.wordLength, room?.hintPattern, hintPattern]);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (!stroke.points.length) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.size;
    ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
    ctx.fillStyle = ctx.strokeStyle;
    const pts = stroke.points;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc((pts[0].x * ctx.canvas.width), (pts[0].y * ctx.canvas.height), stroke.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo((pts[0].x * ctx.canvas.width), (pts[0].y * ctx.canvas.height));
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo((pts[i].x * ctx.canvas.width), (pts[i].y * ctx.canvas.height));
      }
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const redraw = useCallback((strokes: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((s) => drawStroke(ctx, s));
  }, [drawStroke]);

  // Socket event listener registrations
  useEffect(() => {
    const onState = (s: RoomState) => {
      setRoom(s);
      setRemaining(s.remainingMs || 0);
      if (s.hintPattern) setHintPattern(s.hintPattern);
    };
    const onChoose = (data: { words: string[] }) => setWords(data.words);
    const onStart = () => {
      setWords([]);
      setHintPattern("");
    };
    const onHint = (data: { revealed: number; pattern: string }) => {
      setHintPattern(data.pattern);
    };
    const onDrawStart = (stroke: Stroke) => {
      strokeMeta.current.set(stroke.id, { ...stroke, points: [...stroke.points] });
      const c = canvasRef.current?.getContext("2d");
      if (c) drawStroke(c, stroke);
    };
    const onDrawMove = (data: { strokeId: string; point: { x: number; y: number } }) => {
      const c = canvasRef.current?.getContext("2d");
      const s = strokeMeta.current.get(data.strokeId);
      if (!c || !s) return;
      const pts = s.points;
      if (pts.length) {
        c.save();
        c.lineCap = "round";
        c.lineJoin = "round";
        c.lineWidth = s.size;
        c.strokeStyle = s.tool === "eraser" ? "#fff" : s.color;
        c.beginPath();
        c.moveTo(pts[pts.length - 1].x * c.canvas.width, pts[pts.length - 1].y * c.canvas.height);
        c.lineTo(data.point.x * c.canvas.width, data.point.y * c.canvas.height);
        c.stroke();
        c.restore();
      }
      s.points.push(data.point);
    };
    const onSnapshot = (strokes: Stroke[]) => {
      strokeMeta.current = new Map(strokes.map((s) => [s.id, s]));
      redraw(strokes);
    };
    const onClear = () => {
      strokeMeta.current.clear();
      redraw([]);
    };
    const onRoundEnd = (data: { word?: string }) => {
      setWords([]);
      setRoundWord(data?.word || "");
      setHintPattern("");
    };

    socket.on("room_state", onState);
    socket.on("choose_word", onChoose);
    socket.on("round_begun", onStart);
    socket.on("hint", onHint);
    socket.on("draw_start", onDrawStart);
    socket.on("draw_move", onDrawMove);
    socket.on("canvas_snapshot", onSnapshot);
    socket.on("canvas_cleared", onClear);
    socket.on("round_end", onRoundEnd);

    return () => {
      socket.off("room_state", onState);
      socket.off("choose_word", onChoose);
      socket.off("round_begun", onStart);
      socket.off("hint", onHint);
      socket.off("draw_start", onDrawStart);
      socket.off("draw_move", onDrawMove);
      socket.off("canvas_snapshot", onSnapshot);
      socket.off("canvas_cleared", onClear);
      socket.off("round_end", onRoundEnd);
    };
  }, [drawStroke, redraw]);

  // Fetch open public rooms with polling and real-time socket events
  const fetchPublicRooms = useCallback(() => {
    fetch("/api/rooms")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setPublicRooms(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (room) return;
    fetchPublicRooms();
    socket.emit("get_rooms", (data: any) => {
      if (Array.isArray(data)) setPublicRooms(data);
    });

    const onPublicRooms = (rooms: any[]) => {
      if (Array.isArray(rooms)) setPublicRooms(rooms);
    };

    socket.on("public_rooms", onPublicRooms);
    const interval = setInterval(fetchPublicRooms, 3000);

    return () => {
      clearInterval(interval);
      socket.off("public_rooms", onPublicRooms);
    };
  }, [room, fetchPublicRooms]);

  const roomRef = useRef<RoomState | null>(null);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  useEffect(() => {
    if (room) redraw(room.strokes);
  }, [room?.id, room?.phase, redraw]);
  useEffect(() => {
    if (room?.phase === "drawing") {
      const id = setInterval(() => setRemaining((v) => Math.max(0, v - 250)), 250);
      return () => clearInterval(id);
    }
  }, [room?.phase, room?.round]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.chat.length]);

  // Copy helper functions
  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/?room=${encodeURIComponent(code)}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    } else {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyRoomCode = (code: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const createRoom = () => {
    setError("");
    if (!name.trim()) return setError("Enter your nickname first.");
    socket.emit(
      "create_room",
      { hostName: name, settings, isPublic },
      (res: { ok: boolean; roomId?: string; error?: string }) => {
        if (!res?.ok) setError(res?.error || "Could not create room.");
        else setRoomCode(res.roomId || "");
      }
    );
  };

  const joinRoom = (code = roomCode) => {
    setError("");
    if (!name.trim()) return setError("Enter your nickname first.");
    if (!code.trim()) return setError("Enter a room code.");
    socket.emit(
      "join_room",
      { roomId: code, playerName: name },
      (res: { ok: boolean; error?: string }) => {
        if (!res?.ok) setError(res?.error || "Could not join room.");
        else setRoomCode(code.toUpperCase());
      }
    );
  };

  const startGame = () =>
    socket.emit("start_game", {}, (res: { ok: boolean; error?: string }) => {
      if (!res?.ok) setError(res?.error || "Could not start game.");
    });

  const coord = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const pointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = coord(e);
    socket.emit(
      "draw_start",
      { x: p.x, y: p.y, color, size, tool },
      (res: { strokeId?: string }) => {
        activeStroke.current = res?.strokeId || null;
      }
    );
  };

  const pointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !canDraw) return;
    const p = coord(e);
    socket.emit("draw_move", p);
  };

  const pointerUp = () => {
    if (drawing.current) {
      drawing.current = false;
      socket.emit("draw_end");
      activeStroke.current = null;
    }
  };

  const sendGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;
    socket.emit("guess", guess);
    setGuess("");
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    socket.emit("chat", chatText);
    setChatText("");
  };

  // --- LANDING PAGE VIEW ---
  if (!room) {
    return (
      <main className="landing">
        <div className="hero">
          <div className="brand-mark">✦</div>
          <div className="eyebrow">THE ONLINE DRAWING PARTY</div>
          <h1>
            Doodle <span>Party</span>
          </h1>
          <p className="hero-copy">
            Draw something brilliant. Guess something ridiculous. Make a little chaos together.
          </p>
        </div>

        {invitedFromUrl && roomCode && (
          <div className="invite-alert">
            <span>🎉</span>
            <div>
              <b>You were invited to room {roomCode}!</b>
              <p>Type your nickname below and click &quot;Join room&quot; to play with your friends.</p>
            </div>
          </div>
        )}

        <div className="join-layout">
          <section className="panel setup-panel">
            <div className="panel-heading">
              <span className="heading-icon">✎</span>
              <div>
                <h2>Start a room</h2>
                <p>Set the rules and invite your friends.</p>
              </div>
            </div>
            <label>Your nickname</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={18}
              placeholder="e.g. DoodleMaster"
            />
            <div className="settings-grid">
              <div>
                <label>Players</label>
                <select
                  value={settings.maxPlayers}
                  onChange={(e) => setSettings({ ...settings, maxPlayers: +e.target.value })}
                >
                  {[2, 4, 6, 8, 10, 12, 16, 20].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Rounds</label>
                <select
                  value={settings.rounds}
                  onChange={(e) => setSettings({ ...settings, rounds: +e.target.value })}
                >
                  {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Draw time</label>
                <select
                  value={settings.drawTime}
                  onChange={(e) => setSettings({ ...settings, drawTime: +e.target.value })}
                >
                  {[30, 60, 80, 90, 120, 180, 240].map((n) => (
                    <option key={n} value={n}>
                      {n}s
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Word choices</label>
                <select
                  value={settings.wordCount}
                  onChange={(e) => setSettings({ ...settings, wordCount: +e.target.value })}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="full">
                <label>Hints</label>
                <select
                  value={settings.hints}
                  onChange={(e) => setSettings({ ...settings, hints: +e.target.value })}
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "Disabled" : n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <span>Make room public (visible in Open Rooms list)</span>
            </label>

            <button className="primary-btn" onClick={createRoom}>
              {isPublic ? "Create public room" : "Create private room"} <span>↗</span>
            </button>
          </section>

          <section className="panel join-panel">
            <div className="panel-heading">
              <span className="heading-icon purple">⇥</span>
              <div>
                <h2>Join a room</h2>
                <p>Have a code or invite link? Jump right in.</p>
              </div>
            </div>
            <label>Room code</label>
            <div className="join-input">
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={8}
              />
              <button onClick={() => joinRoom()} className="secondary-btn">
                Join room
              </button>
            </div>
            <div className="or-divider">
              <span>OR</span>
            </div>
            <div className="rooms-heading">
              <h3 className="section-mini">Open public rooms ({publicRooms.length})</h3>
              <button className="refresh-btn" onClick={fetchPublicRooms} title="Refresh room list">
                ↻ Refresh
              </button>
            </div>
            {publicRooms.length === 0 ? (
              <div className="empty-rooms">
                <span>☁</span>
                <b>No open rooms right now</b>
                <small>Create a room and share the code or link with friends.</small>
              </div>
            ) : (
              publicRooms.map((r) => (
                <div className="room-row" key={r.id}>
                  <div>
                    <b>{r.id}</b>
                    <small>
                      {r.players}/{r.maxPlayers} players
                    </small>
                  </div>
                  <button className="secondary-btn" onClick={() => joinRoom(r.id)}>
                    Join room ↗
                  </button>
                </div>
              ))
            )}
          </section>
        </div>
        {error && <div className="error-toast">{error}</div>}
        <footer>
          MADE FOR FRIENDS, FUELED BY DOODLES <span>✦</span>
        </footer>
      </main>
    );
  }

  // --- GAME & LOBBY VIEW ---
  const timeLabel = `${Math.floor(remaining / 1000 / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor((remaining / 1000) % 60)
    .toString()
    .padStart(2, "0")}`;
  const isHost = room.hostId === socket.id;

  return (
    <main className="game-shell">
      <header className="game-top">
        <button
          className="brand-small"
          onClick={() => {
            setRoom(null);
            setError("");
          }}
        >
          ✦ <b>Doodle Party</b>
        </button>
        <div className="room-badge">
          <span className="live-dot" />
          <b>{room.id}</b>
          <button
            title="Copy Room Code"
            className="code-copy-btn"
            onClick={() => copyRoomCode(room.id)}
          >
            {copiedCode ? "✓ Code" : "Copy Code"}
          </button>
          <button
            title="Copy Sharable Invite Link"
            className="link-copy-btn"
            onClick={() => copyInviteLink(room.id)}
          >
            {copiedLink ? "✓ Link Copied" : "🔗 Share Link"}
          </button>
        </div>
        <div className="round-badge">
          ROUND <b>{Math.min(room.round, room.settings.rounds)}</b> / {room.settings.rounds}
        </div>
      </header>

      {copiedLink && (
        <div className="toast-copied">
          <span>✓</span> Invite link copied to clipboard! Share it with friends.
        </div>
      )}

      {error && (
        <div className="error-toast inline-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {room.phase === "lobby" ? (
        <section className="lobby panel">
          <div className="lobby-art">✎</div>
          <div className="eyebrow">ROOM {room.id}</div>
          <h1>Gather your crew.</h1>
          <p>Share the room code or send an invite link so anyone can join with one click.</p>

          <div className="invite-box">
            <div className="invite-code-row">
              <span className="invite-code-pill">{room.id}</span>
              <button className="code-action-btn" onClick={() => copyRoomCode(room.id)}>
                {copiedCode ? "✓ Copied" : "Copy Code"}
              </button>
            </div>
            <div className="invite-url-display">
              <span>🔗 Link:</span>
              <code>{`${window.location.origin}/?room=${room.id}`}</code>
            </div>
            <button
              className={`copy-link-btn ${copiedLink ? "copied" : ""}`}
              onClick={() => copyInviteLink(room.id)}
            >
              {copiedLink ? "✓ Invite Link Copied to Clipboard!" : "📋 Copy Sharable Invite Link"}
            </button>
            <small className="invite-hint">
              Anyone clicking this link will automatically open this room.
            </small>
          </div>

          <div className="lobby-players">
            {room.players.map((p, i) => (
              <div className="lobby-player" key={p.id}>
                <div className={`avatar avatar-${i % 6}`}>{p.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <b>
                    {p.name}
                    {p.id === socket.id ? " (you)" : ""}
                  </b>
                  <small>
                    {p.id === room.hostId
                      ? "Room host"
                      : p.ready
                      ? "Ready to play"
                      : "Getting ready…"}
                  </small>
                </div>
                {p.id === room.hostId && <span className="host-tag">HOST</span>}
              </div>
            ))}
          </div>

          <div className="lobby-bottom">
            <div>
              <b>
                {room.players.length} / {room.settings.maxPlayers} players
              </b>
              <small>
                {room.settings.rounds} rounds · {room.settings.drawTime}s per turn ·{" "}
                {room.settings.wordCount} word choices · {room.settings.hints} hints
              </small>
            </div>
            {isHost ? (
              <button
                className="primary-btn"
                disabled={
                  room.players.length < 2 ||
                  room.players.some((p) => !p.ready && p.id !== room.hostId)
                }
                onClick={startGame}
              >
                Start game ↗
              </button>
            ) : (
              <button
                className={`secondary-btn ${me?.ready ? "ready" : ""}`}
                onClick={() => socket.emit("set_ready", !me?.ready)}
              >
                {me?.ready ? "✓ Ready" : "I'm ready"}
              </button>
            )}
          </div>
          {room.players.length < 2 && (
            <small className="helper">At least two players are needed to start.</small>
          )}
        </section>
      ) : (
        <div className="game-layout">
          <section className="play-area">
            <div className="game-status">
              <div className="drawer-info">
                <div className="avatar avatar-2">
                  {room.players
                    .find((p) => p.id === room.drawerId)
                    ?.name.slice(0, 1)
                    .toUpperCase() || "?"}
                </div>
                <div>
                  <small>{isDrawer ? "YOUR TURN TO DRAW" : "DRAWING NOW"}</small>
                  <b>
                    {room.players.find((p) => p.id === room.drawerId)?.name || "Player"}
                  </b>
                </div>
              </div>
              <div className={`timer ${remaining < 15000 ? "urgent" : ""}`}>
                <span>◷</span>
                {room.phase === "drawing"
                  ? timeLabel
                  : room.phase === "choosing"
                  ? "PICK WORD"
                  : room.phase === "roundEnd"
                  ? "ROUND OVER"
                  : "GAME OVER"}
              </div>
              <div className="word-display">
                <small>{isDrawer ? "YOUR WORD" : "GUESS THE WORD"}</small>
                <b>
                  {isDrawer && room.word
                    ? room.word
                    : room.phase === "roundEnd"
                    ? ""
                    : room.phase === "drawing"
                    ? pattern
                    : "Waiting…"}
                </b>
              </div>
            </div>

            {words.length > 0 && isDrawer && room.phase === "choosing" && (
              <div className="word-picker">
                <b>Choose a word to draw</b>
                <div>
                  {words.map((w) => (
                    <button
                      key={w}
                      onClick={() => {
                        socket.emit("word_chosen", w);
                        setWords([]);
                      }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {room.phase === "roundEnd" && (
              <div className="round-overlay">
                <span>✦</span>
                <h2>Round complete!</h2>
                <p>
                  The word was{" "}
                  <b>{roundWord || room.word || "revealed when the round ended"}</b>
                </p>
              </div>
            )}

            {room.phase === "gameOver" && (
              <div className="round-overlay">
                <span>🏆</span>
                <h2>Game over!</h2>
                <p>{[...room.players].sort((a, b) => b.score - a.score)[0]?.name} wins!</p>
                <button className="primary-btn" onClick={() => setRoom(null)}>
                  Play again
                </button>
              </div>
            )}

            <div className="canvas-wrap">
              <canvas
                ref={canvasRef}
                width={1000}
                height={620}
                onPointerDown={pointerDown}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={pointerUp}
                className={canDraw ? "canvas-draw" : "canvas-view"}
              />
            </div>

            <div className="drawing-toolbar">
              <div className="tool-group">
                <button
                  className={tool === "pen" ? "tool active" : "tool"}
                  disabled={!canDraw}
                  onClick={() => setTool("pen")}
                  title="Pen"
                >
                  ✎
                </button>
                <button
                  className={tool === "eraser" ? "tool active" : "tool"}
                  disabled={!canDraw}
                  onClick={() => setTool("eraser")}
                  title="Eraser"
                >
                  ▱
                </button>
                <button
                  className="tool"
                  disabled={!canDraw}
                  onClick={() => socket.emit("draw_undo")}
                  title="Undo"
                >
                  ↶
                </button>
                <button
                  className="tool"
                  disabled={!canDraw}
                  onClick={() => socket.emit("canvas_clear")}
                  title="Clear canvas"
                >
                  ⌫
                </button>
              </div>

              <div className="palette">
                {[
                  "#172033",
                  "#ef4444",
                  "#f97316",
                  "#facc15",
                  "#22c55e",
                  "#06b6d4",
                  "#3b82f6",
                  "#8b5cf6",
                  "#ec4899",
                  "#ffffff",
                ].map((c) => (
                  <button
                    key={c}
                    aria-label={c}
                    disabled={!canDraw}
                    className={color === c ? "swatch selected" : "swatch"}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>

              <div className="brush-control">
                <span>SIZE</span>
                <input
                  type="range"
                  min="2"
                  max="24"
                  value={size}
                  disabled={!canDraw}
                  onChange={(e) => setSize(+e.target.value)}
                />
              </div>
            </div>
          </section>

          <aside className="sidebar">
            <section className="panel score-panel">
              <div className="side-title">
                <h2>Leaderboard</h2>
                <span>✦ LIVE</span>
              </div>
              {[...room.players]
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div className="score-row" key={p.id}>
                    <span className={`rank rank-${i}`}>{i === 0 && p.score > 0 ? "♛" : i + 1}</span>
                    <div className={`avatar avatar-${room.players.indexOf(p) % 6}`}>
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="score-name">
                      <b>
                        {p.name}
                        {p.id === socket.id ? " (you)" : ""}
                      </b>
                      <small>
                        {p.id === room.drawerId
                          ? "✎ drawing"
                          : room.guessed.includes(p.id)
                          ? "✓ guessed"
                          : " "}
                      </small>
                    </div>
                    <strong>{p.score}</strong>
                  </div>
                ))}
            </section>

            <section className="panel chat-panel">
              <div className="side-title">
                <h2>Party chat</h2>
                <span className="chat-count">{room.chat.length}</span>
              </div>
              <div className="chat-feed">
                {room.chat.slice(-60).map((m) => (
                  <div className={`chat-line ${m.kind}`} key={m.id}>
                    {m.kind === "system" ? (
                      <span>{m.text}</span>
                    ) : (
                      <>
                        <b>{m.playerName}</b>
                        <span>{m.text}</span>
                      </>
                    )}
                  </div>
                ))}
                <div ref={chatEnd} />
              </div>
              <form
                className="chat-form"
                onSubmit={isDrawer && room.phase === "drawing" ? sendChat : sendGuess}
              >
                <input
                  value={isDrawer && room.phase === "drawing" ? chatText : guess}
                  onChange={(e) =>
                    isDrawer && room.phase === "drawing"
                      ? setChatText(e.target.value)
                      : setGuess(e.target.value)
                  }
                  placeholder={
                    room.phase === "drawing"
                      ? isDrawer
                        ? "Chat is hidden from guessers"
                        : "Type your guess…"
                      : "Chat…"
                  }
                  disabled={room.phase === "gameOver"}
                />
                <button aria-label="Send message">➤</button>
              </form>
              <small className="chat-hint">
                {room.phase === "drawing" && !isDrawer
                  ? "Guess the word to earn points!"
                  : "Be kind, have fun."}
              </small>
            </section>
          </aside>
        </div>
      )}

      <footer className="game-footer">
        DRAW A LITTLE. LAUGH A LOT.{" "}
        <button
          onClick={() => {
            socket.disconnect();
            socket.connect();
            setRoom(null);
          }}
        >
          Leave room ↗
        </button>
      </footer>
    </main>
  );
}
