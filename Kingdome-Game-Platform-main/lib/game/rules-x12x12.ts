// ─── 12x12 X BOARD — 4-player cross-shaped board ──────────────────────────────
// Four Classic-12x12 "Kingdom War" armies (Top / Right / Bottom / Left), each
// trimmed to their outer 12-wide x 6-deep strip (back rank + front rank + 4
// empty ranks), merged into one 24x24 grid with the four corner 6x6 blocks
// removed, leaving the same compact plus/cross silhouette as the 8x8 X Board
// — just a bigger evolution of it — whose four arms all open onto a shared
// 12x12 center. Every piece type's movement, every spell (Wizard Teleport,
// Sorceress Sleep/Teleport, Executioner Axe Swing, Super Queen double move,
// Mage Sacrifice, Mystic King's Last Wish morph), the Paladin Super Move, and
// elimination-only win/lose logic are copied verbatim in spirit from
// lib/game/rules-12x12.ts — only the board shape/size and the 2-player ->
// 4-player turn/elimination bookkeeping are new. No new abilities, and no
// rule changes, are introduced.

export type PieceTypeX12 =
  | "mystic-king" | "super-queen" | "dragon" | "gargoyle"
  | "wizard" | "sorceress" | "super-knight" | "assassin"
  | "executioner" | "cavalier" | "mage" | "elvin-archer" | "paladin";

// Matches lib/lobby/types.ts MODE_CONFIG["x-12x12"].colors (White/Black/Grey/
// Golden), same clockwise seating as the 8x8 X Board: white=Top, grey=Right,
// black=Bottom, golden=Left.
export type PlayerColorX12 = "white" | "black" | "golden" | "grey";

export interface PieceX12 {
  id: string; type: PieceTypeX12; color: PlayerColorX12;
  hasMoved: boolean; paladanSuperUsed: boolean; superKnightJumpsLeft: number;
  sorceressSpellsLeft: number; sorceressDead: boolean; sleepRoundsLeft: number;
  isEthereal: boolean; executionerAxeUsed: boolean;
  superQueenDoubleJumpDone: boolean; mageSacrificed: boolean;
}

export interface SquareX12 { row: number; col: number; }
export type BoardX12 = (PieceX12 | null)[][];

export type SpecialModeX12 =
  | null | "wizard-teleport-select-piece" | "wizard-teleport-select-dest"
  | "sorceress-sleep-select" | "sorceress-teleport-select"
  | "executioner-axe-swing" | "super-queen-second-move"
  | "mage-sacrifice-pending" | "mystic-king-morph-select";

export interface GameStateX12 {
  board: BoardX12; currentTurn: PlayerColorX12;
  turnOrder: PlayerColorX12[];
  eliminatedPlayers: PlayerColorX12[];
  capturedBy: Record<PlayerColorX12, PieceX12[]>;
  selectedSquare: SquareX12 | null; validMoves: SquareX12[];
  superMoves: SquareX12[]; superMoveMode: boolean;
  // Paladin Reverse Castle — same ability as the 8x8-family Paladin (Classic
  // 8x8 / X-8x8): squares adjacent to the selected paladin occupied by a
  // friendly non-paladin piece it may swap places with. Not present in
  // Classic 12x12, added here to match the X-board Paladin's full kit.
  castleMoves: SquareX12[];
  status: "playing" | "finished"; winner: PlayerColorX12 | null;
  lastMove: { from: SquareX12; to: SquareX12 } | null;
  check: PlayerColorX12 | null;
  specialMode: SpecialModeX12; specialData: any;
  wishDiceResult: number | null; turnMovesLeft: number;
  pendingAxeSquare: SquareX12 | null; spellMessage: string | null;
  lastMoveQuality: "great" | "risky" | "normal" | null;
  justEliminated: PlayerColorX12 | null;
}

export const SIZE = 24;
export const ARM = 6;
// The center 12x12 block every arm opens onto.
export const CENTER_LO = 6;
export const CENTER_HI = 17;

export const TURN_ORDER: PlayerColorX12[] = ["white", "grey", "black", "golden"];

// ─── BOARD SHAPE ────────────────────────────────────────────────────────────
// Valid cells are the whole 24x24 grid MINUS the four 6x6 corner blocks —
// i.e. everywhere except where both the row and the column fall outside the
// center band [6,17]. Four 12-wide x 6-deep arms all sharing one 12x12
// center — the same silhouette as the 8x8 X Board, scaled up.
export function inPlayAreaX12(r: number, c: number): boolean {
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
  const rowOutsideCenter = r < CENTER_LO || r > CENTER_HI;
  const colOutsideCenter = c < CENTER_LO || c > CENTER_HI;
  return !(rowOutsideCenter && colOutsideCenter);
}

