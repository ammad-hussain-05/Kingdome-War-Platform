export type PlayerColor16 = "white" | "black";

export type PieceType16 =
  | "mystic-king" | "super-queen" | "wizard" | "sorceress" | "conjurer" | "warlock"
  | "trickster" | "dragon" | "gargoyle" | "thief" | "super-knight" | "elvin-archer"
  | "executioner" | "assassin" | "cavalier" | "mage" | "paladin"
  | "archer" | "aerobat-assassin" | "berserker";

export interface Piece16 {
  id: string;
  type: PieceType16;
  color: PlayerColor16;
  hasMoved: boolean;
  // Paladin
  paladanSuperUsed: boolean;
  // Super Knight
  superKnightJumpsLeft: number;
  // Sorceress
  sorceressSpellsLeft: number;
  sorceressDead: boolean;
  // Sleep
  sleepRoundsLeft: number;
  // Ethereal pieces
  isEthereal: boolean;
  // Executioner
  executionerAxeUsed: boolean;
  // Super Queen
  superQueenDoubleJumpDone: boolean;
  // Mage
  mageSacrificed: boolean;
  // Thief
  thiefStealUsed: boolean;
  // Trickster last-stand countdown tracking
  tricksterMovesCount: number;
  // Conjurer
  conjurerSpellsLeft: number;
  // Conjurer's one-time Shadow Spell (summons the Berserker) — wholly
  // separate from conjurerSpellsLeft (the revive spell's charge count).
  conjurerShadowSpellUsed: boolean;
  // Berserker — one-time crowd/rampage attack (cleaves through 2 adjacent
  // aligned enemies in a single strike).
  berserkerRampageUsed: boolean;
  // Bound (from Warlock)
  boundRoundsLeft: number;
}

export interface Square16 { row: number; col: number; }
export type Board16 = (Piece16 | null)[][];

export type SpecialMode16 =
  | null
  | "wizard-teleport-select-piece" | "wizard-teleport-select-dest"
  | "trickster-teleport-select-piece" | "trickster-teleport-select-dest"
  | "sorceress-sleep-select" | "sorceress-teleport-select"
  | "executioner-axe-swing"
  | "super-queen-second-move"
  | "conjurer-revive-select"
  | "thief-steal-jump"
  | "mage-sacrifice-pending"
  | "warlock-bind-offer"
  | "berserker-rampage-mode";

