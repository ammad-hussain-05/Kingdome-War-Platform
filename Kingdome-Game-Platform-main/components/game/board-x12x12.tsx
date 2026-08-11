"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { GameStateX12, SquareX12, PlayerColorX12, PieceTypeX12, PieceX12 } from "@/lib/game/rules-x12x12";
import {
  createInitialGameStateX12, getLegalMovesX12, getLegalPaladinSuperMovesX12,
  getCastleMovesX12, executeCastleX12,
  executeMoveX12, advanceTurnX12, quitPlayerX12, sqX12Eq,
  pieceImagePathX12, pieceImageFallbackPathX12, cloneStateX12,
  findSorceressX12, findWizardX12, findKingX12,
  applySleepSpellX12, applyTeleportSpellX12, applyWizardTeleportX12,
  applyMageSacrificeX12, applyAxeSwingX12, getAxeSwingSquaresX12,
  rollWishDiceX12, applyKingMorphX12,
  SIZE, inPlayAreaX12, CENTER_LO, CENTER_HI,
} from "@/lib/game/rules-x12x12";
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
      spell: { freq: [700, 900, 1100], dur: .4, wave: "sine" },
      axe: { freq: [140, 90], dur: .3, wave: "sawtooth" },
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

const AC: Record<PlayerColorX12, string> = { white: "#e8dfc0", black: "#c8a96e", golden: "#d4a843", grey: "#b8c0cc" };
const GL: Record<PlayerColorX12, string> = { white: "rgba(232,223,192,0.4)", black: "rgba(200,169,110,0.4)", golden: "rgba(212,168,67,0.4)", grey: "rgba(184,192,204,0.4)" };
const SIDE_LABEL: Record<PlayerColorX12, string> = { white: "Top", grey: "Right", black: "Bottom", golden: "Left" };

// ─── BATTLE GUIDE — identical piece set/abilities to Classic 12x12 ─────────
const EMOJI: Record<PieceTypeX12, string> = {
  "mystic-king": "👑", "super-queen": "🌟", "dragon": "🐉", "gargoyle": "👹", "wizard": "🧙",
  "sorceress": "🔮", "super-knight": "⚔️", "assassin": "🗡️", "executioner": "🪓",
  "cavalier": "🏇", "mage": "✨", "elvin-archer": "🏹", "paladin": "🛡️",
};
const PIECE_GUIDE_INFO: Record<PieceTypeX12, { name: string; move: string; special: string }> = {
  "mystic-king": { name: "Mystic King", move: "Moves in an L-shaped jump, or 1 square in any direction", special: "Last Wish: the Wizard sacrifices himself so the King may morph into any other piece" },
  "super-queen": { name: "Super Queen", move: "Moves any number of squares in any direction", special: "Gains a second move in the same turn while her Sorceress remains alive" },
  "dragon": { name: "Dragon", move: "Moves any number of squares in any direction, plus a 1-square special attack", special: "Can fly over its own pieces to strike an enemy piece" },
  "gargoyle": { name: "Gargoyle", move: "Wing and Tail Sweep: 1 square in any direction. Fire Attack: 2 squares in any direction", special: "Every turn, may strike either 1 or 2 squares away in any direction" },
  "wizard": { name: "Wizard", move: "Moves any number of squares in any direction (ethereal — cannot capture regular pieces)", special: "Teleports any piece to an empty square by touch" },
  "sorceress": { name: "Sorceress", move: "Moves any number of squares in any direction (ethereal — cannot capture regular pieces)", special: "Holds 3 spells: Sleep, Teleport, and Wish, which is decided by a dice roll" },
  "super-knight": { name: "Super Knight", move: "Moves in an L-shaped jump, like a knight", special: "Can perform two L-shaped jumps within a single turn" },
  "assassin": { name: "Assassin", move: "Moves any number of squares in any direction, in an L-shaped jump, or 1 square in any direction", special: "Combines a Cavalier's L-shaped jump with a Paladin-style 1-square strike" },
  "executioner": { name: "Executioner", move: "Moves in straight lines only, like a Rook", special: "After stopping, may swing his axe to strike an adjacent enemy piece" },
  "cavalier": { name: "Cavalier/Prince", move: "Moves in an L-shaped jump, or 1 square in any direction", special: "Always lands on the opposite square color from where it started" },
  "mage": { name: "Mage/Princess", move: "Moves any number of squares in any direction", special: "May sacrifice himself by touch to fully restore the Super Queen's double-move power" },
  "elvin-archer": { name: "Elvin Archer", move: "Moves any number of squares in any direction, in an L-shaped jump, or 1 square in any direction", special: "Strikes 1 square away with sword or dagger, in Paladin style" },
  "paladin": { name: "Paladin", move: "Moves 1 square in any direction", special: "Super Move: a one-time 3-square surprise attack in any direction, usable once per game. Reverse Castle: may swap places with an adjacent ally to bring it forward in defense" },
};
const GUIDE_ICON_FILE: Partial<Record<PieceTypeX12, string>> = {
  "mystic-king": "Mystic King", "super-queen": "Super Queen", "dragon": "Dragon",
  "gargoyle": "Gargoyle", "wizard": "Wizard", "sorceress": "Sorceress",
  "super-knight": "Super Knight", "executioner": "Executioner", "assassin": "Assassin",
  "cavalier": "Cavalier Prince", "mage": "Mage-Princess", "elvin-archer": "Elven Archer",
  "paladin": "Paladin",
};
function RulePieceIcon({ pieceKey }: { pieceKey: PieceTypeX12 }) {
  const [failed, setFailed] = useState(false);
  const nm = GUIDE_ICON_FILE[pieceKey];
  if (failed || !nm) return <>{EMOJI[pieceKey]}</>;
  return <img src={`/all-characters/${nm}.png`} alt={pieceKey} onError={() => setFailed(true)}
    style={{ width: "82%", height: "82%", objectFit: "contain", pointerEvents: "none" }} />;
}

function BattleGuideCardX12({ pieceKey, info, has }: { pieceKey: PieceTypeX12; info: { name: string; move: string; special: string }; has: boolean }) {
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
function CapturedPieceIconX12({ piece }: { piece: PieceX12 }) {
  const [stage, setStage] = useState(0);
  const src = stage === 0 ? pieceImagePathX12(piece) : stage === 1 ? pieceImageFallbackPathX12(piece) : null;
  if (!src) return <span style={{ fontSize: 12 }}>{EMOJI[piece.type]}</span>;
  return <img src={src} alt={piece.type} onError={() => setStage(s => s + 1)}
    style={{ width: 14, height: 14, objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.8))" }} />;
}

function KingdomCard({ color, name, isMe, isActive, isElim, inCheck, captured }: {
  color: PlayerColorX12; name: string; isMe: boolean; isActive: boolean; isElim: boolean; inCheck: boolean; captured: PieceX12[];
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
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "rgba(0,0,0,.55)" }}>👑</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: ".02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}{isMe ? " (You)" : ""}</p>
        <p style={{ margin: "2px 0 0", fontSize: 9.5, color: "rgba(200,195,205,.5)", textTransform: "uppercase", letterSpacing: ".1em" }}>{isElim ? "Eliminated" : `${SIDE_LABEL[color]} · ${color}`}</p>
        {captured.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5, maxHeight: 20, overflow: "hidden" }}>
            {captured.slice(0, 8).map((p, i) => (
              <CapturedPieceIconX12 key={i} piece={p} />
            ))}
            {captured.length > 8 && <span style={{ fontSize: 8.5, color: "rgba(220,200,165,.5)" }}>+{captured.length - 8}</span>}
          </div>
        )}
      </div>
      {!isElim && inCheck && <span style={{ padding: "3px 7px", borderRadius: 7, background: "rgba(255,80,80,.18)", border: "1px solid rgba(255,80,80,.45)", fontSize: 9, color: "#ff8080", fontWeight: 700, flexShrink: 0 }}>CHECK</span>}
      {!isElim && !inCheck && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", flexShrink: 0, animation: isActive ? "x12Pulse 1.5s infinite" : "none" }} />}
    </div>
  );
}