export const sqX12Eq = (a: SquareX12, b: SquareX12) => a.row === b.row && a.col === b.col;

export function cloneBoardX12(b: BoardX12): BoardX12 {
  return b.map(row => row.map(cell => cell ? { ...cell } : null));
}

export function cloneStateX12(s: GameStateX12): GameStateX12 {
  return {
    ...s, board: cloneBoardX12(s.board),
    turnOrder: [...s.turnOrder],
    eliminatedPlayers: [...s.eliminatedPlayers],
    capturedBy: {
      white: [...s.capturedBy.white], black: [...s.capturedBy.black],
      golden: [...s.capturedBy.golden], grey: [...s.capturedBy.grey],
    },
    validMoves: [...s.validMoves],
    superMoves: [...s.superMoves],
    castleMoves: [...s.castleMoves],
    specialData: s.specialData ? { ...s.specialData } : null,
  };
}

// ─── PIECE ART ────────────────────────────────────────────────────────────
// public/pieces-12x12 has white/black/grey/brown folders. white & black ship
// suffixed art (" White"/" black"). grey ships suffixed art too, but is
// MISSING Cavalier Prince / Elven Archer / Mage-Princess — the board
// component falls back to the unsuffixed "brown" art (golden's own folder)
// for those three so a grey piece is never a broken image. brown is the
// folder "golden" (the 4th X-board color) renders from.
export function pieceFileNameX12(type: PieceTypeX12, color: PlayerColorX12): string {
  const table: Record<PlayerColorX12, Partial<Record<PieceTypeX12, string>>> = {
    white: {
      "mystic-king": "Mystic King White", "super-queen": "Super Queen White",
      "dragon": "Dragon White", "gargoyle": "Gargoyle White",
      "wizard": "Wizard White", "sorceress": "Sorceress White",
      "super-knight": "Super Knight White", "assassin": "Assassin White",
      "executioner": "Executioner White", "cavalier": "Cavalier Prince White",
      "mage": "Mage-Princess White", "elvin-archer": "Elven Archer White",
      "paladin": "Paladin - White",
    },
    black: {
      "mystic-king": "Mystic King black", "super-queen": "Super Queen black",
      "dragon": "Dragon black", "gargoyle": "Gargoyle black",
      "wizard": "Wizard black", "sorceress": "Sorceress black",
      "super-knight": "Super Knight Black", "assassin": "Assassin black",
      "executioner": "Executioner black", "cavalier": "Cavalier Prince Black",
      "mage": "Mage-Princess Black", "elvin-archer": "Elven Archer Black",
      "paladin": "Paladin - Black",
    },
    grey: {
      "mystic-king": "Mystic King Gray", "super-queen": "Super Queen Gray",
      "dragon": "Dragon Gray", "gargoyle": "Gargoyle Gray",
      "wizard": "Wizard Gray", "sorceress": "Sorceress Gray",
      "super-knight": "Super Knight Gray", "assassin": "Assassin Gray",
      "executioner": "Executioner Gray", "paladin": "Paladin Gray",
      // No Cavalier/Elven Archer/Mage art shipped for grey — caller falls
      // back to the golden (brown) folder for these via pieceImagePathX12Fallback.
    },
    golden: {
      "mystic-king": "Mystic King", "super-queen": "Super Queen",
      "dragon": "Dragon", "gargoyle": "Gargoyle",
      "wizard": "Wizard", "sorceress": "Sorceress",
      "super-knight": "Super Knight", "assassin": "Assassin",
      "executioner": "Executioner", "cavalier": "Cavalier Prince",
      "mage": "Mage-Princess", "elvin-archer": "Elven Archer",
      "paladin": "Paladin",
    },
  };
  return table[color][type] ?? table.golden[type]!;
}
export function pieceFolderX12(color: PlayerColorX12): string {
  return color === "golden" ? "brown" : color;
}
export function pieceImagePathX12(p: PieceX12): string {
  return `/pieces-12x12/${pieceFolderX12(p.color)}/${pieceFileNameX12(p.type, p.color)}.png`;
}
// Fallback path used on <img onError> — golden's (brown) unsuffixed art,
// which ships the complete 13-piece set, so a piece is never left broken.
export function pieceImageFallbackPathX12(p: PieceX12): string {
  return `/pieces-12x12/brown/${pieceFileNameX12(p.type, "golden")}.png`;
}

