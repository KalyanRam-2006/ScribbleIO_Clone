import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { DrawingReplayModal } from "./components/DrawingReplayModal";
import {
  Avatar,
  AvatarData,
  getRandomAvatar,
  AVATAR_COLORS,
  EYE_VARIATIONS,
  MOUTH_VARIATIONS,
  HAT_VARIATIONS,
  renderHat,
  renderMouth,
} from "./components/Avatar";
import { ReportModal } from "./components/ReportModal";
import { LANGUAGES, SupportedLanguage, t } from "./i18n";
import { floodFill } from "./utils/canvas";

export type WordMode = "normal" | "hidden" | "combination";

export type Settings = {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  wordCategory?: string;
  wordMode?: WordMode;
  language?: string;
  enableCustomWords?: boolean;
  customWords?: string[];
  customWordsOnly?: boolean;
};

export type Player = {
  id: string;
  name: string;
  score: number;
  ready: boolean;
  avatar?: AvatarData;
  isSpectator?: boolean;
};
export type Stroke = { id: string; points: { x: number; y: number }[]; color: string; size: number; tool: "pen" | "eraser" | "fill" };
export type ChatItem = { id: string; playerId?: string; playerName: string; text: string; kind: "chat" | "system" | "correct" | "close" | "like" | "dislike"; drawerOnly?: boolean };
export type PreviousDrawing = {
  drawerName: string;
  word: string;
  strokes: Stroke[];
  round: number;
};