// ─── COMPACT KINGDOM PILL (mobile-only strip) ───────────────────────────────
function CompactPlayerPill({ color, name, isMe, isActive, isElim }: {
  color: PlayerColorX12; name: string; isMe: boolean; isActive: boolean; isElim: boolean;
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

// ─── CONTROL CARD (right panel — icon badge + title + subtitle) ────────────
// `uniform` switches from the per-action accent-colored look to the shared
// parchment/gold style used by Pass Turn, Battle Guide, Game Rules and Quit
// Game — Super Attack keeps its accent-colored look by omitting the prop.
function ControlCard({ icon, title, subtitle, accent, onClick, disabled, isMobile, uniform }: {
  icon: string; title: string; subtitle: string; accent: string; onClick: () => void; disabled?: boolean; isMobile: boolean; uniform?: boolean;
}) {
  return (
    <button className={uniform ? "x12-btn x12-btn-uniform" : "x12-btn"} onClick={onClick} disabled={disabled}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12, width: isMobile ? undefined : "100%", textAlign: "left",
        padding: "13px 14px", borderRadius: 14, cursor: disabled ? "default" : "pointer", marginBottom: isMobile ? 0 : 12,
        opacity: disabled ? .5 : 1,
        fontFamily: "'Cinzel',Georgia,serif",
        ...(uniform ? {} : {
          background: `linear-gradient(160deg,${accent}1c,${accent}0a)`, border: `1px solid ${accent}4a`,
          boxShadow: `0 8px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08)`,
        }),
      }}>
      <span style={{
        width: 38, height: 38, borderRadius: 10,
        background: uniform ? "rgba(212,168,67,.18)" : `${accent}26`,
        border: uniform ? "1px solid rgba(212,168,67,.4)" : `1px solid ${accent}60`,
        boxShadow: uniform ? "inset 0 1px 0 rgba(255,255,255,.15)" : `inset 0 1px 0 rgba(255,255,255,.15), 0 0 10px ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0,
      }}>{icon}</span>
      {!isMobile && (
        <span style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: uniform ? "#ffffff" : accent, letterSpacing: ".06em", textTransform: "uppercase" }}>{title}</p>
          <p style={{ margin: "3px 0 0", fontSize: 10.5, color: uniform ? "rgba(255,255,255,.55)" : "rgba(220,220,230,.55)", lineHeight: 1.4 }}>{subtitle}</p>
        </span>
      )}
      {isMobile && <span style={{ fontSize: 11, fontWeight: 800, color: uniform ? "#ffffff" : accent, letterSpacing: ".05em", textTransform: "uppercase", alignSelf: "center" }}>{title}</span>}
    </button>
  );
}

// Spell-card icon — same real character artwork as the Battle Guide's
// RulePieceIcon, sized to fill the spell card's badge instead of a plain
// emoji glyph.
function SpellPieceIconX12({ pieceType, fallback }: { pieceType: PieceTypeX12; fallback: string }) {
  const [failed, setFailed] = useState(false);
  const nm = GUIDE_ICON_FILE[pieceType];
  if (failed || !nm) return <>{fallback}</>;
  return <img src={`/all-characters/${nm}.png`} alt={pieceType} onError={() => setFailed(true)}
    style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />;
}

// ─── MODERN SPELL CARD — cleaner, more premium than the old boxy spell bar ──
function SpellCard({ icon, pieceType, title, subtitle, accent, onClick }: {
  icon: string; pieceType: PieceTypeX12; title: string; subtitle: string; accent: string; onClick: () => void;
}) {
  const [hot, setHot] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        width: 128, padding: "16px 12px", borderRadius: 18, cursor: "pointer",
        WebkitTapHighlightColor: "transparent", textAlign: "center", fontFamily: "'Cinzel',Georgia,serif",
        transition: "all .2s ease", transform: hot ? "translateY(-3px) scale(1.03)" : "none",
        background: hot ? `linear-gradient(160deg,${accent}2a,rgba(10,8,4,.9))` : "linear-gradient(160deg,rgba(255,255,255,.05),rgba(10,8,4,.7))",
        border: `1px solid ${hot ? accent + "90" : accent + "38"}`,
        boxShadow: hot ? `0 16px 34px rgba(0,0,0,.55), 0 0 20px ${accent}40` : "0 8px 20px rgba(0,0,0,.4)",
      }}>
      <span style={{ width: 42, height: 42, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: `${accent}22`, border: `1px solid ${accent}55`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.12)`, overflow: "hidden" }}>
        <SpellPieceIconX12 pieceType={pieceType} fallback={icon} />
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: accent, letterSpacing: ".04em" }}>{title}</span>
      <span style={{ fontSize: 9.5, color: "rgba(230,220,200,.55)", lineHeight: 1.4 }}>{subtitle}</span>
    </button>
  );
}

function MorphIconX12({ type, color }: { type: PieceTypeX12; color: PlayerColorX12 }) {
  const [stage, setStage] = useState(0);
  const fake: PieceX12 = { id: "morph", type, color, hasMoved: false, paladanSuperUsed: false, superKnightJumpsLeft: 2, sorceressSpellsLeft: 3, sorceressDead: false, sleepRoundsLeft: 0, isEthereal: false, executionerAxeUsed: false, superQueenDoubleJumpDone: false, mageSacrificed: false };
  const src = stage === 0 ? pieceImagePathX12(fake) : stage === 1 ? pieceImageFallbackPathX12(fake) : null;
  if (!src) return <>{EMOJI[type]}</>;
  return <img src={src} alt={type} onError={() => setStage(s => s + 1)} style={{ width: "84%", height: "84%", objectFit: "contain", pointerEvents: "none" }} />;
}
function MorphOptionCardX12({ type, myColor, info, onPick }: {
  type: PieceTypeX12; myColor: PlayerColorX12; info: { name: string; move: string; special: string }; onPick: () => void;
}) {
  const [hot, setHot] = useState(false);
  return (
    <button onClick={onPick} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        width: 112, padding: "10px 8px", borderRadius: 12, cursor: "pointer",
        WebkitTapHighlightColor: "transparent", textAlign: "center", fontFamily: "'Cinzel',Georgia,serif",
        transition: "all .18s ease", transform: hot ? "translateY(-2px) scale(1.03)" : "none",
        background: hot ? "linear-gradient(145deg,rgba(212,168,67,.22),rgba(255,255,255,.05))" : "rgba(212,168,67,.08)",
        border: `1px solid ${hot ? "rgba(212,168,67,.7)" : "rgba(212,168,67,.3)"}`,
        boxShadow: hot ? "0 10px 24px rgba(0,0,0,.5), 0 0 16px rgba(212,168,67,.3)" : "none",
      }}>
      <span style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#050505", border: "1px solid rgba(255,255,255,.14)", overflow: "hidden", flexShrink: 0 }}>
        <MorphIconX12 type={type} color={myColor} />
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#e8dfc0", letterSpacing: ".03em" }}>{info.name}</span>
    </button>
  );
}