// ─── BOARD SETUP ─────────────────────────────────────────────────────────────
function mkP12(type: PieceTypeX12, color: PlayerColorX12, id: string): PieceX12 {
  return {
    id, type, color, hasMoved: false, paladanSuperUsed: false, superKnightJumpsLeft: 2,
    sorceressSpellsLeft: 3, sorceressDead: false, sleepRoundsLeft: 0,
    isEthereal: type === "wizard" || type === "sorceress",
    executionerAxeUsed: false,
    superQueenDoubleJumpDone: false, mageSacrificed: false,
  };
}

const BACK: PieceTypeX12[] = [
  "executioner", "assassin", "super-knight", "dragon", "sorceress", "super-queen",
  "mystic-king", "wizard", "gargoyle", "super-knight", "assassin", "executioner",
];
const FRONT: PieceTypeX12[] = [
  "elvin-archer", "cavalier", "mage", "paladin", "paladin", "paladin",
  "paladin", "paladin", "paladin", "mage", "cavalier", "elvin-archer",
];

export function createInitialBoardX12(): BoardX12 {
  const b: BoardX12 = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));

  // Top (white): back row = row 0, front row = row 1, cols 6-17.
  BACK.forEach((t, i) => { const col = CENTER_LO + i; b[0][col] = mkP12(t, "white", `white-${t}-${i}`); });
  FRONT.forEach((t, i) => { const col = CENTER_LO + i; b[1][col] = mkP12(t, "white", `white-f-${t}-${i}`); });

  // Bottom (black): back row = row 23, front row = row 22, cols 6-17.
  BACK.forEach((t, i) => { const col = CENTER_LO + i; b[SIZE - 1][col] = mkP12(t, "black", `black-${t}-${i}`); });
  FRONT.forEach((t, i) => { const col = CENTER_LO + i; b[SIZE - 2][col] = mkP12(t, "black", `black-f-${t}-${i}`); });

  // Left (golden): back col = col 0, front col = col 1, rows 6-17.
  BACK.forEach((t, i) => { const row = CENTER_LO + i; b[row][0] = mkP12(t, "golden", `golden-${t}-${i}`); });
  FRONT.forEach((t, i) => { const row = CENTER_LO + i; b[row][1] = mkP12(t, "golden", `golden-f-${t}-${i}`); });

  // Right (grey): back col = col 23, front col = col 22, rows 6-17.
  BACK.forEach((t, i) => { const row = CENTER_LO + i; b[row][SIZE - 1] = mkP12(t, "grey", `grey-${t}-${i}`); });
  FRONT.forEach((t, i) => { const row = CENTER_LO + i; b[row][SIZE - 2] = mkP12(t, "grey", `grey-f-${t}-${i}`); });

  return b;
}

export function createInitialGameStateX12(): GameStateX12 {
  return {
    board: createInitialBoardX12(),
    currentTurn: TURN_ORDER[0],
    turnOrder: [...TURN_ORDER],
    eliminatedPlayers: [],
    capturedBy: { white: [], black: [], golden: [], grey: [] },
    selectedSquare: null, validMoves: [],
    superMoves: [], superMoveMode: false,
    castleMoves: [],
    status: "playing", winner: null,
    lastMove: null, check: null,
    specialMode: null, specialData: null,
    wishDiceResult: null, turnMovesLeft: 1,
    pendingAxeSquare: null, spellMessage: null,
    lastMoveQuality: null, justEliminated: null,
  };
}

// ─── MOVE GENERATION — identical piece patterns to rules-12x12.ts, bounded by
// the cross-shaped play area instead of a fixed 12x12 box ───────────────────
const ALL8: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
const ST4:  [number, number][] = [[-1,0],[1,0],[0,-1],[0,1]];
const KJ:   [number, number][] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

function slide(b: BoardX12, r: number, c: number, dirs: [number,number][], color: PlayerColorX12): SquareX12[] {
  const m: SquareX12[] = [];
  for (const [dr, dc] of dirs) {
    let rr = r + dr, cc = c + dc;
    while (inPlayAreaX12(rr, cc)) {
      const t = b[rr][cc];
      if (!t) { m.push({ row: rr, col: cc }); }
      else { if (t.color !== color) m.push({ row: rr, col: cc }); break; }
      rr += dr; cc += dc;
    }
  }
  return m;
}

function lj(b: BoardX12, r: number, c: number, color: PlayerColorX12): SquareX12[] {
  return KJ.map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
    .filter(s => inPlayAreaX12(s.row, s.col) && b[s.row][s.col]?.color !== color);
}