export interface GameState16 {
  board: Board16;
  currentTurn: PlayerColor16;
  turnOrder: PlayerColor16[];
  eliminatedPlayers: PlayerColor16[];
  // Keyed by PlayerColor16 rather than a literal "white"|"black" so a future
  // 3rd/4th player color slots into this record without further changes here.
  capturedBy: Record<PlayerColor16, Piece16[]>;
  selectedSquare: Square16 | null;
  validMoves: Square16[];
  // Paladin Super Move (one-time 3-square surprise attack) — kept wholly
  // separate from validMoves so it never appears as a normal move option.
  superMoves: Square16[];
  superMoveMode: boolean;
  // Paladin Reverse Castle — squares adjacent to the selected paladin
  // occupied by a friendly non-paladin piece it can swap places with.
  castleMoves: Square16[];
  status: "playing" | "finished";
  winner: PlayerColor16 | null;
  lastMove: { from: Square16; to: Square16 } | null;
  check: PlayerColor16 | null;
  specialMode: SpecialMode16;
  specialData: any;
  wishDiceResult: number | null;
  turnMovesLeft: number;
  pendingAxeSquare: Square16 | null;
  spellMessage: string | null;
  lastMoveQuality: "great" | "risky" | "normal" | null;
  justEliminated: PlayerColor16 | null;
  // Warlock bind — all enemy pieces frozen
  boundPlayers: PlayerColor16[];
  // Trickster game-over countdown
  tricksterAliveCount: Record<string, number>;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export const sq16Eq = (a: Square16, b: Square16) => a.row === b.row && a.col === b.col;
export const inB16 = (r: number, c: number) => r >= 0 && r < 16 && c >= 0 && c < 16;

export function cloneBoard16(b: Board16): Board16 {
  return b.map(row => row.map(cell => cell ? { ...cell } : null));
}

export function cloneState16(s: GameState16): GameState16 {
  return {
    ...s,
    board: cloneBoard16(s.board),
    turnOrder: [...s.turnOrder],
    eliminatedPlayers: [...s.eliminatedPlayers],
    capturedBy: { white: [...s.capturedBy.white], black: [...s.capturedBy.black] },
    validMoves: [...s.validMoves],
    superMoves: [...s.superMoves],
    castleMoves: [...s.castleMoves],
    specialData: s.specialData ? { ...s.specialData } : null,
    boundPlayers: [...s.boundPlayers],
    tricksterAliveCount: { ...s.tricksterAliveCount },
  };
}

export function pieceImagePath16(p: Piece16): string {
  const folder = p.color;
  const suffix = p.color === "white" ? "White" : "Black";
  
const nm: Record<PieceType16, string> = {
  "mystic-king":      p.color === "white" ? "Mystic King White" : "Mystic King black",
  "super-queen":      p.color === "white" ? "Super Queen White" : "Super Queen black",
  "dragon":           p.color === "white" ? "Dragon White" : "Dragon black",
  "gargoyle":         p.color === "white" ? "Gargoyle White" : "Gargoyle black",
  "wizard":           p.color === "white" ? "Wizard White" : "Wizard black",
  "sorceress":        p.color === "white" ? "Sorceress White" : "Sorceress black",
  "executioner":      p.color === "white" ? "Executioner White" : "Executioner black",
  "assassin":         p.color === "white" ? "Assassin White" : "Assassin black",
  "super-knight":     p.color === "white" ? "Super Knight White" : "Super Knight Black",
  "elvin-archer":     p.color === "white" ? "Elven Archer White" : "Elven Archer Black",
  "conjurer":         p.color === "white" ? "Conjuror - White" : "Conjuror - Black",
  "warlock":          p.color === "white" ? "Warlock - White" : "Warlock - Black",
  "trickster":        p.color === "white" ? "Trickster - White" : "Trickster - Black",
  "aerobat-assassin": p.color === "white" ? "Aerobat Assassin - White" : "Aerobat Assassin - Black",
  "cavalier":         p.color === "white" ? "Cavalier Prince White" : "Cavalier Prince Black",
  "mage":             p.color === "white" ? "Mage-Princess White" : "Mage-Princess Black",
  "paladin":          p.color === "white" ? "Paladin - White" : "Paladin - Black",
  "archer":           p.color === "white" ? "Archer White" : "Archer Black",
  "thief":            p.color === "white" ? "Thief White" : "Thief Black",
  "berserker":        p.color === "white" ? "Beserker-White" : "Beserker-Black",
};
  return `/pieces-16x16/${folder}/${nm[p.type]}.png`;
}
// ─── BOARD SETUP ─────────────────────────────────────────────────────────────
function mkP16(type: PieceType16, color: PlayerColor16, id: string): Piece16 {
  return {
    id, type, color,
    hasMoved: false,
    paladanSuperUsed: false,
    superKnightJumpsLeft: 2,
    sorceressSpellsLeft: 3,
    sorceressDead: false,
    sleepRoundsLeft: 0,
    isEthereal: ["wizard","sorceress","conjurer","warlock","trickster"].includes(type),
    executionerAxeUsed: false,
    superQueenDoubleJumpDone: false,
    mageSacrificed: false,
    thiefStealUsed: false,
    tricksterMovesCount: 0,
    conjurerSpellsLeft: 1,
    conjurerShadowSpellUsed: false,
    berserkerRampageUsed: false,
    boundRoundsLeft: 0,
  };
}

// Back row: 16 pieces
const BACK16: PieceType16[] = [
  "executioner","elvin-archer","super-knight","conjurer","trickster",
  "gargoyle","sorceress","super-queen","mystic-king","wizard","dragon",
  "thief","warlock","super-knight","elvin-archer","executioner"
];

// Front row: 16 pieces
const FRONT16: PieceType16[] = [
  "archer","assassin","aerobat-assassin","cavalier","mage",
  "paladin","paladin","paladin","paladin","paladin","paladin",
  "mage","cavalier","aerobat-assassin","assassin","archer"
];

export function createInitialBoard16(): Board16 {
  const b: Board16 = Array(16).fill(null).map(() => Array(16).fill(null));
  // Black — top
  BACK16.forEach((t, c)  => { b[0][c]  = mkP16(t, "black", `k-b${c}`); });
  FRONT16.forEach((t, c) => { b[1][c]  = mkP16(t, "black", `k-f${c}`); });
  // White — bottom
  BACK16.forEach((t, c)  => { b[15][c] = mkP16(t, "white", `w-b${c}`); });
  FRONT16.forEach((t, c) => { b[14][c] = mkP16(t, "white", `w-f${c}`); });
  return b;
}

export function createInitialGameState16(): GameState16 {
  return {
    board: createInitialBoard16(),
    currentTurn: "white",
    turnOrder: ["white", "black"],
    eliminatedPlayers: [],
    capturedBy: { white: [], black: [] },
    selectedSquare: null,
    validMoves: [],
    superMoves: [],
    superMoveMode: false,
    castleMoves: [],
    status: "playing",
    winner: null,
    lastMove: null,
    check: null,
    specialMode: null,
    specialData: null,
    wishDiceResult: null,
    turnMovesLeft: 1,
    pendingAxeSquare: null,
    spellMessage: null,
    lastMoveQuality: null,
    justEliminated: null,
    boundPlayers: [],
    tricksterAliveCount: { white: 0, black: 0 },
  };
}

// ─── MOVE GENERATION ─────────────────────────────────────────────────────────
const ALL8_16: [number,number][] = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
const ST4_16:  [number,number][] = [[-1,0],[1,0],[0,-1],[0,1]];
const KJ_16:   [number,number][] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

function slide16(b: Board16, r: number, c: number, dirs: [number,number][], color: PlayerColor16): Square16[] {
  const m: Square16[] = [];
  for (const [dr, dc] of dirs) {
    let rr = r + dr, cc = c + dc;
    while (inB16(rr, cc)) {
      const t = b[rr][cc];
      if (!t) { m.push({ row: rr, col: cc }); }
      else {
        // Ethereal pieces: can't capture humans, only other ethereals
        const movingPiece = b[r][c]!;
        if (movingPiece.isEthereal) {
          if (t.isEthereal && t.color !== color) m.push({ row: rr, col: cc });
        } else {
          if (t.color !== color) m.push({ row: rr, col: cc });
        }
        break;
      }
      rr += dr; cc += dc;
    }
  }
  return m;
}

function lj16(b: Board16, r: number, c: number, color: PlayerColor16): Square16[] {
  return KJ_16
    .map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
    .filter(s => inB16(s.row, s.col) && b[s.row][s.col]?.color !== color);
}

function os16(b: Board16, r: number, c: number, color: PlayerColor16): Square16[] {
  return ALL8_16
    .map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
    .filter(s => inB16(s.row, s.col) && b[s.row][s.col]?.color !== color);
}

function dd16(m: Square16[]): Square16[] {
  const s = new Set<string>();
  return m.filter(q => {
    const k = `${q.row},${q.col}`;
    if (s.has(k)) return false;
    s.add(k); return true;
  });
}

export function getRawMoves16(b: Board16, r: number, c: number): Square16[] {
  const p = b[r][c];
  if (!p || p.sleepRoundsLeft > 0 || p.boundRoundsLeft > 0) return [];
  const { type, color } = p;
  let m: Square16[] = [];

  switch (type) {
    case "mystic-king":
      m = [...lj16(b,r,c,color), ...os16(b,r,c,color)];
      break;

    case "super-queen":
      m = slide16(b,r,c,ALL8_16,color);
      break;

    case "dragon":
      // Base slide + 1-square special attack (claws/fire/tail, like a
      // Paladin) shared with the Gargoyle, plus the Dragon-exclusive
      // fly-over-own-pieces strike (L-shape).
      m = [...slide16(b,r,c,ALL8_16,color), ...os16(b,r,c,color)];
      KJ_16.forEach(([dr,dc]) => {
        const sq = { row: r+dr, col: c+dc };
        if (inB16(sq.row,sq.col) && b[sq.row][sq.col] && b[sq.row][sq.col]!.color !== color)
          m.push(sq);
      });
      break;

    case "gargoyle":
      // Wing/Tail Attack (1 square) + Fire Attack (2 squares), any of the 8
      // directions, every turn — no unlimited slide, no one-time limit.
      for (const [dr, dc] of ALL8_16)
        for (const d of [1, 2]) {
          const rr = r + dr * d, cc = c + dc * d;
          if (inB16(rr, cc) && b[rr][cc]?.color !== color) m.push({ row: rr, col: cc });
        }
      break;

    case "wizard":
      // Ethereal — slides any dir, only kills other ethereal pieces.
      for (const [dr,dc] of ALL8_16) {
        let rr = r+dr, cc = c+dc;
        while (inB16(rr,cc)) {
          const t = b[rr][cc];
          if (!t) { m.push({ row:rr, col:cc }); }
          else {
            if (t.color !== color && t.isEthereal)
              m.push({ row:rr, col:cc });
            break;
          }
          rr+=dr; cc+=dc;
        }
      }
      break;

    case "sorceress":
      // Ethereal — in the privileged pair with the Wizard, so (like the
      // Wizard) can kill any other ethereal piece.
      for (const [dr,dc] of ALL8_16) {
        let rr = r+dr, cc = c+dc;
        while (inB16(rr,cc)) {
          const t = b[rr][cc];
          if (!t) { m.push({ row:rr, col:cc }); }
          else {
            if (t.color !== color && t.isEthereal)
              m.push({ row:rr, col:cc });
            break;
          }
          rr+=dr; cc+=dc;
        }
      }
      break;

    case "conjurer":
    case "warlock":
      // Ethereal, but NOT part of the Wizard/Sorceress pair — the reference
      // says "only a wizard or sorceress can kill a wizard or sorceress",
      // so these two can kill other ethereals but never a Wizard/Sorceress.
      for (const [dr,dc] of ALL8_16) {
        let rr = r+dr, cc = c+dc;
        while (inB16(rr,cc)) {
          const t = b[rr][cc];
          if (!t) { m.push({ row:rr, col:cc }); }
          else {
            if (t.color !== color && t.isEthereal && t.type !== "wizard" && t.type !== "sorceress")
              m.push({ row:rr, col:cc });
            break;
          }
          rr+=dr; cc+=dc;
        }
      }
      break;

    case "trickster":
      // Ethereal — slides any dir, only kills trickster/conjurer/wizard/sorceress/warlock
      for (const [dr,dc] of ALL8_16) {
        let rr = r+dr, cc = c+dc;
        while (inB16(rr,cc)) {
          const t = b[rr][cc];
          if (!t) { m.push({ row:rr, col:cc }); }
          else {
            if (t.color !== color && t.isEthereal) m.push({ row:rr, col:cc });
            break;
          }
          rr+=dr; cc+=dc;
        }
      }
      break;

    case "thief":
      m = slide16(b,r,c,ALL8_16,color);
      break;

    case "berserker":
      // Unlimited slide, any direction — a non-ethereal piece, so slide16
      // already lets it capture both mortal AND ethereal targets (the
      // ethereal-restriction branch only applies when the MOVING piece is
      // ethereal). The wizard/sorceress kill-immunity below is separately
      // waived for this type — the Berserker's unique combat exception.
      m = slide16(b,r,c,ALL8_16,color);
      break;

    case "super-knight":
      m = lj16(b,r,c,color);
      break;

    case "elvin-archer":
      // Any dir unlimited + L-shape + 1 any dir
      m = [...slide16(b,r,c,ALL8_16,color), ...lj16(b,r,c,color), ...os16(b,r,c,color)];
      break;

    case "archer":
      m = slide16(b,r,c,ALL8_16,color);
      break;

    case "executioner":
      m = slide16(b,r,c,ST4_16,color);
      break;

    case "assassin":
      m = [...slide16(b,r,c,ALL8_16,color), ...lj16(b,r,c,color), ...os16(b,r,c,color)];
      break;

    case "aerobat-assassin":
      // Like assassin but jumps over ANY piece for L-move
      m = [...slide16(b,r,c,ALL8_16,color), ...os16(b,r,c,color)];
      KJ_16.forEach(([dr,dc]) => {
        const sq = { row:r+dr, col:c+dc };
        if (inB16(sq.row,sq.col) && b[sq.row][sq.col]?.color !== color) m.push(sq);
      });
      break;

    case "cavalier":
      m = [...lj16(b,r,c,color), ...os16(b,r,c,color)];
      break;

    case "mage":
      m = slide16(b,r,c,ALL8_16,color);
      break;

    case "paladin":
      // Normal move/kill: 1 square any direction, every turn — nothing
      // more. The 3-square Super Move is a wholly separate, one-time
      // ability (see getPaladinSuperMoves16 below); it is never part of
      // the piece's regular move list. Matches the 12x12 Paladin rules.
      m = [...os16(b,r,c,color)];
      break;
  }

  // Only a Wizard or Sorceress may kill a Wizard or Sorceress — every other
  // piece (including non-ethereal humans and the lesser ethereals like
  // Conjurer/Warlock/Trickster, whose own cases already narrow this) treats
  // an enemy Wizard/Sorceress square as untouchable. The Berserker is the
  // sole exception — its unique combat rule lets it kill BOTH mortal and
  // immortal/ethereal pieces without restriction.
  if (type !== "wizard" && type !== "sorceress" && type !== "berserker") {
    m = m.filter(s => {
      const t = b[s.row][s.col];
      return !(t && (t.type === "wizard" || t.type === "sorceress"));
    });
  }

  return dd16(m);
}

// ─── PALADIN SUPER MOVE (one-time 3-square surprise attack) ──────────────────
// Wholly separate from getRawMoves16/getLegalMoves16 — never merged into the
// piece's regular move list. Only offered once per Paladin (paladanSuperUsed
// gates it), and only via its own selection path in the UI.
export function getPaladinSuperMoves16(b: Board16, r: number, c: number): Square16[] {
  const p = b[r][c];
  if (!p || p.type !== "paladin" || p.paladanSuperUsed) return [];
  const m: Square16[] = [];
  for (const [dr, dc] of ALL8_16) {
    const rr = r + dr * 3, cc = c + dc * 3;
    if (inB16(rr, cc) && b[rr][cc]?.color !== p.color) m.push({ row: rr, col: cc });
  }
  // Only a Wizard or Sorceress may kill a Wizard or Sorceress — same
  // protection as every other piece's regular move list.
  return m.filter(s => {
    const t = b[s.row][s.col];
    return !(t && (t.type === "wizard" || t.type === "sorceress"));
  });
}

// ─── PALADIN REVERSE CASTLE ────────────────────────────────────────────────
// A paladin adjacent to a friendly non-paladin piece may swap places with it
// (in any of the 8 directions), letting that piece "defend" the paladin.
// Mirrors getCastleMoves in rules-8x8.ts exactly — no check-safety filtering,
// same as that reference implementation.
export function getCastleMoves16(board: Board16, row: number, col: number): Square16[] {
  const piece = board[row][col];
  if (!piece || piece.type !== "paladin") return [];
  const moves: Square16[] = [];
  for (const [dr, dc] of ALL8_16) {
    const r = row + dr, c = col + dc;
    if (!inB16(r, c)) continue;
    const ally = board[r][c];
    if (ally && ally.color === piece.color && ally.type !== "paladin") moves.push({ row: r, col: c });
  }
  return moves;
}

export function getLegalCastleMoves16(board: Board16, row: number, col: number): Square16[] {
  return getCastleMoves16(board, row, col);
}

export function findKing16(b: Board16, color: PlayerColor16): Square16 | null {
  for (let r = 0; r < 16; r++)
    for (let c = 0; c < 16; c++)
      if (b[r][c]?.type === "mystic-king" && b[r][c]?.color === color)
        return { row: r, col: c };
  return null;
}

export function isKingInCheck16(b: Board16, color: PlayerColor16, active: PlayerColor16[]): boolean {
  const k = findKing16(b, color);
  if (!k) return false;
  for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
    const p = b[r][c];
    if (p && p.color !== color && active.includes(p.color)) {
      if (getRawMoves16(b, r, c).some(m => sq16Eq(m, k))) return true;
      if (p.type === "paladin" && getPaladinSuperMoves16(b, r, c).some(m => sq16Eq(m, k))) return true;
    }
  }
  return false;
}