// ─── CROSS-SHAPE CLIP PATH ────────────────────────────────────────────────────
const P1 = (CENTER_LO / SIZE) * 100, P2 = ((CENTER_HI + 1) / SIZE) * 100;
const CROSS_CLIP = `polygon(${P1}% 0%, ${P2}% 0%, ${P2}% ${P1}%, 100% ${P1}%, 100% ${P2}%, ${P2}% ${P2}%, ${P2}% 100%, ${P1}% 100%, ${P1}% ${P2}%, 0% ${P2}%, 0% ${P1}%, ${P1}% ${P1}%)`;
const GEM_CORNERS: [number, number][] = [[P1, P1], [P2, P1], [P1, P2], [P2, P2]];

// ─── BOARD PIECE IMAGE — two-stage fallback (own color -> golden art -> emoji)
function BoardPieceImg({ piece, sqPx, isAnim }: { piece: PieceX12; sqPx: number; isAnim: boolean }) {
  const [stage, setStage] = useState(0);
  const src = stage === 0 ? pieceImagePathX12(piece) : stage === 1 ? pieceImageFallbackPathX12(piece) : null;
  const asleep = piece.sleepRoundsLeft > 0;
  if (!src) {
    return <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sqPx * .46, pointerEvents: "none", zIndex: 3, filter: "drop-shadow(0 3px 6px rgba(0,0,0,.9))" }}>{EMOJI[piece.type]}</div>;
  }
  return (
    <img src={src} alt={piece.type} onError={() => setStage(s => s + 1)} className="x12pi"
      style={{
        filter: `drop-shadow(0 3px 6px rgba(0,0,0,.9))${asleep ? " grayscale(0.7) opacity(0.65)" : ""}`,
        animation: isAnim ? "x12In .32s ease both" : "none",
      }} />
  );
}

// ─── ELIMINATION POPUP — same style/animation as the Classic boards ────────
function EliminationPopupX12({ eliminated, playerNames, onClose }: { eliminated: PlayerColorX12; playerNames: Record<PlayerColorX12, string>; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const ac = AC[eliminated];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "x12FadeIn .3s ease" }} onClick={onClose}>
      <div style={{ textAlign: "center", padding: "48px 64px", borderRadius: 24, background: "linear-gradient(160deg,#1a0505,#2a0808)", border: `1px solid ${ac}40`, boxShadow: "0 0 60px rgba(255,50,50,.3),0 30px 80px rgba(0,0,0,.8)", animation: "x12SlideUp .4s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ fontSize: 72, marginBottom: 16, lineHeight: 1 }}>💀</div>
        <h2 style={{ fontFamily: "'Cinzel',Georgia,serif", fontSize: 32, color: "#ff8080", margin: "0 0 8px", fontWeight: 700 }}>Eliminated!</h2>
        <p style={{ fontSize: 18, color: `${ac}cc`, margin: "0 0 6px", fontWeight: 600 }}>{playerNames[eliminated] || eliminated} ({SIDE_LABEL[eliminated]})</p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", margin: "0 0 24px", fontStyle: "italic" }}>has been eliminated from the battlefield</p>
        <p style={{ fontSize: 13, color: "rgba(255,180,180,.5)" }}>The remaining kingdoms continue their battle...</p>
      </div>
    </div>
  );
}

