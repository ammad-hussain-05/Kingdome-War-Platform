"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { GameStateX, SquareX, PlayerColorX, PieceTypeX, PieceX } from "@/lib/game/rules-x8x8";
import {
  createInitialGameStateX, getLegalMovesX, getLegalSuperMovesX, getCastleMovesX,
  executeMoveX, executeCastleX, passTurnX, retrieveCapturedPieceX, skipRetrieveX,
  quitPlayerX, squareEqualsX, myLostPiecesPool, pieceImagePathX,
  SIZE, inPlayAreaX, CENTER_LO, CENTER_HI,
} from "@/lib/game/rules-x8x8";
import Fireworks from "@/components/game/fireworks";

// ─── SOUND — same tiny WebAudio beeps used across every other board ─────────
function snd(type: string) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const S: any = {
      select: { freq: [520], dur: .07, wave: "sine" },
      move: { freq: [280, 380], dur: .1, wave: "triangle" },
      capture: { freq: [220, 160, 100], dur: .25, wave: "sawtooth" },
      win: { freq: [400, 500, 640, 880], dur: .9, wave: "sine" },
      eliminate: { freq: [150, 100, 80], dur: .6, wave: "sawtooth" },
      super: { freq: [350, 700, 1050], dur: .35, wave: "sawtooth" },
      pass: { freq: [280, 240], dur: .18, wave: "sine" },
      click: { freq: [600], dur: .05, wave: "sine" },
    };
    const s = S[type] || S.move;
    o.type = s.wave; const t = ctx.currentTime;
    s.freq.forEach((f: number, i: number) => o.frequency.setValueAtTime(f, t + i * s.dur / s.freq.length));
    g.gain.setValueAtTime(.25, t);
    g.gain.exponentialRampToValueAtTime(.001, t + s.dur);
    o.start(t); o.stop(t + s.dur);
  } catch {}
}

const AC: Record<PlayerColorX, string> = { white: "#e8dfc0", black: "#c8a96e", golden: "#d4a843", grey: "#b8c0cc" };
const GL: Record<PlayerColorX, string> = { white: "rgba(232,223,192,0.4)", black: "rgba(200,169,110,0.4)", golden: "rgba(212,168,67,0.4)", grey: "rgba(184,192,204,0.4)" };
const SIDE_LABEL: Record<PlayerColorX, string> = { white: "Top", grey: "Right", black: "Bottom", golden: "Left" };

// ─── BATTLE GUIDE — identical piece set/abilities to 8x8 Classic War ───────
// Same six pieces, same movement/special text as rules-8x8.ts's PIECE_GUIDE_INFO,
// only the Paladin Super Strike distance note reflects the actual implemented
// range (2 squares) shared by both rules-8x8.ts and rules-x8x8.ts.
const RULE_ICON_SRC: Record<PieceTypeX, string> = {
  king: "/all-characters/King.png",
  queen: "/all-characters/Queen.png",
  bishop: "/all-characters/Bishop.png",
  rook: "/all-characters/Rook.png",
  knight: "/all-characters/Knight.png",
  paladin: "/all-characters/Paladin.png",
};
const PIECE_GUIDE_INFO: Record<PieceTypeX, { name: string; move: string; special: string }> = {
  king: { name: "King", move: "1 square in any direction", special: "Capturing him doesn't end the game — the fight goes on until an army is fully eliminated" },
  queen: { name: "Queen", move: "Unlimited squares — straight or diagonal", special: "Your most powerful piece — commands entire ranks, files, and diagonals at once" },
  bishop: { name: "Bishop", move: "Unlimited diagonal squares, any direction", special: "Stays on one square color for the whole game" },
  rook: { name: "Rook", move: "Unlimited horizontal or vertical squares", special: "Strongest on open files and ranks, especially late-game" },
  knight: { name: "Knight", move: "L-shape: 2 squares + 1 side, jumps pieces", special: "The only piece that can jump over others" },
  paladin: { name: "Paladin", move: "1 square in any direction", special: "Super Strike: 2-square attack once · Reverse Castle: swap with an ally · Back Rank: retrieve a captured piece" },
};

function RulePieceIcon({ pieceKey }: { pieceKey: PieceTypeX }) {
  const [failed, setFailed] = useState(false);
  const src = RULE_ICON_SRC[pieceKey];
  if (failed) return <>♟</>;
  return <img src={src} alt={pieceKey} onError={() => setFailed(true)}
    style={{ width: "82%", height: "82%", objectFit: "contain", pointerEvents: "none" }} />;
}

