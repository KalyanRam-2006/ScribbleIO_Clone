import { useEffect, useRef, useState, useCallback } from "react";
import { Stroke } from "../App";
import { SupportedLanguage, t } from "../i18n";
import { floodFill } from "../utils/canvas";

interface PreviousDrawing {
  drawerName: string;
  word: string;
  strokes: Stroke[];
  round: number;
}

interface DrawingReplayModalProps {
  drawing: PreviousDrawing;
  lang: SupportedLanguage;
  onClose: () => void;
}

export function DrawingReplayModal({ drawing, lang, onClose }: DrawingReplayModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [progress, setProgress] = useState(0);

  // Playback cursor positions
  const cursorRef = useRef<{ strokeIdx: number; ptIdx: number }>({ strokeIdx: 0, ptIdx: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Total points calculation for progress bar
  const totalPoints = useRef(
    drawing.strokes.reduce((sum, s) => sum + Math.max(1, s.points.length), 0)
  ).current;
  const pointsDrawnRef = useRef(0);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const resetReplay = useCallback(() => {
    cursorRef.current = { strokeIdx: 0, ptIdx: 0 };
    pointsDrawnRef.current = 0;
    setProgress(0);
    clearCanvas();
    setIsPlaying(true);
  }, [clearCanvas]);

  // Main step render function
  const stepReplay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { strokes } = drawing;
    let { strokeIdx, ptIdx } = cursorRef.current;

    // How many points to draw per frame based on speed multiplier
    const stepsThisFrame = Math.max(1, speed * 2);

    for (let i = 0; i < stepsThisFrame; i++) {
      if (strokeIdx >= strokes.length) {
        setIsPlaying(false);
        setProgress(100);
        return;
      }

      const stroke = strokes[strokeIdx];
      const pts = stroke.points;

      if (!pts || pts.length === 0) {
        strokeIdx++;
        ptIdx = 0;
        continue;
      }

      if (stroke.tool === "fill") {
        floodFill(ctx, pts[0].x * canvas.width, pts[0].y * canvas.height, stroke.color);
        strokeIdx++;
        ptIdx = 0;
        pointsDrawnRef.current++;
        continue;
      }

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke.size;
      ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
      ctx.fillStyle = ctx.strokeStyle;

      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(
          pts[0].x * canvas.width,
          pts[0].y * canvas.height,
          stroke.size / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        strokeIdx++;
        ptIdx = 0;
        pointsDrawnRef.current++;
      } else {
        if (ptIdx === 0) {
          ptIdx = 1;
          pointsDrawnRef.current++;
        }
        if (ptIdx < pts.length) {
          ctx.beginPath();
          ctx.moveTo(pts[ptIdx - 1].x * canvas.width, pts[ptIdx - 1].y * canvas.height);
          ctx.lineTo(pts[ptIdx].x * canvas.width, pts[ptIdx].y * canvas.height);
          ctx.stroke();
          ptIdx++;
          pointsDrawnRef.current++;
        }
        if (ptIdx >= pts.length) {
          strokeIdx++;
          ptIdx = 0;
        }
      }
      ctx.restore();
    }

    cursorRef.current = { strokeIdx, ptIdx };
    const pct = totalPoints > 0 ? Math.min(100, Math.round((pointsDrawnRef.current / totalPoints) * 100)) : 100;
    setProgress(pct);
  }, [drawing, speed, totalPoints]);

  useEffect(() => {
    clearCanvas();
  }, [clearCanvas]);

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const loop = () => {
      stepReplay();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, stepReplay]);

  return (
    <div className="replay-backdrop" onClick={onClose}>
      <div className="replay-modal" onClick={(e) => e.stopPropagation()}>
        <div className="replay-header">
          <div>
            <h3>
              {t("replayTitle", lang)} · {t("replayRound", lang)} {drawing.round}
            </h3>
            <p>
              {t("replayingBy", lang)} <b>{drawing.drawerName}</b> ({t("theWordWas", lang)} &ldquo;
              <b>{drawing.word}</b>&rdquo;)
            </p>
          </div>
          <button className="replay-close-btn" onClick={onClose} title={t("close", lang)}>
            ✕
          </button>
        </div>

        <div className="replay-canvas-wrap">
          <canvas ref={canvasRef} width={1000} height={620} />
        </div>

        <div className="replay-controls">
          <div className="replay-progress-bar">
            <div className="replay-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <button
            className={`replay-ctrl-btn ${isPlaying ? "" : "primary"}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? `⏸ ${t("pause", lang)}` : `▶ ${t("play", lang)}`}
          </button>

          <button className="replay-ctrl-btn" onClick={resetReplay}>
            ↺ {t("restart", lang)}
          </button>

          <div className="speed-group">
            <span>{t("speed", lang)}:</span>
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                className={`speed-btn ${speed === s ? "active" : ""}`}
                onClick={() => setSpeed(s as 1 | 2 | 4)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