export function getLegalMoves16(b: Board16, row: number, col: number, active: PlayerColor16[]): Square16[] {
  const p = b[row][col];
  if (!p) return [];
  return getRawMoves16(b, row, col).filter(to => {
    const t = cloneBoard16(b);
    t[to.row][to.col] = t[row][col];
    t[row][col] = null;
    return !isKingInCheck16(t, p.color, active);
  });
}

export function getLegalPaladinSuperMoves16(b: Board16, row: number, col: number, active: PlayerColor16[]): Square16[] {
  const p = b[row][col];
  if (!p) return [];
  return getPaladinSuperMoves16(b, row, col).filter(to => {
    const t = cloneBoard16(b);
    t[to.row][to.col] = t[row][col];
    t[row][col] = null;
    return !isKingInCheck16(t, p.color, active);
  });
}

// ─── MOVE QUALITY ────────────────────────────────────────────────────────────
function evaluateMoveQuality16(
  board: Board16, from: Square16, to: Square16,
  piece: Piece16, captured: Piece16 | null,
  newBoard: Board16, active: PlayerColor16[]
): "great" | "risky" | "normal" {
  let score = 0;
  const pv: Record<PieceType16, number> = {
    "mystic-king":10,"super-queen":9,"dragon":8,"gargoyle":7,"sorceress":7,
    "wizard":6,"warlock":6,"conjurer":6,"trickster":6,"thief":5,"berserker":8,
    "assassin":6,"elvin-archer":5,"aerobat-assassin":5,"super-knight":5,
    "executioner":5,"cavalier":4,"mage":4,"paladin":2,"archer":4,
  };

  if (captured) score += pv[captured.type] * 2;

  for (const enemy of active) {
    if (enemy !== piece.color && isKingInCheck16(newBoard, enemy, active)) score += 5;
  }

  if (isKingInCheck16(newBoard, piece.color, active)) score -= 8;

  if (piece.type === "mystic-king") {
    const enemies = active.filter(c => c !== piece.color);
    let threatened = 0;
    for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
      const ep = newBoard[r][c];
      if (ep && enemies.includes(ep.color)) {
        if (getRawMoves16(newBoard, r, c).some(m => sq16Eq(m, to))) threatened++;
      }
    }
    if (threatened > 1) score -= 6;
  }

  if (pv[piece.type] >= 6) {
    const enemies = active.filter(c => c !== piece.color);
    for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
      const ep = newBoard[r][c];
      if (ep && enemies.includes(ep.color)) {
        if (getRawMoves16(newBoard, r, c).some(m => sq16Eq(m, to))) { score -= 3; break; }
      }
    }
  }
  return score >= 6 ? "great" : score <= -6 ? "risky" : "normal";
}