function BattleGuideCardX({ pieceKey, info, has }: { pieceKey: PieceTypeX; info: { name: string; move: string; special: string }; has: boolean }) {
  const [hot, setHot] = useState(false);
  return (
    <div
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onClick={() => setHot(h => !h)}
      style={{
        padding: "13px 14px", borderRadius: 16, cursor: "pointer", WebkitTapHighlightColor: "transparent",
        transition: "all .2s ease", transform: hot ? "translateY(-2px) scale(1.015)" : "none",
        background: hot
          ? "linear-gradient(145deg,rgba(212,168,67,.2),rgba(255,255,255,.05))"
          : has ? "linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.02))" : "linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",
        border: `1px solid ${hot ? "rgba(212,168,67,.65)" : has ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.06)"}`,
        opacity: has ? 1 : .45,
        boxShadow: hot
          ? "0 14px 30px rgba(0,0,0,.55), 0 0 18px rgba(212,168,67,.28), inset 0 1px 0 rgba(255,255,255,.12)"
          : has ? "0 8px 18px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
        <span style={{ width: 42, height: 42, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#050505", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.1), 0 6px 14px rgba(0,0,0,.6)", overflow: "hidden" }}>
          <RulePieceIcon pieceKey={pieceKey} />
        </span>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,.8)", letterSpacing: ".04em" }}>
          {info.name}{!has ? " ✗" : ""}
        </p>
      </div>
      <p style={{ margin: "0 0 5px", fontSize: 11.5, color: hot ? "#fff" : "rgba(255,255,255,.8)", lineHeight: 1.6 }}>
        <span style={{ color: "#78d7ff" }}>⚔ Ability:</span> {info.move}
      </p>
      <p style={{ margin: 0, fontSize: 11.5, color: hot ? "#fff" : "rgba(255,255,255,.68)", lineHeight: 1.6 }}>
        <span style={{ color: "#ffd15c" }}>✦ Special:</span> {info.special}
      </p>
    </div>
  );
}

// ─── PANEL FRAME — ornamental corner-bracket card used for both side panels ─
function CornerBracket({ top, left, right, bottom }: { top?: boolean; left?: boolean; right?: boolean; bottom?: boolean }) {
  return (
    <div style={{
      position: "absolute", width: 16, height: 16, pointerEvents: "none",
      top: top ? 8 : undefined, bottom: bottom ? 8 : undefined,
      left: left ? 8 : undefined, right: right ? 8 : undefined,
      borderTop: top ? "2px solid rgba(212,168,67,.55)" : undefined,
      borderBottom: bottom ? "2px solid rgba(212,168,67,.55)" : undefined,
      borderLeft: left ? "2px solid rgba(212,168,67,.55)" : undefined,
      borderRight: right ? "2px solid rgba(212,168,67,.55)" : undefined,
    }} />
  );
}
function PanelFrame({ title, children, isMobile }: { title: string; children: React.ReactNode; isMobile: boolean }) {
  return (
    <div style={{
      position: "relative", width: isMobile ? "100%" : 272, flexShrink: 0,
      background: "linear-gradient(160deg,rgba(10,8,4,.75),rgba(5,4,2,.85))",
      border: "1px solid rgba(212,168,67,.22)", borderRadius: 16, padding: "18px 15px",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      boxShadow: "0 24px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.04)",
    }}>
      <CornerBracket top left /><CornerBracket top right /><CornerBracket bottom left /><CornerBracket bottom right />
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#e8c96a", letterSpacing: ".18em", textTransform: "uppercase" }}>{title}</p>
        <div style={{ width: 26, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,168,67,.6),transparent)", margin: "8px auto 0" }} />
      </div>
      {children}
    </div>
  );
}

// ─── KINGDOM CARD (left panel) ──────────────────────────────────────────────
// Piece-image fallback used only by the captured-piece row: rules-x8x8.ts
// has no second image path to fall back to (unlike the 12x12/16x16 boards),
// so on a load failure this falls straight through to an emoji glyph.
const EMOJI_X: Record<PieceTypeX, string> = {
  king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", paladin: "🛡️",
};
function CapturedPieceIconX8({ piece }: { piece: PieceX }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span style={{ fontSize: 12 }}>{EMOJI_X[piece.type]}</span>;
  return (
    <img src={pieceImagePathX(piece)} alt={piece.type} onError={() => setFailed(true)}
      style={{ width: 14, height: 14, objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.8))" }} />
  );
}

function KingdomCard({ color, name, isMe, isActive, isElim, captured }: {
  color: PlayerColorX; name: string; isMe: boolean; isActive: boolean; isElim: boolean; captured: PieceX[];
}) {
  const ac = AC[color];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 13, marginBottom: 10,
      background: isElim ? "linear-gradient(135deg,rgba(70,0,0,.5),rgba(20,0,0,.7))" : "rgba(10,8,4,.7)",
      border: `1px solid ${isElim ? "rgba(255,70,70,.35)" : isActive ? "rgba(212,168,67,.8)" : "rgba(255,255,255,.09)"}`,
      opacity: isElim ? .5 : 1, transition: "all .3s",
      boxShadow: isActive && !isElim ? "0 0 20px rgba(212,168,67,.35), 0 8px 20px rgba(0,0,0,.5)" : "0 6px 14px rgba(0,0,0,.35)",
    }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: ac, border: "2px solid rgba(255,255,255,.25)",
        boxShadow: isActive && !isElim ? `0 0 12px ${ac}` : "none",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "rgba(0,0,0,.55)" }}>♛</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: ".02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}{isMe ? " (You)" : ""}</p>
        <p style={{ margin: "2px 0 0", fontSize: 9.5, color: "rgba(200,195,205,.5)", textTransform: "uppercase", letterSpacing: ".1em" }}>{isElim ? "Eliminated" : `${SIDE_LABEL[color]} · ${color}`}</p>
        {captured.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5, maxHeight: 20, overflow: "hidden" }}>
            {captured.slice(0, 8).map((p, i) => (
              <CapturedPieceIconX8 key={i} piece={p} />
            ))}
            {captured.length > 8 && <span style={{ fontSize: 8.5, color: "rgba(220,200,165,.5)" }}>+{captured.length - 8}</span>}
          </div>
        )}
      </div>
      {!isElim && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", flexShrink: 0, animation: isActive ? "x8Pulse 1.5s infinite" : "none" }} />}
    </div>
  );
}

