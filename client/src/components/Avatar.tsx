import React from "react";

export type AvatarData = {
  eyes: number;
  mouth: number;
  color: number;
  hat: number;
};

export const AVATAR_COLORS = [
  { name: "Sunny Butter", hex: "#FBBF24" },
  { name: "Mint Emerald", hex: "#34D399" },
  { name: "Coral Salmon", hex: "#F87171" },
  { name: "Sky Blue", hex: "#60A5FA" },
  { name: "Lavender Pop", hex: "#A78BFA" },
  { name: "Electric Pink", hex: "#F472B6" },
  { name: "Bright Lime", hex: "#A3E635" },
  { name: "Peach Orange", hex: "#FB923C" },
];

export const EYE_VARIATIONS = [
  { name: "Classic", left: "●", right: "●" },
  { name: "Wink", left: "●", right: "━" },
  { name: "Surprised", left: "◉", right: "◉" },
  { name: "Crossed", left: "×", right: "×" },
  { name: "Anime Sparkle", left: "★", right: "★" },
  { name: "Sleepy", left: "━", right: "━" },
];

export const MOUTH_VARIATIONS = [
  { name: "Smile", text: "⌣" },
  { name: "Joyful Grin", text: "▰" },
  { name: "Tongue Out", text: "😛" },
  { name: "Neutral Pout", text: "━" },
  { name: "Big Laugh", text: "ᴗ" },
  { name: "Cat :3", text: "ω" },
  { name: "Surprised O", text: "○" },
  { name: "Confident Smirk", text: "⌁" },
];

export const HAT_VARIATIONS = [
  { name: "Party Hat", text: "🎉" },
  { name: "Golden Crown", text: "👑" },
  { name: "Gamer Cap", text: "🧢" },
  { name: "Golden Halo", text: "😇" },
  { name: "Sprout Plant", text: "🌱" },
  { name: "Top Hat", text: "🎩" },
  { name: "None", text: "" },
];

export function getRandomAvatar(): AvatarData {
  return {
    eyes: Math.floor(Math.random() * EYE_VARIATIONS.length),
    mouth: Math.floor(Math.random() * MOUTH_VARIATIONS.length),
    color: Math.floor(Math.random() * AVATAR_COLORS.length),
    hat: Math.floor(Math.random() * HAT_VARIATIONS.length),
  };
}

/**
 * Pure floating Golden Halo SVG ring with golden gradient & glow (NO face).
 */
export function GoldenHaloSvg({ size = 32 }: { size?: number }) {
  const height = Math.max(10, Math.round(size * 0.42));
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 44 18"
      fill="none"
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        <filter id="haloGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="haloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Glow aura */}
      <ellipse cx="22" cy="9" rx="18" ry="6" stroke="#FDE047" strokeWidth="4.5" opacity="0.6" filter="url(#haloGlow)" />
      {/* Cartoon ink shadow */}
      <ellipse cx="22" cy="10" rx="17" ry="5.5" stroke="#000c2b" strokeWidth="3.5" />
      {/* Main golden ring */}
      <ellipse cx="22" cy="9" rx="17" ry="5.5" stroke="url(#haloGrad)" strokeWidth="3" />
      {/* Inner highlight */}
      <ellipse cx="22" cy="8.2" rx="14.5" ry="4" stroke="#FFFBEB" strokeWidth="1" opacity="0.8" />
    </svg>
  );
}

/**
 * Pure mouth with tongue sticking out (NO yellow face).
 */
export function TongueOutSvg({ size = 24 }: { size?: number }) {
  const height = Math.max(12, Math.round(size * 0.68));
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 34 22"
      fill="none"
      style={{ overflow: "visible", display: "block" }}
    >
      {/* Dark mouth line */}
      <path
        d="M 5 6 Q 17 9 29 6"
        stroke="#000c2b"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Playful pink tongue */}
      <path
        d="M 12 7 C 12 16, 14 20, 17 20 C 20 20, 22 16, 22 7 Z"
        fill="#F43F5E"
        stroke="#000c2b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Tongue center crease */}
      <path
        d="M 17 8 L 17 15"
        stroke="#9F1239"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type AvatarScale = "xs" | "sm" | "md" | "lg" | "xl" | "mini";

export function renderHat(hat: { name: string; text: string }, size: AvatarScale = "md") {
  if (!hat || !hat.name || hat.name === "None" || !hat.text) return null;
  if (hat.name === "Golden Halo") {
    const pixelSizes: Record<AvatarScale, number> = { xs: 18, sm: 24, md: 32, lg: 44, xl: 64, mini: 24 };
    return <GoldenHaloSvg size={pixelSizes[size]} />;
  }
  return <span>{hat.text}</span>;
}

export function renderMouth(mouth: { name: string; text: string }, size: AvatarScale = "md") {
  if (!mouth) return null;
  if (mouth.name === "Tongue Out") {
    const pixelSizes: Record<AvatarScale, number> = { xs: 13, sm: 17, md: 22, lg: 28, xl: 40, mini: 16 };
    return <TongueOutSvg size={pixelSizes[size]} />;
  }
  return <span>{mouth.text}</span>;
}