// ─── FIND HELPERS ─────────────────────────────────────────────────────────────
export function findSorceress16(b: Board16, c: PlayerColor16): Square16 | null {
  for (let r = 0; r < 16; r++)
    for (let cc = 0; cc < 16; cc++)
      if (b[r][cc]?.type === "sorceress" && b[r][cc]?.color === c) return { row:r, col:cc };
  return null;
}
export function findWizard16(b: Board16, c: PlayerColor16): Square16 | null {
  for (let r = 0; r < 16; r++)
    for (let cc = 0; cc < 16; cc++)
      if (b[r][cc]?.type === "wizard" && b[r][cc]?.color === c) return { row:r, col:cc };
  return null;
}
export function findConjurer16(b: Board16, c: PlayerColor16): Square16 | null {
  for (let r = 0; r < 16; r++)
    for (let cc = 0; cc < 16; cc++)
      if (b[r][cc]?.type === "conjurer" && b[r][cc]?.color === c) return { row:r, col:cc };
  return null;
}

// ─── SPELLS ──────────────────────────────────────────────────────────────────
export function applySleepSpell16(b: Board16, tSq: Square16, sSq: Square16): Board16 {
  const nb = cloneBoard16(b);
  const t = nb[tSq.row][tSq.col], s = nb[sSq.row][sSq.col];
  if (!t || !s) return nb;
  nb[tSq.row][tSq.col] = { ...t, sleepRoundsLeft: 3 };
  const ns = s.sorceressSpellsLeft - 1;
  if (ns <= 0) nb[sSq.row][sSq.col] = null;
  else nb[sSq.row][sSq.col] = { ...s, sorceressSpellsLeft: ns };
  return nb;
}

