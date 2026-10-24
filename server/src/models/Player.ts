import { AvatarData, PlayerDTO } from "../types/game";

/**
 * Encapsulates a player's identity, scoring, connection/readiness state, avatar, and spectator status.
 */
export class Player {
  private _score: number;
  private _ready: boolean;
  private _connected: boolean;
  private _avatar?: AvatarData;
  private _isSpectator: boolean;

  constructor(
    public readonly id: string,
    public readonly name: string,
    score = 0,
    ready = false,
    connected = true,
    avatar?: AvatarData,
    isSpectator = false
  ) {
    this._score = score;
    this._ready = ready;
    this._connected = connected;
    this._avatar = avatar;
    this._isSpectator = isSpectator;
  }

  get score(): number {
    return this._score;
  }

  get ready(): boolean {
    return this._ready;
  }

  get connected(): boolean {
    return this._connected;
  }

  get avatar(): AvatarData | undefined {
    return this._avatar;
  }

  get isSpectator(): boolean {
    return this._isSpectator;
  }

  setAvatar(avatar: AvatarData): void {
    this._avatar = avatar;
  }

  setSpectator(isSpectator: boolean): void {
    this._isSpectator = Boolean(isSpectator);
  }

  addScore(points: number): void {
    this._score += Math.max(0, points);
  }

  resetScore(): void {
    this._score = 0;
  }

  setReady(ready: boolean): void {
    this._ready = Boolean(ready);
  }

  setConnected(connected: boolean): void {
    this._connected = Boolean(connected);
  }

  toJSON(): PlayerDTO {
    return {
      id: this.id,
      name: this.name,
      score: this._score,
      ready: this._ready,
      connected: this._connected,
      avatar: this._avatar,
      isSpectator: this._isSpectator,
    };
  }
}

