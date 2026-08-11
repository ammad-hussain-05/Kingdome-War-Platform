"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import {
  createInitialTriGameState16,
  executeMoveTri16,
  eliminatePlayerTri16,
  getLegalMovesTri16,
  getLegalPaladinSuperMovesTri16,
  getLegalCastleMovesTri16,
  executeCastleTri16,
  getRawMovesTri16,
  passTurnTri16,
  advanceTurnTri16,
  triSquareEquals,
  isConnectorCell,
  inBoundsFor,
  findPieceTri16,
  pieceImagePathTri16,
  cloneBoardsTri16,
  applySleepSpellTri16,
  applyTeleportSpellTri16,
  applyWizardTeleportTri16,
  applyMageSacrificeTri16,
  applyConjurerReviveTri16,
  applyWarlockBindTri16,
  applyThiefStealTri16,
  applyTricksterStealTri16,
  getAxeSwingSquaresTri16,
  getThiefStealSquaresTri16,
  getTricksterStealSquaresTri16,
  applyAxeSwingTri16,
  applyShadowSummonTri16,
  getLegalBerserkerRampageTargetsTri16,
  applyBerserkerRampageTri16,
  rollWishDiceTri16,
  ALL_BOARD_IDS,
  ALL_COLORS,
  TRI_ROWS,
  TRI_COLS,
  TRI_COL_CENTER,
  KINGDOM_SIZE,
  type TriColor,
  type TriBoardId,
  type TriSquare,
  type TriGameState16,
  type Piece16,
  type PieceType16,
  type Board16,
} from "@/lib/game/tri/rules-tri-16x16";
import Fireworks from "@/components/game/fireworks";

function pieceImgSrc(p: Piece16) {
  return pieceImagePathTri16(p);
}

const AC: Record<TriColor, string> = {
  white: "#f0dfb0",
  black: "#c8a878",
  grey: "#b8c4d8",
};
const DOT: Record<TriColor, string> = {
  white: "#f4f0e6",
  black: "#2a2a2a",
  grey: "#b8c4d8",
};
const GOLD = "#d4a843";
const DANGER = "#ff5050";
const SAFE = "#3ecf6e";
const SELECT = "#4aa8ff";
const SUPER = "rgba(255,140,0,.95)";

const BOARD_COLOR: Record<TriBoardId, TriColor | null> = { A: "white", B: "black", C: "grey", T: null };

const RULES = [
  { title: "Move inside your kingdom", body: "Slide, jump and capture using the same rules as the classic 16x16 board — 19 piece types, each with its own movement shape." },
  { title: "Reach a connector", body: "Each kingdom has 3 connector cells (glowing gold) on the edge facing the Tri Gate." },
  { title: "Enter the Tri Gate", body: "From a connector, cross into the large shared battlefield at the center." },
  { title: "Fight in the battlefield", body: "The Tri Gate is one real board — White, Black and Grey all move and clash on it together. Crossing is one-way; there is no return." },
  { title: "Cast special abilities", body: "Sorceress, Wizard, Conjurer, Warlock, Thief and Trickster abilities work like the classic board. Revive and Steal only ever target the same board the caster is standing on — but Sleep, Bind, Teleport and Wish reach anywhere on the battlefield, including an opponent's kingdom." },
  { title: "King capture is just a capture", body: "Capturing an enemy Mystic King does NOT eliminate that player — it's a normal capture. They keep fighting with whatever remains." },
  { title: "Win the war", body: "A player is eliminated only once every one of their pieces is gone from every board. The last kingdom with any pieces left wins." },
];

// ─── VICTORY RULES (subset of RULES shown inside the Game Flow / Victory
// modal, right alongside the visual flow steps) ─────────────────────────────
const VICTORY_RULES = RULES.slice(5);

function LegendSwatch({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 18, height: 18, borderRadius: 4, background: "#3a2410", border: "1px solid rgba(212,168,67,.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {children}
    </div>
  );
}

const LEGEND: { icon: React.ReactNode; label: string }[] = [
  { label: "Selected Piece", icon: <LegendSwatch><div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${SELECT}`, boxShadow: `0 0 8px ${SELECT}99` }} /></LegendSwatch> },
  { label: "Safe / Recommended Move", icon: <LegendSwatch><div style={{ width: 10, height: 10, borderRadius: "50%", background: SAFE, boxShadow: `0 0 8px ${SAFE}99` }} /></LegendSwatch> },
  { label: "Connector / Spell Target", icon: <LegendSwatch><div style={{ width: 10, height: 10, background: GOLD, transform: "rotate(45deg)", boxShadow: `0 0 8px ${GOLD}99` }} /></LegendSwatch> },
  { label: "Danger Zone / Risky Move", icon: <LegendSwatch><div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${DANGER}`, boxShadow: `0 0 8px ${DANGER}99` }} /></LegendSwatch> },
];

const GAME_FLOW: { icon: React.ReactNode; lines: [string, string] }[] = [
  { icon: <span style={{ fontSize: 18 }}>♟</span>, lines: ["Move inside", "your kingdom"] },
  { icon: <div style={{ width: 12, height: 12, background: GOLD, transform: "rotate(45deg)" }} />, lines: ["Reach a", "connector cell"] },
  { icon: <span style={{ fontSize: 16, color: "#5ab4ff" }}>➤</span>, lines: ["Cross into", "the Tri Gate"] },
  { icon: <span style={{ fontSize: 17 }}>🔮</span>, lines: ["Cast spells &", "special abilities"] },
  { icon: <span style={{ fontSize: 17 }}>⚔</span>, lines: ["Eliminate every", "enemy piece"] },
  { icon: <span style={{ fontSize: 17 }}>🏆</span>, lines: ["Last kingdom", "standing wins"] },
];

const EMOJI: Record<PieceType16, string> = {
  "mystic-king": "👑", "super-queen": "🌟", "dragon": "🐉", "gargoyle": "👹", "wizard": "🧙",
  "sorceress": "🔮", "conjurer": "✨", "warlock": "🌑", "trickster": "🃏", "thief": "🗝️",
  "super-knight": "⚔️", "assassin": "🗡️", "executioner": "🪓", "cavalier": "🏇",
  "mage": "💫", "elvin-archer": "🏹", "paladin": "🛡️", "archer": "🎯", "aerobat-assassin": "🦅",
  "berserker": "😈",
};

const PIECE_INFO: Record<PieceType16, { name: string; special: string }> = {
  "mystic-king": { name: "Mystic King", special: "Losing this is just a normal capture — you keep fighting until every piece you have is gone." },
  "super-queen": { name: "Super Queen", special: "Moves twice per turn while your Sorceress lives. Mage sacrifice restores this." },
  "dragon": { name: "Dragon", special: "Slides any direction, plus a 1-square claw/tail attack and an L-shaped fly-over strike that ignores pieces in between." },
  "gargoyle": { name: "Gargoyle", special: "Wing/Tail Attack 1 square in any direction, or Fire Attack 2 squares in any direction — every turn, no slide." },
  "wizard": { name: "Wizard", special: "Ethereal — can only capture other ethereal pieces. Teleports any piece on its board." },
  "sorceress": { name: "Sorceress", special: "3 charges: Sleep, Teleport, or Wish (dice) — all reach anywhere on the battlefield." },
  "conjurer": { name: "Conjurer", special: "Revives one captured piece onto an empty square on its own board (one charge). Also holds a separate, one-time Shadow Spell that summons a hidden Berserker onto a free square directly in front of itself." },
  "warlock": { name: "Warlock", special: "Binds every enemy piece across the entire battlefield for 1 round. One-time use." },
  "trickster": { name: "Trickster", special: "Steals any adjacent enemy piece by touch, once. Survive 10+ of your own turns and you're eliminated!" },
  "thief": { name: "Thief", special: "Triple-jump steal: removes a non-king enemy within 3 squares, once." },
  "super-knight": { name: "Super Knight", special: "Knight-shaped jumps only." },
  "elvin-archer": { name: "Elvin Archer", special: "Slide + jump + one-step combined." },
  "executioner": { name: "Executioner", special: "Rook-like slide, then swings an axe at an adjacent enemy." },
  "assassin": { name: "Assassin", special: "Slide + jump + one-step combined." },
  "cavalier": { name: "Cavalier", special: "Knight-jump + one-step." },
  "mage": { name: "Mage", special: "Can sacrifice itself next to your Super Queen to restore her double-move." },
  "paladin": { name: "Paladin", special: "Normal movement: 1 square any direction. Super Move: one-time 3-square surprise attack in any direction, then 1-square only. Reverse Castle: swap places with an adjacent ally." },
  "archer": { name: "Archer", special: "Slides any direction." },
  "aerobat-assassin": { name: "Acrobat Assassin", special: "Slides any direction like an Assassin. Moves and kills in an L-shape, jumping over any character (even enemies). Can also strike 1 square in any direction, like a Paladin." },
  "berserker": { name: "Berserker", special: "Special summoned unit — NOT part of the starting formation. Created once by the Conjurer's Shadow Spell, appearing on the Conjurer's own board. Slides any direction, unlimited distance. The sole exception to the mortal/immortal combat rule: kills BOTH mortal and immortal/ethereal pieces, and immortals cannot kill it back. One-time Rampage attack cleaves through 2 adjacent aligned enemies on the same board in a single strike." },
};

// ─── SPELLS / SPECIAL ABILITIES — the 16x16 roster carries more spellcasters
// than the other Tri boards (Conjurer, Warlock, Thief, Trickster on top of
// Sorceress/Wizard/Mage/Super Queen/Executioner), so it gets its own
// dedicated reference card grid in the right panel alongside Piece Abilities.
// "range" drives the colored pill on each card: Global spells can target any
// board on the battlefield (including an opponent's kingdom); Same Board
// spells stay scoped to the caster's own board; Passive abilities aren't cast
// at all — they trigger automatically off another action.
type SpellRange = "Global" | "Same Board" | "Passive";
const SPELLS: { icon: string; pieceType: PieceType16; name: string; piece: string; range: SpellRange; body: string }[] = [
  { icon: "😴", pieceType: "sorceress", name: "Sleep", piece: "Sorceress", range: "Global", body: "Puts any enemy piece anywhere on the battlefield to sleep for 3 rounds, preventing it from moving or acting." },
  { icon: "🌀", pieceType: "sorceress", name: "Teleport", piece: "Sorceress", range: "Global", body: "Moves one of your own pieces to any empty square anywhere on the battlefield — including an opponent's kingdom." },
  { icon: "⭐", pieceType: "sorceress", name: "Wish", piece: "Sorceress", range: "Same Board", body: "Rolls a 10-sided die. Rolling above 5 grants a free Global Teleport with the same reach as the Wizard's; rolling 5 or below ends the turn with no effect." },
  { icon: "🧙", pieceType: "wizard", name: "Teleport", piece: "Wizard", range: "Global", body: "Teleports any piece standing on the Wizard's own board to any empty square anywhere on the battlefield — including an opponent's kingdom." },
  { icon: "✨", pieceType: "conjurer", name: "Revive", piece: "Conjurer", range: "Same Board", body: "Brings back one of your own captured pieces (never the Mystic King) onto an empty square on the Conjurer's own board. One charge." },
  { icon: "⛓️", pieceType: "warlock", name: "Bind", piece: "Warlock", range: "Global", body: "Freezes every enemy piece across the entire battlefield — all three kingdoms and the Tri Gate — for 1 full round. One-time use." },
  { icon: "🗝️", pieceType: "thief", name: "Triple-Jump Steal", piece: "Thief", range: "Same Board", body: "Removes any non-king enemy piece within 3 squares on the same board, ignoring pieces in between. One-time use." },
  { icon: "🃏", pieceType: "trickster", name: "Touch Steal", piece: "Trickster", range: "Same Board", body: "Steals any adjacent enemy piece by touch. One-time use — and if your Trickster becomes your only piece and survives 10 of your own turns, it is eliminated." },
  { icon: "💫", pieceType: "mage", name: "Sacrifice", piece: "Mage", range: "Same Board", body: "Sacrifice the Mage next to your own Super Queen to restore her double-move ability after her Sorceress has fallen." },
  { icon: "👑", pieceType: "super-queen", name: "Double Move", piece: "Super Queen", range: "Passive", body: "Moves twice in a single turn for as long as your Sorceress is alive, or until restored by a Mage sacrifice." },
  { icon: "🪓", pieceType: "executioner", name: "Axe Swing", piece: "Executioner", range: "Passive", body: "Immediately after completing its normal slide, the Executioner may swing its axe at one adjacent enemy piece." },
  { icon: "🌑", pieceType: "conjurer", name: "Shadow Summon", piece: "Conjurer", range: "Same Board", body: "Summons a hidden Berserker onto an empty square directly in front of the Conjurer (or the nearest valid empty square). The Berserker is NOT part of the starting formation — this is the only way it enters the game. One-time use." },
  { icon: "💥", pieceType: "berserker", name: "Rampage", piece: "Berserker", range: "Same Board", body: "Cleaves through 2 adjacent, in-line enemy pieces on the same board in a single strike, eliminating both. One-time use." },
];