export type RoomState = {
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
  previousDrawing?: PreviousDrawing | null;
  likes?: string[];
  dislikes?: string[];
};

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || "";
const socket: Socket = io(SERVER_URL || undefined, { autoConnect: true });
const initialSettings: Settings = {
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

export default function App() {
  // Internationalization language state
  const [lang, setLang] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem("doodle_lang") as SupportedLanguage) || "en";
  });

  const handleLangChange = (newLang: SupportedLanguage) => {
    setLang(newLang);
    localStorage.setItem("doodle_lang", newLang);
  };

  // Local player avatar customizer state
  const [avatar, setAvatar] = useState<AvatarData>(() => {
    try {
      const saved = sessionStorage.getItem("doodle_avatar") || localStorage.getItem("doodle_avatar");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed?.eyes === "number" &&
          typeof parsed?.mouth === "number" &&
          typeof parsed?.color === "number" &&
          typeof parsed?.hat === "number"
        ) {
          return parsed;
        }
      }
    } catch { }
    return getRandomAvatar();
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("doodle_avatar", JSON.stringify(avatar));
      localStorage.setItem("doodle_avatar", JSON.stringify(avatar));
    } catch { }
  }, [avatar]);

  // 7 Decorative personas for the scribble hero
  const [decorativePersonas, setDecorativePersonas] = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({
      color: (i * 3 + 2) % AVATAR_COLORS.length,
      eyes: i % EYE_VARIATIONS.length,
      mouth: (i * 2 + 1) % MOUTH_VARIATIONS.length,
      hat: i % HAT_VARIATIONS.length,
      animKey: 0,
    }))
  );

  // Synchronize persona #3 (center) so whatever the player customizes is reflected in the row
  useEffect(() => {
    setDecorativePersonas((prev) => {
      const next = [...prev];
      next[3] = {
        color: Math.abs(avatar.color) % AVATAR_COLORS.length,
        eyes: Math.abs(avatar.eyes) % EYE_VARIATIONS.length,
        mouth: Math.abs(avatar.mouth) % MOUTH_VARIATIONS.length,
        hat: Math.abs(avatar.hat) % HAT_VARIATIONS.length,
        animKey: (next[3]?.animKey || 0) + 1,
      };
      return next;
    });
  }, [avatar]);

  const [stageAnim, setStageAnim] = useState(false);

  const onPersonaClick = (idx: number) => {
    const p = decorativePersonas[idx];
    if (idx === 3 || (p.color === avatar.color && p.eyes === avatar.eyes && p.mouth === avatar.mouth && p.hat === avatar.hat)) {
      setAvatar(getRandomAvatar());
    } else {
      setAvatar({
        color: p.color,
        eyes: p.eyes,
        mouth: p.mouth,
        hat: p.hat,
      });
    }
    triggerStageAnimation();
  };

  const triggerStageAnimation = () => {
    setStageAnim(false);
    setTimeout(() => setStageAnim(true), 20);
  };

  const stepAvatar = (part: "eyes" | "mouth" | "color" | "hat", step: number) => {
    setAvatar((prev) => {
      const lists = {
        eyes: EYE_VARIATIONS.length,
        mouth: MOUTH_VARIATIONS.length,
        color: AVATAR_COLORS.length,
        hat: HAT_VARIATIONS.length,
      };
      const len = lists[part];
      const cur = (prev[part] + step + len) % len;
      return { ...prev, [part]: cur };
    });
    triggerStageAnimation();
  };

  const randomizeAllAvatar = () => {
    setAvatar(getRandomAvatar());
    triggerStageAnimation();
  };

  const curColor = AVATAR_COLORS[Math.abs(avatar.color) % AVATAR_COLORS.length] || AVATAR_COLORS[6];
  const curEye = EYE_VARIATIONS[Math.abs(avatar.eyes) % EYE_VARIATIONS.length] || EYE_VARIATIONS[0];
  const curMouth = MOUTH_VARIATIONS[Math.abs(avatar.mouth) % MOUTH_VARIATIONS.length] || MOUTH_VARIATIONS[0];
  const curHat = HAT_VARIATIONS[Math.abs(avatar.hat) % HAT_VARIATIONS.length] || HAT_VARIATIONS[1];

  const [isSpectator, setIsSpectator] = useState(false);
  const [reportingTarget, setReportingTarget] = useState<Player | null>(null);
  const [closeToast, setCloseToast] = useState("");
  const [infoToast, setInfoToast] = useState("");

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [enableCustomWords, setEnableCustomWords] = useState(true);
  const [drawerCustomWord, setDrawerCustomWord] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [color, setColor] = useState("#172033");
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState<"pen" | "eraser" | "fill">("pen");
  const [guess, setGuess] = useState("");
  const [chatText, setChatText] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [publicRooms, setPublicRooms] = useState<{ id: string; players: number; maxPlayers: number }[]>([]);
  const [hintPattern, setHintPattern] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [invitedFromUrl, setInvitedFromUrl] = useState(false);
  const [showReplay, setShowReplay] = useState(false);


  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const activeStroke = useRef<string | null>(null);
  const strokeMeta = useRef<Map<string, Stroke>>(new Map());
  const [roundWord, setRoundWord] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  const me = room?.players.find((p) => p.id === socket.id);
  const isDrawer = room?.drawerId === socket.id;
  const isDrawerTurn = Boolean(isDrawer && (room?.phase === "drawing" || room?.phase === "choosing"));
  const canDraw = Boolean(room && room.phase === "drawing" && isDrawer);

  const hasLiked = Boolean(room?.likes?.includes(socket.id || ""));
  const hasDisliked = Boolean(room?.dislikes?.includes(socket.id || ""));
  const likesCount = room?.likes?.length || 0;
  const dislikesCount = room?.dislikes?.length || 0;

  const handleRate = (type: "like" | "dislike") => {
    if (!socket || !room || isDrawer) return;
    socket.emit("rate_drawing", type);
  };

  // Check URL query parameters on load for sharable invite links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room") || params.get("code") || window.location.hash.replace("#", "");
    if (code) {
      const cleanCode = code.trim().toUpperCase();
      setRoomCode(cleanCode);
      setInvitedFromUrl(true);
    }
  }, []);

  // Compute displayed pattern
  const pattern = useMemo(() => {
    if (!room || !room.wordLength) return "";
    if (room.word) return room.word;
    if (hintPattern) return hintPattern;
    if (room.hintPattern) return room.hintPattern;
    return Array.from({ length: room.wordLength }, () => "_").join(" ");
  }, [room?.word, room?.wordLength, room?.hintPattern, hintPattern]);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (!stroke.points.length) return;
    if (stroke.tool === "fill") {
      const pt = stroke.points[0];
      floodFill(ctx, pt.x * ctx.canvas.width, pt.y * ctx.canvas.height, stroke.color);
      return;
    }
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.size;
    ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
    ctx.fillStyle = ctx.strokeStyle;
    const pts = stroke.points;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x * ctx.canvas.width, pts[0].y * ctx.canvas.height, stroke.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0].x * ctx.canvas.width, pts[0].y * ctx.canvas.height);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * ctx.canvas.width, pts[i].y * ctx.canvas.height);
      }
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const redraw = useCallback(
    (strokes: Stroke[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      strokes.forEach((s) => drawStroke(ctx, s));
    },
    [drawStroke]
  );

  // Socket event listener registrations
  useEffect(() => {
    const onState = (s: RoomState) => {
      setRoom(s);
      setRemaining(s.remainingMs || 0);
      if (s.hintPattern) setHintPattern(s.hintPattern);
    };
    const onChoose = (data: { words: string[]; chooseTime?: number }) => {
      setWords(data.words);
      setDrawerCustomWord("");
      if (data.chooseTime) {
        setRemaining(data.chooseTime * 1000);
      }
    };
    const onChatMessage = (item: ChatItem) => {
      setRoom((prev) => {
        if (!prev) return prev;
        if (prev.chat.some((m) => m.id === item.id)) return prev;
        return { ...prev, chat: [...prev.chat, item] };
      });
    };
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
    const onDrawData = (stroke: Stroke) => {
      strokeMeta.current.set(stroke.id, stroke);
      const c = canvasRef.current?.getContext("2d");
      if (c) drawStroke(c, stroke);
    };
    const onGuessResult = (data: { correct: boolean; close?: boolean; text?: string; playerId?: string; playerName?: string }) => {
      if (data.close) {
        setCloseToast(data.text ? `"${data.text}" ${t("closeGuess", lang)}` : t("closeGuess", lang));
        setTimeout(() => setCloseToast(""), 3200);
      }
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
    const onKicked = (data: { reason?: string }) => {
      setError(data?.reason || t("playerKickedToast", lang));
      setRoom(null);
    };
    const onBanned = (data: { reason?: string }) => {
      setError(data?.reason || t("playerBannedToast", lang));
      setRoom(null);
    };

    socket.on("room_state", onState);
    socket.on("choose_word", onChoose);
    socket.on("chat_message", onChatMessage);
    socket.on("round_begun", onStart);
    socket.on("hint", onHint);
    socket.on("draw_start", onDrawStart);
    socket.on("draw_move", onDrawMove);
    socket.on("draw_data", onDrawData);
    socket.on("guess_result", onGuessResult);
    socket.on("canvas_snapshot", onSnapshot);
    socket.on("canvas_cleared", onClear);
    socket.on("round_end", onRoundEnd);
    socket.on("kicked", onKicked);
    socket.on("banned", onBanned);

    return () => {
      socket.off("room_state", onState);
      socket.off("choose_word", onChoose);
      socket.off("chat_message", onChatMessage);
      socket.off("round_begun", onStart);
      socket.off("hint", onHint);
      socket.off("draw_start", onDrawStart);
      socket.off("draw_move", onDrawMove);
      socket.off("draw_data", onDrawData);
      socket.off("guess_result", onGuessResult);
      socket.off("canvas_snapshot", onSnapshot);
      socket.off("canvas_cleared", onClear);
      socket.off("round_end", onRoundEnd);
      socket.off("kicked", onKicked);
      socket.off("banned", onBanned);
    };
  }, [drawStroke, redraw, lang]);

  // Fetch open public rooms with polling and real-time socket events
  const fetchPublicRooms = useCallback(() => {
    fetch(`${SERVER_URL}/api/rooms`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setPublicRooms(data);
      })
      .catch(() => { });
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
    if (room?.phase === "drawing" || room?.phase === "choosing") {
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

  // Host Controls: Kick, Ban, Votekick
  const handleKickPlayer = (playerId: string) => {
    socket.emit("kick_player", playerId, (res: { ok: boolean; error?: string }) => {
      if (!res?.ok) setError(res?.error || "Could not kick player");
    });
  };

  const handleBanPlayer = (playerId: string) => {
    socket.emit("ban_player", playerId, (res: { ok: boolean; error?: string }) => {
      if (!res?.ok) setError(res?.error || "Could not ban player");
    });
  };

  const handleVoteKickPlayer = (playerId: string) => {
    socket.emit("votekick_player", playerId, (res: { ok: boolean; error?: string; votes?: number; threshold?: number }) => {
      if (!res?.ok) setError(res?.error || "Could not vote kick");
    });
  };

  // Spectator Mode toggle
  const toggleSpectator = () => {
    const nextSpectator = !me?.isSpectator;
    setIsSpectator(nextSpectator);
    socket.emit("toggle_spectator", nextSpectator, (res: { ok: boolean }) => {
      if (res?.ok) {
        setInfoToast(nextSpectator ? t("spectating", lang) : t("readyToPlay", lang));
        setTimeout(() => setInfoToast(""), 2500);
      }
    });
  };

  // Report Player submission
  const handleReportSubmit = (reason: string) => {
    if (!reportingTarget) return;
    socket.emit("report_player", { targetId: reportingTarget.id, reason }, (res: { ok: boolean }) => {
      setReportingTarget(null);
      if (res?.ok) {
        setInfoToast(t("reportSentToast", lang));
        setTimeout(() => setInfoToast(""), 3500);
      }
    });
  };

  // Create room with category, mode, language and custom words settings
  const createRoom = () => {
    setError("");
    if (!name.trim()) return setError("Enter your nickname first.");

    const roomSettings: Settings = {
      ...settings,
      enableCustomWords,
      wordCategory: settings.wordCategory || "all",
      wordMode: settings.wordMode || "normal",
      language: settings.language || "en",
    };

    socket.emit(
      "create_room",
      { hostName: name, settings: roomSettings, isPublic, avatar, isSpectator },
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
      { roomId: code, playerName: name, avatar, isSpectator },
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

  // Drawer custom word selection submission
  const handleDrawerCustomWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerCustomWord.trim()) return;
    socket.emit("choose_custom_word", drawerCustomWord.trim(), (res: { ok: boolean; error?: string }) => {
      if (!res?.ok) {
        setError(res?.error || "Could not set custom word.");
      } else {
        setWords([]);
        setDrawerCustomWord("");
      }
    });
  };

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
    const p = coord(e);
    if (tool === "fill") {
      socket.emit("draw_start", { x: p.x, y: p.y, color, size, tool: "fill" });
      return;
    }
    drawing.current = true;
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
    if (me?.isSpectator) return;
    if (!guess.trim()) return;
    socket.emit("guess", { text: guess.trim() });
    setGuess("");
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (me?.isSpectator) return;
    if (!chatText.trim()) return;
    socket.emit("chat", { text: chatText.trim() });
    setChatText("");
  };


  // Language selector element (used in both views)
  const languageSelector = (
    <div className="lang-selector-wrap">
      <span>🌐</span>
      <select
        value={lang}
        onChange={(e) => handleLangChange(e.target.value as SupportedLanguage)}
        aria-label="Select language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.name}
          </option>
        ))}
      </select>
    </div>
  );

  // --- LANDING PAGE VIEW ---
  if (!room) {
    return (
      <main className="landing">
        <header style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          {languageSelector}
        </header>

        {/* DoodleDash / Skribbl-style title + decorative personas + avatar customizer */}
        <section className="scribble-hero" id="scribbleHero">
          <div className="scribble-title-wrap">
            <span className="scribble-pencil" aria-hidden="true">✎</span>
            <h1 className="scribble-title" aria-label="skribbl.io">
              <span>s</span><span>k</span><span>r</span><span>i</span><span>b</span><span>b</span><span>l</span>
              <span className="scribble-dot">•</span><span>i</span><span>o</span>
            </h1>
            <span className="scribble-sparkle" aria-hidden="true">✦</span>
          </div>
          <p className="scribble-tagline">Draw, guess, and laugh with friends or players across the world!</p>

          {/* Seven decorative avatars. Center one reflects player's custom persona; clicking any selects/rerolls it */}
          <div className="scribble-personas" id="scribblePersonas" aria-label="Decorative doodle avatars">
            {decorativePersonas.map((p, idx) => {
              const pColor = AVATAR_COLORS[Math.abs(p.color) % AVATAR_COLORS.length];
              const pEye = EYE_VARIATIONS[Math.abs(p.eyes) % EYE_VARIATIONS.length];
              const pMouth = MOUTH_VARIATIONS[Math.abs(p.mouth) % MOUTH_VARIATIONS.length];
              const pHat = HAT_VARIATIONS[Math.abs(p.hat) % HAT_VARIATIONS.length];
              const isSelected = idx === 3;
              return (
                <button
                  key={`${idx}-${p.animKey}`}
                  className={`scribble-persona ${isSelected ? "scribble-persona-active" : ""}`}
                  type="button"
                  style={{
                    backgroundColor: pColor.hex,
                    boxShadow: isSelected ? "0 0 0 3px #1e293b, 0 0 0 6px #6366f1" : undefined,
                  }}
                  onClick={() => onPersonaClick(idx)}
                  aria-label={`Select doodle avatar ${idx + 1}`}
                  title={isSelected ? "Your current customized persona (click to reroll)" : `Select persona ${idx + 1}`}
                >
                  <span className="mini-hat">{renderHat(pHat, "mini")}</span>
                  <span className="mini-eyes">
                    <span>{pEye.left}</span>
                    <span>{pEye.right}</span>
                  </span>
                  <span className="mini-mouth">{renderMouth(pMouth, "mini")}</span>
                </button>
              );
            })}
          </div>

          {/* Avatar customizer */}
          <div className="scribble-customizer">
            <div className="scribble-customizer-heading">
              <h2><span aria-hidden="true">🎨</span> Your Scribble Persona</h2>
              <button
                type="button"
                className="scribble-randomize"
                id="scribbleRandomize"
                onClick={randomizeAllAvatar}
              >
                🎲 Randomize
              </button>
            </div>

            <div className="scribble-customizer-panel">
              <div className="scribble-controls scribble-controls-left">
                <div className="scribble-control-row">
                  <span>Eyes</span>
                  <button type="button" onClick={() => stepAvatar("eyes", -1)} aria-label="Previous eyes">‹</button>
                </div>
                <div className="scribble-control-row">
                  <span>Mouth</span>
                  <button type="button" onClick={() => stepAvatar("mouth", -1)} aria-label="Previous mouth">‹</button>
                </div>
                <div className="scribble-control-row">
                  <span>Color</span>
                  <button type="button" onClick={() => stepAvatar("color", -1)} aria-label="Previous color">‹</button>
                </div>
                <div className="scribble-control-row">
                  <span>Hat</span>
                  <button type="button" onClick={() => stepAvatar("hat", -1)} aria-label="Previous hat">‹</button>
                </div>
              </div>

              <div
                className={`scribble-avatar-stage ${stageAnim ? "scribble-pop" : ""}`}
                id="scribbleAvatarStage"
                aria-label="Avatar preview"
                style={{ backgroundColor: curColor.hex }}
              >
                <div className="scribble-hat" id="scribbleHat">{renderHat(curHat, "xl")}</div>
                <div className="scribble-eyes" id="scribbleEyes">
                  <span>{curEye.left}</span>
                  <span>{curEye.right}</span>
                </div>
                <div className="scribble-mouth" id="scribbleMouth">{renderMouth(curMouth, "xl")}</div>
              </div>

              <div className="scribble-controls scribble-controls-right">
                <div className="scribble-control-row">
                  <button type="button" onClick={() => stepAvatar("eyes", 1)} aria-label="Next eyes">›</button>
                  <span>Eyes</span>
                </div>
                <div className="scribble-control-row">
                  <button type="button" onClick={() => stepAvatar("mouth", 1)} aria-label="Next mouth">›</button>
                  <span>Mouth</span>
                </div>
                <div className="scribble-control-row">
                  <button type="button" onClick={() => stepAvatar("color", 1)} aria-label="Next color">›</button>
                  <span>Color</span>
                </div>
                <div className="scribble-control-row">
                  <button type="button" onClick={() => stepAvatar("hat", 1)} aria-label="Next hat">›</button>
                  <span>Hat</span>
                </div>
              </div>
            </div>
            <p className="scribble-avatar-label" id="scribbleAvatarLabel">
              {curColor.name} · {curEye.name} · {curMouth.name} · {curHat.name}
            </p>

            <div className="scribble-nickname-wrap">
              <label className="scribble-nickname-label">
                {t("nickname", lang)}
              </label>
              <input
                className="scribble-nickname-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={18}
                placeholder={t("nicknamePlaceholder", lang)}
              />
            </div>
          </div>
        </section>

        {invitedFromUrl && roomCode && (
          <div className="invite-alert" style={{ margin: "0 auto 24px", maxWidth: 700 }}>
            <span>🎉</span>
            <div>
              <b>
                {t("invitedAlert", lang)} {roomCode}!
              </b>
              <p>{t("invitedAlertSub", lang)}</p>
            </div>
          </div>
        )}

        <div className="join-layout">
          <section className="panel setup-panel">
            <div className="panel-heading">
              <span className="heading-icon">✎</span>
              <div>
                <h2>{t("startRoom", lang)}</h2>
                <p>{t("startRoomDesc", lang)}</p>
              </div>
            </div>

            <label>{t("nickname", lang)}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={18}
              placeholder={t("nicknamePlaceholder", lang)}
            />
            <div className="settings-grid">
              <div>
                <label>{t("players", lang)}</label>
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
                <label>{t("rounds", lang)}</label>
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
                <label>{t("drawTime", lang)}</label>
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
                <label>{t("wordChoices", lang)}</label>
                <select
                  value={settings.wordCount}
                  onChange={(e) => setSettings({ ...settings, wordCount: +e.target.value })}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>{t("hints", lang)}</label>
                <select
                  value={settings.hints}
                  onChange={(e) => setSettings({ ...settings, hints: +e.target.value })}
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? t("disabled", lang) : n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>{t("wordCategory", lang)}</label>
                <select
                  value={settings.wordCategory || "all"}
                  onChange={(e) => setSettings({ ...settings, wordCategory: e.target.value })}
                >
                  <option value="all">{t("categoryAll", lang)}</option>
                  <option value="animals">{t("categoryAnimals", lang)}</option>
                  <option value="objects">{t("categoryObjects", lang)}</option>
                  <option value="food">{t("categoryFood", lang)}</option>
                </select>
              </div>
              <div>
                <label>{t("wordMode", lang)}</label>
                <select
                  value={settings.wordMode || "normal"}
                  onChange={(e) => setSettings({ ...settings, wordMode: e.target.value as any })}
                >
                  <option value="normal">{t("wordModeNormal", lang)}</option>
                  <option value="hidden">{t("wordModeHidden", lang)}</option>
                  <option value="combination">{t("wordModeCombination", lang)}</option>
                </select>
              </div>
              <div>
                <label>{t("roomLanguage", lang)}</label>
                <select
                  value={settings.language || "en"}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Words Option */}
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={enableCustomWords}
                onChange={(e) => setEnableCustomWords(e.target.checked)}
              />
              <span>{t("enableCustomWords", lang)}</span>
            </label>

            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isSpectator}
                onChange={(e) => setIsSpectator(e.target.checked)}
              />
              <span>{t("joinAsSpectator", lang)}</span>
            </label>

            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <span>{t("makePublic", lang)}</span>
            </label>

            <button className="primary-btn" onClick={createRoom}>
              {isPublic ? t("createPublicRoom", lang) : t("createPrivateRoom", lang)} <span>↗</span>
            </button>
          </section>

          <section className="panel join-panel">
            <div className="panel-heading">
              <span className="heading-icon purple">⇥</span>
              <div>
                <h2>{t("joinRoomTitle", lang)}</h2>
                <p>{t("joinRoomDesc", lang)}</p>
              </div>
            </div>

            <label className="toggle-label" style={{ marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={isSpectator}
                onChange={(e) => setIsSpectator(e.target.checked)}
              />
              <span>{t("joinAsSpectator", lang)}</span>
            </label>

            <label>{t("roomCode", lang)}</label>
            <div className="join-input">
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={8}
              />
              <button onClick={() => joinRoom()} className="secondary-btn">
                {t("joinRoomBtn", lang)}
              </button>
            </div>
            <div className="or-divider">
              <span>OR</span>
            </div>
            <div className="rooms-heading">
              <h3 className="section-mini">
                {t("openRooms", lang)} ({publicRooms.length})
              </h3>
              <button className="refresh-btn" onClick={fetchPublicRooms} title="Refresh room list">
                ↻ {t("refresh", lang)}
              </button>
            </div>
            {publicRooms.length === 0 ? (
              <div className="empty-rooms">
                <span>☁</span>
                <b>{t("noOpenRooms", lang)}</b>
                <small>{t("noOpenRoomsSub", lang)}</small>
              </div>
            ) : (
              publicRooms.map((r) => (
                <div className="room-row" key={r.id}>
                  <div>
                    <b>{r.id}</b>
                    <small>
                      {r.players}/{r.maxPlayers} {t("players", lang).toLowerCase()}
                    </small>
                  </div>
                  <button className="secondary-btn" onClick={() => joinRoom(r.id)}>
                    {t("joinRoomBtn", lang)} ↗
                  </button>
                </div>
              ))
            )}
          </section>
        </div>
        {error && <div className="error-toast">{error}</div>}
        <footer>
          {t("footer", lang)} <span>✦</span>
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

        <div className="top-bar-right">
          {room.previousDrawing && (
            <button className="replay-trigger-btn" onClick={() => setShowReplay(true)}>
              {t("replayLastDrawing", lang)}
            </button>
          )}

          <div className="room-badge">
            <span className="live-dot" />
            <b>{room.id}</b>
            <button
              title="Copy Room Code"
              className="code-copy-btn"
              onClick={() => copyRoomCode(room.id)}
            >
              {copiedCode ? "✓ Code" : t("copyRoomCode", lang)}
            </button>
            <button
              title="Copy Sharable Invite Link"
              className="link-copy-btn"
              onClick={() => copyInviteLink(room.id)}
            >
              {copiedLink ? `✓ ${t("linkCopied", lang)}` : `🔗 ${t("shareLink", lang)}`}
            </button>
          </div>

          <div className="round-badge">
            {t("round", lang)} <b>{Math.min(room.round, room.settings.rounds)}</b> / {room.settings.rounds}
          </div>

          {room.settings.wordMode && room.settings.wordMode !== "normal" && (
            <div className="wordmode-badge" title={t("wordMode", lang)}>
              ⚡ {room.settings.wordMode.toUpperCase()}
            </div>
          )}

          {room.settings.language && room.settings.language !== "en" && (
            <div className="wordmode-badge" title={t("roomLanguage", lang)}>
              🌐 {room.settings.language.toUpperCase()}
            </div>
          )}

          {room.settings.wordCategory && room.settings.wordCategory !== "all" && (
            <div className="category-badge" title={t("wordCategory", lang)}>
              {room.settings.wordCategory === "animals"
                ? t("categoryAnimals", lang)
                : room.settings.wordCategory === "objects"
                  ? t("categoryObjects", lang)
                  : t("categoryFood", lang)}
            </div>
          )}

          {me?.isSpectator && (
            <div className="spectator-pill" title={t("spectating", lang)}>
              👀 {t("spectating", lang)}
            </div>
          )}

          {languageSelector}
        </div>
      </header>

      {closeToast && <div className="toast-close-flame">🔥 {closeToast}</div>}

      {infoToast && (
        <div className="toast-copied">
          <span>✓</span> {infoToast}
        </div>
      )}

      {copiedLink && (
        <div className="toast-copied">
          <span>✓</span> {t("linkCopiedToast", lang)}
        </div>
      )}

      {error && (
        <div className="error-toast inline-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* Drawing Replay Modal */}
      {showReplay && room.previousDrawing && (
        <DrawingReplayModal
          drawing={room.previousDrawing}
          lang={lang}
          onClose={() => setShowReplay(false)}
        />
      )}

      {/* Report Player Modal */}
      {reportingTarget && (
        <ReportModal
          target={reportingTarget}
          lang={lang}
          onClose={() => setReportingTarget(null)}
          onSubmit={handleReportSubmit}
        />
      )}

      {room.phase === "lobby" ? (
        <section className="lobby panel">
          <div className="lobby-art">✎</div>
          <div className="eyebrow">ROOM {room.id}</div>
          <h1>{t("gatherCrew", lang)}</h1>
          <p>{t("gatherCrewDesc", lang)}</p>

          <div className="invite-box">
            <div className="invite-code-row">
              <span className="invite-code-pill">{room.id}</span>
              <button className="code-action-btn" onClick={() => copyRoomCode(room.id)}>
                {copiedCode ? "✓ Copied" : t("copyRoomCode", lang)}
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
              {copiedLink ? `✓ ${t("linkCopied", lang)}!` : `📋 ${t("copyInviteLinkBtn", lang)}`}
            </button>
            <small className="invite-hint">{t("inviteHint", lang)}</small>
          </div>

          <div className="lobby-players">
            {room.players.map((p) => (
              <div className="lobby-player" key={p.id}>
                <Avatar avatar={p.avatar} name={p.name} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>
                    {p.name}
                    {p.id === socket.id ? " (you)" : ""}
                    {p.isSpectator && <span className="spectator-pill">👀 {t("spectatorBadge", lang)}</span>}
                  </b>
                  <small>
                    {p.id === room.hostId
                      ? t("roomHost", lang)
                      : p.ready
                        ? t("readyToPlay", lang)
                        : t("gettingReady", lang)}
                  </small>
                </div>
                {p.id === room.hostId ? (
                  <span className="host-tag">{t("hostTag", lang)}</span>
                ) : (
                  <div className="player-actions">
                    {p.id !== socket.id && (
                      <button
                        className="mod-btn report-btn"
                        title={t("report", lang)}
                        onClick={() => setReportingTarget(p)}
                      >
                        ⚑
                      </button>
                    )}
                    {isHost ? (
                      <>
                        <button
                          className="mod-btn kick-btn"
                          title="Kick player"
                          onClick={() => handleKickPlayer(p.id)}
                        >
                          {t("kick", lang)}
                        </button>
                        <button
                          className="mod-btn ban-btn"
                          title="Ban player"
                          onClick={() => handleBanPlayer(p.id)}
                        >
                          {t("ban", lang)}
                        </button>
                      </>
                    ) : (
                      p.id !== socket.id && (
                        <button
                          className="mod-btn votekick-btn"
                          title="Vote to kick player"
                          onClick={() => handleVoteKickPlayer(p.id)}
                        >
                          {t("voteKick", lang)}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="lobby-bottom">
            <div>
              <b>
                {room.players.length} / {room.settings.maxPlayers} {t("players", lang).toLowerCase()}
              </b>
              <small>
                {room.settings.rounds} {t("rounds", lang).toLowerCase()} · {room.settings.drawTime}s ·{" "}
                {room.settings.wordCount} {t("wordChoices", lang).toLowerCase()} · {room.settings.hints}{" "}
                {t("hints", lang).toLowerCase()}
                {room.settings.wordMode && room.settings.wordMode !== "normal" ? ` · ⚡ ${room.settings.wordMode}` : ""}
                {room.settings.language && room.settings.language !== "en" ? ` · 🌐 ${room.settings.language.toUpperCase()}` : ""}
                {room.settings.wordCategory && room.settings.wordCategory !== "all"
                  ? ` · ${room.settings.wordCategory === "animals" ? t("categoryAnimals", lang) : room.settings.wordCategory === "objects" ? t("categoryObjects", lang) : t("categoryFood", lang)}`
                  : ""}
              </small>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="secondary-btn"
                title="Change or randomize your avatar look"
                onClick={() => {
                  const newAv = getRandomAvatar();
                  setAvatar(newAv);
                  socket.emit("update_avatar", newAv);
                }}
              >
                🎲 Change Look
              </button>
              <button
                type="button"
                className={`secondary-btn ${me?.isSpectator ? "spectating" : ""}`}
                onClick={toggleSpectator}
              >
                {me?.isSpectator ? `🎮 ${t("readyToPlay", lang)}` : `👀 ${t("spectate", lang)}`}
              </button>
              {isHost ? (
                <button
                  className="primary-btn"
                  disabled={
                    room.players.filter((p) => !p.isSpectator).length < 2 ||
                    room.players.some((p) => !p.ready && p.id !== room.hostId && !p.isSpectator)
                  }
                  onClick={startGame}
                >
                  {t("startGameBtn", lang)} ↗
                </button>
              ) : (
                <button
                  className={`secondary-btn ${me?.ready ? "ready" : ""}`}
                  onClick={() => socket.emit("set_ready", !me?.ready)}
                >
                  {me?.ready ? t("readyDone", lang) : t("readyBtn", lang)}
                </button>
              )}
            </div>
          </div>
          {room.players.filter((p) => !p.isSpectator).length < 2 && (
            <small className="helper">{t("minPlayersHelper", lang)}</small>
          )}
        </section>
      ) : (
        <div className="game-layout">
          <section className="play-area">
            <div className="game-status">
              <div className="drawer-info">
                <Avatar
                  avatar={room.players.find((p) => p.id === room.drawerId)?.avatar}
                  name={room.players.find((p) => p.id === room.drawerId)?.name || "?"}
                  size="md"
                />
                <div>
                  <small>{isDrawer ? t("yourTurnDraw", lang) : t("drawingNow", lang)}</small>
                  <b>{room.players.find((p) => p.id === room.drawerId)?.name || "Player"}</b>
                </div>
              </div>
              {(room.phase === "drawing" || room.phase === "roundEnd") && (
                <div className="status-reactions-pill" title={t("drawingReactions", lang)}>
                  <span className={`status-react-badge ${hasLiked ? "reacted" : ""}`}>
                    👍 <b>{likesCount}</b>
                  </span>
                  <span className={`status-react-badge ${hasDisliked ? "reacted" : ""}`}>
                    👎 <b>{dislikesCount}</b>
                  </span>
                </div>
              )}
              <div className={`timer ${remaining < 15000 || room.phase === "choosing" ? "urgent" : ""}`}>
                <span>◷</span>
                {room.phase === "drawing"
                  ? timeLabel
                  : room.phase === "choosing"
                    ? `${t("pickWord", lang)} (${Math.max(0, Math.ceil(remaining / 1000))}s)`
                    : room.phase === "roundEnd"
                      ? t("roundOver", lang)
                      : t("gameOver", lang)}
              </div>
              <div className="word-display">
                <small>{isDrawer ? t("yourWord", lang) : t("guessTheWord", lang)}</small>
                <b>
                  {isDrawer && room.word
                    ? room.word
                    : room.phase === "roundEnd"
                      ? ""
                      : room.phase === "drawing"
                        ? (room.settings.wordMode === "hidden" ? "??? (Hidden Word)" : pattern)
                        : t("waiting", lang)}
                </b>
              </div>
            </div>

            {/* Word Selection Popup with Countdown Timer & Custom Word Option */}
            {words.length > 0 && isDrawer && room.phase === "choosing" && (
              <div className="word-picker">
                <div className="word-picker-header">
                  <div className="word-picker-title-group">
                    <b>{t("chooseWordTitle", lang)}</b>
                    {room.settings.wordCategory && room.settings.wordCategory !== "all" && (
                      <span className="word-picker-cat-tag">
                        {room.settings.wordCategory === "animals"
                          ? t("categoryAnimals", lang)
                          : room.settings.wordCategory === "objects"
                            ? t("categoryObjects", lang)
                            : room.settings.wordCategory === "food"
                              ? t("categoryFood", lang)
                              : room.settings.wordCategory}
                      </span>
                    )}
                  </div>
                  <div className={`word-picker-timer-pill ${remaining <= 5000 ? "urgent" : ""}`}>
                    <span>⏱️</span>
                    <span>{Math.max(0, Math.ceil(remaining / 1000))}s</span>
                  </div>
                </div>
                <div className="word-picker-progress-track">
                  <div
                    className="word-picker-progress-fill"
                    style={{ width: `${Math.min(100, Math.max(0, (remaining / 15000) * 100))}%` }}
                  />
                </div>
                <div className="word-picker-choices">
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

                {room.settings.enableCustomWords !== false && (
                  <div className="custom-word-picker-section">
                    <p>{t("orCustomWord", lang)}</p>
                    <form onSubmit={handleDrawerCustomWordSubmit} className="custom-word-form">
                      <input
                        className="custom-word-input"
                        value={drawerCustomWord}
                        onChange={(e) => setDrawerCustomWord(e.target.value)}
                        placeholder={t("customWordPlaceholder", lang)}
                        maxLength={30}
                      />
                      <button type="submit" className="custom-word-btn">
                        {t("submitCustomWord", lang)}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {room.phase === "roundEnd" && (
              <div className="round-overlay">
                <Avatar
                  avatar={room.players.find((p) => p.id === room.drawerId)?.avatar}
                  name={room.players.find((p) => p.id === room.drawerId)?.name || "?"}
                  size="lg"
                />
                <h2>{t("roundComplete", lang)}</h2>
                <p>
                  {t("theWordWas", lang)}{" "}
                  <b>{roundWord || room.word || "revealed when the round ended"}</b>
                </p>
                <div className="round-rating-summary">
                  <span className="summary-pill like-pill">👍 {likesCount} {t("like", lang)}</span>
                  <span className="summary-pill dislike-pill">👎 {dislikesCount} {t("dislike", lang)}</span>
                </div>
                {room.previousDrawing && (
                  <button
                    className="replay-trigger-btn"
                    style={{ marginTop: 14 }}
                    onClick={() => setShowReplay(true)}
                  >
                    {t("replayLastDrawing", lang)}
                  </button>
                )}
              </div>
            )}

            {room.phase === "gameOver" && (
              <div className="round-overlay">
                <Avatar
                  avatar={[...room.players].sort((a, b) => b.score - a.score)[0]?.avatar}
                  name={[...room.players].sort((a, b) => b.score - a.score)[0]?.name || "Winner"}
                  size="xl"
                />
                <h2>{t("gameOver", lang)}</h2>
                <p>
                  {[...room.players].sort((a, b) => b.score - a.score)[0]?.name} {t("wins", lang)}!
                </p>
                <div style={{ display: "flex", gap: 16, justifyContent: "center", margin: "14px 0", flexWrap: "wrap" }}>
                  {[...room.players].sort((a, b) => b.score - a.score).slice(0, 3).map((p, idx) => (
                    <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 20 }}>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</span>
                      <Avatar avatar={p.avatar} name={p.name} size="md" />
                      <b style={{ fontSize: 13 }}>{p.name}</b>
                      <span style={{ fontSize: 12, opacity: 0.8 }}>{p.score} pts</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button className="primary-btn" onClick={() => setRoom(null)}>
                    {t("playAgain", lang)}
                  </button>
                  {room.previousDrawing && (
                    <button className="replay-trigger-btn" onClick={() => setShowReplay(true)}>
                      {t("replayLastDrawing", lang)}
                    </button>
                  )}
                </div>
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
                className={
                  canDraw
                    ? tool === "fill"
                      ? "canvas-draw canvas-fill-mode"
                      : "canvas-draw"
                    : "canvas-view"
                }
              />
            </div>

            {canDraw ? (
              <div className="drawing-toolbar">
                <div className="tool-group">
                  <button
                    className={tool === "pen" ? "tool active" : "tool"}
                    disabled={!canDraw}
                    onClick={() => setTool("pen")}
                    title={t("pen", lang)}
                    id="tool-pen-btn"
                  >
                    ✎
                  </button>
                  <button
                    className={tool === "fill" ? "tool active" : "tool"}
                    disabled={!canDraw}
                    onClick={() => setTool("fill")}
                    title={t("fillTool", lang)}
                    id="tool-fill-btn"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
                      <path d="M19 11l-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
                      <path d="m5 2 5 5" />
                      <path d="M2 13h15" />
                      <path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" />
                    </svg>
                  </button>
                  <button
                    className={tool === "eraser" ? "tool active" : "tool"}
                    disabled={!canDraw}
                    onClick={() => setTool("eraser")}
                    title={t("eraser", lang)}
                    id="tool-eraser-btn"
                  >
                    ▱
                  </button>
                  <button
                    className="tool"
                    disabled={!canDraw}
                    onClick={() => socket.emit("draw_undo")}
                    title={t("undo", lang) || "Undo"}
                    id="tool-undo-btn"
                  >
                    ↶
                  </button>
                  <button
                    className="tool"
                    disabled={!canDraw}
                    onClick={() => socket.emit("canvas_clear")}
                    title={t("clearCanvas", lang)}
                    id="tool-clear-btn"
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

                <div className="drawer-reaction-badge" title={t("drawingReactions", lang)}>
                  <span className="drawer-reaction-item green" title="Likes">
                    👍 <span>{likesCount}</span>
                  </span>
                  <span className="drawer-reaction-item red" title="Dislikes">
                    👎 <span>{dislikesCount}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="rating-toolbar">
                <div className="rating-prompt">
                  <span>{t("rateDrawing", lang)}:</span>
                  <span className="artist-tag">
                    {room.players.find((p) => p.id === room.drawerId)?.name || "Artist"}
                  </span>
                </div>

                <div className="rating-buttons-group">
                  <button
                    type="button"
                    className={`rate-btn rate-btn-like ${hasLiked ? "active" : ""}`}
                    onClick={() => handleRate("like")}
                    disabled={room.phase !== "drawing" && room.phase !== "roundEnd"}
                    title={t("like", lang)}
                    id="rate-like-btn"
                  >
                    <span className="btn-icon">👍</span>
                    <span className="btn-label">{t("like", lang)}</span>
                    <span className="count-pill">{likesCount}</span>
                  </button>

                  <button
                    type="button"
                    className={`rate-btn rate-btn-dislike ${hasDisliked ? "active" : ""}`}
                    onClick={() => handleRate("dislike")}
                    disabled={room.phase !== "drawing" && room.phase !== "roundEnd"}
                    title={t("dislike", lang)}
                    id="rate-dislike-btn"
                  >
                    <span className="btn-icon">👎</span>
                    <span className="btn-label">{t("dislike", lang)}</span>
                    <span className="count-pill">{dislikesCount}</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="sidebar">
            <section className="panel score-panel">
              <div className="side-title">
                <h2>{t("leaderboard", lang)}</h2>
                <span>✦ {t("live", lang)}</span>
              </div>
              {[...room.players]
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div className="score-row" key={p.id}>
                    <span className={`rank rank-${i}`}>{i === 0 && p.score > 0 ? "♛" : i + 1}</span>
                    <Avatar avatar={p.avatar} name={p.name} size="sm" />
                    <div className="score-name">
                      <b>
                        {p.name}
                        {p.id === socket.id ? " (you)" : ""}
                        {p.isSpectator && <span className="spectator-pill" style={{ marginLeft: 4, fontSize: 10, padding: "1px 5px" }}>👀</span>}
                      </b>
                      <small>
                        {p.isSpectator
                          ? t("spectatorBadge", lang)
                          : p.id === room.drawerId
                            ? t("drawingTag", lang)
                            : room.guessed.includes(p.id)
                              ? t("guessedTag", lang)
                              : " "}
                      </small>
                    </div>
                    <strong>{p.score}</strong>

                    {/* In-game player moderation actions */}
                    {p.id !== socket.id && (
                      <div className="player-actions">
                        <button
                          className="mod-btn report-btn"
                          title={t("report", lang)}
                          onClick={() => setReportingTarget(p)}
                        >
                          ⚑
                        </button>
                        {p.id !== room.hostId && (
                          isHost ? (
                            <>
                              <button
                                className="mod-btn kick-btn"
                                title="Kick"
                                onClick={() => handleKickPlayer(p.id)}
                              >
                                ✕
                              </button>
                              <button
                                className="mod-btn ban-btn"
                                title="Ban"
                                onClick={() => handleBanPlayer(p.id)}
                              >
                                ⊘
                              </button>
                            </>
                          ) : (
                            <button
                              className="mod-btn votekick-btn"
                              title="Vote Kick"
                              onClick={() => handleVoteKickPlayer(p.id)}
                            >
                              !
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </section>

            <section className="panel chat-panel">
              <div className="side-title">
                <h2>{t("partyChat", lang)}</h2>
                <span className="chat-count">{room.chat.length}</span>
              </div>
              <div className="chat-feed">
                {room.chat.slice(-60).map((m) => (
                  <div className={`chat-line ${m.kind}${m.drawerOnly ? " drawer-only" : ""}`} key={m.id}>
                    {m.kind === "system" ? (
                      <span>{m.text}</span>
                    ) : m.kind === "like" ? (
                      <div className="chat-reaction-notify like-notify">
                        <span className="chat-reaction-badge like-badge">👍</span>
                        <div className="chat-reaction-content">
                          <b className="chat-reaction-name">{m.playerName}</b>
                          <span className="chat-reaction-msg">{t("likedDrawing", lang) || m.text}</span>
                        </div>
                      </div>
                    ) : m.kind === "dislike" ? (
                      <div className="chat-reaction-notify dislike-notify">
                        <span className="chat-reaction-badge dislike-badge">👎</span>
                        <div className="chat-reaction-content">
                          <b className="chat-reaction-name">{m.playerName}</b>
                          <span className="chat-reaction-msg">{t("dislikedDrawing", lang) || m.text}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <b>{m.playerName}</b>
                        {m.drawerOnly && (
                          <span className="drawer-hidden-badge" title={t("drawerOnlyNotice", lang)}>
                            🔒 {t("hiddenFromTeammates", lang)}
                          </span>
                        )}
                        <span>{m.text}</span>
                      </>
                    )}
                  </div>
                ))}
                <div ref={chatEnd} />
              </div>
              <form
                className="chat-form"
                onSubmit={isDrawerTurn ? sendChat : sendGuess}
              >
                <input
                  value={isDrawerTurn ? chatText : guess}
                  onChange={(e) =>
                    isDrawerTurn
                      ? setChatText(e.target.value)
                      : setGuess(e.target.value)
                  }
                  placeholder={
                    me?.isSpectator
                      ? "👀 " + (t("spectatorBadge", lang) ? `${t("spectatorBadge", lang)} (watching only)` : "You are spectating (watching only)")
                      : isDrawerTurn
                        ? t("chatHiddenFromGuessers", lang)
                        : room.phase === "drawing"
                          ? t("typeYourGuess", lang)
                          : t("chatPlaceholder", lang)
                  }
                  disabled={room.phase === "gameOver" || Boolean(me?.isSpectator)}
                />
                <button
                  aria-label="Send message"
                  disabled={room.phase === "gameOver" || Boolean(me?.isSpectator)}
                >
                  ➤
                </button>
              </form>
              <small className="chat-hint">
                {me?.isSpectator
                  ? "👀 Spectators can only watch the game."
                  : isDrawerTurn
                    ? t("drawerOnlyNotice", lang)
                    : room.phase === "drawing" && !isDrawer
                      ? t("guessHint", lang)
                      : t("beKind", lang)}
              </small>
            </section>
          </aside>
        </div>
      )}

      <footer className="game-footer">
        {t("footer", lang)}{" "}
        <button
          type="button"
          className="spectator-toggle-link"
          style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontWeight: 600, margin: "0 10px" }}
          onClick={toggleSpectator}
        >
          {me?.isSpectator ? `🎮 ${t("readyToPlay", lang)}` : `👀 ${t("spectate", lang)}`}
        </button>
        <button
          onClick={() => {
            socket.disconnect();
            socket.connect();
            setRoom(null);
          }}
        >
          {t("leaveRoom", lang)} ↗
        </button>
      </footer>
    </main>
  );
}