function os(b: BoardX12, r: number, c: number, color: PlayerColorX12): SquareX12[] {
  return ALL8.map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
    .filter(s => inPlayAreaX12(s.row, s.col) && b[s.row][s.col]?.color !== color);
}

function dd(m: SquareX12[]): SquareX12[] {
  const s = new Set<string>();
  return m.filter(q => {
    const k = `${q.row},${q.col}`;
    if (s.has(k)) return false;
    s.add(k); return true;
  });
}

// Wizard & Sorceress are ethereal: they slide any direction, but can only
// ever capture another Wizard/Sorceress — regular pieces block their path
// like a wall without ever being killable by them.
function etherealSlide(b: BoardX12, r: number, c: number, color: PlayerColorX12): SquareX12[] {
  const m: SquareX12[] = [];
  for (const [dr, dc] of ALL8) {
    let rr = r + dr, cc = c + dc;
    while (inPlayAreaX12(rr, cc)) {
      const t = b[rr][cc];
      if (!t) { m.push({ row: rr, col: cc }); }
      else { if (t.color !== color && (t.type === "wizard" || t.type === "sorceress")) m.push({ row: rr, col: cc }); break; }
      rr += dr; cc += dc;
    }
  }
  return m;
}

export function getRawMovesX12(b: BoardX12, r: number, c: number): SquareX12[] {
  const p = b[r][c]; if (!p || p.sleepRoundsLeft > 0) return [];
  const { type, color } = p; let m: SquareX12[] = [];
  switch (type) {
    case "mystic-king":  m = [...lj(b,r,c,color), ...os(b,r,c,color)]; break;
    case "super-queen":  m = slide(b,r,c,ALL8,color); break;
    case "dragon":
      m = [...slide(b,r,c,ALL8,color), ...os(b,r,c,color), ...lj(b,r,c,color).filter(s => b[s.row][s.col] && b[s.row][s.col]!.color !== color)];
      break;
    case "gargoyle":
      for (const [dr, dc] of ALL8)
        for (const d of [1, 2]) {
          const rr = r + dr * d, cc = c + dc * d;
          if (inPlayAreaX12(rr, cc) && b[rr][cc]?.color !== color) m.push({ row: rr, col: cc });
        }
      break;
    case "wizard":
    case "sorceress":
      m = etherealSlide(b,r,c,color);
      break;
    case "super-knight": m = lj(b,r,c,color); break;
    case "assassin":     m = [...slide(b,r,c,ALL8,color), ...lj(b,r,c,color), ...os(b,r,c,color)]; break;
    case "executioner":  m = slide(b,r,c,ST4,color); break;
    case "cavalier":     m = [...lj(b,r,c,color), ...os(b,r,c,color)]; break;
    case "mage":         m = slide(b,r,c,ALL8,color); break;
    case "elvin-archer": m = [...slide(b,r,c,ALL8,color), ...lj(b,r,c,color), ...os(b,r,c,color)]; break;
    case "paladin":
      m = [...os(b,r,c,color)];
      break;
  }
  if (type !== "wizard" && type !== "sorceress") {
    m = m.filter(s => {
      const t = b[s.row][s.col];
      return !(t && (t.type === "wizard" || t.type === "sorceress"));
    });
  }
  return dd(m);
}

// ─── PALADIN SUPER MOVE (one-time 3-square surprise attack) ──────────────────
export function getPaladinSuperMovesX12(b: BoardX12, r: number, c: number): SquareX12[] {
  const p = b[r][c];
  if (!p || p.type !== "paladin" || p.paladanSuperUsed) return [];
  const m: SquareX12[] = [];
  for (const [dr, dc] of ALL8) {
    const rr = r + dr * 3, cc = c + dc * 3;
    if (inPlayAreaX12(rr, cc) && b[rr][cc]?.color !== p.color) m.push({ row: rr, col: cc });
  }
  return m.filter(s => {
    const t = b[s.row][s.col];
    return !(t && (t.type === "wizard" || t.type === "sorceress"));
  });
}

export function findKingX12(b: BoardX12, color: PlayerColorX12): SquareX12 | null {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (b[r][c]?.type === "mystic-king" && b[r][c]?.color === color) return { row: r, col: c };
  return null;
}

export function isKingInCheckX12(b: BoardX12, color: PlayerColorX12, active: PlayerColorX12[]): boolean {
  const k = findKingX12(b, color);
  if (!k) return false;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = b[r][c];
    if (p && p.color !== color && active.includes(p.color)) {
      if (getRawMovesX12(b, r, c).some(m => sqX12Eq(m, k))) return true;
      if (p.type === "paladin" && getPaladinSuperMovesX12(b, r, c).some(m => sqX12Eq(m, k))) return true;
    }
  }
  return false;
}