export function applyTeleportSpell16(b: Board16, pSq: Square16, dSq: Square16, sSq: Square16): Board16 {
  const nb = cloneBoard16(b);
  const p = nb[pSq.row][pSq.col], s = nb[sSq.row][sSq.col];
  if (!p || !s) return nb;
  nb[dSq.row][dSq.col] = p;
  nb[pSq.row][pSq.col] = null;
  const ns = s.sorceressSpellsLeft - 1;
  if (ns <= 0) nb[sSq.row][sSq.col] = null;
  else nb[sSq.row][sSq.col] = { ...s, sorceressSpellsLeft: ns };
  return nb;
}

export function rollWishDice16(): number { return Math.floor(Math.random() * 10) + 1; }

export function applyWizardTeleport16(b: Board16, pSq: Square16, dSq: Square16): Board16 {
  const nb = cloneBoard16(b);
  const p = nb[pSq.row][pSq.col];
  if (!p) return nb;
  nb[dSq.row][dSq.col] = p;
  nb[pSq.row][pSq.col] = null;
  return nb;
}

// Conjurer revives 1 dead piece
export function applyConjurerRevive16(b: Board16, piece: Piece16, dSq: Square16, cSq: Square16): Board16 {
  const nb = cloneBoard16(b);
  const conjurer = nb[cSq.row][cSq.col];
  if (!conjurer) return nb;
  nb[dSq.row][dSq.col] = { ...piece, id: `revived-${Date.now()}` };
  nb[cSq.row][cSq.col] = { ...conjurer, conjurerSpellsLeft: conjurer.conjurerSpellsLeft - 1 };
  return nb;
}

// Warlock binds every OTHER active player's pieces for 1 round (not just a
// single hardcoded opposite color, so this keeps working if turnOrder ever
// has 3-4 active players instead of exactly 2). Only reachable via the
// "warlock-bind-offer" special mode, which executeMove16 only opens right
// after the Warlock completes a move — "he must make one move to do the
// spell." Unlimited uses across the game — the reference states no
// per-game cap, only the move prerequisite.
export function applyWarlockBind16(state: GameState16, warlockColor: PlayerColor16): GameState16 {
  const ns = cloneState16(state);
  const enemies = ns.turnOrder.filter(c => c !== warlockColor);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
    const p = ns.board[r][c];
    if (p && enemies.includes(p.color)) ns.board[r][c] = { ...p, boundRoundsLeft: 1 };
  }
  for (const enemy of enemies) if (!ns.boundPlayers.includes(enemy)) ns.boundPlayers.push(enemy);
  ns.spellMessage = enemies.length > 1
    ? `⛓️ Warlock bound ALL enemy pieces for 1 round!`
    : `⛓️ Warlock bound ALL ${enemies[0]} pieces for 1 round!`;
  return ns;
}

// Thief triple jump steal
export function getAxeSwingSquares16(b: Board16, r: number, c: number, color: PlayerColor16): Square16[] {
  return [{ row:r, col:c-1 },{ row:r, col:c+1 },{ row:r-1, col:c },{ row:r+1, col:c }]
    .filter(s => inB16(s.row,s.col) && b[s.row][s.col] !== null && b[s.row][s.col]!.color !== color);
}

export function applyMageSacrifice16(b: Board16, mSq: Square16, qSq: Square16): Board16 {
  const nb = cloneBoard16(b);
  const q = nb[qSq.row][qSq.col];
  if (!q || q.type !== "super-queen") return nb;
  nb[mSq.row][mSq.col] = null;
  nb[qSq.row][qSq.col] = { ...q, sorceressDead: false, superQueenDoubleJumpDone: false };
  return nb;
}

export function tickSleep16(b: Board16, color: PlayerColor16): Board16 {
  const nb = cloneBoard16(b);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
    const p = nb[r][c];
    if (p && p.color === color && p.sleepRoundsLeft > 0)
      nb[r][c] = { ...p, sleepRoundsLeft: p.sleepRoundsLeft - 1 };
    if (p && p.color === color && p.boundRoundsLeft > 0)
      nb[r][c] = { ...p, boundRoundsLeft: p.boundRoundsLeft - 1 };
  }
  return nb;
}