// ─── Real character piece art (same source as the X 16x16 Battle Guide) ────
const PIECE_ICON_SRC: Record<PieceType16, string> = {
  "mystic-king": "/all-characters/Mystic King.png",
  "super-queen": "/all-characters/Super Queen.png",
  "dragon": "/all-characters/Dragon.png",
  "gargoyle": "/all-characters/Gargoyle.png",
  "wizard": "/all-characters/Wizard.png",
  "sorceress": "/all-characters/Sorceress.png",
  "conjurer": "/all-characters/Conjurer.png",
  "warlock": "/all-characters/Warlock.png",
  "trickster": "/all-characters/Trickster.png",
  "thief": "/all-characters/Thief.png",
  "super-knight": "/all-characters/Super Knight.png",
  "assassin": "/all-characters/Assassin.png",
  "executioner": "/all-characters/Executioner.png",
  "cavalier": "/all-characters/Cavalier Prince.png",
  "mage": "/all-characters/Mage-Princess.png",
  "elvin-archer": "/all-characters/Elven Archer.png",
  "paladin": "/all-characters/Paladin.png",
  "archer": "/all-characters/Archer.png",
  "aerobat-assassin": "/all-characters/Acrobat Assassin.png",
  "berserker": "/all-characters/Beserker.png",
};

function PieceAbilityIcon({ pieceKey }: { pieceKey: PieceType16 }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{EMOJI[pieceKey]}</>;
  return (
    <img
      src={PIECE_ICON_SRC[pieceKey]}
      alt={pieceKey}
      onError={() => setFailed(true)}
      style={{ width: "84%", height: "84%", objectFit: "contain", pointerEvents: "none" }}
    />
  );
}

// Spell/ability card icon — same real character artwork as the Piece
// Abilities (Battle Guide) icons above, sized to fill the existing
// .tb-spell-icon badge instead of a plain emoji glyph.
function SpellPieceIcon({ pieceKey, fallback }: { pieceKey: PieceType16; fallback: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <img
      src={PIECE_ICON_SRC[pieceKey]}
      alt={pieceKey}
      onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
    />
  );
}

function CapturedTray({ pieces }: { pieces: Piece16[] }) {
  if (pieces.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
      {pieces.slice(0, 6).map((p, i) => (
        <img key={i} src={pieceImgSrc(p)} alt={`${p.color} ${p.type}`} style={{ width: 16, height: 16, objectFit: "contain", filter: "drop-shadow(0 1px 3px rgba(0,0,0,.8))" }} />
      ))}
      {pieces.length > 6 && <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)", alignSelf: "center" }}>+{pieces.length - 6}</span>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="tb-panel">
      <h3 className="tb-panel-title">{title}</h3>
      {children}
    </div>
  );
}

// ─── CONTROL CARD — standardized action button used in the right panel for
// Pass Turn / Battle Guide / Game Rules / Quit Game. Shared visual spec
// (colors/padding/radius) matches the same 4 buttons across every board file
// so they render pixel-identical ─────────────────────────────────────────────
function ControlCard({ icon, title, subtitle, onClick, disabled }: {
  icon: string; title: string; subtitle?: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button className="tb-ctrl-btn" onClick={onClick} disabled={disabled}>
      <span className="tb-ctrl-icon">{icon}</span>
      <span style={{ minWidth: 0, textAlign: "left" }}>
        <p className="tb-ctrl-title">{title}</p>
        {subtitle && <p className="tb-ctrl-subtitle">{subtitle}</p>}
      </span>
    </button>
  );
}

// ─── MODAL SHELL — glass effect + gold fantasy border, matching the X 8x8
// Battle Guide / Game Rules modals ──────────────────────────────────────────
function TbModal({ title, subtitle, icon, onClose, children }: {
  title: string; subtitle?: string; icon: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="tb-modal-backdrop" onClick={onClose}>
      <div className="tb-modal-card" data-lenis-prevent onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, color: GOLD, fontFamily: "'Cinzel',Georgia,serif" }}>{icon} {title}</h2>
            {subtitle && <p style={{ margin: "5px 0 0", fontSize: 10, color: "rgba(255,255,255,.5)", letterSpacing: ".1em", textTransform: "uppercase" }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="tb-modal-close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── THREAT ANALYSIS (read-only UI guidance — no game-rule changes) ─────────
function computeReachSet(state: TriGameState16, excludeColor: TriColor): Set<string> {
  const reach = new Set<string>();
  for (const boardId of ALL_BOARD_IDS) {
    const board = state.boards[boardId];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const piece = board[r][c];
        if (!piece || piece.color === excludeColor) continue;
        for (const m of getRawMovesTri16(board, r, c, boardId)) reach.add(`${boardId}|${m.row}|${m.col}`);
      }
    }
  }
  return reach;
}

function findMageAdjacentToQueen(
  boards: Record<TriBoardId, Board16>, color: TriColor
): { mageSq: TriSquare; queenSq: TriSquare } | null {
  const dirs: [number, number][] = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  for (const boardId of ALL_BOARD_IDS) {
    const board = boards[boardId];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const p = board[r][c];
        if (p && p.type === "super-queen" && p.color === color) {
          for (const [dr, dc] of dirs) {
            const rr = r + dr, cc = c + dc;
            if (inBoundsFor(boardId, rr, cc) && board[rr][cc]?.type === "mage" && board[rr][cc]?.color === color) {
              return { mageSq: { boardId, row: rr, col: cc }, queenSq: { boardId, row: r, col: c } };
            }
          }
        }
      }
    }
  }
  return null;
}

// ─── LAYOUT GEOMETRY ─────────────────────────────────────────────────────────
// Same technique as Tri 8x8/12x12 — see tri-board12x12.tsx's buildLayout
// comment for the full derivation. Parametric on KINGDOM_SIZE/TRI_COLS,
// which are bigger again here (16, 31), so the desktop breakpoint and
// min/max cell-size caps were re-verified numerically for this board size.
const FRAME = 14;
const TITLE_H = 26;
const WIRE_GAP = 20;
const LABEL_GUTTER = 18;
const SIDE_COL_W = 224;
const GRID_GAP = 18;
const ROOT_PAD = 24;
const CONTENT_MAX_W = 1600;
const COL_LABEL_H = 20;

function buildLayout(triSqPx: number, kingdomSqPx: number) {
  const kingdomBoardPx = kingdomSqPx * KINGDOM_SIZE + FRAME * 2;
  const triWidth = TRI_COLS * triSqPx;
  const triHeight = TRI_ROWS * triSqPx;
  const triMargin = triSqPx;
  const triFrameW = triWidth + triMargin * 2 + FRAME * 2 + LABEL_GUTTER * 2;
  const triFrameH = triHeight + triMargin + FRAME * 2 + COL_LABEL_H;

  const halfSpan = Math.max(triFrameW / 2, kingdomBoardPx + triWidth / 2, kingdomBoardPx / 2) + 8;
  const clusterWidth = halfSpan * 2;
  const apexX = halfSpan;

  const triFrameLeft = apexX - triFrameW / 2;
  const meshLeft = triFrameLeft + FRAME + LABEL_GUTTER + triMargin;
  const meshRight = meshLeft + triWidth;

  const triFrameTop = TITLE_H + kingdomBoardPx + WIRE_GAP;
  const bottomTitleTop = triFrameTop + triFrameH + WIRE_GAP;
  const bottomBoardTop = bottomTitleTop + TITLE_H;
  const clusterHeight = bottomBoardTop + kingdomBoardPx;

  return {
    kingdomBoardPx, triWidth, triHeight, triMargin, triFrameW, triFrameH,
    clusterWidth, clusterHeight, apexX, triFrameLeft, meshLeft, meshRight,
    triFrameTop, bottomTitleTop, bottomBoardTop,
    boardALeft: apexX - kingdomBoardPx / 2,
    boardBLeft: meshLeft - kingdomBoardPx,
    boardCLeft: meshRight,
  };
}

type LayoutTier = "desktop" | "tablet" | "mobile";

function tierFor(vw: number): LayoutTier {
  if (vw < 760) return "mobile";
  if (vw < 1300) return "tablet";
  return "desktop";
}