export function getLegalMovesX12(b: BoardX12, row: number, col: number, active: PlayerColorX12[]): SquareX12[] {
  const p = b[row][col];
  if (!p) return [];
  return getRawMovesX12(b, row, col).filter(to => {
    const t = cloneBoardX12(b);
    t[to.row][to.col] = t[row][col];
    t[row][col] = null;
    return !isKingInCheckX12(t, p.color, active);
  });
}

export function getLegalPaladinSuperMovesX12(b: BoardX12, row: number, col: number, active: PlayerColorX12[]): SquareX12[] {
  const p = b[row][col];
  if (!p) return [];
  return getPaladinSuperMovesX12(b, row, col).filter(to => {
    const t = cloneBoardX12(b);
    t[to.row][to.col] = t[row][col];
    t[row][col] = null;
    return !isKingInCheckX12(t, p.color, active);
  });
}

// ─── PALADIN REVERSE CASTLE ─────────────────────────────────────────────────
// Same ability as the 8x8-family Paladin (Classic 8x8 / X-8x8): a paladin
// adjacent to a friendly non-paladin piece may swap places with it (in any
// of the 8 directions), letting that piece "defend" the paladin. Classic
// 12x12 doesn't have this move — added here so the X-board Paladin carries
// its full kit (Normal move + Super Move + Reverse Castle).
export function getCastleMovesX12(b: BoardX12, row: number, col: number): SquareX12[] {
  const piece = b[row][col];
  if (!piece || piece.type !== "paladin") return [];
  const moves: SquareX12[] = [];
  ALL8.forEach(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    if (!inPlayAreaX12(r, c)) return;
    const ally = b[r][c];
    if (ally && ally.color === piece.color && ally.type !== "paladin") moves.push({ row: r, col: c });
  });
  return moves;
}

// ─── MOVE QUALITY EVALUATOR ──────────────────────────────────────────────────
function evaluateMoveQualityX12(
  board: BoardX12, from: SquareX12, to: SquareX12,
  piece: PieceX12, captured: PieceX12 | null, newBoard: BoardX12,
  active: PlayerColorX12[]
): "great" | "risky" | "normal" {
  let score = 0;
  const pieceValues: Record<PieceTypeX12, number> = {
    "mystic-king":10, "super-queen":9, "dragon":8, "gargoyle":7, "sorceress":7,
    "wizard":6, "assassin":6, "elvin-archer":5, "super-knight":5, "executioner":5,
    "cavalier":4, "mage":4, "paladin":2,
  };

  if (captured) score += pieceValues[captured.type] * 2;

  for (const enemy of active) {
    if (enemy !== piece.color && isKingInCheckX12(newBoard, enemy, active)) score += 5;
  }

  if (isKingInCheckX12(newBoard, piece.color, active)) score -= 8;

  if (piece.type === "mystic-king") {
    const enemies = active.filter(c => c !== piece.color);
    let threatened = 0;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const ep = newBoard[r][c];
      if (ep && enemies.includes(ep.color)) {
        if (getRawMovesX12(newBoard, r, c).some(m => sqX12Eq(m, to))) threatened++;
      }
    }
    if (threatened > 1) score -= 6;
  }

  if (pieceValues[piece.type] >= 6) {
    const enemies = active.filter(c => c !== piece.color);
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const ep = newBoard[r][c];
      if (ep && enemies.includes(ep.color)) {
        if (getRawMovesX12(newBoard, r, c).some(m => sqX12Eq(m, to))) { score -= 3; break; }
      }
    }
  }
  return score >= 6 ? "great" : score <= -6 ? "risky" : "normal";
}

// ─── FIND PIECES ─────────────────────────────────────────────────────────────
export function findSorceressX12(b: BoardX12, c: PlayerColorX12): SquareX12 | null {
  for (let r = 0; r < SIZE; r++)
    for (let cc = 0; cc < SIZE; cc++)
      if (b[r][cc]?.type === "sorceress" && b[r][cc]?.color === c) return { row: r, col: cc };
  return null;
}

export function findWizardX12(b: BoardX12, c: PlayerColorX12): SquareX12 | null {
  for (let r = 0; r < SIZE; r++)
    for (let cc = 0; cc < SIZE; cc++)
      if (b[r][cc]?.type === "wizard" && b[r][cc]?.color === c) return { row: r, col: cc };
  return null;
}