// ─── WIN CHECK — ALL PIECES ELIMINATED ───────────────────────────────────────
// Win condition: ALL enemy pieces eliminated (king capture does NOT end game)
export function checkAllEliminated16(board: Board16, color: PlayerColor16): boolean {
  for (let r = 0; r < 16; r++)
    for (let c = 0; c < 16; c++)
      if (board[r][c]?.color === color) return false;
  return true; // no pieces left = eliminated
}

// Recomputes who still has pieces on the board, updates turnOrder/
// eliminatedPlayers/justEliminated accordingly, and declares a winner only
// once exactly one player remains — correct for 2 players today and for any
// future 3-4 player expansion (never assumes "the other" player automatically
// wins just because one player was eliminated).
function applyEliminationCheck16(ns: GameState16): GameState16 {
  const remaining = ns.turnOrder.filter(c => !checkAllEliminated16(ns.board, c));
  const newlyEliminated = ns.turnOrder.filter(c => !remaining.includes(c));
  if (newlyEliminated.length > 0) {
    ns.eliminatedPlayers = [...ns.eliminatedPlayers, ...newlyEliminated];
    ns.justEliminated = newlyEliminated[0];
  }
  ns.turnOrder = remaining;
  if (remaining.length <= 1) {
    ns.status = "finished";
    ns.winner = remaining[0] ?? null;
    ns.currentTurn = ns.winner ?? ns.currentTurn;
  }
  return ns;
}

// ─── ADVANCE TURN ─────────────────────────────────────────────────────────────
export function advanceTurn16(state: GameState16): GameState16 {
  let ns = cloneState16(state);
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null;
  ns.pendingAxeSquare = null; ns.selectedSquare = null; ns.validMoves = [];
  ns.superMoves = []; ns.superMoveMode = false; ns.castleMoves = [];
  ns.justEliminated = null;
  // A resolved (or abandoned) Wish dice roll must never survive a turn
  // transition — otherwise handleClick's "a dice roll is awaiting
  // Confirm/End Turn" guard blocks the board forever for both players.
  ns.wishDiceResult = null;

  // Trickster last-stand: the countdown only runs once a player's Trickster
  // is their ONLY remaining piece. If the opponent hasn't killed it within
  // 10 further turns, the whole board resets to the starting position
  // (same players/turn order) rather than anyone winning outright.
  for (const color of ns.turnOrder) {
    let aliveCount = 0, onlyPieceIsTrickster = false;
    for (let r = 0; r < 16; r++) for (let c2 = 0; c2 < 16; c2++) {
      const p = ns.board[r][c2];
      if (p && p.color === color) {
        aliveCount++;
        onlyPieceIsTrickster = p.type === "trickster";
      }
    }
    const lastStand = aliveCount === 1 && onlyPieceIsTrickster;

    if (lastStand) {
      const count = (ns.tricksterAliveCount[color] || 0) + 1;
      ns.tricksterAliveCount[color] = count;
      if (count > 10) {
        const fresh = createInitialGameState16();
        fresh.turnOrder = [...ns.turnOrder];
        fresh.currentTurn = ns.turnOrder[0];
        fresh.spellMessage = `⏳ ${color}'s Trickster survived as the last piece for 10 rounds — the board has been reset!`;
        return fresh;
      }
    } else {
      ns.tricksterAliveCount[color] = 0;
    }
  }

  ns = applyEliminationCheck16(ns);
  if (ns.status === "finished") return ns;

  // Tick down sleep/bound rounds for the player whose turn is ENDING, not
  // the one about to start. Ticking the incoming player instead (the old
  // behavior) decremented a fresh boundRoundsLeft:1 to 0 before that
  // player's frozen turn ever happened, so Bind never actually blocked
  // anyone — this is what makes "1 round" mean one full skipped turn.
  const outgoing = ns.currentTurn;
  const idx = ns.turnOrder.indexOf(ns.currentTurn);
  const nextIdx = (idx + 1) % ns.turnOrder.length;
  ns.currentTurn = ns.turnOrder[nextIdx];
  ns.turnMovesLeft = 1;

  ns.board = tickSleep16(ns.board, outgoing);

  // Remove expired bound players
  ns.boundPlayers = ns.boundPlayers.filter(bp => {
    let stillBound = false;
    for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
      if (ns.board[r][c]?.color === bp && ns.board[r][c]!.boundRoundsLeft > 0) { stillBound = true; break; }
    }
    return stillBound;
  });

  // Super queen double move if sorceress alive
  const hasSorc = findSorceress16(ns.board, ns.currentTurn) !== null;
  if (hasSorc) ns.turnMovesLeft = 2;

  ns.check = null;
  for (const player of ns.turnOrder) {
    if (isKingInCheck16(ns.board, player, ns.turnOrder)) { ns.check = player; break; }
  }

  return ns;
}

