export type Settings = {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
};

export type Phase = "lobby" | "choosing" | "drawing" | "roundEnd" | "gameOver";

export type ChatItem = {
  id: string;
  playerId?: string;
  playerName: string;
  text: string;
  kind: "chat" | "system" | "correct";
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
  tool: "pen" | "eraser";
};

export type PlayerDTO = {
  id: string;
  name: string;
  score: number;
  ready: boolean;
  connected: boolean;
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
};