// ─── SPELLS — identical mechanics to rules-12x12.ts ──────────────────────────
export function applySleepSpellX12(b: BoardX12, tSq: SquareX12, sSq: SquareX12): BoardX12 {
  const nb = cloneBoardX12(b);
  const t = nb[tSq.row][tSq.col], s = nb[sSq.row][sSq.col];
  if (!t || !s) return nb;
  nb[tSq.row][tSq.col] = { ...t, sleepRoundsLeft: 3 };
  const ns = s.sorceressSpellsLeft - 1;
  if (ns <= 0) nb[sSq.row][sSq.col] = null;
  else nb[sSq.row][sSq.col] = { ...s, sorceressSpellsLeft: ns };
  return nb;
}

export function applyTeleportSpellX12(b: BoardX12, pSq: SquareX12, dSq: SquareX12, sSq: SquareX12): BoardX12 {
  const nb = cloneBoardX12(b);
  const p = nb[pSq.row][pSq.col], s = nb[sSq.row][sSq.col];
  if (!p || !s) return nb;
  nb[dSq.row][dSq.col] = p;
  nb[pSq.row][pSq.col] = null;
  const ns = s.sorceressSpellsLeft - 1;
  if (ns <= 0) nb[sSq.row][sSq.col] = null;
  else nb[sSq.row][sSq.col] = { ...s, sorceressSpellsLeft: ns };
  return nb;
}

export function rollWishDiceX12(): number { return Math.floor(Math.random() * 10) + 1; }

export function applyWizardTeleportX12(b: BoardX12, pSq: SquareX12, dSq: SquareX12): BoardX12 {
  const nb = cloneBoardX12(b);
  const p = nb[pSq.row][pSq.col];
  if (!p) return nb;
  nb[dSq.row][dSq.col] = p;
  nb[pSq.row][pSq.col] = null;
  return nb;
}

export function getAxeSwingSquaresX12(b: BoardX12, r: number, c: number, color: PlayerColorX12): SquareX12[] {
  return [{ row: r, col: c-1 }, { row: r, col: c+1 }, { row: r-1, col: c }, { row: r+1, col: c }]
    .filter(s => inPlayAreaX12(s.row, s.col) && b[s.row][s.col] !== null && b[s.row][s.col]!.color !== color);
}

export function applyMageSacrificeX12(b: BoardX12, mSq: SquareX12, qSq: SquareX12): BoardX12 {
  const nb = cloneBoardX12(b);
  const q = nb[qSq.row][qSq.col];
  if (!q || q.type !== "super-queen") return nb;
  nb[mSq.row][mSq.col] = null;
  nb[qSq.row][qSq.col] = { ...q, superQueenDoubleJumpDone: false };
  return nb;
}

export function tickSleepX12(b: BoardX12, color: PlayerColorX12): BoardX12 {
  const nb = cloneBoardX12(b);
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const p = nb[r][c];
      if (p && p.color === color && p.sleepRoundsLeft > 0)
        nb[r][c] = { ...p, sleepRoundsLeft: p.sleepRoundsLeft - 1 };
    }
  return nb;
}

// ─── MYSTIC KING'S LAST WISH (Wizard morph) ──────────────────────────────────
export function applyKingMorphX12(b: BoardX12, kingSq: SquareX12, wizardSq: SquareX12, newType: PieceTypeX12): BoardX12 {
  const nb = cloneBoardX12(b);
  const king = nb[kingSq.row][kingSq.col];
  if (!king || king.type !== "mystic-king") return nb;
  nb[wizardSq.row][wizardSq.col] = null;
  nb[kingSq.row][kingSq.col] = {
    ...king, type: newType, isEthereal: newType === "wizard" || newType === "sorceress",
  };
  return nb;
}

// ─── WIN CHECK — ALL PIECES ELIMINATED ───────────────────────────────────────
// Same rule as Classic 12x12: capturing the King is just a normal capture. A
// player is eliminated only once every one of their pieces is gone; the last
// kingdom left standing wins.
function countPiecesX12(board: BoardX12, color: PlayerColorX12): number {
  let n = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c]?.color === color) n++;
  return n;
}

// eliminatedPlayers is always recomputed against the FULL original
// TURN_ORDER (never against the already-shrunk turnOrder) so it's idempotent
// and self-correcting on every call — a color eliminated on move N can't
// silently "come back" because a later call only compared against a partial
// list. Winner is declared only once exactly one player remains — a single
// quit (or several sequential quits) among 4 never finishes the match early.
function getRemainingPlayersX12(board: BoardX12, turnOrder: PlayerColorX12[]): PlayerColorX12[] {
  return turnOrder.filter(c => countPiecesX12(board, c) > 0);
}