export default function TriBoard16x16({
  myColor,
  roomId,
  playerNames,
  socket,
  onGameEnd,
}: {
  myColor: TriColor;
  roomId: string;
  playerNames: Record<TriColor, string>;
  socket: Socket;
  onGameEnd: (winner: TriColor) => void;
}) {
  const [gs, setGs] = useState<TriGameState16>(createInitialTriGameState16());
  const [animSq, setAnimSq] = useState<TriSquare | null>(null);
  const [triSqPx, setTriSqPx] = useState(18);
  const [kingdomSqPxState, setKingdomSqPxState] = useState(15);
  const [tier, setTier] = useState<LayoutTier>("desktop");
  const [showBattleGuide, setShowBattleGuide] = useState(false);
  const [battleGuideTab, setBattleGuideTab] = useState<"pieces" | "spells">("pieces");
  const [showGameRules, setShowGameRules] = useState(false);
  const [gameRulesTab, setGameRulesTab] = useState<"play" | "flow">("play");
  const gsRef = useRef(gs);

  useEffect(() => {
    gsRef.current = gs;
  }, [gs]);

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const t = tierFor(vw);
      setTier(t);

      if (t === "desktop") {
        const containerW = Math.min(vw, CONTENT_MAX_W) - ROOT_PAD * 2;
        const availW = containerW - SIDE_COL_W * 2 - GRID_GAP * 2;
        const availH = vh - 300;
        const SIZE_FACTOR = 2 * (KINGDOM_SIZE * 0.85 + TRI_COLS / 2);
        const SAFETY = 20;
        const fromWidth = Math.floor((availW - FRAME * 4 - 16 - SAFETY) / SIZE_FACTOR);
        const fromHeight = Math.floor((availH - FRAME * 2 - COL_LABEL_H) / (TRI_ROWS + 1));
        const s = Math.max(10, Math.min(fromWidth, fromHeight, 18));
        setTriSqPx(s);
        setKingdomSqPxState(Math.max(10, Math.round(s * 0.85)));
      } else {
        const pagePad = t === "mobile" ? 24 : 40;
        const availW = vw - pagePad;
        const maxTri = t === "mobile" ? 12 : 16;
        const maxKingdom = t === "mobile" ? 12 : 16;
        const triFromW = Math.floor((availW - FRAME * 2 - LABEL_GUTTER * 2 - 2 * 22) / (TRI_COLS + 2));
        const kingdomFromW = Math.floor((availW / 2 - 16 - FRAME * 2) / KINGDOM_SIZE);
        setTriSqPx(Math.max(7, Math.min(triFromW, maxTri)));
        setKingdomSqPxState(Math.max(7, Math.min(kingdomFromW, maxKingdom)));
      }
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const kingdomSqPx = kingdomSqPxState;
  const isCompact = tier !== "desktop";
  const layout = buildLayout(triSqPx, kingdomSqPx);

  useEffect(() => {
    const onMove = ({ newState }: { newState: TriGameState16 }) => {
      if (newState.lastMove) {
        setAnimSq(newState.lastMove.to);
        setTimeout(() => setAnimSq(null), 420);
      }
      setGs(newState);
    };
    socket.on("game:move", onMove);
    return () => {
      socket.off("game:move", onMove);
    };
  }, [socket]);

  useEffect(() => {
    if (gs.status === "finished" && gs.winner) onGameEnd(gs.winner);
  }, [gs.status, gs.winner, onGameEnd]);

  const isMyTurn = gs.currentTurn === myColor;
  const enemyReach = useMemo(() => computeReachSet(gs, myColor), [gs, myColor]);

  const broadcast = (next: TriGameState16, from: TriSquare | null = null, to: TriSquare | null = null) => {
    setGs(next);
    socket.emit("game:move", { roomId, from, to, newState: next });
  };

  const handleBoardClick = (sq: TriSquare) => {
    if (gs.status !== "playing") return;
    // A dice roll is awaiting Confirm/End Turn — ignore board clicks until
    // it's resolved. Matches lib/game/rules-16x16.ts's handleClick guard.
    if (gs.wishDiceResult !== null) return;
    if (gs.specialMode && gs.currentTurn !== myColor) return;

    const board = gs.boards[sq.boardId];
    const piece = board[sq.row][sq.col];

    // ── Paladin Super Move — wholly separate from normal validMoves ─────
    if (gs.superMoveMode && gs.selectedSquare && gs.superMoves.some((m) => triSquareEquals(m, sq))) {
      const next = executeMoveTri16(gs, gs.selectedSquare, sq);
      setAnimSq(sq);
      setTimeout(() => setAnimSq(null), 450);
      broadcast(next, gs.selectedSquare, sq);
      return;
    }

    // ── Paladin Reverse Castle — swap with an adjacent ally ─────────────
    if (gs.selectedSquare && gs.castleMoves.some((m) => triSquareEquals(m, sq))) {
      const next = executeCastleTri16(gs, gs.selectedSquare, sq);
      setAnimSq(sq);
      setTimeout(() => setAnimSq(null), 420);
      broadcast(next, gs.selectedSquare, sq);
      return;
    }

    // ── Spell-mode dispatch ────────────────────────────────────────────
    if (gs.specialMode === "executioner-axe-swing" && gs.pendingAxeSquare) {
      const anchor = gs.pendingAxeSquare;
      const targets = getAxeSwingSquaresTri16(gs.boards[anchor.boardId], anchor.row, anchor.col, myColor, anchor.boardId);
      const isTarget = targets.some((t) => triSquareEquals(t, sq));
      const next = isTarget ? applyAxeSwingTri16(gs, sq) : advanceTurnTri16(gs);
      broadcast(next);
      return;
    }

    if (gs.specialMode === "super-queen-second-move") {
      const isValid = gs.validMoves.some((m) => triSquareEquals(m, sq));
      if (isValid && gs.selectedSquare) {
        const next = executeMoveTri16(gs, gs.selectedSquare, sq);
        setAnimSq(sq);
        setTimeout(() => setAnimSq(null), 420);
        broadcast(next, gs.selectedSquare, sq);
      }
      return;
    }

    if (gs.specialMode === "sorceress-sleep-select" && gs.specialData?.casterSq) {
      const casterSq: TriSquare = gs.specialData.casterSq;
      // Sleep is a battlefield-wide ability — any enemy piece on any board,
      // not just the caster's own board.
      if (piece && piece.color !== myColor) {
        const newBoards = applySleepSpellTri16(gs.boards, sq, casterSq);
        broadcast(advanceTurnTri16({ ...gs, boards: newBoards }));
      }
      return;
    }

    if (gs.specialMode === "sorceress-teleport-select" && gs.specialData?.casterSq) {
      const casterSq: TriSquare = gs.specialData.casterSq;
      const pieceSq: TriSquare | null = gs.specialData.pieceSq ?? null;
      if (!pieceSq) {
        if (sq.boardId === casterSq.boardId && piece && piece.color === myColor) {
          broadcast({ ...gs, specialData: { casterSq, pieceSq: sq }, spellMessage: "Sorceress: now click the destination square — anywhere on the battlefield." });
        }
        return;
      }
      // Teleport destination is a global ability — any empty square on any
      // board (including opponent kingdoms and the Tri Gate), not just the
      // piece's own board.
      if (!piece) {
        const newBoards = applyTeleportSpellTri16(gs.boards, pieceSq, sq, casterSq);
        broadcast(advanceTurnTri16({ ...gs, boards: newBoards }));
      }
      return;
    }

    if (gs.specialMode === "wizard-teleport-select-piece" && gs.specialData?.anchorBoardId) {
      if (sq.boardId === gs.specialData.anchorBoardId && piece) {
        broadcast({ ...gs, specialMode: "wizard-teleport-select-dest", specialData: { pieceSq: sq }, spellMessage: "Now click the destination square — anywhere on the battlefield." });
      }
      return;
    }

    if (gs.specialMode === "wizard-teleport-select-dest" && gs.specialData?.pieceSq) {
      const pieceSq: TriSquare = gs.specialData.pieceSq;
      // Teleport destination is a global ability — any empty square on any
      // board (including opponent kingdoms and the Tri Gate).
      if (!piece) {
        const newBoards = applyWizardTeleportTri16(gs.boards, pieceSq, sq);
        broadcast(advanceTurnTri16({ ...gs, boards: newBoards }));
      }
      return;
    }

    if (gs.specialMode === "conjurer-revive-select" && gs.specialData?.conjurerSq) {
      const conjurerSq: TriSquare = gs.specialData.conjurerSq;
      const selectedPiece: Piece16 | null = gs.specialData.selectedPiece ?? null;
      if (selectedPiece && sq.boardId === conjurerSq.boardId && !piece) {
        const newBoards = applyConjurerReviveTri16(gs.boards, selectedPiece, sq, conjurerSq);
        broadcast(advanceTurnTri16({ ...gs, boards: newBoards }));
      }
      return;
    }

    if (gs.specialMode === "thief-steal-select" && gs.specialData?.thiefSq) {
      const thiefSq: TriSquare = gs.specialData.thiefSq;
      const targets = getThiefStealSquaresTri16(gs.boards[thiefSq.boardId], thiefSq.row, thiefSq.col, myColor, thiefSq.boardId);
      if (targets.some((t) => triSquareEquals(t, sq))) {
        broadcast(advanceTurnTri16(applyThiefStealTri16(gs, thiefSq, sq)));
      }
      return;
    }

    if (gs.specialMode === "trickster-steal-select" && gs.specialData?.tricksterSq) {
      const tricksterSq: TriSquare = gs.specialData.tricksterSq;
      const targets = getTricksterStealSquaresTri16(gs.boards[tricksterSq.boardId], tricksterSq.row, tricksterSq.col, myColor, tricksterSq.boardId);
      if (targets.some((t) => triSquareEquals(t, sq))) {
        broadcast(advanceTurnTri16(applyTricksterStealTri16(gs, tricksterSq, sq)));
      }
      return;
    }

    // ── Berserker Rampage — wholly separate from normal validMoves, exactly
    // like the Paladin's Super Move. Clicking either the "mid" or "far"
    // square of a valid line confirms that direction's cleave attack. ────
    if (gs.specialMode === "berserker-rampage-mode" && gs.specialData?.from) {
      const from: TriSquare = gs.specialData.from;
      const targets = getLegalBerserkerRampageTargetsTri16(gs, from);
      const match = targets.find((t) => triSquareEquals(t.far, sq) || triSquareEquals(t.mid, sq));
      if (match) {
        const next = applyBerserkerRampageTri16(gs, from, match.mid, match.far);
        setAnimSq(sq);
        setTimeout(() => setAnimSq(null), 420);
        broadcast(next, from, match.far);
      }
      return;
    }

    // ── Normal move selection/execution ────────────────────────────────
    if (gs.selectedSquare) {
      const isValid = gs.validMoves.some((m) => triSquareEquals(m, sq));
      if (isValid) {
        const next = executeMoveTri16(gs, gs.selectedSquare, sq);
        setAnimSq(sq);
        setTimeout(() => setAnimSq(null), 420);
        broadcast(next, gs.selectedSquare, sq);
        return;
      }
    }

    if (!piece || piece.color !== myColor || !isMyTurn) {
      setGs((prev) => ({ ...prev, selectedSquare: null, validMoves: [], superMoves: [], superMoveMode: false, castleMoves: [] }));
      return;
    }
    if (piece.sleepRoundsLeft > 0 || piece.boundRoundsLeft > 0) return;

    const isPal = piece.type === "paladin";
    setGs((prev) => ({
      ...prev,
      selectedSquare: sq,
      validMoves: getLegalMovesTri16(gs, sq),
      castleMoves: isPal ? getLegalCastleMovesTri16(gs, sq) : [],
      superMoves: [],
      superMoveMode: false,
    }));
  };

  // ─── PALADIN SUPER MOVE (one-time 3-square surprise attack) ────────────
  const handleSuperMove = () => {
    if (!isMyTurn || !gs.selectedSquare) return;
    const { boardId, row, col } = gs.selectedSquare;
    const piece = gs.boards[boardId][row][col];
    if (!piece || piece.type !== "paladin" || piece.color !== myColor || piece.paladanSuperUsed) return;
    const superMoves = getLegalPaladinSuperMovesTri16(gs, gs.selectedSquare);
    broadcast({ ...gs, superMoves, superMoveMode: true, validMoves: [], castleMoves: [] });
  };

  const handlePass = () => {
    if (!isMyTurn) return;
    broadcast(passTurnTri16(gs));
  };

  // ── Special-ability buttons ─────────────────────────────────────────────
  const handleSpecial = (action: string) => {
    if (!isMyTurn) return;

    if (action === "sleep") {
      const sorc = findPieceTri16(gs.boards, myColor, "sorceress");
      if (!sorc) return;
      broadcast({ ...gs, selectedSquare: null, validMoves: [], specialMode: "sorceress-sleep-select", specialData: { casterSq: sorc }, spellMessage: "Sorceress: click any enemy piece anywhere on the battlefield to put it to sleep." });
    } else if (action === "teleport") {
      const sorc = findPieceTri16(gs.boards, myColor, "sorceress");
      if (!sorc) return;
      broadcast({ ...gs, selectedSquare: null, validMoves: [], specialMode: "sorceress-teleport-select", specialData: { casterSq: sorc, pieceSq: null }, spellMessage: "Sorceress: click a piece on your board to teleport." });
    } else if (action === "wish") {
      const sorc = findPieceTri16(gs.boards, myColor, "sorceress");
      if (!sorc) return;
      const sorcPiece = gs.boards[sorc.boardId][sorc.row][sorc.col]!;
      const roll = rollWishDiceTri16();
      const boardsClone = cloneBoardsTri16(gs.boards);
      const left = sorcPiece.sorceressSpellsLeft - 1;
      boardsClone[sorc.boardId][sorc.row][sorc.col] = left <= 0 ? null : { ...sorcPiece, sorceressSpellsLeft: left };
      broadcast({
        ...gs, boards: boardsClone, selectedSquare: null, validMoves: [], wishDiceResult: roll,
        specialMode: null, specialData: roll > 5 ? { anchorBoardId: sorc.boardId } : null,
        spellMessage: roll > 5 ? "The Wish succeeds! Claim a free teleport." : `The Wish fails (${roll}/10). Turn lost.`,
      });
    } else if (action === "wish-success") {
      const anchorBoardId = gs.specialData?.anchorBoardId;
      broadcast({ ...gs, specialMode: "wizard-teleport-select-piece", specialData: { anchorBoardId }, wishDiceResult: null, spellMessage: "Wish granted: click any piece on that board to teleport it." });
    } else if (action === "wish-fail") {
      broadcast(advanceTurnTri16(gs));
    } else if (action === "wizard") {
      const wiz = findPieceTri16(gs.boards, myColor, "wizard");
      if (!wiz) return;
      broadcast({ ...gs, selectedSquare: null, validMoves: [], specialMode: "wizard-teleport-select-piece", specialData: { anchorBoardId: wiz.boardId }, spellMessage: "Wizard: click any piece on your board to teleport it." });
    } else if (action === "conjure") {
      const conj = findPieceTri16(gs.boards, myColor, "conjurer");
      if (!conj) return;
      const dead = gs.capturedBy[myColor].filter((p) => p.type !== "mystic-king");
      if (dead.length === 0) return;
      broadcast({ ...gs, selectedSquare: null, validMoves: [], specialMode: "conjurer-revive-select", specialData: { conjurerSq: conj, deadPieces: dead, selectedPiece: null }, spellMessage: "Conjurer: pick a fallen piece to revive." });
    } else if (action === "bind") {
      const wl = findPieceTri16(gs.boards, myColor, "warlock");
      if (!wl) return;
      const next = advanceTurnTri16(applyWarlockBindTri16(gs, wl));
      broadcast(next);
    } else if (action === "thief-steal") {
      const th = findPieceTri16(gs.boards, myColor, "thief");
      if (!th) return;
      broadcast({ ...gs, selectedSquare: null, validMoves: [], specialMode: "thief-steal-select", specialData: { thiefSq: th }, spellMessage: "Thief: click an enemy within 3 squares (not the king) to steal it." });
    } else if (action === "trickster-steal") {
      const tr = findPieceTri16(gs.boards, myColor, "trickster");
      if (!tr) return;
      broadcast({ ...gs, selectedSquare: null, validMoves: [], specialMode: "trickster-steal-select", specialData: { tricksterSq: tr }, spellMessage: "Trickster: click an adjacent enemy piece to steal it." });
    } else if (action === "shadow-summon") {
      const conj = findPieceTri16(gs.boards, myColor, "conjurer");
      if (!conj) return;
      const newBoards = applyShadowSummonTri16(gs.boards, conj);
      broadcast(advanceTurnTri16({ ...gs, boards: newBoards }));
    }
  };

  // ─── BERSERKER RAMPAGE (one-time crowd/cleave attack) ──────────────────
  const handleBerserkerRampage = () => {
    if (!isMyTurn || !gs.selectedSquare) return;
    const { boardId, row, col } = gs.selectedSquare;
    const piece = gs.boards[boardId][row][col];
    if (!piece || piece.type !== "berserker" || piece.color !== myColor || piece.berserkerRampageUsed) return;
    const targets = getLegalBerserkerRampageTargetsTri16(gs, gs.selectedSquare);
    broadcast({
      ...gs, specialMode: "berserker-rampage-mode", specialData: { from: gs.selectedSquare },
      spellMessage: targets.length ? "💥 Choose a target — cleave through 2 enemies in a line" : "⚠️ No valid rampage targets right now",
      selectedSquare: gs.selectedSquare, validMoves: [], superMoves: [], superMoveMode: false, castleMoves: [],
    });
  };

  const handleConjurerPick = (piece: Piece16) => {
    broadcast({ ...gs, specialData: { ...gs.specialData, selectedPiece: piece }, spellMessage: "Conjurer: click an empty square on your board to place it." });
  };

  const handleMageSacrifice = () => {
    if (!isMyTurn) return;
    const found = findMageAdjacentToQueen(gs.boards, myColor);
    if (!found) return;
    const newBoards = applyMageSacrificeTri16(gs.boards, found.mageSq, found.queenSq);
    broadcast({ ...gs, boards: newBoards });
  };

  const cancelSpecial = () => {
    broadcast({ ...gs, specialMode: null, specialData: null, spellMessage: null, wishDiceResult: null, selectedSquare: null, validMoves: [], superMoves: [], superMoveMode: false, castleMoves: [] });
  };

  // ── Which squares are valid spell targets for the CURRENT specialMode ──
  const spellTargetSquares = useMemo(() => {
    const set = new Set<string>();
    if (!gs.specialMode) return set;

    if (gs.specialMode === "executioner-axe-swing" && gs.pendingAxeSquare) {
      const anchor = gs.pendingAxeSquare;
      for (const t of getAxeSwingSquaresTri16(gs.boards[anchor.boardId], anchor.row, anchor.col, myColor, anchor.boardId)) {
        set.add(`${t.boardId}|${t.row}|${t.col}`);
      }
    } else if (gs.specialMode === "sorceress-sleep-select" && gs.specialData?.casterSq) {
      // Sleep is a battlefield-wide ability — any enemy piece on any board.
      for (const boardId of ALL_BOARD_IDS) {
        const b = gs.boards[boardId];
        for (let r = 0; r < b.length; r++) for (let c = 0; c < b[r].length; c++) {
          if (b[r][c] && b[r][c]!.color !== myColor) set.add(`${boardId}|${r}|${c}`);
        }
      }
    } else if (gs.specialMode === "sorceress-teleport-select" && gs.specialData?.casterSq) {
      const casterSq: TriSquare = gs.specialData.casterSq;
      const pieceSq: TriSquare | null = gs.specialData.pieceSq ?? null;
      if (!pieceSq) {
        const b = gs.boards[casterSq.boardId];
        for (let r = 0; r < b.length; r++) for (let c = 0; c < b[r].length; c++) {
          const p = b[r][c];
          if (p && p.color === myColor) set.add(`${casterSq.boardId}|${r}|${c}`);
        }
      } else {
        // Destination is a global teleport target — any empty square on any
        // board, including opponent kingdoms and the Tri Gate.
        for (const boardId of ALL_BOARD_IDS) {
          const b = gs.boards[boardId];
          for (let r = 0; r < b.length; r++) for (let c = 0; c < b[r].length; c++) {
            if (!b[r][c]) set.add(`${boardId}|${r}|${c}`);
          }
        }
      }
    } else if (gs.specialMode === "wizard-teleport-select-piece") {
      const boardId: TriBoardId | undefined = gs.specialData?.anchorBoardId;
      if (boardId) {
        const b = gs.boards[boardId];
        for (let r = 0; r < b.length; r++) for (let c = 0; c < b[r].length; c++) {
          if (b[r][c]) set.add(`${boardId}|${r}|${c}`);
        }
      }
    } else if (gs.specialMode === "wizard-teleport-select-dest") {
      // Destination is a global teleport target — any empty square on any
      // board, including opponent kingdoms and the Tri Gate.
      for (const boardId of ALL_BOARD_IDS) {
        const b = gs.boards[boardId];
        for (let r = 0; r < b.length; r++) for (let c = 0; c < b[r].length; c++) {
          if (!b[r][c]) set.add(`${boardId}|${r}|${c}`);
        }
      }
    } else if (gs.specialMode === "conjurer-revive-select" && gs.specialData?.conjurerSq && gs.specialData?.selectedPiece) {
      const conjurerSq: TriSquare = gs.specialData.conjurerSq;
      const b = gs.boards[conjurerSq.boardId];
      for (let r = 0; r < b.length; r++) for (let c = 0; c < b[r].length; c++) {
        if (!b[r][c]) set.add(`${conjurerSq.boardId}|${r}|${c}`);
      }
    } else if (gs.specialMode === "thief-steal-select" && gs.specialData?.thiefSq) {
      const thiefSq: TriSquare = gs.specialData.thiefSq;
      for (const t of getThiefStealSquaresTri16(gs.boards[thiefSq.boardId], thiefSq.row, thiefSq.col, myColor, thiefSq.boardId)) {
        set.add(`${t.boardId}|${t.row}|${t.col}`);
      }
    } else if (gs.specialMode === "trickster-steal-select" && gs.specialData?.tricksterSq) {
      const tricksterSq: TriSquare = gs.specialData.tricksterSq;
      for (const t of getTricksterStealSquaresTri16(gs.boards[tricksterSq.boardId], tricksterSq.row, tricksterSq.col, myColor, tricksterSq.boardId)) {
        set.add(`${t.boardId}|${t.row}|${t.col}`);
      }
    } else if (gs.specialMode === "super-queen-second-move") {
      for (const m of gs.validMoves) set.add(`${m.boardId}|${m.row}|${m.col}`);
    } else if (gs.specialMode === "berserker-rampage-mode" && gs.specialData?.from) {
      const from: TriSquare = gs.specialData.from;
      for (const t of getLegalBerserkerRampageTargetsTri16(gs, from)) {
        set.add(`${t.mid.boardId}|${t.mid.row}|${t.mid.col}`);
        set.add(`${t.far.boardId}|${t.far.row}|${t.far.col}`);
      }
    }

    return set;
  }, [gs.specialMode, gs.specialData, gs.pendingAxeSquare, gs.boards, gs.validMoves, gs.currentTurn, myColor]);

  // ── "Your Turn" toast ──────────────────────────────────────────────────
  const [turnToast, setTurnToast] = useState(false);
  const prevTurnRef = useRef(gs.currentTurn);
  useEffect(() => {
    const changed = prevTurnRef.current !== gs.currentTurn;
    prevTurnRef.current = gs.currentTurn;
    if (changed && gs.currentTurn === myColor && gs.status === "playing") {
      setTurnToast(true);
      const t = setTimeout(() => setTurnToast(false), 2200);
      return () => clearTimeout(t);
    }
  }, [gs.currentTurn, gs.status, myColor]);

  // ── Selected-piece move summary (derived, presentational only) ────────
  const moveSummary = useMemo(() => {
    if (!gs.selectedSquare) return null;
    let safe = 0, risky = 0, captures = 0, crossing = 0;
    for (const m of gs.validMoves) {
      const key = `${m.boardId}|${m.row}|${m.col}`;
      const target = gs.boards[m.boardId][m.row][m.col];
      if (target) captures++;
      if (enemyReach.has(key)) risky++; else safe++;
      if (m.boardId === "T" && gs.selectedSquare!.boardId !== "T") crossing++;
    }
    return { safe, risky, captures, crossing };
  }, [gs.selectedSquare, gs.validMoves, gs.boards, enemyReach]);

  // ── Leave / Surrender ───────────────────────────────────────────────────
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const handleLeave = () => {
    const next = eliminatePlayerTri16(gs, myColor);
    setGs(next);
    socket.emit("game:quit", { roomId, newState: next });
    setShowLeaveConfirm(false);
  };

  useEffect(() => {
    const onQuit = ({ newState }: { newState: TriGameState16 }) => {
      setGs(newState);
    };
    socket.on("game:quit", onQuit);
    return () => {
      socket.off("game:quit", onQuit);
    };
  }, [socket]);

  // ── Passive disconnect handling (same authority-election pattern as Tri 8x8/12x12) ──
  useEffect(() => {
    const onRoomUpdated = (room: { players?: { color: string }[] }) => {
      const current = gsRef.current;
      if (current.status !== "playing" || !room.players) return;

      const present = new Set(room.players.map((p) => p.color));
      const departed = ALL_COLORS.find(
        (c) => playerNames[c] && !present.has(c) && !current.eliminatedPlayers.includes(c)
      );
      if (!departed) return;

      const authority = ALL_COLORS.filter(
        (c) => c !== departed && !current.eliminatedPlayers.includes(c)
      ).sort()[0];
      if (authority !== myColor) return;

      const next = eliminatePlayerTri16(current, departed);
      setGs(next);
      socket.emit("game:move", { roomId, from: null, to: null, newState: next });
    };
    socket.on("room:updated", onRoomUpdated);
    return () => {
      socket.off("room:updated", onRoomUpdated);
    };
  }, [socket, playerNames, myColor, roomId]);

  const kingdomLight = "#c9a96e";
  const kingdomDark = "#4a2e1a";
  const triLight = "linear-gradient(150deg,#e6c884,#b9863c)";
  const triDark = "linear-gradient(150deg,#75521f,#2c1b09)";

  const renderCell = (boardId: TriBoardId, r: number, c: number, size: number, variant: "kingdom" | "triangle") => {
    const board = gs.boards[boardId];
    const piece = board[r][c];
    const sq: TriSquare = { boardId, row: r, col: c };
    const isLight = (r + c) % 2 === 0;

    const isSel = !!gs.selectedSquare && triSquareEquals(gs.selectedSquare, sq);
    const isValid = gs.validMoves.some((m) => triSquareEquals(m, sq));
    const isSuper = gs.superMoveMode && gs.superMoves.some((m) => triSquareEquals(m, sq));
    const isCastle = gs.castleMoves.some((m) => triSquareEquals(m, sq));
    const isLF = !!gs.lastMove && triSquareEquals(gs.lastMove.from, sq);
    const isLT = !!gs.lastMove && triSquareEquals(gs.lastMove.to, sq);
    const isAnim = !!animSq && triSquareEquals(animSq, sq);

    const boardColor = BOARD_COLOR[boardId];
    const isConnector = boardColor !== null && isConnectorCell(boardColor, boardId, { row: r, col: c });
    const isConnOrigin = isSel && isConnector;
    const isCrossing = isValid && boardId === "T" && !!gs.selectedSquare && gs.selectedSquare.boardId !== "T";

    const reachKey = `${boardId}|${r}|${c}`;
    const isDanger = !!piece && piece.color === myColor && enemyReach.has(reachKey);
    const isRiskyMove = isValid && isMyTurn && enemyReach.has(reachKey);
    const isSpellTarget = !gs.specialMode ? false : spellTargetSquares.has(reachKey);

    const baseBg = variant === "triangle" ? (isLight ? triLight : triDark) : isLight ? kingdomLight : kingdomDark;
    let ov = "";
    if (isSel) ov = `${SELECT}88`;
    else if (isLF || isLT) ov = "rgba(212,168,67,.25)";
    if (gs.superMoveMode && !isSel && !isSuper) ov = ov || "rgba(0,0,0,.1)";

    const moveColor = isCrossing ? GOLD : isRiskyMove ? DANGER : SAFE;

    return (
      <div
        key={`${boardId}-${r}-${c}`}
        className="tcsq"
        onClick={() => handleBoardClick(sq)}
        style={{ width: size, height: size, background: baseBg, position: "relative", overflow: "hidden", flexShrink: 0 }}
      >
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            background: isLight ? "linear-gradient(135deg,rgba(255,255,255,.14) 0%,transparent 55%)" : "linear-gradient(135deg,rgba(255,255,255,.05) 0%,rgba(0,0,0,.25) 100%)",
            boxShadow: variant === "triangle" ? "inset 0 1px 0 rgba(255,255,255,.22), inset 0 -2px 5px rgba(0,0,0,.5)" : undefined,
          }}
        />
        {isConnector && !ov && <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(circle,rgba(212,168,67,.3),transparent 72%)" }} />}
        {isConnOrigin && <div style={{ position: "absolute", inset: 0, zIndex: 1, border: `2px solid ${SELECT}d9`, borderRadius: 2, animation: "connGlow 1.2s infinite", pointerEvents: "none" }} />}
        {isDanger && <div style={{ position: "absolute", inset: 0, zIndex: 2, border: `2px solid ${DANGER}`, background: `${DANGER}22`, borderRadius: 2, animation: "dangerPulse 1.1s infinite", pointerEvents: "none" }} />}
        {ov && <div style={{ position: "absolute", inset: 0, zIndex: 1, background: ov, pointerEvents: "none" }} />}

        {isSpellTarget && (
          <div style={{ position: "absolute", inset: 0, zIndex: 3, background: `${GOLD}33`, border: `2px solid ${GOLD}`, borderRadius: 2, animation: "connGlow 1.2s infinite", pointerEvents: "none" }} />
        )}

        {isValid && !piece && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: size * 0.3, height: size * 0.3, borderRadius: "50%", background: `${moveColor}d9`, boxShadow: `0 0 16px ${moveColor}99`, animation: "tdotPop .15s ease both", pointerEvents: "none", zIndex: 4 }} />
        )}
        {isValid && piece && (
          <div style={{ position: "absolute", inset: 0, zIndex: 3, background: `${moveColor}26`, pointerEvents: "none" }} />
        )}
        {isValid && piece && (
          <div style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, zIndex: 4, borderRadius: 5, boxSizing: "border-box", border: `3px solid ${moveColor}e6`, pointerEvents: "none" }} />
        )}
        {isRiskyMove && (
          <div style={{ position: "absolute", top: -1, right: -1, width: 0, height: 0, borderStyle: "solid", borderWidth: "0 12px 12px 0", borderColor: `transparent ${DANGER} transparent transparent`, opacity: 0.9, zIndex: 5, pointerEvents: "none" }} />
        )}

        {isSuper && !piece && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: size * 0.35, height: size * 0.35, borderRadius: "50%", background: SUPER, boxShadow: `0 0 20px ${SUPER}`, animation: "tdotPop .15s ease both", pointerEvents: "none", zIndex: 4 }} />
        )}
        {isSuper && piece && (
          <div style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, zIndex: 4, borderRadius: 5, boxSizing: "border-box", border: `3px solid ${SUPER}`, pointerEvents: "none" }} />
        )}

        {isCastle && piece && (
          <div style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, zIndex: 4, borderRadius: 5, boxSizing: "border-box", border: `2px dashed ${SELECT}`, pointerEvents: "none" }} />
        )}

        {piece && (
          <>
            <img
              src={pieceImgSrc(piece)}
              alt={`${piece.color} ${piece.type}`}
              className="tcpi"
              style={{
                animation: isAnim ? "tpieceIn .32s cubic-bezier(.22,1,.36,1) both" : "none",
                filter: `${piece.sleepRoundsLeft > 0 ? "grayscale(.8) opacity(.6) " : ""}${piece.boundRoundsLeft > 0 ? "sepia(1) hue-rotate(220deg)" : ""}`,
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
            />
            {piece.type === "paladin" && piece.paladanSuperUsed && <div className="tsup-badge">✗</div>}
            {piece.type === "berserker" && piece.berserkerRampageUsed && <div className="tsup-badge">✗</div>}
          </>
        )}
      </div>
    );
  };

  const renderKingdomBoard = (boardId: TriBoardId, title: string, subtitle: string, width: number) => {
    const boardPx = kingdomSqPx * KINGDOM_SIZE;
    const isActiveBoard = BOARD_COLOR[boardId] === gs.currentTurn;

    return (
      <div style={{ width }}>
        <div className="tb-board-title" style={{ color: isActiveBoard ? AC[BOARD_COLOR[boardId]!] : GOLD }}>
          {title}
          <div style={{ fontSize: 9, opacity: 0.6, marginTop: 1, fontWeight: 600 }}>{subtitle}</div>
        </div>
        <div className={isActiveBoard ? "tb-kingdom-frame tb-kingdom-active" : "tb-kingdom-frame"} style={{ width: boardPx + FRAME * 2, height: boardPx + FRAME * 2 }}>
          {[{ top: -5, left: -5 }, { top: -5, right: -5 }, { bottom: -5, left: -5 }, { bottom: -5, right: -5 }].map((pos, i) => (
            <div key={i} className="tb-diamond" style={{ ...(pos as any) }} />
          ))}
          <div
            style={{
              position: "absolute", top: FRAME, left: FRAME, width: boardPx, height: boardPx,
              display: "grid", gridTemplateColumns: `repeat(${KINGDOM_SIZE},${kingdomSqPx}px)`, gridTemplateRows: `repeat(${KINGDOM_SIZE},${kingdomSqPx}px)`,
              borderRadius: 4, overflow: "hidden", border: "1px solid rgba(0,0,0,.9)", boxShadow: "inset 0 0 24px rgba(0,0,0,.5)",
            }}
          >
            {Array.from({ length: KINGDOM_SIZE }).map((_, r) => Array.from({ length: KINGDOM_SIZE }).map((_, c) => renderCell(boardId, r, c, kingdomSqPx, "kingdom")))}
          </div>
        </div>
      </div>
    );
  };

  const { triWidth, triHeight, triMargin, triFrameW, triFrameH } = layout;

  const renderTriGate = () => {
    const svgW = triWidth + triMargin * 2;
    const svgH = triHeight + triMargin;
    const apexXsvg = svgW / 2;
    const gridTop = FRAME + triMargin;
    const gridLeft = FRAME + LABEL_GUTTER + triMargin;

    return (
      <div className="tb-tri-frame" style={{ width: triFrameW, height: triFrameH }}>
        <svg width={svgW} height={svgH} style={{ position: "absolute", top: FRAME, left: FRAME + LABEL_GUTTER, overflow: "visible", pointerEvents: "none" }}>
          <defs>
            <linearGradient id="triBacking16" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8a6428" />
              <stop offset="100%" stopColor="#2c1b09" />
            </linearGradient>
          </defs>
          <polygon points={`${apexXsvg},0 0,${svgH} ${svgW},${svgH}`} fill="url(#triBacking16)" />
          <polygon points={`${apexXsvg},0 0,${svgH} ${svgW},${svgH}`} fill="none" stroke="rgba(15,8,2,.95)" strokeWidth={9} strokeLinejoin="round" />
          <polygon points={`${apexXsvg},0 0,${svgH} ${svgW},${svgH}`} fill="none" stroke="rgba(212,168,67,1)" strokeWidth={4} strokeLinejoin="round" className="tb-tri-outline" />
          <polygon points={`${apexXsvg},0 0,${svgH} ${svgW},${svgH}`} fill="none" stroke="rgba(255,224,150,.55)" strokeWidth={1.25} strokeLinejoin="round" />
        </svg>

        <div style={{ position: "absolute", top: gridTop, left: gridLeft, width: triWidth, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {Array.from({ length: TRI_ROWS }).map((_, r) => {
            const width = 2 * r + 1;
            const startCol = TRI_COL_CENTER - r;
            const rowNum = TRI_ROWS - r;
            return (
              <div key={r} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span className="tb-tri-label" style={{ position: "absolute", right: `calc(100% + 4px)`, width: LABEL_GUTTER - 4 }}>{rowNum}</span>
                <div style={{ display: "flex" }}>{Array.from({ length: width }).map((_, k) => renderCell("T", r, startCol + k, triSqPx, "triangle"))}</div>
                <span className="tb-tri-label" style={{ position: "absolute", left: `calc(100% + 4px)`, width: LABEL_GUTTER - 4 }}>{rowNum}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", marginTop: 6 }}>
            {Array.from({ length: TRI_COLS }).map((_, c) => (
              <span key={c} className="tb-tri-label" style={{ width: triSqPx, textAlign: "center", fontSize: 7.5 }}>{String.fromCharCode(65 + (c % 26))}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Special abilities panel ─────────────────────────────────────────────
  const renderSpecialPanel = () => {
    if (gs.status !== "playing") return null;
    if (gs.currentTurn !== myColor) return null;

    // The Wish dice result is a wholly independent flag from specialMode
    // (Wish itself clears specialMode back to null once the die is rolled),
    // so it must be checked on its own — not nested inside `if (specialMode)`
    // — or the Claim/End Turn buttons never render and the turn gets stuck.
    // Matches lib/game/rules-16x16.ts's special-ability panel exactly.
    if (gs.wishDiceResult !== null) {
      return (
        <Panel title="Special Ability">
          {gs.spellMessage && <div className="tb-spell-msg">{gs.spellMessage}</div>}
          <div className="tb-wish-card">
            🎲 {gs.wishDiceResult}/10 — {gs.wishDiceResult > 5 ? "Success!" : "No luck"}
            {gs.wishDiceResult > 5 ? (
              <button className="tb-spell-btn" onClick={() => handleSpecial("wish-success")}>Claim Wish →</button>
            ) : (
              <button className="tb-spell-btn" onClick={() => handleSpecial("wish-fail")}>End Turn</button>
            )}
          </div>
        </Panel>
      );
    }

    if (gs.specialMode) {
      const cancellable = gs.specialMode !== "executioner-axe-swing" && gs.specialMode !== "super-queen-second-move";

      if (gs.specialMode === "conjurer-revive-select" && gs.specialData?.deadPieces && !gs.specialData?.selectedPiece) {
        return (
          <Panel title="Special Ability">
            <div className="tb-spell-msg">{gs.spellMessage}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {(gs.specialData.deadPieces as Piece16[]).map((p, i) => (
                <button key={i} className="tb-spell-btn" onClick={() => handleConjurerPick(p)}>
                  {EMOJI[p.type]} {p.type}
                </button>
              ))}
            </div>
            <button className="tb-leave-btn" style={{ marginTop: 8, width: "100%" }} onClick={cancelSpecial}>✕ Cancel</button>
          </Panel>
        );
      }

      return (
        <Panel title="Special Ability">
          <div className="tb-spell-msg">{gs.spellMessage}</div>
          {cancellable && (
            <button className="tb-leave-btn" style={{ marginTop: 8, width: "100%" }} onClick={cancelSpecial}>✕ Cancel</button>
          )}
        </Panel>
      );
    }

    if (gs.superMoveMode) {
      return (
        <Panel title="Special Ability">
          <div className="tb-spell-msg" style={{ color: "#ffb347", fontWeight: 700 }}>⚔ Choose a square 3 spaces away to strike</div>
          <button className="tb-leave-btn" style={{ marginTop: 8, width: "100%" }} onClick={cancelSpecial}>✕ Cancel</button>
        </Panel>
      );
    }

    const selPiece = gs.selectedSquare ? gs.boards[gs.selectedSquare.boardId][gs.selectedSquare.row][gs.selectedSquare.col] : null;
    const selectedIsPaladin = !!selPiece && selPiece.type === "paladin" && selPiece.color === myColor;
    const paladinSuperUsed = selPiece?.paladanSuperUsed ?? false;
    const selectedIsBerserker = !!selPiece && selPiece.type === "berserker" && selPiece.color === myColor;
    const berserkerRampageUsed = selPiece?.berserkerRampageUsed ?? false;

    const sorc = findPieceTri16(gs.boards, myColor, "sorceress");
    const sorcPiece = sorc ? gs.boards[sorc.boardId][sorc.row][sorc.col] : null;
    const wiz = findPieceTri16(gs.boards, myColor, "wizard");
    const conj = findPieceTri16(gs.boards, myColor, "conjurer");
    const conjPiece = conj ? gs.boards[conj.boardId][conj.row][conj.col] : null;
    const hasDead = gs.capturedBy[myColor].some((p) => p.type !== "mystic-king");
    const hasShadowSpell = !!conjPiece && !conjPiece.conjurerShadowSpellUsed;
    const wl = findPieceTri16(gs.boards, myColor, "warlock");
    const wlPiece = wl ? gs.boards[wl.boardId][wl.row][wl.col] : null;
    const thief = findPieceTri16(gs.boards, myColor, "thief");
    const thiefPiece = thief ? gs.boards[thief.boardId][thief.row][thief.col] : null;
    const trickster = findPieceTri16(gs.boards, myColor, "trickster");
    const tricksterPiece = trickster ? gs.boards[trickster.boardId][trickster.row][trickster.col] : null;
    const mageSac = findMageAdjacentToQueen(gs.boards, myColor);

    const hasAny = (sorcPiece && sorcPiece.sorceressSpellsLeft > 0) || wiz || (conjPiece && conjPiece.conjurerSpellsLeft > 0 && hasDead)
      || hasShadowSpell || (wlPiece && !wlPiece.warlockBindUsed) || (thiefPiece && !thiefPiece.thiefStealUsed) || (tricksterPiece && !tricksterPiece.tricksterStealUsed)
      || mageSac || selectedIsPaladin || selectedIsBerserker;
    if (!hasAny) return null;

    return (
      <Panel title="Special Abilities">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {selectedIsPaladin && (
            paladinSuperUsed ? (
              <span className="tb-spell-btn" style={{ opacity: 0.5, cursor: "default" }}>⚡ Super Used</span>
            ) : (
              <button className="tb-spell-btn" style={{ background: "rgba(255,140,0,.18)", borderColor: "rgba(255,140,0,.5)", color: "#ffb347" }} onClick={handleSuperMove}>⚡ Super Move (3-square)</button>
            )
          )}
          {selectedIsBerserker && (
            berserkerRampageUsed ? (
              <span className="tb-spell-btn" style={{ opacity: 0.5, cursor: "default" }}>💥 Rampage Used</span>
            ) : (
              <button className="tb-spell-btn" style={{ background: "rgba(255,40,40,.18)", borderColor: "rgba(255,60,60,.5)", color: "#ff6b6b" }} onClick={handleBerserkerRampage}>💥 Rampage Attack</button>
            )
          )}
          {sorcPiece && sorcPiece.sorceressSpellsLeft > 0 && (
            <>
              <button className="tb-spell-btn" onClick={() => handleSpecial("sleep")}>😴 Sleep ({sorcPiece.sorceressSpellsLeft})</button>
              <button className="tb-spell-btn" onClick={() => handleSpecial("teleport")}>🌀 Teleport</button>
              <button className="tb-spell-btn" onClick={() => handleSpecial("wish")}>⭐ Wish</button>
            </>
          )}
          {wiz && <button className="tb-spell-btn" onClick={() => handleSpecial("wizard")}>🧙 Wizard</button>}
          {conjPiece && conjPiece.conjurerSpellsLeft > 0 && hasDead && <button className="tb-spell-btn" onClick={() => handleSpecial("conjure")}>✨ Conjure</button>}
          {hasShadowSpell && <button className="tb-spell-btn" style={{ background: "rgba(120,40,200,.18)", borderColor: "rgba(140,60,220,.5)", color: "#b060ff" }} onClick={() => handleSpecial("shadow-summon")}>🌑 Shadow Summon</button>}
          {wlPiece && !wlPiece.warlockBindUsed && <button className="tb-spell-btn" onClick={() => handleSpecial("bind")}>⛓️ Bind</button>}
          {thiefPiece && !thiefPiece.thiefStealUsed && <button className="tb-spell-btn" onClick={() => handleSpecial("thief-steal")}>🗝️ Steal</button>}
          {tricksterPiece && !tricksterPiece.tricksterStealUsed && <button className="tb-spell-btn" onClick={() => handleSpecial("trickster-steal")}>🃏 Steal</button>}
          {mageSac && <button className="tb-spell-btn" onClick={handleMageSacrifice}>💫 Mage Sacrifice</button>}
        </div>
      </Panel>
    );
  };

  const winnerIsMe = gs.winner === myColor;

  return (
    <div className="tb-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        @keyframes tdotPop {0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}80%{transform:translate(-50%,-50%) scale(1.2)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes tpieceIn {0%{opacity:.3;transform:translate(-50%,-50%) scale(.65) translateY(-10px)}65%{transform:translate(-50%,-50%) scale(1.08) translateY(1px)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) translateY(0)}}
        @keyframes connGlow {0%,100%{box-shadow:0 0 10px rgba(90,180,255,.5)}50%{box-shadow:0 0 22px rgba(90,180,255,.9)}}
        @keyframes dangerPulse {0%,100%{box-shadow:0 0 8px ${DANGER}70}50%{box-shadow:0 0 18px ${DANGER}}}
        @keyframes gateGlow {0%,100%{filter:drop-shadow(0 0 5px rgba(212,168,67,.6))}50%{filter:drop-shadow(0 0 14px rgba(212,168,67,.95))}}
        @keyframes wireFlow {0%{background-position:0 0}100%{background-position:0 -16px}}
        @keyframes turnPulse {0%,100%{box-shadow:0 0 16px var(--turn-glow,rgba(212,168,67,.4))}50%{box-shadow:0 0 30px var(--turn-glow,rgba(212,168,67,.7))}}
        @keyframes toastSlideIn {0%{opacity:0;transform:translate(-50%,-16px) scale(.94)}100%{opacity:1;transform:translate(-50%,0) scale(1)}}
        @keyframes chipPop {0%{opacity:0;transform:translateY(4px) scale(.9)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes panelFadeUp {0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes pulseDot {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.82)}}
        @keyframes titleFloat {0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes titleShimmer {0%{background-position:0% 50%}100%{background-position:200% 50%}}
        @keyframes titleGlow {0%,100%{filter:drop-shadow(0 0 14px rgba(212,168,67,.35))}50%{filter:drop-shadow(0 0 28px rgba(212,168,67,.6))}}

        .tb-title{margin:0;font-size:36px;font-family:'Cinzel',Georgia,serif;font-weight:700;letter-spacing:.02em;background:linear-gradient(100deg,#8a5a18,#f0dfb0,#d4a843,#8a5a18);background-size:220% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:titleFloat 4.5s ease-in-out infinite,titleShimmer 6s linear infinite,titleGlow 4.5s ease-in-out infinite;display:inline-block;}

        .tb-root{min-height:100vh;overflow-x:hidden;background-image:url('/X-8x8/background.png');background-repeat:no-repeat;background-size:cover;background-position:center top;background-attachment:scroll;color:#fff;font-family:'Cinzel',Georgia,serif;padding:110px ${ROOT_PAD}px 40px;}
        .tb-panel{padding:12px 13px;border-radius:12px;background:rgba(18,12,6,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(212,168,67,.22);box-shadow:0 10px 30px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04);animation:panelFadeUp .4s ease both;transition:border-color .25s,box-shadow .25s,transform .25s;}
        .tb-panel:hover{border-color:rgba(212,168,67,.4);box-shadow:0 14px 36px rgba(0,0,0,.5),0 0 24px rgba(212,168,67,.08),inset 0 1px 0 rgba(255,255,255,.05);}
        .tb-panel-title{margin:0 0 9px;color:${GOLD};font-family:'Cinzel',Georgia,serif;font-size:13px;font-weight:700;letter-spacing:.04em;}
        .tb-board-title{margin-bottom:5px;text-align:center;font-family:'Cinzel',Georgia,serif;font-weight:700;font-size:11px;letter-spacing:.03em;text-transform:uppercase;transition:color .3s;}
        .tb-kingdom-frame{position:relative;border-radius:10px;background:linear-gradient(145deg,#3d1f08,#1e0e04,#0e0702,#1e0e04,#3d1f08);box-shadow:0 0 0 1px rgba(60,35,5,.95),0 0 0 2px rgba(212,168,67,.4),0 12px 32px rgba(0,0,0,.7),inset 0 1px 0 rgba(212,168,67,.2);transition:box-shadow .3s;margin:0 auto;}
        .tb-kingdom-active{box-shadow:0 0 0 1px rgba(60,35,5,.95),0 0 0 2px rgba(212,168,67,.75),0 0 34px rgba(212,168,67,.35),0 12px 32px rgba(0,0,0,.7),inset 0 1px 0 rgba(212,168,67,.3);}
        .tb-diamond{position:absolute;width:10px;height:10px;background:${GOLD};border:1px solid rgba(255,230,150,.7);border-radius:2px;transform:rotate(45deg);box-shadow:0 0 8px ${GOLD}66;z-index:6;}
        .tb-tri-frame{position:relative;border-radius:16px;background:linear-gradient(180deg,rgba(26,15,5,.75),rgba(6,3,1,.85));box-shadow:0 0 0 1px rgba(212,168,67,.45),0 0 50px rgba(212,168,67,.2),0 24px 60px rgba(0,0,0,.8);max-width:100%;}
        .tb-tri-outline{animation:gateGlow 3s ease-in-out infinite;}
        .tb-tri-label{color:rgba(255,224,150,.85);font-size:10px;font-family:'Cinzel',Georgia,serif;font-weight:700;flex-shrink:0;text-shadow:0 0 4px rgba(0,0,0,.8);}
        .tb-gate-caption{color:${GOLD};font-size:11px;font-weight:800;letter-spacing:.05em;line-height:1.4;}
        .tb-wire-v{position:absolute;width:2px;background-image:linear-gradient(${GOLD},${GOLD} 50%,transparent 50%,transparent);background-size:2px 8px;animation:wireFlow 1s linear infinite;box-shadow:0 0 6px ${GOLD}77;transform:translateX(-1px);}
        .tb-wire-dot{position:absolute;width:8px;height:8px;background:${GOLD};transform:translate(-3px,0) rotate(45deg);box-shadow:0 0 8px ${GOLD}aa;}
        .tb-wire-v-flow{width:2px;height:18px;background-image:linear-gradient(${GOLD},${GOLD} 50%,transparent 50%,transparent);background-size:2px 8px;animation:wireFlow 1s linear infinite;box-shadow:0 0 6px ${GOLD}77;}
        .tb-turn-pill{padding:12px 20px;border-radius:14px;background:rgba(0,0,0,.5);font-weight:900;letter-spacing:.08em;text-transform:uppercase;animation:turnPulse 2.2s ease-in-out infinite;}
        .tb-pass-btn{padding:13px 16px;border-radius:12px;border:1px solid rgba(212,168,67,.3);font-weight:900;font-family:'Cinzel',Georgia,serif;transition:transform .15s,box-shadow .15s;}
        .tb-pass-btn:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(212,168,67,.3);}
        .tb-pass-btn:not(:disabled):active{transform:translateY(0);}
        .tb-leave-btn{padding:11px 16px;border-radius:12px;border:1px solid rgba(220,80,80,.3);background:rgba(120,30,30,.18);color:rgba(255,160,160,.85);font-weight:700;font-family:'Cinzel',Georgia,serif;font-size:12px;cursor:pointer;transition:all .2s;}
        .tb-leave-btn:hover{background:rgba(150,35,35,.32);border-color:rgba(255,100,100,.5);color:#fff;transform:translateY(-1px);}
        .tb-spell-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:12px;border:1px solid rgba(212,168,67,.45);background:linear-gradient(155deg,rgba(212,168,67,.16),rgba(255,255,255,.02));backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#f0dfb0;font-weight:700;font-family:'Cinzel',Georgia,serif;font-size:11.5px;letter-spacing:.02em;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease;}
        .tb-spell-btn:hover{transform:translateY(-2px);border-color:rgba(212,168,67,.85);background:linear-gradient(155deg,rgba(212,168,67,.3),rgba(255,255,255,.04));box-shadow:0 10px 22px rgba(0,0,0,.5),0 0 18px rgba(212,168,67,.3),inset 0 1px 0 rgba(255,255,255,.12);}
        .tb-spell-btn:active{transform:translateY(0) scale(.97);}
        .tb-spell-msg{font-size:12px;color:rgba(255,255,255,.8);line-height:1.5;}
        .tb-wish-card{margin-top:10px;padding:14px 16px;border-radius:14px;background:linear-gradient(155deg,rgba(255,255,255,.06),rgba(255,255,255,.015));border:1px solid rgba(212,168,67,.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 8px 20px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.06);font-size:13px;display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center;}
        .tb-turn-toast{position:fixed;top:110px;left:50%;transform:translateX(-50%);z-index:500;padding:14px 26px;border-radius:14px;background:rgba(8,5,2,.9);backdrop-filter:blur(10px);border:1px solid;display:flex;flex-direction:column;align-items:center;gap:2px;animation:toastSlideIn .3s cubic-bezier(.22,1,.36,1) both;pointer-events:none;font-family:'Cinzel',Georgia,serif;}
        .tb-turn-toast span:first-child{font-weight:900;font-size:16px;letter-spacing:.08em;text-transform:uppercase;}
        .tb-turn-toast-sub{font-size:11px;color:rgba(255,255,255,.55);}
        .tb-move-summary{position:absolute;top:-6px;left:50%;transform:translate(-50%,-100%);z-index:60;display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:90%;pointer-events:none;}
        .tb-ms-chip{padding:5px 10px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.02em;white-space:nowrap;animation:chipPop .18s ease both;border:1px solid;backdrop-filter:blur(6px);}
        .tb-ms-safe{background:rgba(62,207,110,.14);border-color:rgba(62,207,110,.45);color:#8be6a8;}
        .tb-ms-danger{background:rgba(255,80,80,.14);border-color:rgba(255,80,80,.45);color:#ff9a9a;}
        .tb-ms-gold{background:rgba(212,168,67,.14);border-color:rgba(212,168,67,.5);color:#f0dfb0;}
        .tb-layout-grid{display:grid;grid-template-columns:${SIDE_COL_W}px minmax(0,1fr) ${SIDE_COL_W}px;gap:${GRID_GAP}px;align-items:start;justify-content:center;}
        .tb-col-left,.tb-col-right{animation:panelFadeUp .4s ease both;}
        @media (max-width:1300px){
          .tb-layout-grid{grid-template-columns:1fr;}
          .tb-col-center{order:1;}
          .tb-col-left{order:2;}
          .tb-col-right{order:3;}
        }
        @media (max-width:760px){
          .tb-root{padding:96px 12px 32px;}
          .tb-turn-toast{top:88px;padding:11px 18px;}
        }
        .tb-ctrl-btn{display:flex;align-items:flex-start;gap:11px;width:100%;text-align:left;padding:13px 14px;border-radius:14px;cursor:pointer;font-family:'Cinzel',Georgia,serif;background:linear-gradient(160deg,#5c3d1f 0%,#2a1a0a 100%);border:1px solid rgba(212,168,67,.35);box-shadow:0 8px 20px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08);transition:all .18s ease;}
        .tb-ctrl-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 26px rgba(0,0,0,.55);background:linear-gradient(160deg,#6b4726 0%,#331f0d 100%);}
        .tb-ctrl-btn:active:not(:disabled){transform:translateY(0) scale(.98);}
        .tb-ctrl-btn:disabled{opacity:.5;cursor:default;}
        .tb-ctrl-icon{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;font-size:16px;flex-shrink:0;background:rgba(212,168,67,.18);border:1px solid rgba(212,168,67,.4);}
        .tb-ctrl-title{margin:0;font-size:12px;font-weight:800;color:#ffffff;letter-spacing:.06em;text-transform:uppercase;}
        .tb-ctrl-subtitle{margin:2px 0 0;font-size:10.5px;color:rgba(255,255,255,.55);line-height:1.35;}
        .tb-tab-btn{padding:9px 16px;border-radius:10px;border:1px solid rgba(212,168,67,.25);background:rgba(255,255,255,.03);color:rgba(255,255,255,.6);font-family:'Cinzel',Georgia,serif;font-weight:700;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .18s ease;}
        .tb-tab-btn:hover{background:rgba(212,168,67,.08);color:#fff;}
        .tb-tab-active{background:rgba(212,168,67,.18);border-color:rgba(212,168,67,.55);color:${GOLD};box-shadow:inset 0 1px 0 rgba(255,255,255,.08);}
        .tb-modal-backdrop{position:fixed;inset:0;z-index:960;background:rgba(0,0,0,.88);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:20px;animation:panelFadeUp .25s ease both;}
        .tb-modal-card{width:min(820px,94vw);max-height:88vh;overflow-y:auto;border-radius:24px;padding:28px 26px;background:linear-gradient(155deg,#0e0902 0%,#1a1005 45%,#0e0902 100%);border:1px solid rgba(212,168,67,.28);box-shadow:0 40px 100px rgba(0,0,0,.85),0 0 60px rgba(212,168,67,.08),inset 0 1px 0 rgba(255,255,255,.05);font-family:'Cinzel',Georgia,serif;}
        .tb-modal-close{width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);cursor:pointer;font-size:16px;flex-shrink:0;transition:background .15s,color .15s;}
        .tb-modal-close:hover{background:rgba(255,255,255,.1);color:#fff;}
        .tb-modal-scroll::-webkit-scrollbar,.tb-modal-card::-webkit-scrollbar{width:5px;}
        .tb-modal-scroll::-webkit-scrollbar-thumb,.tb-modal-card::-webkit-scrollbar-thumb{background:rgba(212,168,67,.25);border-radius:5px;}
        .tb-rule-card{display:flex;gap:11px;padding:13px 14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(212,168,67,.12);transition:border-color .2s,background .2s;}
        .tb-rule-card:hover{background:rgba(212,168,67,.05);border-color:rgba(212,168,67,.28);}
        .tb-rule-num{width:22px;height:22px;border-radius:50%;background:rgba(212,168,67,.14);border:1px solid rgba(212,168,67,.4);color:${GOLD};font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .tb-piece-card{padding:20px 20px;border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 18px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.06);transition:transform .18s,border-color .18s,box-shadow .18s,background .18s;}
        .tb-piece-card:hover{transform:translateY(-3px) scale(1.01);border-color:rgba(212,168,67,.55);background:linear-gradient(145deg,rgba(212,168,67,.16),rgba(255,255,255,.03));box-shadow:0 16px 32px rgba(0,0,0,.55),0 0 20px rgba(212,168,67,.22),inset 0 1px 0 rgba(255,255,255,.1);}
        .tb-piece-icon{display:flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:16px;background:#050505;border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 8px 16px rgba(0,0,0,.6);flex-shrink:0;overflow:hidden;font-size:26px;}
        .tb-spell-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;}
        .tb-spell-card{position:relative;padding:18px 17px;border-radius:16px;background:linear-gradient(155deg,rgba(255,255,255,.06),rgba(255,255,255,.015));border:1px solid rgba(212,168,67,.25);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 8px 20px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.05);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease,background .2s ease;overflow:hidden;}
        .tb-spell-card::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(212,168,67,.08),transparent 60%);pointer-events:none;}
        .tb-spell-card:hover{transform:translateY(-4px);border-color:rgba(212,168,67,.6);background:linear-gradient(155deg,rgba(212,168,67,.14),rgba(255,255,255,.02));box-shadow:0 18px 36px rgba(0,0,0,.55),0 0 26px rgba(212,168,67,.25),inset 0 1px 0 rgba(255,255,255,.1);}
        .tb-spell-icon{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:13px;font-size:21px;margin-bottom:12px;background:rgba(212,168,67,.14);border:1px solid rgba(212,168,67,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 14px rgba(212,168,67,.15);transition:transform .2s ease,box-shadow .2s ease;}
        .tb-spell-card:hover .tb-spell-icon{transform:scale(1.08) rotate(-4deg);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 22px rgba(212,168,67,.4);}
        .tb-spell-name{margin:0 0 2px;font-size:14.5px;font-weight:800;color:#fff;letter-spacing:.02em;text-shadow:0 2px 6px rgba(0,0,0,.7);}
        .tb-spell-piece{margin:0 0 10px;font-size:10px;font-weight:700;color:${GOLD};text-transform:uppercase;letter-spacing:.08em;}
        .tb-spell-body{margin:0 0 12px;font-size:12px;color:rgba(255,255,255,.75);line-height:1.6;}
        .tb-spell-tag{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border:1px solid;}
        .tb-spell-tag-global{background:rgba(90,180,255,.14);border-color:rgba(90,180,255,.5);color:#8fc6ff;}
        .tb-spell-tag-local{background:rgba(212,168,67,.14);border-color:rgba(212,168,67,.5);color:#f0dfb0;}
        .tb-spell-tag-passive{background:rgba(180,180,190,.14);border-color:rgba(180,180,190,.4);color:rgba(255,255,255,.7);}
        @media (max-width:760px){.tb-spell-grid{grid-template-columns:1fr;}}
        .tcsq{position:relative;overflow:hidden;cursor:pointer;transition:filter .1s;}
        .tcsq:hover{filter:brightness(1.2);}
        .tcsq:hover .tcpi{transform:translate(-50%,-50%) scale(1.07) translateY(-2px);}
        .tcpi{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:78%;height:78%;object-fit:contain;pointer-events:none;z-index:3;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,.9)) drop-shadow(0 1px 3px rgba(0,0,0,.7));transition:transform .15s;}
        .tsup-badge{position:absolute;bottom:2px;right:2px;width:11px;height:11px;border-radius:50%;background:rgba(180,50,50,.85);border:1px solid rgba(255,100,100,.5);display:flex;align-items:center;justify-content:center;font-size:6px;color:#fff;font-weight:700;z-index:5;pointer-events:none;}
      `}</style>

      {turnToast && (
        <div className="tb-turn-toast" style={{ borderColor: `${AC[myColor]}77`, boxShadow: `0 0 40px ${AC[myColor]}44, 0 10px 30px rgba(0,0,0,.6)` }}>
          <span style={{ color: AC[myColor] }}>Your Turn</span>
          <span className="tb-turn-toast-sub">Select a piece to see your moves</span>
        </div>
      )}

      <div style={{ maxWidth: CONTENT_MAX_W, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <h1 className="tb-title">
              Tri Board 16x16
            </h1>
            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.55)" }}>Room: {roomId} · You are {myColor}</p>
          </div>
          <div className="tb-turn-pill" style={{ border: `1px solid ${AC[gs.currentTurn]}66`, color: AC[gs.currentTurn], ["--turn-glow" as any]: `${AC[gs.currentTurn]}66` }}>
            {isMyTurn ? "Your Turn" : `${gs.currentTurn}'s Turn`}
          </div>
        </div>

        <div className="tb-layout-grid">
          {/* ── LEFT: PLAYERS + LEGEND + SPECIAL ── */}
          <div className="tb-col-left" style={{ display: "grid", gap: 16 }}>
            <Panel title="Players">
              <div style={{ display: "grid", gap: 9 }}>
                {(["white", "black", "grey"] as TriColor[]).map((color, i) => {
                  const isActive = gs.currentTurn === color;
                  const isEliminated = gs.eliminatedPlayers.includes(color);
                  return (
                    <div key={color} style={{ opacity: isEliminated ? 0.4 : 1, borderLeft: isActive && !isEliminated ? `3px solid ${AC[color]}` : "3px solid transparent", boxShadow: isActive && !isEliminated ? `0 0 14px ${AC[color]}33` : "none", borderRadius: 6, padding: "3px 5px", transition: "all .3s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 11, height: 11, borderRadius: "50%", background: DOT[color], border: "1px solid rgba(255,255,255,.35)", flexShrink: 0, boxShadow: isActive && !isEliminated ? `0 0 10px ${AC[color]}aa` : undefined, animation: isActive && !isEliminated ? "pulseDot 1.5s infinite" : "none" }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: 11.5, lineHeight: 1.25 }}>{color.charAt(0).toUpperCase() + color.slice(1)} Kingdom (P{i + 1})</div>
                          <div style={{ color: GOLD, fontSize: 10, fontWeight: 600, marginTop: 1 }}>
                            {playerNames[color] || color}
                            {color === myColor && <span style={{ opacity: 0.6 }}> (You)</span>}
                            {isEliminated && <span style={{ color: "#ff8080", marginLeft: 6, fontSize: 9, letterSpacing: ".05em" }}>ELIMINATED</span>}
                          </div>
                        </div>
                      </div>
                      <CapturedTray pieces={gs.capturedBy[color]} />
                    </div>
                  );
                })}
              </div>
            </Panel>

            {renderSpecialPanel()}

            <Panel title="Legend">
              <div style={{ display: "grid", gap: 7 }}>
                {LEGEND.map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {item.icon}
                    <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.75)" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* ── CENTER: battlefield ── */}
          <div className="tb-col-center" style={{ display: "flex", justifyContent: "center", position: "relative" }}>
            {moveSummary && (
              <div className="tb-move-summary">
                {moveSummary.captures > 0 && <span className="tb-ms-chip tb-ms-gold">⚔ {moveSummary.captures} capture{moveSummary.captures > 1 ? "s" : ""}</span>}
                {moveSummary.safe > 0 && <span className="tb-ms-chip tb-ms-safe">✓ {moveSummary.safe} safe</span>}
                {moveSummary.risky > 0 && <span className="tb-ms-chip tb-ms-danger">⚠ {moveSummary.risky} risky</span>}
                {moveSummary.crossing > 0 && <span className="tb-ms-chip tb-ms-gold">↙ {moveSummary.crossing} gate crossing</span>}
              </div>
            )}
            {isCompact ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%" }}>
                {renderKingdomBoard("A", "White Kingdom (Player 1)", "Board A", layout.kingdomBoardPx)}
                <div className="tb-wire-v-flow" />
                {renderTriGate()}
                <div className="tb-wire-v-flow" />
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
                  {renderKingdomBoard("B", "Black Kingdom (Player 2)", "Board B", layout.kingdomBoardPx)}
                  {renderKingdomBoard("C", "Grey Kingdom (Player 3)", "Board C", layout.kingdomBoardPx)}
                </div>
              </div>
            ) : (
              <div style={{ position: "relative", width: layout.clusterWidth, height: layout.clusterHeight }}>
                <div style={{ position: "absolute", left: layout.boardALeft, top: 0 }}>
                  {renderKingdomBoard("A", "White Kingdom (Player 1)", "Board A", layout.kingdomBoardPx)}
                </div>

                <div className="tb-wire-v" style={{ left: layout.apexX, top: TITLE_H + layout.kingdomBoardPx, height: WIRE_GAP }} />
                <div className="tb-wire-dot" style={{ left: layout.apexX, top: TITLE_H + layout.kingdomBoardPx + WIRE_GAP - 4 }} />

                <div style={{ position: "absolute", left: layout.triFrameLeft, top: layout.triFrameTop, width: layout.triFrameW }}>
                  {renderTriGate()}
                </div>

                <div
                  className="tb-gate-caption"
                  style={{ position: "absolute", left: layout.triFrameLeft + layout.triFrameW + 14, top: layout.triFrameTop + layout.triFrameH * 0.36, width: 130 }}
                >
                  <span style={{ marginRight: 4 }}>↙</span>TRI GATE
                  <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.65, textTransform: "uppercase" }}>(Connector Board)</div>
                </div>

                <div className="tb-wire-v" style={{ left: layout.meshLeft, top: layout.triFrameTop + layout.triFrameH, height: WIRE_GAP }} />
                <div className="tb-wire-dot" style={{ left: layout.meshLeft, top: layout.triFrameTop + layout.triFrameH + WIRE_GAP - 4 }} />
                <div className="tb-wire-v" style={{ left: layout.meshRight, top: layout.triFrameTop + layout.triFrameH, height: WIRE_GAP }} />
                <div className="tb-wire-dot" style={{ left: layout.meshRight, top: layout.triFrameTop + layout.triFrameH + WIRE_GAP - 4 }} />

                <div style={{ position: "absolute", left: layout.boardBLeft, top: layout.bottomTitleTop }}>
                  {renderKingdomBoard("B", "Black Kingdom (Player 2)", "Board B", layout.kingdomBoardPx)}
                </div>
                <div style={{ position: "absolute", left: layout.boardCLeft, top: layout.bottomTitleTop }}>
                  {renderKingdomBoard("C", "Grey Kingdom (Player 3)", "Board C", layout.kingdomBoardPx)}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: GAME CONTROLS ── */}
          <div className="tb-col-right" style={{ display: "grid", gap: 16 }}>
            <Panel title="Game Controls">
              <div style={{ display: "grid", gap: 10 }}>
                <ControlCard icon="🏳️" title="Pass Turn" subtitle={gs.passUsed[myColor] ? "Already used this game" : "Skip your move this turn"}
                  onClick={handlePass} disabled={!isMyTurn || gs.passUsed[myColor]} />
                <ControlCard icon="🛡️" title="Battle Guide" subtitle="Piece powers & spells"
                  onClick={() => { setBattleGuideTab("pieces"); setShowBattleGuide(true); }} />
                <ControlCard icon="📜" title="Game Rules" subtitle="How to play & victory"
                  onClick={() => { setGameRulesTab("play"); setShowGameRules(true); }} />
                <ControlCard icon="🚪" title="Quit Game" subtitle="Leave / Surrender"
                  onClick={() => setShowLeaveConfirm(true)} />
              </div>
            </Panel>
          </div>
        </div>

        {/* ── BATTLE GUIDE MODAL — Pieces + Spells tabs ── */}
        {showBattleGuide && (
          <TbModal title="Battle Guide" subtitle="Movement · Powers · Spells" icon="🛡️" onClose={() => setShowBattleGuide(false)}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button className={`tb-tab-btn ${battleGuideTab === "pieces" ? "tb-tab-active" : ""}`} onClick={() => setBattleGuideTab("pieces")}>🛡️ Pieces</button>
              <button className={`tb-tab-btn ${battleGuideTab === "spells" ? "tb-tab-active" : ""}`} onClick={() => setBattleGuideTab("spells")}>🔮 Spells</button>
            </div>

            {battleGuideTab === "pieces" && (
              <div className="tb-modal-scroll" style={{ maxHeight: "64vh", overflowY: "auto", display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 14, paddingRight: 4 }}>
                {(Object.keys(PIECE_INFO) as PieceType16[]).map((type) => (
                  <div key={type} className="tb-piece-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                      <span className="tb-piece-icon"><PieceAbilityIcon pieceKey={type} /></span>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: ".03em", textShadow: "0 2px 8px rgba(0,0,0,.8)" }}>{PIECE_INFO[type].name}</p>
                    </div>
                    <p style={{ margin: 0, fontSize: 13.5, color: "rgba(255,255,255,.8)", lineHeight: 1.7 }}>{PIECE_INFO[type].special}</p>
                  </div>
                ))}
              </div>
            )}

            {battleGuideTab === "spells" && (
              <div className="tb-modal-scroll tb-spell-grid" style={{ maxHeight: "64vh", overflowY: "auto", paddingRight: 4, paddingBottom: 4 }}>
                {SPELLS.map((s, i) => (
                  <div key={i} className="tb-spell-card">
                    <span className="tb-spell-icon"><SpellPieceIcon pieceKey={s.pieceType} fallback={s.icon} /></span>
                    <p className="tb-spell-name">{s.name}</p>
                    <p className="tb-spell-piece">{s.piece}</p>
                    <p className="tb-spell-body">{s.body}</p>
                    <span className={`tb-spell-tag ${s.range === "Global" ? "tb-spell-tag-global" : s.range === "Passive" ? "tb-spell-tag-passive" : "tb-spell-tag-local"}`}>
                      {s.range === "Global" ? "🌐" : s.range === "Passive" ? "♟" : "🔒"} {s.range}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TbModal>
        )}

        {/* ── GAME RULES MODAL — How to Play + Game Flow & Victory tabs ── */}
        {showGameRules && (
          <TbModal title="Game Rules" subtitle="Kingdoms · Tri Gate · Combat" icon="📜" onClose={() => setShowGameRules(false)}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button className={`tb-tab-btn ${gameRulesTab === "play" ? "tb-tab-active" : ""}`} onClick={() => setGameRulesTab("play")}>📜 How to Play</button>
              <button className={`tb-tab-btn ${gameRulesTab === "flow" ? "tb-tab-active" : ""}`} onClick={() => setGameRulesTab("flow")}>🏆 Game Flow & Victory</button>
            </div>

            {gameRulesTab === "play" && (
              <>
                <div className="tb-modal-scroll" style={{ maxHeight: "60vh", overflowY: "auto", display: "grid", gap: 10, paddingRight: 4 }}>
                  {RULES.map((r, i) => (
                    <div key={i} className="tb-rule-card">
                      <div className="tb-rule-num">{i + 1}</div>
                      <div>
                        <div style={{ color: "#f0dfb0", fontWeight: 800, fontSize: 13, marginBottom: 3, letterSpacing: ".03em" }}>{r.title}</div>
                        <div style={{ color: "rgba(255,255,255,.68)", fontSize: 12.5, lineHeight: 1.6 }}>{r.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: "center", padding: "14px 0 0", borderTop: "1px solid rgba(212,168,67,.12)", marginTop: 14 }}>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(212,168,67,.4)", fontStyle: "italic" }}>"Three crowns, one Tri Gate — only one kingdom walks away."</p>
                </div>
              </>
            )}

            {gameRulesTab === "flow" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 14, padding: "4px 0 18px" }}>
                  {GAME_FLOW.map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 96 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,.5)", border: "1px solid rgba(212,168,67,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>{step.icon}</div>
                        <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.7)", lineHeight: 1.35 }}>
                          <div>{step.lines[0]}</div>
                          <div>{step.lines[1]}</div>
                        </div>
                      </div>
                      {i < GAME_FLOW.length - 1 && <span style={{ color: GOLD, fontSize: 18, opacity: 0.6 }}>→</span>}
                    </div>
                  ))}
                </div>
                <div className="tb-modal-scroll" style={{ maxHeight: "46vh", overflowY: "auto", display: "grid", gap: 10, paddingRight: 4, borderTop: "1px solid rgba(212,168,67,.12)", paddingTop: 14 }}>
                  {VICTORY_RULES.map((r, i) => (
                    <div key={i} className="tb-rule-card">
                      <div className="tb-rule-num">{i + 1}</div>
                      <div>
                        <div style={{ color: "#f0dfb0", fontWeight: 800, fontSize: 13, marginBottom: 3, letterSpacing: ".03em" }}>{r.title}</div>
                        <div style={{ color: "rgba(255,255,255,.68)", fontSize: 12.5, lineHeight: 1.6 }}>{r.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TbModal>
        )}

        {showLeaveConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 998 }}>
            <div style={{ padding: 32, borderRadius: 18, background: "linear-gradient(145deg,#1b1006,#050301)", border: "1px solid rgba(220,60,60,.35)", textAlign: "center", maxWidth: 360 }}>
              <h3 style={{ color: "#ff8080", margin: "0 0 10px", fontFamily: "'Cinzel',Georgia,serif" }}>Leave the Battle?</h3>
              <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, marginBottom: 20 }}>
                Your pieces will be removed from every board and the remaining kingdoms will continue without you.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "#fff", cursor: "pointer", fontFamily: "'Cinzel',Georgia,serif" }}>
                  Stay
                </button>
                <button onClick={handleLeave} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#c83a3a,#701818)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "'Cinzel',Georgia,serif" }}>
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}

        {gs.status === "playing" && gs.eliminatedPlayers.includes(myColor) && (
          <div style={{ position: "fixed", left: 24, bottom: 24, zIndex: 900, padding: "14px 18px", borderRadius: 14, background: "linear-gradient(145deg,rgba(28,10,10,.95),rgba(10,4,4,.95))", border: "1px solid rgba(255,80,80,.3)", boxShadow: "0 10px 30px rgba(0,0,0,.6)", maxWidth: 280 }}>
            <div style={{ color: "#ff8080", fontWeight: 800, fontFamily: "'Cinzel',Georgia,serif", marginBottom: 4 }}>You Have Been Eliminated</div>
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 12 }}>All your pieces are gone, but the war continues — watch the remaining kingdoms fight for the crown.</div>
          </div>
        )}

        {gs.status === "finished" && gs.winner && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
            {winnerIsMe && <Fireworks />}
            <div style={{ position: "relative", padding: 44, borderRadius: 24, background: "linear-gradient(145deg,#1b1006,#050301)", border: `1px solid ${winnerIsMe ? "rgba(212,168,67,.45)" : "rgba(220,60,60,.35)"}`, textAlign: "center", boxShadow: `0 30px 90px rgba(0,0,0,.75), 0 0 60px ${winnerIsMe ? "rgba(212,168,67,.2)" : "rgba(220,60,60,.15)"}` }}>
              {[{ top: 12, left: 12 }, { top: 12, right: 12 }, { bottom: 12, left: 12 }, { bottom: 12, right: 12 }].map((pos, i) => (
                <div key={i} style={{ position: "absolute", ...(pos as any), width: 10, height: 10, border: "1px solid rgba(212,168,67,.4)", transform: "rotate(45deg)" }} />
              ))}
              <img
                src={winnerIsMe ? "/game-over/victory.png" : "/game-over/defeated.png"}
                alt={winnerIsMe ? "Victory" : "Defeat"}
                style={{ width: 90, height: 90, objectFit: "contain", margin: "0 auto 12px" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <h2 style={{ color: winnerIsMe ? "#e8c96a" : "#ff8080", fontSize: 40, margin: 0, fontFamily: "'Cinzel',Georgia,serif" }}>
                {winnerIsMe ? "VICTORY!" : `${gs.winner.toUpperCase()} WINS`}
              </h2>
              <p style={{ color: "rgba(255,255,255,.55)", marginTop: 10 }}>
                {winnerIsMe ? "You claim the tri-kingdom." : `${playerNames[gs.winner] || gs.winner} claims the tri-kingdom. Better luck next time.`}
              </p>
              <button onClick={() => location.reload()} style={{ marginTop: 20, padding: "12px 26px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#d4a843,#8a5a18)", color: "#120800", fontWeight: 900, fontFamily: "'Cinzel',Georgia,serif", cursor: "pointer" }}>
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