// ─── COMPACT KINGDOM PILL (mobile-only strip) ───────────────────────────────
function CompactPlayerPill({ color, name, isMe, isActive, isElim }: {
  color: PlayerColorX; name: string; isMe: boolean; isActive: boolean; isElim: boolean;
}) {
  const ac = AC[color];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5, padding: "5px 8px", borderRadius: 10, minWidth: 0, flex: "1 1 0",
      background: isElim ? "rgba(70,0,0,.4)" : "rgba(16,11,5,.75)",
      border: `1px solid ${isElim ? "rgba(255,70,70,.3)" : isActive ? "rgba(212,168,67,.8)" : ac + "30"}`,
      opacity: isElim ? .55 : 1,
      boxShadow: isActive && !isElim ? "0 0 10px rgba(212,168,67,.4)" : "none",
    }}>
      <span style={{ width: 15, height: 15, borderRadius: "50%", background: ac, flexShrink: 0 }} />
      <span style={{ fontSize: 9.5, fontWeight: 800, color: "#e8dfc0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{isMe ? "You" : name}</span>
      {!isElim && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 5px #4ade80", flexShrink: 0, marginLeft: "auto" }} />}
    </div>
  );
}

// ─── CONTROL CARD (right panel — icon badge + title + subtitle, matching the
// design2 reference's "Game Controls" list) ────────────────────────────────
function ControlCard({ icon, title, subtitle, accent, onClick, disabled, isMobile, brown }: {
  icon: string; title: string; subtitle: string; accent: string; onClick: () => void; disabled?: boolean; isMobile: boolean; brown?: boolean;
}) {
  // `brown` selects the shared neutral parchment-brown styling used by the
  // 4 standard controls (Pass Turn / Battle Guide / Game Rules / Quit Game)
  // across every board — kept uniform instead of per-action accent color.
  // The conditional Super Attack button never passes `brown`, so it keeps
  // its original accent-colored look untouched. Background/box-shadow for
  // the brown variant are driven entirely by the .x8-btn-brown CSS class
  // (not inline) so its :hover rule can actually take effect.
  return (
    <button className={brown ? "x8-btn x8-btn-brown" : "x8-btn"} onClick={onClick} disabled={disabled}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12, width: isMobile ? undefined : "100%", textAlign: "left",
        padding: "13px 14px", borderRadius: 14, cursor: disabled ? "default" : "pointer", marginBottom: isMobile ? 0 : 12,
        border: brown ? "1px solid rgba(212,168,67,.35)" : `1px solid ${accent}4a`, opacity: disabled ? .5 : 1,
        fontFamily: "'Cinzel',Georgia,serif",
        ...(brown ? {} : {
          background: `linear-gradient(160deg,${accent}1c,${accent}0a)`,
          boxShadow: `0 8px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08)`,
        }),
      }}>
      <span style={{
        width: 38, height: 38, borderRadius: 10,
        background: brown ? "rgba(212,168,67,.18)" : `${accent}26`,
        border: brown ? "1px solid rgba(212,168,67,.4)" : `1px solid ${accent}60`,
        boxShadow: brown ? "inset 0 1px 0 rgba(255,255,255,.15)" : `inset 0 1px 0 rgba(255,255,255,.15), 0 0 10px ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0,
      }}>{icon}</span>
      {!isMobile && (
        <span style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: brown ? "#ffffff" : accent, letterSpacing: ".06em", textTransform: "uppercase" }}>{title}</p>
          <p style={{ margin: "3px 0 0", fontSize: 10.5, color: brown ? "rgba(255,255,255,.55)" : "rgba(220,220,230,.55)", lineHeight: 1.4 }}>{subtitle}</p>
        </span>
      )}
      {isMobile && <span style={{ fontSize: 11, fontWeight: 800, color: brown ? "#ffffff" : accent, letterSpacing: ".05em", textTransform: "uppercase", alignSelf: "center" }}>{title}</span>}
    </button>
  );
}

// ─── CROSS-SHAPE CLIP PATH ────────────────────────────────────────────────────
// Traces the 12-vertex plus/cross outline in percentages of the grid — 4
// arms (8 wide x 4 deep) meeting a shared 8x8 center, exactly matching the
// reference image's silhouette. One single connected battlefield — never
// four separate boards.
const P1 = (CENTER_LO / SIZE) * 100, P2 = ((CENTER_HI + 1) / SIZE) * 100;
const CROSS_CLIP = `polygon(${P1}% 0%, ${P2}% 0%, ${P2}% ${P1}%, 100% ${P1}%, 100% ${P2}%, ${P2}% ${P2}%, ${P2}% 100%, ${P1}% 100%, ${P1}% ${P2}%, 0% ${P2}%, 0% ${P1}%, ${P1}% ${P1}%)`;
// The 4 concave inner corners (where each arm meets the shared center) get a
// small decorative gem accent, matching the reference board's frame detail.
const GEM_CORNERS: [number, number][] = [[P1, P1], [P2, P1], [P1, P2], [P2, P2]];

// ─── ELIMINATION POPUP — same style/animation as the X-12x12/X-16x16 boards ─
function EliminationPopupX8({ eliminated, playerNames, onClose }: { eliminated: PlayerColorX; playerNames: Record<PlayerColorX, string>; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const ac = AC[eliminated];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "x8FadeIn .3s ease" }} onClick={onClose}>
      <div style={{ textAlign: "center", padding: "48px 64px", borderRadius: 24, background: "linear-gradient(160deg,#1a0505,#2a0808)", border: `1px solid ${ac}40`, boxShadow: "0 0 60px rgba(255,50,50,.3),0 30px 80px rgba(0,0,0,.8)", animation: "x8SlideUp .4s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ fontSize: 72, marginBottom: 16, lineHeight: 1 }}>💀</div>
        <h2 style={{ fontFamily: "'Cinzel',Georgia,serif", fontSize: 32, color: "#ff8080", margin: "0 0 8px", fontWeight: 700 }}>Eliminated!</h2>
        <p style={{ fontSize: 18, color: `${ac}cc`, margin: "0 0 6px", fontWeight: 600 }}>{playerNames[eliminated] || eliminated} ({SIDE_LABEL[eliminated]})</p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", margin: "0 0 24px", fontStyle: "italic" }}>has been eliminated from the battlefield</p>
        <p style={{ fontSize: 13, color: "rgba(255,180,180,.5)" }}>The remaining kingdoms continue their battle...</p>
      </div>
    </div>
  );
}

// ─── WIN / DEFEAT SCREEN — same premium celebration effect as the X-12x12/
// X-16x16 boards: fireworks for the winner, glow, and a richer presentation
// than a plain static card ───────────────────────────────────────────────────
function EndScreenX8({ showWin, myColor, playerNames, onLobby, onPlayAgain }: {
  showWin: PlayerColorX; myColor: PlayerColorX; playerNames: Record<PlayerColorX, string>; onLobby: () => void; onPlayAgain: () => void;
}) {
  const isWinner = showWin === myColor;
  const ac = AC[showWin];
  const gl = GL[showWin];
  return (
    <>
      {isWinner && <Fireworks />}
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "x8FadeIn .4s ease", padding: 20 }}>
        <div style={{
          textAlign: "center", padding: "52px 68px", borderRadius: 28, position: "relative", overflow: "hidden",
          background: isWinner ? "linear-gradient(160deg,#1a1400,#2e2000,#1a1400)" : "linear-gradient(160deg,#0e0505,#1e0808,#0e0505)",
          border: `1px solid ${ac}45`,
          boxShadow: `0 0 80px ${gl},0 0 160px ${isWinner ? "rgba(212,168,67,0.15)" : "rgba(255,50,50,0.1)"},0 40px 100px rgba(0,0,0,0.95),inset 0 1px 0 ${ac}18`,
          animation: "x8WinPulse 2.5s ease-in-out infinite", fontFamily: "'Cinzel',Georgia,serif", maxWidth: "92vw",
        }}>
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 200, height: 1, background: `linear-gradient(90deg,transparent,${ac}80,transparent)` }} />
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 140, height: 32, background: `radial-gradient(ellipse,${ac}18,transparent 70%)` }} />

          <div style={{ fontSize: 84, marginBottom: 8 }}>{isWinner ? "👑" : "💀"}</div>

          <p style={{ fontSize: 9, letterSpacing: "0.32em", textTransform: "uppercase", color: `${ac}60`, margin: "0 0 10px" }}>
            {isWinner ? "— Kingdom Triumphant —" : "— Kingdom Fallen —"}
          </p>

          <h1 style={{ fontSize: 54, color: isWinner ? "#c8a84a" : ac, margin: "0 0 8px", fontWeight: 700, letterSpacing: ".04em",
            textShadow: isWinner ? "0 0 40px rgba(200,168,74,0.6),0 0 80px rgba(200,168,74,0.2)" : "0 0 40px rgba(255,80,80,0.5)" }}>
            {isWinner ? "Victory!" : "Defeated"}
          </h1>

          <p style={{ fontSize: 20, color: `${ac}aa`, margin: "0 0 6px", fontWeight: 600 }}>{playerNames[showWin] || showWin}</p>
          <p style={{ fontSize: 14, color: "rgba(212,168,67,.5)", margin: "0 0 12px", fontStyle: "italic" }}>({SIDE_LABEL[showWin]} kingdom)</p>

          <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${ac}40,transparent)`, margin: "16px auto", width: 200 }} />

          <div style={{ padding: "14px 28px", borderRadius: 12, background: isWinner ? "rgba(200,168,74,0.08)" : "rgba(255,80,80,0.06)", border: `1px solid ${isWinner ? "rgba(200,168,74,0.2)" : "rgba(255,80,80,0.18)"}`, marginBottom: 36, display: "inline-block" }}>
            <p style={{ margin: 0, fontSize: 15, color: isWinner ? "rgba(212,168,67,.85)" : "rgba(255,140,140,.7)", fontStyle: "italic" }}>
              {isWinner ? "🏆 The Golden Crown has been claimed" : "💀 Your Kingdom has fallen"}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(180,160,120,.4)" }}>
              {isWinner ? "Last Kingdom Standing" : "All pieces eliminated"}
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onLobby} style={{ padding: "14px 40px", borderRadius: 14, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12, background: `linear-gradient(135deg,${ac},${ac}88)`, color: "#0a0d14", border: "none", cursor: "pointer", fontFamily: "'Cinzel',Georgia,serif", boxShadow: `0 8px 30px ${gl}` }}>← Return to Lobby</button>
            <button onClick={onPlayAgain} style={{ padding: "14px 40px", borderRadius: 14, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.12)", cursor: "pointer", fontFamily: "'Cinzel',Georgia,serif" }}>Play Again</button>
          </div>
        </div>
      </div>
    </>
  );
}

interface Props {
  myColor: PlayerColorX; roomId: string;
  playerNames: Record<PlayerColorX, string>;
  onGameEnd?: (winner: PlayerColorX) => void;
  socket?: any;
}