// ─── ADVANCE TURN ────────────────────────────────────────────────────────────
export function advanceTurnX12(state: GameStateX12): GameStateX12 {
  let ns = cloneStateX12(state);
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null;
  ns.pendingAxeSquare = null; ns.selectedSquare = null; ns.validMoves = [];
  ns.superMoves = []; ns.superMoveMode = false; ns.castleMoves = [];
  ns.wishDiceResult = null;

  const remainingPlayers = getRemainingPlayersX12(ns.board, ns.turnOrder);
  ns.eliminatedPlayers = TURN_ORDER.filter(c => !remainingPlayers.includes(c));
  ns.justEliminated = ns.eliminatedPlayers.find(c => !state.eliminatedPlayers.includes(c)) ?? null;

  if (remainingPlayers.length === 1) {
    ns.status = "finished";
    ns.winner = remainingPlayers[0];
    ns.currentTurn = remainingPlayers[0];
    return ns;
  }
  ns.turnOrder = remainingPlayers;
  ns.status = "playing";

  const idx = ns.turnOrder.indexOf(ns.currentTurn);
  const nextIdx = (idx + 1) % ns.turnOrder.length;
  ns.currentTurn = ns.turnOrder[nextIdx];
  ns.turnMovesLeft = 1;

  ns.board = tickSleepX12(ns.board, ns.currentTurn);

  const hasSorc = findSorceressX12(ns.board, ns.currentTurn) !== null;
  if (hasSorc) ns.turnMovesLeft = 2;

  ns.check = null;
  for (const player of ns.turnOrder) {
    if (isKingInCheckX12(ns.board, player, ns.turnOrder)) {
      ns.check = player;
      break;
    }
  }

  return ns;
}

// ─── EXECUTE MOVE ────────────────────────────────────────────────────────────
export function executeMoveX12(state: GameStateX12, from: SquareX12, to: SquareX12): GameStateX12 {
  let ns = cloneStateX12(state);
  const board = ns.board;
  const piece = board[from.row][from.col]!;
  const target = board[to.row][to.col];
  ns.justEliminated = null;

  if (target) {
    ns.capturedBy[piece.color].push(target);

    if (target.type === "sorceress") {
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) {
          const p = board[r][c];
          if (p && p.type === "super-queen" && p.color === target.color)
            board[r][c] = { ...p, sorceressDead: true };
        }
    }
  }

  const newBoardPreview = cloneBoardX12(board);
  newBoardPreview[to.row][to.col] = piece;
  newBoardPreview[from.row][from.col] = null;
  const quality = evaluateMoveQualityX12(board, from, to, piece, target, newBoardPreview, ns.turnOrder);
  ns.lastMoveQuality = quality;

  const isPS = piece.type === "paladin" && !piece.paladanSuperUsed &&
    (Math.abs(to.row - from.row) > 1 || Math.abs(to.col - from.col) > 1);

  board[to.row][to.col] = { ...piece, hasMoved: true, paladanSuperUsed: isPS ? true : piece.paladanSuperUsed, executionerAxeUsed: false };
  board[from.row][from.col] = null;
  ns.lastMove = { from, to };
  ns.selectedSquare = null; ns.validMoves = [];
  ns.superMoves = []; ns.superMoveMode = false; ns.castleMoves = [];
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null; ns.wishDiceResult = null;

  const remainingPlayers = getRemainingPlayersX12(ns.board, ns.turnOrder);
  ns.eliminatedPlayers = TURN_ORDER.filter(c => !remainingPlayers.includes(c));
  ns.justEliminated = ns.eliminatedPlayers.find(c => !state.eliminatedPlayers.includes(c)) ?? null;
  if (remainingPlayers.length === 1) {
    ns.status = "finished";
    ns.winner = remainingPlayers[0];
    ns.currentTurn = remainingPlayers[0];
    return ns;
  }
  ns.turnOrder = remainingPlayers;
  ns.status = "playing";

  if (piece.type === "executioner") {
    const ax = getAxeSwingSquaresX12(board, to.row, to.col, piece.color);
    if (ax.length > 0) {
      ns.pendingAxeSquare = to;
      ns.specialMode = "executioner-axe-swing";
      ns.spellMessage = "Executioner: Click adjacent enemy to swing axe, or elsewhere to skip.";
      return ns;
    }
  }

  if (piece.type === "super-queen" && !piece.sorceressDead && ns.turnMovesLeft > 1) {
    ns.turnMovesLeft = ns.turnMovesLeft - 1;
    ns.specialMode = "super-queen-second-move";
    ns.spellMessage = "Super Queen can move again!";
    ns.selectedSquare = to;
    ns.validMoves = getLegalMovesX12(board, to.row, to.col, ns.turnOrder);
    return ns;
  }

  return advanceTurnX12(ns);
}

