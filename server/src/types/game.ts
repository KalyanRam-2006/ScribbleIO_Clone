export type WordCategory = "all" | "animals" | "objects" | "food" | string;

export type Settings = {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  wordCategory?: WordCategory;
  enableCustomWords?: boolean;
  customWords?: string[];
  customWordsOnly?: boolean;
};

export type Phase = "lobby" | "choosing" | "drawing" | "roundEnd" | "gameOver";

export type ChatItem = {
  id: string;
  playerId?: string;
  playerName: string;
  text: string;
  kind: "chat" | "system" | "correct" | "like" | "dislike";
  drawerOnly?: boolean;
};

export type Point = {
  x: number;
  y: number;
};

export type Stroke = {
  id: string;
  points: Point[];
  color: string;
  size: number;
  tool: "pen" | "eraser" | "fill";
};

export type PlayerDTO = {
  id: string;
  name: string;
  score: number;
  ready: boolean;
  connected: boolean;
};

export type PreviousDrawing = {
  drawerName: string;
  word: string;
  strokes: Stroke[];
  round: number;
};

export type RoomStateDTO = {
  id: string;
  hostId: string;
  settings: Settings;
  players: PlayerDTO[];
  phase: Phase;
  round: number;
  drawerId?: string;
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