// ─── EXECUTE MOVE ─────────────────────────────────────────────────────────────
export function executeMove16(state: GameState16, from: Square16, to: Square16): GameState16 {
  let ns = cloneState16(state);
  const board = ns.board;
  const piece = board[from.row][from.col]!;
  const target = board[to.row][to.col];
  ns.justEliminated = null;

  if (target) {
    ns.capturedBy[piece.color].push(target);

    // King captured — NOT game over, just another piece captured
    // Game ends only when ALL pieces of a player are gone

    if (target.type === "sorceress") {
      for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
        const p = board[r][c];
        if (p && p.type === "super-queen" && p.color === target.color)
          board[r][c] = { ...p, sorceressDead: true };
      }
    }
  }

  const newBoardPreview = cloneBoard16(board);
  newBoardPreview[to.row][to.col] = piece;
  newBoardPreview[from.row][from.col] = null;
  const quality = evaluateMoveQuality16(board, from, to, piece, target, newBoardPreview, ns.turnOrder);
  ns.lastMoveQuality = quality;

  // Paladin super move check
  const isPS = piece.type === "paladin" && !piece.paladanSuperUsed &&
    (Math.abs(to.row - from.row) > 1 || Math.abs(to.col - from.col) > 1);

  // Trickster move count
  let updatedPiece = {
    ...piece,
    hasMoved: true,
    paladanSuperUsed: isPS ? true : piece.paladanSuperUsed,
    executionerAxeUsed: false,
    tricksterMovesCount: piece.type === "trickster" ? piece.tricksterMovesCount + 1 : piece.tricksterMovesCount,
  };

  board[to.row][to.col] = updatedPiece;
  board[from.row][from.col] = null;
  ns.lastMove = { from, to };
  ns.selectedSquare = null; ns.validMoves = [];
  ns.superMoves = []; ns.superMoveMode = false; ns.castleMoves = [];
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null; ns.wishDiceResult = null;

  ns = applyEliminationCheck16(ns);
  if (ns.status === "finished") return ns;

  // Executioner axe swing
  if (piece.type === "executioner") {
    const ax = getAxeSwingSquares16(board, to.row, to.col, piece.color);
    if (ax.length > 0) {
      ns.pendingAxeSquare = to;
      ns.specialMode = "executioner-axe-swing";
      ns.spellMessage = "⚔️ Executioner: Click adjacent enemy to swing axe, or elsewhere to skip.";
      return ns;
    }
  }

  // Warlock Bind — "he must make one move to do the spell": Bind is only
  // offered right after the Warlock completes a normal move, never as a
  // stand-alone anytime action.
  if (piece.type === "warlock") {
    const hasEnemies = ns.turnOrder.some(c => c !== piece.color);
    if (hasEnemies) {
      ns.specialMode = "warlock-bind-offer";
      ns.spellMessage = "⛓️ Cast Bind on all enemy pieces, or skip.";
      return ns;
    }
  }

  // Super queen second move
  if (piece.type === "super-queen" && !piece.sorceressDead && ns.turnMovesLeft > 1) {
    ns.turnMovesLeft = ns.turnMovesLeft - 1;
    ns.specialMode = "super-queen-second-move";
    ns.spellMessage = "👑 Super Queen can move again!";
    ns.selectedSquare = to;
    ns.validMoves = getLegalMoves16(board, to.row, to.col, ns.turnOrder);
    return ns;
  }

  return advanceTurn16(ns);
}

// ─── PALADIN REVERSE CASTLE (execute) ───────────────────────────────────────
// Mirrors executeCastle in rules-8x8.ts: swap the paladin and the ally in
// place, mark both as moved, then end the turn via the engine's own
// advanceTurn16 (which handles elimination/check/sleep-tick/turn-order —
// unlike 8x8's simpler white/black toggle).
export function executeCastle16(state: GameState16, from: Square16, to: Square16): GameState16 {
  let ns = cloneState16(state);
  const board = ns.board;
  const paladin = board[from.row][from.col];
  const ally = board[to.row][to.col];
  if (!paladin || paladin.type !== "paladin" || !ally || ally.type === "paladin" || ally.color !== paladin.color) {
    return state;
  }

  board[from.row][from.col] = { ...ally, hasMoved: true };
  board[to.row][to.col] = { ...paladin, hasMoved: true };

  ns.lastMove = { from, to };
  ns.lastMoveQuality = null;
  ns.selectedSquare = null; ns.validMoves = [];
  ns.superMoves = []; ns.superMoveMode = false; ns.castleMoves = [];
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null; ns.wishDiceResult = null;

  return advanceTurn16(ns);
}

export function applyAxeSwing16(state: GameState16, tSq: Square16): GameState16 {
  let ns = cloneState16(state);
  const board = ns.board;
  const t = board[tSq.row][tSq.col];
  if (!t) return advanceTurn16(ns);
  ns.capturedBy[ns.currentTurn].push(t);
  // Axe swing kills whatever it hits — including a King — as a normal
  // capture only. It does not eliminate the player by itself.
  board[tSq.row][tSq.col] = null;
  ns = applyEliminationCheck16(ns);
  if (ns.status === "finished") return ns;
  return advanceTurn16(ns);
}

// Thief steal — jumps over anyone (triple jump) to steal a piece, once per
// game. The Thief ends up occupying the stolen piece's square ("must remain
// where he stole that character"); the stolen piece simply disappears.
export function applyThiefSteal16(state: GameState16, from: Square16, targetSq: Square16): GameState16 {
  const ns = cloneState16(state);
  const board = ns.board;
  const thief = board[from.row][from.col];
  const target = board[targetSq.row][targetSq.col];
  if (!thief || !target) return ns;

  ns.capturedBy[thief.color].push(target);
  board[targetSq.row][targetSq.col] = { ...thief, thiefStealUsed: true, hasMoved: true };
  board[from.row][from.col] = null;
  ns.lastMove = { from, to: targetSq };
  ns.spellMessage = `🗝️ Thief stole the ${target.type}!`;
  return advanceTurn16(ns);
}

// Thief's steal reaches 2-3 squares in any direction, ignoring blockers
// (mirrors the Paladin's super-attack reach), once per game.
export function getThiefStealTargets16(b: Board16, r: number, c: number, color: PlayerColor16): Square16[] {
  const p = b[r][c];
  if (!p || p.type !== "thief" || p.thiefStealUsed || p.sleepRoundsLeft > 0 || p.boundRoundsLeft > 0) return [];
  const targets: Square16[] = [];
  for (const [dr, dc] of ALL8_16) {
    for (const d of [2, 3]) {
      const rr = r + dr * d, cc = c + dc * d;
      if (!inB16(rr, cc)) continue;
      const t = b[rr][cc];
      if (t && t.color !== color) targets.push({ row: rr, col: cc });
    }
  }
  return targets;
}