// ─── PALADIN REVERSE CASTLE (execute) ────────────────────────────────────────
export function executeCastleX12(state: GameStateX12, from: SquareX12, to: SquareX12): GameStateX12 {
  const ns = cloneStateX12(state);
  const board = ns.board;
  const paladin = board[from.row][from.col];
  const ally = board[to.row][to.col];
  if (!paladin || paladin.type !== "paladin" || !ally || ally.type === "paladin" || ally.color !== paladin.color) {
    return state;
  }

  board[from.row][from.col] = { ...ally, hasMoved: true };
  board[to.row][to.col] = { ...paladin, hasMoved: true };

  ns.lastMove = { from, to };
  ns.selectedSquare = null; ns.validMoves = []; ns.superMoves = []; ns.castleMoves = [];
  ns.superMoveMode = false; ns.specialMode = null; ns.specialData = null; ns.spellMessage = null; ns.wishDiceResult = null;
  ns.status = "playing";

  return advanceTurnX12(ns);
}

export function applyAxeSwingX12(state: GameStateX12, tSq: SquareX12): GameStateX12 {
  let ns = cloneStateX12(state);
  const board = ns.board;
  const t = board[tSq.row][tSq.col];
  if (!t) return advanceTurnX12(ns);
  ns.capturedBy[ns.currentTurn].push(t);
  board[tSq.row][tSq.col] = null;

  const remainingPlayers = getRemainingPlayersX12(ns.board, ns.turnOrder);
  ns.eliminatedPlayers = TURN_ORDER.filter(c => !remainingPlayers.includes(c));
  ns.justEliminated = ns.eliminatedPlayers.find(c => !state.eliminatedPlayers.includes(c)) ?? null;
  if (remainingPlayers.length === 1) {
    ns.status = "finished";
    ns.winner = remainingPlayers[0];
    ns.currentTurn = remainingPlayers[0];
    return ns;
  }
  ns.turnOrder = remainingPlayers;
  ns.status = "playing";
  return advanceTurnX12(ns);
}

// ─── QUIT (elimination) ───────────────────────────────────────────────────────
// A quitting player's whole army is removed from the board and they're
// marked eliminated. The match continues among whoever's left, and only
// declares a winner once exactly one player remains — one quit (or several
// sequential quits) among 4 never finishes the match early.
export function quitPlayerX12(state: GameStateX12, color: PlayerColorX12): GameStateX12 {
  const ns = cloneStateX12(state);
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (ns.board[r][c]?.color === color) ns.board[r][c] = null;
  }
  ns.selectedSquare = null; ns.validMoves = []; ns.superMoves = []; ns.castleMoves = [];
  ns.superMoveMode = false; ns.specialMode = null; ns.specialData = null;
  ns.spellMessage = null; ns.pendingAxeSquare = null; ns.wishDiceResult = null;

  const wasCurrent = ns.currentTurn === color;
  const oldOrder = ns.turnOrder;
  const quitterIdx = oldOrder.indexOf(color);

  // Only the quitter is removed here — countPiecesX12(color) is now 0 for
  // them alone, so getRemainingPlayersX12 drops exactly that one color and
  // everyone else with pieces still on the board stays active.
  const remainingPlayers = getRemainingPlayersX12(ns.board, ns.turnOrder);
  ns.eliminatedPlayers = TURN_ORDER.filter(c => !remainingPlayers.includes(c));
  ns.justEliminated = ns.eliminatedPlayers.find(c => !state.eliminatedPlayers.includes(c)) ?? null;
  ns.turnOrder = remainingPlayers;

  if (remainingPlayers.length === 1) {
    ns.status = "finished";
    ns.winner = remainingPlayers[0];
    ns.currentTurn = remainingPlayers[0];
    return ns;
  }

  ns.status = "playing";
  if (wasCurrent && quitterIdx !== -1) {
    // Walk forward from the quitter's old slot in the ORIGINAL rotation
    // order until hitting a color that's still active.
    for (let step = 1; step <= oldOrder.length; step++) {
      const candidate = oldOrder[(quitterIdx + step) % oldOrder.length];
      if (ns.turnOrder.includes(candidate)) { ns.currentTurn = candidate; break; }
    }
  }
  return ns;
}