// ─── WIN / DEFEAT SCREEN — same premium celebration effect as the Classic
// boards: fireworks for the winner, glow, and a richer presentation than a
// plain static card ─────────────────────────────────────────────────────────
function EndScreenX12({ showWin, myColor, playerNames, onLobby, onPlayAgain }: {
  showWin: PlayerColorX12; myColor: PlayerColorX12; playerNames: Record<PlayerColorX12, string>; onLobby: () => void; onPlayAgain: () => void;
}) {
  const isWinner = showWin === myColor;
  const ac = AC[showWin];
  const gl = GL[showWin];
  return (
    <>
      {isWinner && <Fireworks />}
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "x12FadeIn .4s ease", padding: 20 }}>
        <div style={{
          textAlign: "center", padding: "52px 68px", borderRadius: 28, position: "relative", overflow: "hidden",
          background: isWinner ? "linear-gradient(160deg,#1a1400,#2e2000,#1a1400)" : "linear-gradient(160deg,#0e0505,#1e0808,#0e0505)",
          border: `1px solid ${ac}45`,
          boxShadow: `0 0 80px ${gl},0 0 160px ${isWinner ? "rgba(212,168,67,0.15)" : "rgba(255,50,50,0.1)"},0 40px 100px rgba(0,0,0,0.95),inset 0 1px 0 ${ac}18`,
          animation: "x12WinPulse 2.5s ease-in-out infinite", fontFamily: "'Cinzel',Georgia,serif", maxWidth: "92vw",
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
  myColor: PlayerColorX12; roomId: string;
  playerNames: Record<PlayerColorX12, string>;
  onGameEnd?: (winner: PlayerColorX12) => void;
  socket?: any;
}

export default function BoardX12x12({ myColor, roomId, playerNames, onGameEnd, socket }: Props) {
  const [gs, setGs] = useState<GameStateX12>(createInitialGameStateX12());
  const [animSq, setAnimSq] = useState<SquareX12 | null>(null);
  const [showWin, setShowWin] = useState<PlayerColorX12 | null>(null);
  const [elimPopup, setElimPopup] = useState<PlayerColorX12 | null>(null);
  const [sqPx, setSqPx] = useState(20);
  const [isMobile, setIsMobile] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const gsRef = useRef(gs);
  useEffect(() => { gsRef.current = gs; }, [gs]);

  const isMyTurn = gs.currentTurn === myColor && gs.status === "playing";
  const isElim = gs.eliminatedPlayers.includes(myColor);
  const selSq = gs.selectedSquare;
  const selPiece = selSq ? gs.board[selSq.row][selSq.col] : null;
  const selectedIsPaladin = selPiece?.type === "paladin" && selPiece.color === myColor;
  const paladinSuperUsed = selPiece?.paladanSuperUsed ?? false;

  // ─── RESPONSIVE SIZE ────────────────────────────────────────────────────
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const mobile = vw <= 1000;
      setIsMobile(mobile);

      if (mobile) {
        const outerPadX = 24;
        const headerH = 66;
        const cardsH = 40;
        const turnH = 34;
        const controlsH = 96;
        const gaps = 14 * 4;
        const safety = 40;
        const chromeH = headerH + cardsH + turnH + controlsH + gaps + outerPadX * 2 + safety;
        const maxByWidth = vw - outerPadX * 2;
        const maxByHeight = vh - chromeH;
        const raw = Math.floor(Math.min(maxByWidth, maxByHeight) / SIZE);
        setSqPx(Math.max(6, Math.min(raw, 26)));
      } else {
        const outerPadX = 56, outerPadY = 56;
        const headerH = 108;
        const outerGap = 26;
        const turnH = 42;
        const centerColGap = 30;
        const panelW = 272;
        const rowGap = 44;
        const safety = 40;
        const chromeH = headerH + outerGap + turnH + centerColGap + safety;
        const maxByWidth = vw - outerPadX * 2 - panelW * 2 - rowGap * 2;
        const maxByHeight = vh - outerPadY * 2 - chromeH;
        const raw = Math.floor(Math.min(maxByWidth, maxByHeight) / SIZE);
        setSqPx(Math.max(6, Math.min(raw, 48)));
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
    socket.on("game:move", ({ newState }: { newState: GameStateX12 }) => {
      const prev = gsRef.current;
      if (newState.lastMove) { setAnimSq(newState.lastMove.to); setTimeout(() => setAnimSq(null), 420); }
      if (newState.eliminatedPlayers.length > prev.eliminatedPlayers.length) {
        snd("eliminate");
        if (newState.justEliminated) setTimeout(() => setElimPopup(newState.justEliminated), 350);
      } else if (newState.specialMode === "executioner-axe-swing") {
        snd("axe");
      } else if (newState.spellMessage) {
        snd("spell");
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
    socket.on("game:quit", ({ newState }: { newState: GameStateX12 }) => {
      setGs(newState); setShowQuitConfirm(false);
      if (newState.status === "finished" && newState.winner) {
        setTimeout(() => { setShowWin(newState.winner); snd("win"); }, 250);
      }
    });
    return () => { socket.off("game:move"); socket.off("game:quit"); };
  }, [socket]);

  // ─── ACTIONS ────────────────────────────────────────────────────────────
  const emit = (ns: GameStateX12) => { setGs(ns); socket?.emit("game:move", { roomId, newState: ns }); };

  const handleSuperAttack = useCallback(() => {
    const state = gsRef.current;
    if (!state.selectedSquare) return;
    const { row, col } = state.selectedSquare;
    const piece = state.board[row][col];
    if (!piece || piece.type !== "paladin" || piece.paladanSuperUsed) return;
    snd("select");
    const superMoves = getLegalPaladinSuperMovesX12(state.board, row, col, state.turnOrder);
    emit({ ...cloneStateX12(state), superMoves, superMoveMode: true, validMoves: [], castleMoves: [] });
  }, [roomId, socket]);

  const handlePass = useCallback(() => {
    const state = gsRef.current;
    if (state.currentTurn !== myColor || state.status !== "playing") return;
    snd("pass");
    emit(advanceTurnX12(cloneStateX12(state)));
  }, [myColor, roomId, socket]);

  const handleQuit = useCallback(() => {
    const ns = quitPlayerX12(gsRef.current, myColor);
    setShowQuitConfirm(false);
    emit(ns);
    if (ns.status === "finished" && ns.winner) { setTimeout(() => { setShowWin(ns.winner); snd("win"); }, 250); onGameEnd?.(ns.winner); }
    socket?.emit("game:quit", { roomId, quitter: myColor, newState: ns });
  }, [myColor, roomId, socket, onGameEnd]);

  // ─── SPECIAL / SPELL ACTIONS ─────────────────────────────────────────────
  const handleSpecial = useCallback((action: string, data?: any) => {
    const state = gsRef.current;
    let ns: GameStateX12;
    if (action === "spell-sleep") {
      ns = { ...cloneStateX12(state), specialMode: "sorceress-sleep-select", spellMessage: "Click any enemy piece to put it to sleep (3 rounds)." };
    } else if (action === "spell-teleport") {
      ns = { ...cloneStateX12(state), specialMode: "sorceress-teleport-select", spellMessage: "Click any piece to teleport it." };
    } else if (action === "spell-wish") {
      const roll = rollWishDiceX12();
      ns = cloneStateX12(state); ns.wishDiceResult = roll;
      const sSq = findSorceressX12(state.board, myColor);
      if (sSq) {
        const s = ns.board[sSq.row][sSq.col]!;
        const nsp = s.sorceressSpellsLeft - 1;
        ns.board[sSq.row][sSq.col] = nsp <= 0 ? null : { ...s, sorceressSpellsLeft: nsp };
      }
    } else if (action === "wizard-teleport") {
      ns = { ...cloneStateX12(state), specialMode: "wizard-teleport-select-piece", spellMessage: "Click any piece to teleport via Wizard." };
    } else if (action === "king-morph") {
      ns = { ...cloneStateX12(state), specialMode: "mystic-king-morph-select", spellMessage: "Choose what the King morphs into — the Wizard gives his life for this." };
    } else if (action === "king-morph-confirm" && data) {
      const kingSq = findKingX12(state.board, myColor); const wizSq = findWizardX12(state.board, myColor);
      if (!kingSq || !wizSq) { ns = advanceTurnX12(cloneStateX12(state)); }
      else {
        const board = applyKingMorphX12(state.board, kingSq, wizSq, data.type);
        ns = advanceTurnX12({ ...cloneStateX12(state), board });
        snd("spell");
      }
    } else if (action === "mage-sacrifice" && data) {
      const board = applyMageSacrificeX12(state.board, data.mageSq, data.queenSq);
      ns = advanceTurnX12({ ...cloneStateX12(state), board });
      snd("spell");
    } else if (action === "wish-success") {
      ns = { ...cloneStateX12(state), wishDiceResult: null, specialMode: "wizard-teleport-select-piece", spellMessage: "Wish granted! Move any piece anywhere." };
    } else if (action === "wish-fail") {
      ns = advanceTurnX12(cloneStateX12(state));
    } else return;
    emit(ns);
    if (ns.status === "finished" && ns.winner) { setTimeout(() => { setShowWin(ns.winner); snd("win"); }, 300); onGameEnd?.(ns.winner); }
  }, [myColor, roomId, socket, onGameEnd]);

  const cancelSpecial = useCallback(() => {
    const state = gsRef.current;
    emit({ ...cloneStateX12(state), specialMode: null, specialData: null, spellMessage: null, wishDiceResult: null, selectedSquare: null, validMoves: [], superMoves: [], superMoveMode: false });
  }, [roomId, socket]);

  // ─── CLICK HANDLER ────────────────────────────────────────────────────────
  const handleClick = useCallback((row: number, col: number) => {
    const state = gsRef.current;
    if (state.status === "finished" || state.currentTurn !== myColor || isElim) return;
    if (state.wishDiceResult !== null) return;
    const { board, selectedSquare, validMoves, superMoves, superMoveMode, specialMode, castleMoves } = state;
    const cp = board[row][col];
    const sq: SquareX12 = { row, col };
    snd("click");

    if (superMoveMode && selectedSquare && superMoves.some(m => sqX12Eq(m, sq))) {
      const ns = executeMoveX12(state, selectedSquare, sq);
      setAnimSq(sq); setTimeout(() => setAnimSq(null), 450);
      snd("super");
      emit(ns);
      if (ns.status === "finished" && ns.winner) { setTimeout(() => { setShowWin(ns.winner); snd("win"); }, 300); onGameEnd?.(ns.winner); }
      return;
    }

    if (specialMode === "sorceress-sleep-select") {
      if (cp && cp.color !== myColor) {
        const sSq = findSorceressX12(board, myColor)!;
        const nb = applySleepSpellX12(board, sq, sSq);
        const ns = advanceTurnX12({ ...cloneStateX12(state), board: nb });
        snd("spell");
        emit(ns);
      }
      return;
    }
    if (specialMode === "sorceress-teleport-select") {
      if (!state.specialData) { if (cp) emit({ ...cloneStateX12(state), specialData: { pieceSq: sq }, spellMessage: "Now click the destination square." }); return; }
      if (!cp || cp.color !== myColor) {
        const sSq = findSorceressX12(board, myColor)!;
        const nb = applyTeleportSpellX12(board, state.specialData.pieceSq, sq, sSq);
        const ns = advanceTurnX12({ ...cloneStateX12(state), board: nb });
        snd("spell");
        emit(ns);
      }
      return;
    }
    if (specialMode === "wizard-teleport-select-piece") {
      if (cp) emit({ ...cloneStateX12(state), specialMode: "wizard-teleport-select-dest", specialData: { pieceSq: sq }, spellMessage: "Now click the destination." });
      return;
    }
    if (specialMode === "wizard-teleport-select-dest") {
      if (!cp) {
        const nb = applyWizardTeleportX12(board, state.specialData.pieceSq, sq);
        const ns = advanceTurnX12({ ...cloneStateX12(state), board: nb });
        snd("spell");
        emit(ns);
      }
      return;
    }
    if (specialMode === "executioner-axe-swing") {
      const exSq = state.pendingAxeSquare!;
      const ax = getAxeSwingSquaresX12(board, exSq.row, exSq.col, myColor);
      if (ax.some(s => sqX12Eq(s, sq))) {
        const ns = applyAxeSwingX12(state, sq);
        snd("axe");
        emit(ns);
      } else {
        emit(advanceTurnX12(cloneStateX12(state)));
      }
      return;
    }
    if (specialMode === "super-queen-second-move") {
      if (selectedSquare && validMoves.some(m => sqX12Eq(m, sq))) {
        const ns2 = cloneStateX12(state);
        const p2 = ns2.board[selectedSquare.row][selectedSquare.col]!;
        const t2 = ns2.board[sq.row][sq.col];
        if (t2) ns2.capturedBy[p2.color].push(t2);
        ns2.board[sq.row][sq.col] = p2; ns2.board[selectedSquare.row][selectedSquare.col] = null;
        ns2.lastMove = { from: selectedSquare, to: sq };
        const final = advanceTurnX12(ns2);
        snd("move");
        setAnimSq(sq); setTimeout(() => setAnimSq(null), 450);
        emit(final);
        if (final.status === "finished" && final.winner) { setTimeout(() => { setShowWin(final.winner); snd("win"); }, 300); onGameEnd?.(final.winner); }
      }
      return;
    }

    if (selectedSquare && castleMoves.some(m => sqX12Eq(m, sq))) {
      const ns = executeCastleX12(state, selectedSquare, sq);
      setAnimSq(sq); setTimeout(() => setAnimSq(null), 420);
      snd("move");
      emit(ns);
      return;
    }
    if (selectedSquare && validMoves.some(m => sqX12Eq(m, sq))) {
      const ns = executeMoveX12(state, selectedSquare, sq);
      setAnimSq(sq); setTimeout(() => setAnimSq(null), 420);
      const prevCap = Object.values(state.capturedBy).reduce((n, a) => n + a.length, 0);
      const newCap = Object.values(ns.capturedBy).reduce((n, a) => n + a.length, 0);
      snd(newCap > prevCap ? "capture" : "move");
      emit(ns);
      if (ns.status === "finished" && ns.winner) { setTimeout(() => { setShowWin(ns.winner); snd("win"); }, 300); onGameEnd?.(ns.winner); }
      return;
    }
    if (cp?.color === myColor && cp.sleepRoundsLeft === 0) {
      snd("select");
      const isPal = cp.type === "paladin";
      emit({
        ...cloneStateX12(state), selectedSquare: sq,
        validMoves: getLegalMovesX12(board, row, col, state.turnOrder),
        castleMoves: isPal ? getCastleMovesX12(board, row, col) : [],
        superMoves: [], superMoveMode: false,
      });
      return;
    }
    emit({ ...cloneStateX12(state), selectedSquare: null, validMoves: [], castleMoves: [], superMoves: [], superMoveMode: false });
  }, [myColor, roomId, socket, onGameEnd, isElim]);

  // ─── SPELL AVAILABILITY (for the modern spell-card row) ─────────────────
  const sorcSq = findSorceressX12(gs.board, myColor);
  const spellsLeft = sorcSq ? gs.board[sorcSq.row][sorcSq.col]?.sorceressSpellsLeft ?? 0 : 0;
  const hasSorc = spellsLeft > 0;
  const wizSq = findWizardX12(gs.board, myColor);
  const hasWiz = !!wizSq;
  const kingSq = findKingX12(gs.board, myColor);
  const hasKingMorph = !!kingSq && hasWiz;
  const mageNextToQueen = (() => {
    let q: SquareX12 | null = null;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (gs.board[r][c]?.type === "super-queen" && gs.board[r][c]?.color === myColor) q = { row: r, col: c };
    if (!q) return null;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]] as [number, number][]) {
      const r = q.row + dr, c = q.col + dc;
      if (inPlayAreaX12(r, c) && gs.board[r][c]?.type === "mage" && gs.board[r][c]?.color === myColor) return { mageSq: { row: r, col: c }, queenSq: q };
    }
    return null;
  })();
  const morphTargets: PieceTypeX12[] = ["super-queen", "dragon", "gargoyle", "sorceress", "super-knight", "assassin", "executioner", "cavalier", "mage", "elvin-archer", "paladin"];
  const showSpellDeck = isMyTurn && (hasSorc || hasWiz || hasKingMorph || !!mageNextToQueen || !!gs.spellMessage || gs.superMoveMode);

  // ─── OVERLAY DATA ───────────────────────────────────────────────────────
  const allColors: PlayerColorX12[] = ["white", "grey", "black", "golden"];
  const myGuideSet = new Set<PieceTypeX12>();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = gs.board[r][c];
    if (p && p.color === myColor) myGuideSet.add(p.type);
  }

  // ─── SHARED BLOCKS ──────────────────────────────────────────────────────
  const turnIndicator = (
    <div style={{ borderRadius: 10, padding: "8px 22px", display: "flex", alignItems: "center", gap: 9,
      background: "rgba(8,6,3,.75)",
      border: `1px solid ${gs.check === myColor ? "rgba(255,80,80,.4)" : isMyTurn ? "rgba(125,189,110,.45)" : "rgba(212,168,67,.35)"}`,
      boxShadow: isMyTurn ? "0 0 20px rgba(125,189,110,.18)" : "0 8px 20px rgba(0,0,0,.45)" }}>
      <span style={{ fontSize: 14 }}>{gs.check === myColor ? "⚠️" : isMyTurn ? "⚔️" : "⏳"}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: gs.check === myColor ? "#ff8080" : isMyTurn ? "#7dbd6e" : "#e8c96a" }}>
        {gs.status === "finished" ? "Battle Over" : gs.check === myColor ? "Check!" : isMyTurn ? "Your Turn" : `${playerNames[gs.currentTurn] || gs.currentTurn}'s Turn`}
      </span>
    </div>
  );

  const boardBlock = (
    <div style={{ position: "relative", width: boardPx, height: boardPx, animation: "x12FadeUp .5s ease", margin: isMobile ? "0 0 4px" : "0 0 6px" }}>
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
        animation: "x12TrimShine 7s linear infinite",
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
            if (!inPlayAreaX12(row, col)) return <div key={`${row}-${col}`} style={{ width: sqPx, height: sqPx, pointerEvents: "none" }} />;

            const piece = gs.board[row][col];
            const sq = { row, col };
            const isLight = (row + col) % 2 === 0;
            const isSel = !!gs.selectedSquare && sqX12Eq(gs.selectedSquare, sq);
            const isValid = gs.validMoves.some(m => sqX12Eq(m, sq));
            const isSuper = gs.superMoveMode && gs.superMoves.some(m => sqX12Eq(m, sq));
            const isLF = !!gs.lastMove && sqX12Eq(gs.lastMove.from, sq);
            const isLT = !!gs.lastMove && sqX12Eq(gs.lastMove.to, sq);
            const isChk = piece?.type === "mystic-king" && piece.color === gs.check;
            const isAnim = !!animSq && sqX12Eq(animSq, sq);
            const isAxeT = gs.specialMode === "executioner-axe-swing" && gs.pendingAxeSquare && getAxeSwingSquaresX12(gs.board, gs.pendingAxeSquare.row, gs.pendingAxeSquare.col, myColor).some(s => sqX12Eq(s, sq));
            const isCastleMove = gs.castleMoves.some(m => sqX12Eq(m, sq));

            const baseBg = isLight ? "#c9a96e" : "#4a2e1a";
            let ov = "";
            if (isSel) ov = "rgba(212,168,67,.55)";
            else if (isChk) ov = "rgba(220,40,40,.6)";
            else if (isLF || isLT) ov = "rgba(212,168,67,.25)";
            else if (isAxeT) ov = "rgba(255,80,0,.45)";
            else if (isCastleMove) ov = "rgba(80,160,255,.18)";
            if (gs.superMoveMode && !isSel && !isSuper) ov = ov || "rgba(0,0,0,.08)";

            return (
              <div key={`${row}-${col}`} className="x12sq" onClick={() => handleClick(row, col)} style={{ width: sqPx, height: sqPx, background: baseBg, position: "relative" }}>
                {ov && <div style={{ position: "absolute", inset: 0, zIndex: 1, background: ov, pointerEvents: "none" }} />}
                {piece && piece.sleepRoundsLeft > 0 && <div style={{ position: "absolute", top: 1, right: 1, zIndex: 5, fontSize: sqPx * .3, pointerEvents: "none" }}>💤</div>}
                {isValid && !piece && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: sqPx * .32, height: sqPx * .32, borderRadius: "50%", background: "rgba(212,168,67,.75)", boxShadow: "0 0 10px rgba(212,168,67,.6)", animation: "x12Dot .15s ease both", pointerEvents: "none", zIndex: 4 }} />}
                {isValid && piece && <div style={{ position: "absolute", inset: Math.max(2, sqPx * .06), zIndex: 4, borderRadius: 4, border: "2px solid rgba(212,168,67,.9)", pointerEvents: "none" }} />}
                {isAxeT && piece && <div style={{ position: "absolute", inset: Math.max(2, sqPx * .06), zIndex: 4, borderRadius: 4, border: "2px solid rgba(255,80,0,.9)", pointerEvents: "none" }} />}
                {isCastleMove && piece && <div style={{ position: "absolute", inset: Math.max(2, sqPx * .06), zIndex: 4, borderRadius: 4, border: "2px dashed rgba(80,160,255,.9)", pointerEvents: "none" }} />}
                {isSuper && !piece && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: sqPx * .36, height: sqPx * .36, borderRadius: "50%", background: "rgba(255,140,0,.82)", boxShadow: "0 0 14px rgba(255,140,0,.7)", pointerEvents: "none", zIndex: 4 }} />}
                {isSuper && piece && <div style={{ position: "absolute", inset: Math.max(2, sqPx * .06), zIndex: 4, borderRadius: 4, border: "2px solid rgba(255,140,0,.95)", pointerEvents: "none" }} />}
                {piece && (
                  <BoardPieceImg piece={piece} sqPx={sqPx} isAnim={isAnim} />
                )}
              </div>
            );
          }))}
        </div>
      </div>
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

  // ─── MODERN SPELL DECK — replaces the old boxy special-action bar ───────
  const spellDeck = showSpellDeck && (
    <div style={{
      position: "relative", zIndex: 20, width: "min(620px,95vw)", margin: isMobile ? "0 0 4px" : "6px auto 0",
      background: "linear-gradient(160deg,rgba(10,8,4,.85),rgba(5,4,2,.92))", border: "1px solid rgba(212,168,67,.25)",
      borderRadius: 20, padding: "16px 18px",
      boxShadow: "0 24px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05)",
    }}>
      {gs.spellMessage && <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#e8c96a", fontWeight: 700, textAlign: "center", letterSpacing: ".03em" }}>✨ {gs.spellMessage}</p>}
      {gs.wishDiceResult !== null && (
        <div style={{ padding: "12px 18px", borderRadius: 14, background: gs.wishDiceResult > 5 ? "rgba(125,189,110,.12)" : "rgba(255,80,80,.12)", border: `1px solid ${gs.wishDiceResult > 5 ? "rgba(125,189,110,.3)" : "rgba(255,80,80,.3)"}`, textAlign: "center", marginBottom: 10 }}>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: gs.wishDiceResult > 5 ? "#7dbd6e" : "#ff8080" }}>🎲 {gs.wishDiceResult}/10</p>
          <p style={{ margin: "4px 0 10px", fontSize: 12, color: "rgba(220,200,165,.6)" }}>{gs.wishDiceResult > 5 ? "Wish Granted!" : "Wish Failed — Turn Lost"}</p>
          {gs.wishDiceResult > 5
            ? <button onClick={() => handleSpecial("wish-success")} style={{ padding: "9px 20px", borderRadius: 10, background: "rgba(125,189,110,.2)", border: "1px solid rgba(125,189,110,.4)", color: "#7dbd6e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Claim Wish →</button>
            : <button onClick={() => handleSpecial("wish-fail")} style={{ padding: "9px 20px", borderRadius: 10, background: "rgba(255,80,80,.1)", border: "1px solid rgba(255,80,80,.3)", color: "#ff8080", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>End Turn</button>}
        </div>
      )}
      {gs.specialMode === "mystic-king-morph-select" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 4 }}>
          {morphTargets.map(t => <MorphOptionCardX12 key={t} type={t} myColor={myColor} info={PIECE_GUIDE_INFO[t]} onPick={() => handleSpecial("king-morph-confirm", { type: t })} />)}
        </div>
      )}
      {!gs.specialMode && gs.wishDiceResult === null && !gs.superMoveMode && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {hasSorc && <>
            <SpellCard icon="😴" pieceType="sorceress" title="Sleep" subtitle={`${spellsLeft} charges left`} accent="#9090ff" onClick={() => handleSpecial("spell-sleep")} />
            <SpellCard icon="🌀" pieceType="sorceress" title="Teleport" subtitle="Move any piece" accent="#d080ff" onClick={() => handleSpecial("spell-teleport")} />
            <SpellCard icon="⭐" pieceType="sorceress" title="Wish" subtitle="Roll the dice" accent="#f0c040" onClick={() => handleSpecial("spell-wish")} />
          </>}
          {hasWiz && <SpellCard icon="🧙" pieceType="wizard" title="Wizard Teleport" subtitle="Relocate any piece" accent="#60c0f0" onClick={() => handleSpecial("wizard-teleport")} />}
          {hasKingMorph && <SpellCard icon="🔮" pieceType="mystic-king" title="Last Wish" subtitle="Morph the King" accent="#e8dfc0" onClick={() => handleSpecial("king-morph")} />}
          {mageNextToQueen && <SpellCard icon="💫" pieceType="mage" title="Mage Sacrifice" subtitle="Restore Super Queen" accent="#ff9090" onClick={() => handleSpecial("mage-sacrifice", mageNextToQueen)} />}
        </div>
      )}
      {gs.superMoveMode && <p style={{ margin: "0 0 4px", fontSize: 11, color: "#ffb347", textAlign: "center", fontWeight: 700 }}>⚔ Choose a square 3 spaces away to strike</p>}
      {(gs.specialMode || gs.superMoveMode) && gs.wishDiceResult === null && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <button onClick={cancelSpecial} style={{ padding: "7px 20px", borderRadius: 10, background: "rgba(255,80,80,.1)", border: "1px solid rgba(255,80,80,.25)", color: "#ff8080", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✕ Cancel</button>
        </div>
      )}
    </div>
  );

  const superAttackBtn = isMyTurn && selectedIsPaladin && (
    <ControlCard isMobile={isMobile} icon="⚡" accent="#ffb347"
      title={paladinSuperUsed ? "Super Used" : "Super Attack"}
      subtitle={paladinSuperUsed ? "This Paladin's one-time strike is already spent" : "Unleash a one-time 3-square surprise strike"}
      disabled={paladinSuperUsed}
      onClick={() => { if (!paladinSuperUsed) handleSuperAttack(); }} />
  );
  const passBtn = (
    <ControlCard isMobile={isMobile} icon="⏩" accent="#60a5fa" title="Pass Turn" subtitle="Hand the battlefield to the next kingdom"
      disabled={!isMyTurn} onClick={handlePass} uniform />
  );
  const guideBtn = (
    <ControlCard isMobile={isMobile} icon="📖" accent="#c084fc" title="Battle Guide" subtitle="Master every unit's powers and abilities"
      onClick={() => setShowGuide(true)} uniform />
  );
  const rulesBtn = (
    <ControlCard isMobile={isMobile} icon="📜" accent="#4ade80" title="Game Rules" subtitle="Discover the path to becoming the last kingdom standing"
      onClick={() => setShowRules(true)} uniform />
  );
  const quitBtn = !isElim && gs.status === "playing" && (
    <ControlCard isMobile={isMobile} icon="🚩" accent="#f87171" title="Quit Game" subtitle="Retreat and forfeit your kingdom's claim"
      onClick={() => setShowQuitConfirm(true)} uniform />
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        *{box-sizing:border-box;}
        @keyframes x12Pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
        @keyframes x12In{0%{opacity:.3;transform:translate(-50%,-50%) scale(.65)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes x12Dot{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}80%{transform:translate(-50%,-50%) scale(1.2)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes x12FadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes x12Shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes x12Float{0%,100%{transform:translateY(0) rotateY(0deg)}50%{transform:translateY(-4px) rotateY(12deg)}}
        @keyframes x12TrimShine{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes x12FadeIn{from{opacity:0}to{opacity:1}}
        @keyframes x12SlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes x12WinPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
        .x12sq{position:relative;overflow:hidden;cursor:pointer;transition:filter .1s;}
        .x12sq:hover{filter:brightness(1.2);}
        .x12-btn{backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:all .18s ease;box-shadow:0 6px 18px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.06);}
        .x12-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 26px rgba(0,0,0,.55);}
        .x12-btn:active:not(:disabled){transform:translateY(0) scale(.98);}
        .x12-btn:disabled{cursor:default;}
        .x12-btn-uniform{background:linear-gradient(160deg,#5c3d1f 0%,#2a1a0a 100%);border:1px solid rgba(212,168,67,.35);box-shadow:0 8px 20px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08);}
        .x12-btn-uniform:hover:not(:disabled){background:linear-gradient(160deg,#6b4726 0%,#331f0d 100%);box-shadow:0 12px 26px rgba(0,0,0,.55);}
        .x12pi{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:88%;height:88%;object-fit:contain;pointer-events:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.9));}
        .x12-rule-card{padding:16px 18px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(212,168,67,.1);transition:border-color .2s,background .2s;display:flex;gap:16px;align-items:flex-start;}
        .x12-rule-card:hover{background:rgba(212,168,67,.05);border-color:rgba(212,168,67,.22);}
        .x12-icon{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;font-size:24px;flex-shrink:0;animation:x12Float 3s ease-in-out infinite;user-select:none;}
        .x12-modal-scroll::-webkit-scrollbar{width:5px;}
        .x12-modal-scroll::-webkit-scrollbar-track{background:transparent;}
        .x12-modal-scroll::-webkit-scrollbar-thumb{background:rgba(212,168,67,.25);border-radius:5px;}
      `}</style>

      <div style={{
        minHeight: "100vh", width: "100%", maxWidth: "100vw", overflowX: "hidden", boxSizing: "border-box",
        backgroundImage: "url('/X-8x8/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex", flexDirection: "column", alignItems: "center",
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
            animation: "x12Shimmer 3s linear infinite",
            textShadow: "0 0 44px rgba(212,168,67,.28)",
          }}>
            12×12 X Board
          </h1>
          <p style={{ margin: isMobile ? "5px 0 0" : "8px 0 0", fontSize: isMobile ? 10 : 12.5, color: "rgba(212,168,67,.6)", letterSpacing: ".22em", textTransform: "uppercase" }}>
            Four Kingdoms <span style={{ color: "rgba(212,168,67,.9)" }}>✦</span> One Battlefield
          </p>
        </div>

        {isMobile ? (
          <>
            <div style={{ display: "flex", gap: 6, width: "100%", maxWidth: boardPx + 40 }}>
              {allColors.map(c => (
                <CompactPlayerPill key={c} color={c} name={playerNames[c] || c} isMe={c === myColor}
                  isActive={gs.currentTurn === c && gs.status === "playing"}
                  isElim={gs.eliminatedPlayers.includes(c)} />
              ))}
            </div>

            {turnIndicator}
            {boardBlock}
            {spellDeck}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%", maxWidth: boardPx + 40 }}>
              {superAttackBtn}
              {passBtn}
              {guideBtn}
              {rulesBtn}
              {quitBtn}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "row", gap: 44, alignItems: "flex-start", justifyContent: "center", width: "100%" }}>
              <PanelFrame title="The Four Kingdoms" isMobile={false}>
                {allColors.map(c => (
                  <KingdomCard key={c} color={c} name={playerNames[c] || c} isMe={c === myColor}
                    isActive={gs.currentTurn === c && gs.status === "playing"}
                    isElim={gs.eliminatedPlayers.includes(c)}
                    inCheck={gs.check === c}
                    captured={gs.capturedBy[c]} />
                ))}
              </PanelFrame>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
                {turnIndicator}
                {boardBlock}
              </div>

              <PanelFrame title="Game Controls" isMobile={false}>
                {superAttackBtn}
                {passBtn}
                {guideBtn}
                {rulesBtn}
                {quitBtn}
              </PanelFrame>
            </div>
            {spellDeck}
          </div>
        )}

        {/* ── BATTLE GUIDE MODAL ── */}
        {showGuide && (
          <div style={{ position: "fixed", inset: 0, zIndex: 111, background: "rgba(0,0,0,.88)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 14 : 24 }}>
            <div className="x12-modal-scroll" data-lenis-prevent style={{ width: isMobile ? "96vw" : "min(820px,92vw)", maxHeight: "90vh", overflowY: "auto", borderRadius: 26, padding: isMobile ? "24px 18px" : "34px 34px", background: "linear-gradient(155deg,#0e0902 0%,#1a1005 40%,#0e0902 100%)", border: "1px solid rgba(212,168,67,.22)", fontFamily: "'Cinzel',Georgia,serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: isMobile ? 22 : 27, color: "#e8c96a" }}>🧭 Battle Guide</h2>
                  <p style={{ margin: "5px 0 0", fontSize: 10, color: "rgba(255,255,255,.5)", letterSpacing: ".1em", textTransform: "uppercase" }}>Pieces · Powers · Combat</p>
                </div>
                <button onClick={() => setShowGuide(false)} style={{ width: 42, height: 42, borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>✕</button>
              </div>
              <p style={{ margin: "8px 0 20px", fontSize: 12.5, color: "rgba(212,168,67,.55)", fontStyle: "italic" }}>💡 Hover (or tap) any piece for its full ability.</p>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                {(Object.keys(PIECE_GUIDE_INFO) as PieceTypeX12[]).map(type => (
                  <BattleGuideCardX12 key={type} pieceKey={type} info={PIECE_GUIDE_INFO[type]} has={myGuideSet.has(type)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── RULES MODAL ── */}
        {showRules && (
          <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,.88)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 14 : 24 }}>
            <div className="x12-modal-scroll" data-lenis-prevent style={{ width: isMobile ? "96vw" : "min(860px,94vw)", maxHeight: "90vh", overflowY: "auto", borderRadius: 26, padding: isMobile ? "24px 18px" : "34px 34px", background: "linear-gradient(155deg,#0e0902 0%,#1a1005 40%,#0e0902 100%)", border: "1px solid rgba(212,168,67,.22)", fontFamily: "'Cinzel',Georgia,serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 22 : 28, color: "#e8c96a" }}>⚔️ X Board Rules</h2>
                <button onClick={() => setShowRules(false)} style={{ width: 42, height: 42, borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <p style={{ margin: "0 0 20px", textAlign: "center", fontSize: 12.5, color: "rgba(212,168,67,.55)", fontStyle: "italic" }}>
                💡 Looking for piece abilities? Open the Battle Guide.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div className="x12-rule-card">
                  <div className="x12-icon" style={{ background: "linear-gradient(145deg,#2a1a06,#3d2a0e)", boxShadow: "0 8px 20px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,220,100,.2)" }}>🗺️</div>
                  <div>
                    <h3 style={{ margin: "0 0 7px", color: "#e8c96a", fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase" }}>Four-Player Battlefield</h3>
                    <p style={{ margin: 0, color: "rgba(215,194,154,.75)", lineHeight: 1.75, fontSize: 13 }}>
                      Four 12×12 armies — <span style={{ color: "#e8c96a" }}>Top, Right, Bottom, Left</span> — are merged into one connected cross-shaped board with a shared 12×12 center. Every side can fight through the middle to reach any other side.
                    </p>
                  </div>
                </div>

                <div className="x12-rule-card">
                  <div className="x12-icon" style={{ background: "linear-gradient(145deg,#0e2010,#14300f)", boxShadow: "0 8px 20px rgba(0,0,0,.6),inset 0 1px 0 rgba(150,220,120,.2)" }}>🔄</div>
                  <div>
                    <h3 style={{ margin: "0 0 7px", color: "#a0e090", fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase" }}>Turn Order</h3>
                    <p style={{ margin: 0, color: "rgba(215,194,154,.75)", lineHeight: 1.75, fontSize: 13 }}>
                      Turns rotate clockwise: <span style={{ color: "#a0e090" }}>Top → Right → Bottom → Left</span>, then back to Top. An eliminated player is skipped automatically — the rotation always continues among whoever remains.
                    </p>
                  </div>
                </div>

                <div className="x12-rule-card">
                  <div className="x12-icon" style={{ background: "linear-gradient(145deg,#1a0e20,#241030)", boxShadow: "0 8px 20px rgba(0,0,0,.6),inset 0 1px 0 rgba(200,150,220,.2)" }}>🧙</div>
                  <div>
                    <h3 style={{ margin: "0 0 7px", color: "#d0a0e8", fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase" }}>Wizard & Sorceress</h3>
                    <p style={{ margin: 0, color: "rgba(215,194,154,.75)", lineHeight: 1.75, fontSize: 13 }}>
                      Ethereal — they cannot kill regular pieces, and only a Wizard or Sorceress can kill a Wizard or Sorceress. Everyone else's moves treat them as a wall.
                    </p>
                  </div>
                </div>

                <div className="x12-rule-card">
                  <div className="x12-icon" style={{ background: "linear-gradient(145deg,#200e0e,#301010)", boxShadow: "0 8px 20px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,150,150,.2)" }}>🎲</div>
                  <div>
                    <h3 style={{ margin: "0 0 7px", color: "#ff9090", fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase" }}>Spell Dice</h3>
                    <p style={{ margin: 0, color: "rgba(215,194,154,.75)", lineHeight: 1.75, fontSize: 13 }}>
                      Only the Sorceress's Wish spell requires a d10 roll above 5 to succeed. Every other spell (Sleep, Teleport, Wizard Teleport, Mage Sacrifice) is guaranteed.
                    </p>
                  </div>
                </div>

                <div className="x12-rule-card" style={{ background: "rgba(255,215,0,.04)", borderColor: "rgba(255,215,0,.18)", flexDirection: "column", gap: 10, gridColumn: isMobile ? "auto" : "1 / -1" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div className="x12-icon" style={{ background: "linear-gradient(145deg,#1a1400,#2e2400)", boxShadow: "0 8px 18px rgba(0,0,0,.55),0 0 14px rgba(255,215,0,.35),inset 0 1px 0 rgba(255,240,100,.15)" }}>👑</div>
                    <h3 style={{ margin: 0, color: "#ffd700", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase" }}>Winning / Elimination</h3>
                    <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 20, background: "rgba(255,80,80,.15)", border: "1px solid rgba(255,100,100,.4)", color: "#ff9090", fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" }}>🚫 Not King-Capture</span>
                  </div>
                  <p style={{ margin: 0, color: "rgba(215,194,154,.7)", lineHeight: 1.75, fontSize: 12.5 }}>
                    Capturing a Mystic King never ends the game by itself. A kingdom is <strong style={{ color: "#ffd700" }}>eliminated</strong> only once every one of its pieces is gone from the board, or its player quits. The battle continues among whoever remains — down to three, then two — until a single kingdom stands alone as the winner.
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
          <EliminationPopupX12 eliminated={elimPopup} playerNames={playerNames} onClose={() => setElimPopup(null)} />
        )}

        {/* ── WIN / DEFEAT SCREEN ── */}
        {showWin && (
          <EndScreenX12
            showWin={showWin}
            myColor={myColor}
            playerNames={playerNames}
            onLobby={() => window.location.href = "/lobby"}
            onPlayAgain={() => { setGs(createInitialGameStateX12()); setShowWin(null); }}
          />
        )}
      </div>
    </>
  );
}