export default function BoardX8x8({ myColor, roomId, playerNames, onGameEnd, socket }: Props) {
  const [gs, setGs] = useState<GameStateX>(createInitialGameStateX());
  const [animSq, setAnimSq] = useState<SquareX | null>(null);
  const [showWin, setShowWin] = useState<PlayerColorX | null>(null);
  const [elimPopup, setElimPopup] = useState<PlayerColorX | null>(null);
  const [sqPx, setSqPx] = useState(20);
  const [isMobile, setIsMobile] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const gsRef = useRef(gs);
  useEffect(() => { gsRef.current = gs; }, [gs]);

  const isMyTurn = gs.currentTurn === myColor && gs.status === "playing";
  const selSq = gs.selectedSquare;
  const selPiece = selSq ? gs.board[selSq.row][selSq.col] : null;
  const selectedIsPaladin = selPiece?.type === "paladin" && selPiece.color === myColor;
  const paladinSuperUsed = selPiece?.paladanSuperUsed ?? false;

  // ─── RESPONSIVE SIZE ────────────────────────────────────────────────────
  // Desktop places the kingdom panel (left) and controls panel (right) NEXT
  // TO the board rather than stacked above/below it, so the board's own
  // budget is only constrained by the header/turn-indicator height and the
  // two side panels' widths — never forces a size floor that would overflow
  // small screens.
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const mobile = vw <= 1000;
      setIsMobile(mobile);

      if (mobile) {
        // Matches the container's own uniform padding (24px) so the frame
        // clearance is actually reserved out of the board's size budget
        // instead of being silently eaten into.
        const outerPadX = 24, outerPadY = 24;
        const headerH = 66;
        const cardsH = 40;
        const turnH = 34;
        const controlsH = 96;
        const gaps = 14 * 4; // outer container gap between header/cards/turn/board/controls
        const safety = 40;
        const chromeH = headerH + cardsH + turnH + controlsH + gaps + outerPadY * 2 + safety;
        const maxByWidth = vw - outerPadX * 2;
        const maxByHeight = vh - chromeH;
        const raw = Math.floor(Math.min(maxByWidth, maxByHeight) / SIZE);
        setSqPx(Math.max(8, Math.min(raw, 34)));
      } else {
        // Matches the container's own uniform padding (56px) so the frame
        // clearance is actually reserved out of the board's size budget
        // instead of being silently eaten into.
        const outerPadX = 56, outerPadY = 56;
        const headerH = 108;
        const outerGap = 26; // header -> row
        const turnH = 42;
        const centerColGap = 30; // turn indicator -> board, its own floating spacing
        const panelW = 272;
        const rowGap = 44; // left panel <-> board <-> right panel
        const safety = 40;
        const chromeH = headerH + outerGap + turnH + centerColGap + safety;
        const maxByWidth = vw - outerPadX * 2 - panelW * 2 - rowGap * 2;
        const maxByHeight = vh - outerPadY * 2 - chromeH;
        const raw = Math.floor(Math.min(maxByWidth, maxByHeight) / SIZE);
        setSqPx(Math.max(8, Math.min(raw, 74)));
      }
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const boardPx = sqPx * SIZE;

  // ─── SOCKET ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.on("game:move", ({ newState }: { newState: GameStateX }) => {
      const prev = gsRef.current;
      if (newState.lastMove) { setAnimSq(newState.lastMove.to); setTimeout(() => setAnimSq(null), 420); }
      if (newState.eliminatedPlayers.length > prev.eliminatedPlayers.length) {
        snd("eliminate");
        if (newState.justEliminated) setTimeout(() => setElimPopup(newState.justEliminated), 350);
      } else {
        const prevCap = Object.values(prev.capturedBy).reduce((n, a) => n + a.length, 0);
        const newCap = Object.values(newState.capturedBy).reduce((n, a) => n + a.length, 0);
        snd(newCap > prevCap ? "capture" : "move");
      }
      setGs(newState);
      if (newState.status === "finished" && newState.winner) {
        setTimeout(() => { setShowWin(newState.winner); snd("win"); }, 300);
      }
    });
    socket.on("game:quit", ({ newState }: { newState: GameStateX }) => {
      setGs(newState); setShowQuitConfirm(false);
      if (newState.status === "finished" && newState.winner) {
        setTimeout(() => { setShowWin(newState.winner); snd("win"); }, 250);
      }
    });
    return () => { socket.off("game:move"); socket.off("game:quit"); };
  }, [socket]);

  // ─── ACTIONS ────────────────────────────────────────────────────────────
  const emit = (ns: GameStateX) => { setGs(ns); socket?.emit("game:move", { roomId, newState: ns }); };

  const handleSuperAttack = useCallback(() => {
    const state = gsRef.current;
    if (!state.selectedSquare) return;
    const { row, col } = state.selectedSquare;
    const piece = state.board[row][col];
    if (!piece || piece.type !== "paladin" || piece.paladanSuperUsed) return;
    snd("select");
    emit({ ...state, superMoves: getLegalSuperMovesX(state.board, row, col), superMoveMode: true, validMoves: [], castleMoves: [] });
  }, [roomId, socket]);

  const handlePass = useCallback(() => {
    const state = gsRef.current;
    if (state.currentTurn !== myColor || state.status !== "playing") return;
    snd("pass");
    const ns = passTurnX(state);
    emit(ns);
  }, [myColor, roomId, socket]);

  const handleQuit = useCallback(() => {
    const ns = quitPlayerX(gsRef.current, myColor);
    setShowQuitConfirm(false);
    emit(ns);
    if (ns.status === "finished" && ns.winner) { setTimeout(() => { setShowWin(ns.winner); snd("win"); }, 250); onGameEnd?.(ns.winner); }
    socket?.emit("game:quit", { roomId, quitter: myColor, newState: ns });
  }, [myColor, roomId, socket, onGameEnd]);

  const handleClick = useCallback((row: number, col: number) => {
    const state = gsRef.current;
    if (state.currentTurn !== myColor || state.status !== "playing" || state.pendingRetrieve) return;
    const { board, selectedSquare, validMoves, superMoves, castleMoves, superMoveMode } = state;
    const cp = board[row][col];
    const clickedSq: SquareX = { row, col };
    snd("click");

    if (superMoveMode && superMoves.some(m => squareEqualsX(m, clickedSq))) {
      const ns = executeMoveX(state, selectedSquare!, clickedSq, true);
      setAnimSq(clickedSq); setTimeout(() => setAnimSq(null), 450);
      snd("super");
      emit(ns);
      if (ns.status === "finished" && ns.winner) { setTimeout(() => { setShowWin(ns.winner); snd("win"); }, 300); onGameEnd?.(ns.winner); }
      return;
    }
    if (selectedSquare && castleMoves.some(m => squareEqualsX(m, clickedSq))) {
      const ns = executeCastleX(state, selectedSquare, clickedSq);
      setAnimSq(clickedSq); setTimeout(() => setAnimSq(null), 420);
      snd("move");
      emit(ns);
      return;
    }
    if (selectedSquare && validMoves.some(m => squareEqualsX(m, clickedSq))) {
      const ns = executeMoveX(state, selectedSquare, clickedSq, false);
      setAnimSq(clickedSq); setTimeout(() => setAnimSq(null), 420);
      const prevCap = Object.values(state.capturedBy).reduce((n, a) => n + a.length, 0);
      const newCap = Object.values(ns.capturedBy).reduce((n, a) => n + a.length, 0);
      snd(newCap > prevCap ? "capture" : "move");
      emit(ns);
      if (ns.status === "finished" && ns.winner) { setTimeout(() => { setShowWin(ns.winner); snd("win"); }, 300); onGameEnd?.(ns.winner); }
      return;
    }
    if (cp?.color === myColor) {
      snd("select");
      const isPal = cp.type === "paladin";
      emit({
        ...state, selectedSquare: clickedSq,
        validMoves: getLegalMovesX(board, row, col),
        castleMoves: isPal ? getCastleMovesX(board, row, col) : [],
        superMoves: [], superMoveMode: false,
      });
      return;
    }
    emit({ ...state, selectedSquare: null, validMoves: [], castleMoves: [], superMoves: [], superMoveMode: false });
  }, [myColor, roomId, socket, onGameEnd]);

  const handleRetrieve = useCallback((pieceId: string) => {
    const state = gsRef.current;
    if (!state.pendingRetrieve) return;
    emit(retrieveCapturedPieceX(state, pieceId));
  }, [roomId, socket]);
  const handleSkipRetrieve = useCallback(() => {
    const state = gsRef.current;
    if (!state.pendingRetrieve) return;
    emit(skipRetrieveX(state));
  }, [roomId, socket]);

  // ─── OVERLAY DATA ───────────────────────────────────────────────────────
  const allColors: PlayerColorX[] = ["white", "grey", "black", "golden"];
  const myGuideSet = new Set<PieceTypeX>();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = gs.board[r][c];
    if (p && p.color === myColor) myGuideSet.add(p.type);
  }

  // ─── SHARED BLOCKS ──────────────────────────────────────────────────────
  const turnIndicator = (
    <div style={{ borderRadius: 10, padding: "8px 22px", display: "flex", alignItems: "center", gap: 9,
      background: "rgba(8,6,3,.75)",
      border: `1px solid ${isMyTurn ? "rgba(125,189,110,.45)" : "rgba(212,168,67,.35)"}`,
      boxShadow: isMyTurn ? "0 0 20px rgba(125,189,110,.18)" : "0 8px 20px rgba(0,0,0,.45)" }}>
      <span style={{ fontSize: 14 }}>{isMyTurn ? "⚔️" : "⏳"}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: isMyTurn ? "#7dbd6e" : "#e8c96a" }}>
        {gs.status === "finished" ? "Battle Over" : isMyTurn ? "Your Turn" : `${playerNames[gs.currentTurn] || gs.currentTurn}'s Turn`}
      </span>
    </div>
  );

  const boardBlock = (
    // One connected cross-shaped battlefield, never four separate boards.
    // Every frame layer below is an absolutely-positioned SIBLING (not a
    // padded ancestor) so none of them can ever clip the grid's own edge
    // cells. Layered bezel, outermost first: ambient halo → dark wood frame
    // → gold metallic trim → dark bevel → black playing surface + grid.
    // The halo's reach was previously wide enough (-60px) to visually bleed
    // into the turn indicator and side panels even with real spacing between
    // them — pulled in so the board reads as a clearly separate element.
    <div style={{ position: "relative", width: boardPx, height: boardPx, animation: "x8FadeUp .5s ease", margin: isMobile ? "0 0 4px" : "0 0 6px" }}>
      <div style={{
        position: "absolute", inset: isMobile ? -20 : -30, borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(212,168,67,.16), transparent 68%)",
        zIndex: -1, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: isMobile ? -13 : -22,
        background: "linear-gradient(145deg,#4a2a0c,#251306,#120a03,#251306,#4a2a0c)",
        clipPath: CROSS_CLIP,
        filter: "drop-shadow(0 0 38px rgba(212,168,67,.2)) drop-shadow(0 28px 64px rgba(0,0,0,.9))",
        zIndex: 0,
      }} />
      <div style={{
        position: "absolute", inset: isMobile ? -7 : -12,
        clipPath: CROSS_CLIP,
        background: "linear-gradient(115deg,#8a6414 0%,#f5e09a 18%,#d4a843 38%,#8a6414 52%,#f5e09a 68%,#d4a843 86%,#8a6414 100%)",
        backgroundSize: "260% auto",
        animation: "x8TrimShine 7s linear infinite",
        boxShadow: "inset 0 1px 1px rgba(255,255,255,.6), inset 0 -1px 2px rgba(0,0,0,.5)",
        zIndex: 1,
      }} />
      <div style={{
        position: "absolute", inset: isMobile ? -3 : -4,
        clipPath: CROSS_CLIP, background: "#0a0602",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,.85)",
        zIndex: 2,
      }} />
      <div style={{ position: "absolute", inset: 0, background: "#050505", clipPath: CROSS_CLIP, boxShadow: "inset 0 0 34px rgba(0,0,0,.65)", zIndex: 3 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${SIZE},${sqPx}px)`, gridTemplateRows: `repeat(${SIZE},${sqPx}px)`, width: boardPx, height: boardPx }}>
          {Array.from({ length: SIZE }).map((_, row) => Array.from({ length: SIZE }).map((__, col) => {
            if (!inPlayAreaX(row, col)) return <div key={`${row}-${col}`} style={{ width: sqPx, height: sqPx, pointerEvents: "none" }} />;

            const piece = gs.board[row][col];
            const sq = { row, col };
            const isLight = (row + col) % 2 === 0;
            const isSel = !!gs.selectedSquare && squareEqualsX(gs.selectedSquare, sq);
            const isValid = gs.validMoves.some(m => squareEqualsX(m, sq));
            const isSuper = gs.superMoves.some(m => squareEqualsX(m, sq));
            const isCastleMove = gs.castleMoves.some(m => squareEqualsX(m, sq));
            const isLF = !!gs.lastMove && squareEqualsX(gs.lastMove.from, sq);
            const isLT = !!gs.lastMove && squareEqualsX(gs.lastMove.to, sq);
            const isAnim = !!animSq && squareEqualsX(animSq, sq);

            const baseBg = isLight ? "#c9a96e" : "#4a2e1a";
            let ov = "";
            if (isSel) ov = "rgba(212,168,67,.55)";
            else if (isLF || isLT) ov = "rgba(212,168,67,.25)";
            else if (isCastleMove) ov = "rgba(80,160,255,.18)";
            if (gs.superMoveMode && !isSel && !isSuper) ov = ov || "rgba(0,0,0,.08)";

            return (
              <div key={`${row}-${col}`} className="x8sq" onClick={() => handleClick(row, col)} style={{ width: sqPx, height: sqPx, background: baseBg, position: "relative" }}>
                {ov && <div style={{ position: "absolute", inset: 0, zIndex: 1, background: ov, pointerEvents: "none" }} />}
                {isValid && !piece && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: sqPx * .32, height: sqPx * .32, borderRadius: "50%", background: "rgba(212,168,67,.75)", boxShadow: "0 0 10px rgba(212,168,67,.6)", animation: "x8Dot .15s ease both", pointerEvents: "none", zIndex: 4 }} />}
                {isValid && piece && <div style={{ position: "absolute", inset: Math.max(2, sqPx * .06), zIndex: 4, borderRadius: 4, border: "2px solid rgba(212,168,67,.9)", pointerEvents: "none" }} />}
                {isSuper && !piece && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: sqPx * .36, height: sqPx * .36, borderRadius: "50%", background: "rgba(255,140,0,.82)", boxShadow: "0 0 14px rgba(255,140,0,.7)", pointerEvents: "none", zIndex: 4 }} />}
                {isSuper && piece && <div style={{ position: "absolute", inset: Math.max(2, sqPx * .06), zIndex: 4, borderRadius: 4, border: "2px solid rgba(255,140,0,.95)", pointerEvents: "none" }} />}
                {isCastleMove && piece && <div style={{ position: "absolute", inset: Math.max(2, sqPx * .06), zIndex: 4, borderRadius: 4, border: "2px dashed rgba(80,160,255,.9)", pointerEvents: "none" }} />}
                {piece && (
                  <img src={pieceImagePathX(piece)} alt={piece.type} className="x8pi"
                    style={{ animation: isAnim ? "x8In .32s ease both" : "none" }} />
                )}
              </div>
            );
          }))}
        </div>
      </div>
      {/* Decorative gem accents at the board's inner (concave) corners */}
      {GEM_CORNERS.map(([px, py], i) => (
        <div key={i} style={{
          position: "absolute", left: `${px}%`, top: `${py}%`, width: isMobile ? 8 : 12, height: isMobile ? 8 : 12,
          transform: "translate(-50%,-50%) rotate(45deg)", zIndex: 4, pointerEvents: "none",
          background: "linear-gradient(145deg,#8ed8f5,#3d8fc4)",
          border: "1px solid rgba(255,255,255,.6)",
          boxShadow: "0 0 10px rgba(94,200,240,.75), 0 2px 6px rgba(0,0,0,.6)",
        }} />
      ))}
    </div>
  );

  const superAttackBtn = isMyTurn && selectedIsPaladin && (
    <ControlCard isMobile={isMobile} icon="⚡" accent="#ffb347"
      title={paladinSuperUsed ? "Super Used" : "Super Attack"}
      subtitle="One-time 2-square strike"
      disabled={paladinSuperUsed}
      onClick={() => { if (!paladinSuperUsed) handleSuperAttack(); }} />
  );
  const passBtn = (
    <ControlCard isMobile={isMobile} brown icon="⏩" accent="#60a5fa" title="Pass Turn" subtitle="Skip your turn"
      disabled={!isMyTurn} onClick={handlePass} />
  );
  const guideBtn = (
    <ControlCard isMobile={isMobile} brown icon="📖" accent="#c084fc" title="Battle Guide" subtitle="View all pieces and abilities"
      onClick={() => setShowGuide(true)} />
  );
  const rulesBtn = (
    <ControlCard isMobile={isMobile} brown icon="📜" accent="#4ade80" title="Game Rules" subtitle="Learn how to play and win"
      onClick={() => setShowRules(true)} />
  );
  const quitBtn = !gs.eliminatedPlayers.includes(myColor) && gs.status === "playing" && (
    <ControlCard isMobile={isMobile} brown icon="🚩" accent="#f87171" title="Quit Game" subtitle="Exit the current match"
      onClick={() => setShowQuitConfirm(true)} />
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        *{box-sizing:border-box;}
        @keyframes x8Pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
        @keyframes x8In{0%{opacity:.3;transform:translate(-50%,-50%) scale(.65)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes x8Dot{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}80%{transform:translate(-50%,-50%) scale(1.2)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes x8FadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes x8Shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes x8Float{0%,100%{transform:translateY(0) rotateY(0deg)}50%{transform:translateY(-4px) rotateY(12deg)}}
        @keyframes x8TipIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes x8Pulse2{0%,100%{box-shadow:0 0 0 0 rgba(125,189,110,.5)}50%{box-shadow:0 0 0 5px rgba(125,189,110,0)}}
        @keyframes x8TrimShine{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes x8FadeIn{from{opacity:0}to{opacity:1}}
        @keyframes x8SlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes x8WinPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
        .x8sq{position:relative;overflow:hidden;cursor:pointer;transition:filter .1s;}
        .x8sq:hover{filter:brightness(1.2);}
        .x8-btn{backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease;box-shadow:0 6px 18px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.06);}
        .x8-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 26px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.12);}
        .x8-btn:active:not(:disabled){transform:translateY(0) scale(.98);}
        .x8-btn:disabled{cursor:default;}
        .x8-btn-brown{background:linear-gradient(160deg,#5c3d1f 0%,#2a1a0a 100%);box-shadow:0 8px 20px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08);}
        .x8-btn-brown:hover:not(:disabled){background:linear-gradient(160deg,#6b4726 0%,#331f0d 100%);box-shadow:0 12px 26px rgba(0,0,0,.55);}
        .x8pi{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:82%;height:82%;object-fit:contain;pointer-events:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.9));}
        .x8-rule-card{padding:16px 18px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(212,168,67,.1);transition:border-color .2s,background .2s;display:flex;gap:16px;align-items:flex-start;}
        .x8-rule-card:hover{background:rgba(212,168,67,.05);border-color:rgba(212,168,67,.22);}
        .x8-icon{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;font-size:24px;flex-shrink:0;animation:x8Float 3s ease-in-out infinite;user-select:none;}
        .x8-modal-scroll::-webkit-scrollbar{width:5px;}
        .x8-modal-scroll::-webkit-scrollbar-track{background:transparent;}
        .x8-modal-scroll::-webkit-scrollbar-thumb{background:rgba(212,168,67,.25);border-radius:5px;}
      `}</style>

      <div style={{
        minHeight: "100vh", width: "100%", maxWidth: "100vw", overflowX: "hidden", boxSizing: "border-box",
        backgroundImage: "url('/X-8x8/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex", flexDirection: "column", alignItems: "center",
        // Equal clearance on all four sides so the title/board/panels never
        // touch the background image's decorative frame — kept uniform
        // (not just top-heavy) per side at each breakpoint.
        padding: isMobile ? "24px" : "56px", gap: isMobile ? 14 : 26, fontFamily: "'Cinzel',Georgia,serif",
      }}>
        {/* Header — crown + flanking ornament, large premium shimmer title */}
        <div style={{ textAlign: "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 8 : 14, marginBottom: 2 }}>
            <span style={{ width: isMobile ? 24 : 56, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,168,67,.55))" }} />
            <span style={{ fontSize: isMobile ? 14 : 20, filter: "drop-shadow(0 0 8px rgba(212,168,67,.5))" }}>👑</span>
            <span style={{ width: isMobile ? 24 : 56, height: 1, background: "linear-gradient(90deg,rgba(212,168,67,.55),transparent)" }} />
          </div>
          <h1 style={{
            margin: 0, fontSize: isMobile ? 26 : 46, fontWeight: 700, letterSpacing: isMobile ? ".05em" : ".07em",
            background: "linear-gradient(135deg,#e8c96a 0%,#f5e09a 40%,#c8a030 100%)",
            backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "x8Shimmer 3s linear infinite",
            textShadow: "0 0 44px rgba(212,168,67,.28)",
          }}>
            8×8 X Board
          </h1>
          <p style={{ margin: isMobile ? "5px 0 0" : "8px 0 0", fontSize: isMobile ? 10 : 12.5, color: "rgba(212,168,67,.6)", letterSpacing: ".22em", textTransform: "uppercase" }}>
            Four Kingdoms <span style={{ color: "rgba(212,168,67,.9)" }}>✦</span> One Battlefield
          </p>
        </div>

        {isMobile ? (
          <>
            {/* Compact player strip — all 4 kingdoms visible without eating the board's vertical room */}
            <div style={{ display: "flex", gap: 6, width: "100%", maxWidth: boardPx + 40 }}>
              {allColors.map(c => (
                <CompactPlayerPill key={c} color={c} name={playerNames[c] || c} isMe={c === myColor}
                  isActive={gs.currentTurn === c && gs.status === "playing"}
                  isElim={gs.eliminatedPlayers.includes(c)} />
              ))}
            </div>

            {turnIndicator}
            {boardBlock}

            {/* Controls row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%", maxWidth: boardPx + 40 }}>
              {superAttackBtn}
              {passBtn}
              {guideBtn}
              {rulesBtn}
              {quitBtn}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "row", gap: 44, alignItems: "flex-start", justifyContent: "center", width: "100%" }}>
            {/* LEFT — The Four Kingdoms */}
            <PanelFrame title="The Four Kingdoms" isMobile={false}>
              {allColors.map(c => (
                <KingdomCard key={c} color={c} name={playerNames[c] || c} isMe={c === myColor}
                  isActive={gs.currentTurn === c && gs.status === "playing"}
                  isElim={gs.eliminatedPlayers.includes(c)}
                  captured={gs.capturedBy[c]} />
              ))}
            </PanelFrame>

            {/* CENTER — turn indicator, floating clear of the board, then the board itself */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
              {turnIndicator}
              {boardBlock}
            </div>

            {/* RIGHT — Game Controls */}
            <PanelFrame title="Game Controls" isMobile={false}>
              {superAttackBtn}
              {passBtn}
              {guideBtn}
              {rulesBtn}
              {quitBtn}
            </PanelFrame>
          </div>
        )}

        {/* ── PALADIN RETRIEVAL ── */}
        {gs.pendingRetrieve && gs.pendingRetrieve.color === myColor && (() => {
          const pool = myLostPiecesPool(gs, myColor);
          return (
            <div style={{ position: "fixed", inset: 0, zIndex: 112, background: "rgba(0,0,0,.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div style={{ width: "min(420px,92vw)", borderRadius: 22, padding: "26px 22px", background: "linear-gradient(160deg,#0e0902,#1a1005,#0e0902)", border: "1px solid rgba(212,168,67,.3)", boxShadow: "0 0 50px rgba(212,168,67,.12), 0 30px 70px rgba(0,0,0,.9)", fontFamily: "'Cinzel',Georgia,serif", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>♻</div>
                <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "#c9a84c" }}>Retrieve a Piece</h3>
                <p style={{ margin: "0 0 18px", fontSize: 12, color: "rgba(232,223,200,.55)" }}>Your Paladin reached an enemy's home edge. Choose a fallen piece to bring back.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 18 }}>
                  {pool.length === 0 ? <p style={{ color: "rgba(212,168,67,.4)", fontSize: 12 }}>No captured pieces available.</p> :
                    pool.map(p => (
                      <button key={p.id} onClick={() => handleRetrieve(p.id)} style={{ width: 56, height: 56, borderRadius: 10, cursor: "pointer", background: "rgba(201,168,76,.08)", border: "1px solid rgba(201,168,76,.3)", display: "flex", alignItems: "center", justifyContent: "center", padding: 6 }}>
                        <img src={pieceImagePathX(p)} alt={p.type} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      </button>
                    ))}
                </div>
                <button onClick={handleSkipRetrieve} style={{ width: "100%", padding: "10px 0", borderRadius: 10, cursor: "pointer", background: "transparent", border: "1px solid rgba(212,168,67,.2)", color: "rgba(212,168,67,.6)", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>Skip</button>
              </div>
            </div>
          );
        })()}

        {/* ── BATTLE GUIDE MODAL ── */}
        {showGuide && (
          <div style={{ position: "fixed", inset: 0, zIndex: 111, background: "rgba(0,0,0,.88)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 14 : 24 }}>
            <div className="x8-modal-scroll" data-lenis-prevent style={{ width: isMobile ? "96vw" : "min(760px,92vw)", maxHeight: "90vh", overflowY: "auto", borderRadius: 26, padding: isMobile ? "24px 18px" : "34px 34px", background: "linear-gradient(155deg,#0e0902 0%,#1a1005 40%,#0e0902 100%)", border: "1px solid rgba(212,168,67,.22)", fontFamily: "'Cinzel',Georgia,serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: isMobile ? 22 : 27, color: "#e8c96a" }}>🧭 Battle Guide</h2>
                  <p style={{ margin: "5px 0 0", fontSize: 10, color: "rgba(255,255,255,.5)", letterSpacing: ".1em", textTransform: "uppercase" }}>Pieces · Powers · Combat</p>
                </div>
                <button onClick={() => setShowGuide(false)} style={{ width: 42, height: 42, borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>✕</button>
              </div>
              <p style={{ margin: "8px 0 20px", fontSize: 12.5, color: "rgba(212,168,67,.55)", fontStyle: "italic" }}>💡 Hover (or tap) any piece for its full ability.</p>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                {(Object.keys(PIECE_GUIDE_INFO) as PieceTypeX[]).map(type => (
                  <BattleGuideCardX key={type} pieceKey={type} info={PIECE_GUIDE_INFO[type]} has={myGuideSet.has(type)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── RULES MODAL ── */}
        {showRules && (
          <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,.88)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 14 : 24 }}>
            <div className="x8-modal-scroll" data-lenis-prevent style={{ width: isMobile ? "96vw" : "min(860px,94vw)", maxHeight: "90vh", overflowY: "auto", borderRadius: 26, padding: isMobile ? "24px 18px" : "34px 34px", background: "linear-gradient(155deg,#0e0902 0%,#1a1005 40%,#0e0902 100%)", border: "1px solid rgba(212,168,67,.22)", fontFamily: "'Cinzel',Georgia,serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 22 : 28, color: "#e8c96a" }}>⚔️ X Board Rules</h2>
                <button onClick={() => setShowRules(false)} style={{ width: 42, height: 42, borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <p style={{ margin: "0 0 20px", textAlign: "center", fontSize: 12.5, color: "rgba(212,168,67,.55)", fontStyle: "italic" }}>
                💡 Looking for piece abilities? Open the Battle Guide.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div className="x8-rule-card">
                  <div className="x8-icon" style={{ background: "linear-gradient(145deg,#2a1a06,#3d2a0e)", boxShadow: "0 8px 20px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,220,100,.2)" }}>🗺️</div>
                  <div>
                    <h3 style={{ margin: "0 0 7px", color: "#e8c96a", fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase" }}>Four-Player Battlefield</h3>
                    <p style={{ margin: 0, color: "rgba(215,194,154,.75)", lineHeight: 1.75, fontSize: 13 }}>
                      Four 8×8 armies — <span style={{ color: "#e8c96a" }}>Top, Right, Bottom, Left</span> — are merged into one connected cross-shaped board with a shared 8×8 center. Every side can fight through the middle to reach any other side.
                    </p>
                  </div>
                </div>

                <div className="x8-rule-card">
                  <div className="x8-icon" style={{ background: "linear-gradient(145deg,#0e2010,#14300f)", boxShadow: "0 8px 20px rgba(0,0,0,.6),inset 0 1px 0 rgba(150,220,120,.2)" }}>🔄</div>
                  <div>
                    <h3 style={{ margin: "0 0 7px", color: "#a0e090", fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase" }}>Turn Order</h3>
                    <p style={{ margin: 0, color: "rgba(215,194,154,.75)", lineHeight: 1.75, fontSize: 13 }}>
                      Turns rotate clockwise: <span style={{ color: "#a0e090" }}>Top → Right → Bottom → Left</span>, then back to Top. An eliminated player is skipped automatically — the rotation always continues among whoever remains.
                    </p>
                  </div>
                </div>

                <div className="x8-rule-card">
                  <div className="x8-icon" style={{ background: "linear-gradient(145deg,#1a0e20,#241030)", boxShadow: "0 8px 20px rgba(0,0,0,.6),inset 0 1px 0 rgba(200,150,220,.2)" }}>🤺</div>
                  <div>
                    <h3 style={{ margin: "0 0 7px", color: "#d0a0e8", fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase" }}>How Players Interact</h3>
                    <p style={{ margin: 0, color: "rgba(215,194,154,.75)", lineHeight: 1.75, fontSize: 13 }}>
                      You may move onto or capture a piece belonging to <span style={{ color: "#d0a0e8" }}>any</span> of the other three kingdoms — not just the player before or after you in turn order. Alliances aren't tracked; every other color is a valid target.
                    </p>
                  </div>
                </div>

                <div className="x8-rule-card">
                  <div className="x8-icon" style={{ background: "linear-gradient(145deg,#200e0e,#301010)", boxShadow: "0 8px 20px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,150,150,.2)" }}>⚔️</div>
                  <div>
                    <h3 style={{ margin: "0 0 7px", color: "#ff9090", fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase" }}>Capture Rules</h3>
                    <p style={{ margin: 0, color: "rgba(215,194,154,.75)", lineHeight: 1.75, fontSize: 13 }}>
                      Move a piece onto an enemy-occupied square to capture it. Captured pieces are held by whoever took them — a Paladin reaching an opponent's home edge can bring one of its own fallen pieces back into play (Back-Rank Retrieval).
                    </p>
                  </div>
                </div>

                <div className="x8-rule-card" style={{ background: "rgba(255,215,0,.04)", borderColor: "rgba(255,215,0,.18)", flexDirection: "column", gap: 10, gridColumn: isMobile ? "auto" : "1 / -1" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div className="x8-icon" style={{ background: "linear-gradient(145deg,#1a1400,#2e2400)", boxShadow: "0 8px 18px rgba(0,0,0,.55),0 0 14px rgba(255,215,0,.35),inset 0 1px 0 rgba(255,240,100,.15)" }}>👑</div>
                    <h3 style={{ margin: 0, color: "#ffd700", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase" }}>Winning / Elimination</h3>
                    <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 20, background: "rgba(255,80,80,.15)", border: "1px solid rgba(255,100,100,.4)", color: "#ff9090", fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" }}>🚫 Not King-Capture</span>
                  </div>
                  <p style={{ margin: 0, color: "rgba(215,194,154,.7)", lineHeight: 1.75, fontSize: 12.5 }}>
                    Capturing a King never ends the game by itself. A kingdom is <strong style={{ color: "#ffd700" }}>eliminated</strong> only once every one of its pieces is gone from the board, or its player quits. The battle continues among whoever remains — down to three, then two — until a single kingdom stands alone as the winner.
                  </p>
                </div>

                <div className="x8-rule-card" style={{ background: "rgba(100,120,200,.04)", borderColor: "rgba(100,120,200,.18)", flexDirection: "column", gap: 10, gridColumn: isMobile ? "auto" : "1 / -1" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div className="x8-icon" style={{ background: "linear-gradient(145deg,#0a0e1a,#121828)", boxShadow: "0 8px 18px rgba(0,0,0,.55),0 0 14px rgba(100,120,255,.3),inset 0 1px 0 rgba(150,170,255,.1)" }}>🤝</div>
                    <h3 style={{ margin: 0, color: "#9090e8", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase" }}>Pass Turn</h3>
                    <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 20, background: "rgba(125,189,110,.15)", border: "1px solid rgba(125,189,110,.4)", color: "#a0e090", fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", animation: "x8Pulse2 2s infinite" }}>♾️ Unlimited</span>
                  </div>
                  <p style={{ margin: 0, color: "rgba(215,194,154,.7)", lineHeight: 1.75, fontSize: 12.5 }}>
                    <span style={{ color: "#9090e8" }}>Mexican Standoff</span> — you don't have to move. Pass your turn anytime, as many times as you like.
                  </p>
                </div>
              </div>

              <div style={{ textAlign: "center", padding: "16px 0 2px", borderTop: "1px solid rgba(212,168,67,.1)", marginTop: 16 }}>
                <p style={{ margin: 0, fontSize: 11.5, color: "rgba(212,168,67,.35)", letterSpacing: ".1em", fontStyle: "italic" }}>
                  "Four crowns, one battlefield — only one kingdom walks away."
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── QUIT CONFIRM ── */}
        {showQuitConfirm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 115, background: "rgba(0,0,0,.88)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ width: "min(420px,92vw)", borderRadius: 24, padding: "30px 24px", background: "linear-gradient(155deg,#120606,#2a0e0e,#120606)", border: "1px solid rgba(255,100,100,.25)", textAlign: "center", fontFamily: "'Cinzel',Georgia,serif" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏳️</div>
              <h2 style={{ margin: "0 0 10px", color: "#ff9d9d", fontSize: 22 }}>Surrender?</h2>
              <p style={{ margin: "0 0 20px", color: "rgba(255,220,220,.75)", fontSize: 13, lineHeight: 1.6 }}>Your army will be removed from the board. The battle continues among the remaining players.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setShowQuitConfirm(false)} style={{ padding: "11px 22px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#ddd", cursor: "pointer", fontWeight: 700, fontSize: 11, textTransform: "uppercase", fontFamily: "'Cinzel',Georgia,serif" }}>Stay</button>
                <button onClick={handleQuit} style={{ padding: "11px 22px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#d9534f,#8f1f1f)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 11, textTransform: "uppercase", fontFamily: "'Cinzel',Georgia,serif" }}>Quit</button>
              </div>
            </div>
          </div>
        )}

        {/* ── ELIMINATION POPUP ── */}
        {elimPopup && (
          <EliminationPopupX8 eliminated={elimPopup} playerNames={playerNames} onClose={() => setElimPopup(null)} />
        )}

        {/* ── WIN / DEFEAT SCREEN ── */}
        {showWin && (
          <EndScreenX8
            showWin={showWin}
            myColor={myColor}
            playerNames={playerNames}
            onLobby={() => window.location.href = "/lobby"}
            onPlayAgain={() => { setGs(createInitialGameStateX()); setShowWin(null); }}
          />
        )}
      </div>
    </>
  );
}