interface AvatarProps {
  avatar?: AvatarData | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  animate?: boolean;
}

export function Avatar({
  avatar,
  name = "P",
  size = "md",
  className = "",
  animate = false,
}: AvatarProps) {
  const safeAvatar = {
    eyes: typeof avatar?.eyes === "number" && !isNaN(avatar.eyes)
      ? Math.abs(avatar.eyes) % EYE_VARIATIONS.length
      : Math.abs(name.charCodeAt(0) || 0) % EYE_VARIATIONS.length,
    mouth: typeof avatar?.mouth === "number" && !isNaN(avatar.mouth)
      ? Math.abs(avatar.mouth) % MOUTH_VARIATIONS.length
      : Math.abs((name.charCodeAt(1) || 0) + 1) % MOUTH_VARIATIONS.length,
    color: typeof avatar?.color === "number" && !isNaN(avatar.color)
      ? Math.abs(avatar.color) % AVATAR_COLORS.length
      : Math.abs((name.charCodeAt(0) || 0) + 2) % AVATAR_COLORS.length,
    hat: typeof avatar?.hat === "number" && !isNaN(avatar.hat)
      ? Math.abs(avatar.hat) % HAT_VARIATIONS.length
      : name.length % HAT_VARIATIONS.length,
  };

  const eyeIdx = safeAvatar.eyes;
  const mouthIdx = safeAvatar.mouth;
  const colorIdx = safeAvatar.color;
  const hatIdx = safeAvatar.hat;

  const bg = AVATAR_COLORS[colorIdx]?.hex || "#A3E635";
  const eye = EYE_VARIATIONS[eyeIdx];
  const mouth = MOUTH_VARIATIONS[mouthIdx];
  const hat = HAT_VARIATIONS[hatIdx];

  const config = {
    xs: {
      box: { width: 30, height: 30, borderRadius: 9, borderWidth: 2, boxShadow: "0 2px 0 #000c2b" },
      hat: { top: -10, fontSize: 13 },
      eyes: { fontSize: 8, gap: 5, marginTop: 4 },
      mouth: { fontSize: 9, marginTop: 1 },
    },
    sm: {
      box: { width: 38, height: 38, borderRadius: 12, borderWidth: 2.5, boxShadow: "0 2.5px 0 #000c2b" },
      hat: { top: -12, fontSize: 16 },
      eyes: { fontSize: 11, gap: 7, marginTop: 5 },
      mouth: { fontSize: 12, marginTop: 2 },
    },
    md: {
      box: { width: 52, height: 52, borderRadius: 15, borderWidth: 3, boxShadow: "0 3px 0 #000c2b" },
      hat: { top: -15, fontSize: 20 },
      eyes: { fontSize: 13, gap: 9, marginTop: 7 },
      mouth: { fontSize: 16, marginTop: 3 },
    },
    lg: {
      box: { width: 72, height: 72, borderRadius: 19, borderWidth: 3.5, boxShadow: "0 4px 0 #000c2b" },
      hat: { top: -19, fontSize: 26 },
      eyes: { fontSize: 17, gap: 14, marginTop: 8 },
      mouth: { fontSize: 20, marginTop: 4 },
    },
    xl: {
      box: { width: 136, height: 136, borderRadius: 26, borderWidth: 4, boxShadow: "0 5px 0 #000c2b" },
      hat: { top: -24, fontSize: 34 },
      eyes: { fontSize: 25, gap: 24, marginTop: 10 },
      mouth: { fontSize: 34, marginTop: 5 },
    },
  }[size];

  return (
    <div
      className={`scribble-persona-box select-none relative flex flex-col items-center justify-center flex-shrink-0 ${
        animate ? "scribble-pop" : ""
      } ${className}`}
      style={{
        width: config.box.width,
        height: config.box.height,
        borderRadius: config.box.borderRadius,
        border: `${config.box.borderWidth}px solid #000c2b`,
        boxShadow: config.box.boxShadow,
        backgroundColor: bg,
        position: "relative",
        boxSizing: "border-box",
        transition: "background-color 0.2s ease, transform 0.18s ease",
      }}
    >
      {hat.text && (
        <span
          className="scribble-hat"
          style={{
            position: "absolute",
            top: config.hat.top,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: config.hat.fontSize,
            lineHeight: 1,
            pointerEvents: "none",
            filter: "drop-shadow(0 2px 0 #000c2b)",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {renderHat(hat, size)}
        </span>
      )}

      <div
        className="scribble-eyes"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: config.eyes.gap,
          marginTop: config.eyes.marginTop,
          color: "#000c2b",
          fontSize: config.eyes.fontSize,
          fontWeight: 1000,
          lineHeight: 1,
          pointerEvents: "none",
        }}
      >
        <span>{eye.left}</span>
        <span>{eye.right}</span>
      </div>

      <div
        className="scribble-mouth"
        style={{
          color: "#000c2b",
          fontSize: config.mouth.fontSize,
          fontWeight: 1000,
          lineHeight: 1,
          marginTop: config.mouth.marginTop,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {renderMouth(mouth, size)}
      </div>
    </div>
  );
}