// Trickster teleport — "they also can teleport any character anywhere but
// must hit them to teleport them": a pure reposition tool (like the
// Wizard's teleport), usable on ANY piece — friend or foe — moved to any
// empty square. It is not a kill. Unlimited uses, per the reference.
export function applyTricksterTeleport16(b: Board16, pSq: Square16, dSq: Square16): Board16 {
  const nb = cloneBoard16(b);
  const p = nb[pSq.row][pSq.col];
  if (!p) return nb;
  nb[dSq.row][dSq.col] = p;
  nb[pSq.row][pSq.col] = null;
  return nb;
}

// ─── BERSERKER — special crowd/rampage attack (one-time) ─────────────────────
// Cleaves through exactly 2 adjacent, in-line enemy pieces in a single
// attack: the square immediately next to the Berserker ("mid") and the
// square directly beyond it on the same line ("far") must both be occupied
// by enemies. Both are eliminated and the Berserker ends up on "far" — a
// piercing charge, mirroring how the Thief ends up on the square it steals.
// Wholly separate from getRawMoves16/getLegalMoves16, exactly like the
// Paladin's one-time Super Move, so it never appears as a normal move.
export function getBerserkerRampageTargets16(b: Board16, r: number, c: number, color: PlayerColor16): { mid: Square16; far: Square16 }[] {
  const p = b[r][c];
  if (!p || p.type !== "berserker" || p.berserkerRampageUsed || p.sleepRoundsLeft > 0 || p.boundRoundsLeft > 0) return [];
  const out: { mid: Square16; far: Square16 }[] = [];
  for (const [dr, dc] of ALL8_16) {
    const midR = r + dr, midC = c + dc, farR = r + dr * 2, farC = c + dc * 2;
    if (!inB16(midR, midC) || !inB16(farR, farC)) continue;
    const mid = b[midR][midC], far = b[farR][farC];
    if (mid && far && mid.color !== color && far.color !== color) {
      out.push({ mid: { row: midR, col: midC }, far: { row: farR, col: farC } });
    }
  }
  return out;
}

export function getLegalBerserkerRampageTargets16(b: Board16, row: number, col: number, active: PlayerColor16[]): { mid: Square16; far: Square16 }[] {
  const p = b[row][col];
  if (!p) return [];
  return getBerserkerRampageTargets16(b, row, col, p.color).filter(({ mid, far }) => {
    const t = cloneBoard16(b);
    t[far.row][far.col] = t[row][col];
    t[row][col] = null;
    t[mid.row][mid.col] = null;
    return !isKingInCheck16(t, p.color, active);
  });
}

export function applyBerserkerRampage16(state: GameState16, from: Square16, mid: Square16, far: Square16): GameState16 {
  let ns = cloneState16(state);
  const board = ns.board;
  const piece = board[from.row][from.col];
  if (!piece || piece.type !== "berserker") return advanceTurn16(ns);
  const midTarget = board[mid.row][mid.col];
  const farTarget = board[far.row][far.col];
  if (midTarget) ns.capturedBy[piece.color].push(midTarget);
  if (farTarget) ns.capturedBy[piece.color].push(farTarget);
  board[mid.row][mid.col] = null;
  board[far.row][far.col] = { ...piece, berserkerRampageUsed: true, hasMoved: true };
  board[from.row][from.col] = null;
  ns.lastMove = { from, to: far };
  ns.selectedSquare = null; ns.validMoves = [];
  ns.superMoves = []; ns.superMoveMode = false;
  ns.specialMode = null; ns.specialData = null;
  ns = applyEliminationCheck16(ns);
  if (ns.status === "finished") return ns;
  return advanceTurn16(ns);
}

// ─── CONJURER — one-time Shadow Spell (summons the Berserker) ────────────────
// Finds the square directly in front of the Conjurer (toward the enemy side
// of the board — up for white, down for black). If that square is occupied
// or off the board, expands outward ring by ring from that point to find the
// nearest empty square, reusing the same inB16 bounds check as every other
// piece's placement logic. Never overwrites an occupied square.
export function findShadowSummonSquare16(b: Board16, conjSq: Square16, color: PlayerColor16): Square16 | null {
  const dr = color === "white" ? -1 : 1;
  const front = { row: conjSq.row + dr, col: conjSq.col };
  const start = inB16(front.row, front.col) ? front : conjSq;
  if (inB16(front.row, front.col) && !b[front.row][front.col]) return front;
  for (let radius = 1; radius <= 16; radius++) {
    const candidates: Square16[] = [];
    for (let dR = -radius; dR <= radius; dR++) {
      for (let dC = -radius; dC <= radius; dC++) {
        if (Math.max(Math.abs(dR), Math.abs(dC)) !== radius) continue;
        const rr = start.row + dR, cc = start.col + dC;
        if (inB16(rr, cc) && !b[rr][cc]) candidates.push({ row: rr, col: cc });
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, bq) => {
        const da = Math.abs(a.row - start.row) + Math.abs(a.col - start.col);
        const db = Math.abs(bq.row - start.row) + Math.abs(bq.col - start.col);
        if (da !== db) return da - db;
        if (a.row !== bq.row) return a.row - bq.row;
        return a.col - bq.col;
      });
      return candidates[0];
    }
  }
  return null;
}

// Summons the Berserker as a brand-new real game piece — never touches or
// removes any existing piece. Consumes the Conjurer's one-time Shadow Spell
// charge only on success; if no empty square exists anywhere (never happens
// in practice on a 16x16 board), the spell is left unconsumed.
export function applyShadowSummon16(b: Board16, conjSq: Square16): Board16 {
  const nb = cloneBoard16(b);
  const conjurer = nb[conjSq.row][conjSq.col];
  if (!conjurer || conjurer.type !== "conjurer" || conjurer.conjurerShadowSpellUsed) return nb;
  const dest = findShadowSummonSquare16(nb, conjSq, conjurer.color);
  if (!dest) return nb;
  nb[dest.row][dest.col] = mkP16("berserker", conjurer.color, `berserker-${conjurer.color}-${Date.now()}`);
  nb[conjSq.row][conjSq.col] = { ...conjurer, conjurerShadowSpellUsed: true };
  return nb;
}
