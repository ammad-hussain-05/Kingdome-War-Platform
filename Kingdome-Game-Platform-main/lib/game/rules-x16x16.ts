// ─── 16x16 X BOARD — 4-player cross-shaped board ──────────────────────────────
// Four Classic-16x16 "Empire" armies (Top / Right / Bottom / Left), each
// trimmed to their outer 16-wide x 8-deep strip (back rank + front rank + 6
// empty ranks), merged into one 32x32 grid with the four corner 8x8 blocks
// removed, leaving the same compact plus/cross silhouette as the 8x8 and
// 12x12 X Boards — just a bigger evolution of them — whose four arms all
// open onto a shared 16x16 center. Every piece type's movement, every spell
// (Wizard Teleport, Sorceress Sleep/Teleport/Wish, Conjurer Revive, Warlock
// Bind, Thief Steal, Trickster Teleport + last-stand reset, Mage Sacrifice),
// the Paladin Super Move, and elimination-only win/lose logic are copied
// verbatim in spirit from lib/game/rules-16x16.ts — only the board shape/size
// and the 2-player -> 4-player turn/elimination bookkeeping are new. No new
// abilities, and no rule changes, are introduced.

export type PieceTypeX16 =
  | "mystic-king" | "super-queen" | "wizard" | "sorceress" | "conjurer" | "warlock"
  | "trickster" | "dragon" | "gargoyle" | "thief" | "super-knight" | "elvin-archer"
  | "executioner" | "assassin" | "cavalier" | "mage" | "paladin"
  | "archer" | "aerobat-assassin";

// Matches lib/lobby/types.ts MODE_CONFIG["x-16x16"].colors (White/Black/Grey/
// Golden), same clockwise seating as the other X Boards: white=Top,
// grey=Right, black=Bottom, golden=Left.
export type PlayerColorX16 = "white" | "black" | "golden" | "grey";

export interface PieceX16 {
  id: string; type: PieceTypeX16; color: PlayerColorX16;
  hasMoved: boolean;
  paladanSuperUsed: boolean;
  superKnightJumpsLeft: number;
  sorceressSpellsLeft: number;
  sorceressDead: boolean;
  sleepRoundsLeft: number;
  isEthereal: boolean;
  executionerAxeUsed: boolean;
  superQueenDoubleJumpDone: boolean;
  mageSacrificed: boolean;
  thiefStealUsed: boolean;
  tricksterMovesCount: number;
  conjurerSpellsLeft: number;
  boundRoundsLeft: number;
}

export interface SquareX16 { row: number; col: number; }
export type BoardX16 = (PieceX16 | null)[][];

export type SpecialModeX16 =
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
  | "warlock-bind-target-select";

export interface GameStateX16 {
  board: BoardX16; currentTurn: PlayerColorX16;
  turnOrder: PlayerColorX16[];
  eliminatedPlayers: PlayerColorX16[];
  capturedBy: Record<PlayerColorX16, PieceX16[]>;
  selectedSquare: SquareX16 | null; validMoves: SquareX16[];
  superMoves: SquareX16[]; superMoveMode: boolean;
  // Paladin Reverse Castle — same ability as the 8x8/12x12-family Paladin:
  // squares adjacent to the selected paladin occupied by a friendly
  // non-paladin piece it may swap places with. Not present in Classic
  // 16x16, added here to match the X-board Paladin's full kit.
  castleMoves: SquareX16[];
  status: "playing" | "finished"; winner: PlayerColorX16 | null;
  lastMove: { from: SquareX16; to: SquareX16 } | null;
  check: PlayerColorX16 | null;
  specialMode: SpecialModeX16; specialData: any;
  wishDiceResult: number | null; turnMovesLeft: number;
  pendingAxeSquare: SquareX16 | null; spellMessage: string | null;
  lastMoveQuality: "great" | "risky" | "normal" | null;
  justEliminated: PlayerColorX16 | null;
  boundPlayers: PlayerColorX16[];
  tricksterAliveCount: Record<string, number>;
}

export const SIZE = 32;
export const ARM = 8;
// The center 16x16 block every arm opens onto.
export const CENTER_LO = 8;
export const CENTER_HI = 23;

export const TURN_ORDER: PlayerColorX16[] = ["white", "grey", "black", "golden"];

// ─── BOARD SHAPE ────────────────────────────────────────────────────────────
export function inPlayAreaX16(r: number, c: number): boolean {
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
  const rowOutsideCenter = r < CENTER_LO || r > CENTER_HI;
  const colOutsideCenter = c < CENTER_LO || c > CENTER_HI;
  return !(rowOutsideCenter && colOutsideCenter);
}

export const sqX16Eq = (a: SquareX16, b: SquareX16) => a.row === b.row && a.col === b.col;

export function cloneBoardX16(b: BoardX16): BoardX16 {
  return b.map(row => row.map(cell => cell ? { ...cell } : null));
}

export function cloneStateX16(s: GameStateX16): GameStateX16 {
  return {
    ...s, board: cloneBoardX16(s.board),
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
    boundPlayers: [...s.boundPlayers],
    tricksterAliveCount: { ...s.tricksterAliveCount },
  };
}

// ─── PIECE ART ────────────────────────────────────────────────────────────
// public/pieces-16x16 has white/black/grey/golden folders, each with its own
// naming convention. grey is missing a proper "Archer" asset (shipped as a
// stray "-Grey.png") — the board component falls back to the golden art for
// any piece whose own-color image 404s, so nothing ever renders broken.
export function pieceFileNameX16(type: PieceTypeX16, color: PlayerColorX16): string {
  const table: Record<PlayerColorX16, Partial<Record<PieceTypeX16, string>>> = {
    white: {
      "mystic-king": "Mystic King White", "super-queen": "Super Queen White",
      "dragon": "Dragon White", "gargoyle": "Gargoyle White",
      "wizard": "Wizard White", "sorceress": "Sorceress White",
      "executioner": "Executioner White", "assassin": "Assassin White",
      "super-knight": "Super Knight White", "elvin-archer": "Elven Archer White",
      "conjurer": "Conjuror - White", "warlock": "Warlock - White",
      "trickster": "Trickster - White", "aerobat-assassin": "Aerobat Assassin - White",
      "cavalier": "Cavalier Prince White", "mage": "Mage-Princess White",
      "paladin": "Paladin - White", "archer": "Archer White", "thief": "Thief White",
    },
    black: {
      "mystic-king": "Mystic King black", "super-queen": "Super Queen black",
      "dragon": "Dragon black", "gargoyle": "Gargoyle black",
      "wizard": "Wizard black", "sorceress": "Sorceress black",
      "executioner": "Executioner black", "assassin": "Assassin black",
      "super-knight": "Super Knight Black", "elvin-archer": "Elven Archer Black",
      "conjurer": "Conjuror - Black", "warlock": "Warlock - Black",
      "trickster": "Trickster - Black", "aerobat-assassin": "Aerobat Assassin - Black",
      "cavalier": "Cavalier Prince Black", "mage": "Mage-Princess Black",
      "paladin": "Paladin - Black", "archer": "Archer Black", "thief": "Thief Black",
    },
    grey: {
      "mystic-king": "Mystic King Gray", "super-queen": "Super Queen Gray",
      "dragon": "Dragon Gray", "gargoyle": "Gargoyle Gray",
      "wizard": "Wizard Gray", "sorceress": "Sorceress Gray",
      "executioner": "Executioner Gray", "assassin": "Assassin Gray",
      "super-knight": "Super Knight Gray", "elvin-archer": "Elven Archer Gray",
      "conjurer": "Conjuror - Silver", "warlock": "Warlock - Silver",
      "trickster": "Trickster - Silver", "aerobat-assassin": "Acrobat Assassin - Silver",
      "cavalier": "Cavalier Prince Gray", "mage": "Mage-Princess Gray",
      "paladin": "Paladin Gray",
      // No Archer or Thief art shipped for grey — caller falls back to the
      // golden art via pieceImageFallbackPathX16.
    },
    golden: {
      "mystic-king": "Mystic King - Golden", "super-queen": "Super Queen - Golden",
      "dragon": "Dragon - Golden", "gargoyle": "Gargoyle - Golden",
      "wizard": "Wizard - Golden", "sorceress": "Sorceress - Golden",
      "executioner": "Executioner - Golden", "assassin": "Assassin - Golden",
      "super-knight": "Super Knight - Golden", "elvin-archer": "Elven Archer - Golden",
      "conjurer": "Conjuror - Golden", "warlock": "Warlock - Golden",
      "trickster": "Trickster - Golden", "aerobat-assassin": "Aerobat Assassin - Golden",
      "cavalier": "Cavalier Prince - Golden", "mage": "Mage Princess - Golden",
      "paladin": "Paladin - Golden", "archer": "Archer - Golden", "thief": "Theif - Golden",
    },
  };
  return table[color][type] ?? table.golden[type]!;
}
export function pieceImagePathX16(p: PieceX16): string {
  return `/pieces-16x16/${p.color}/${pieceFileNameX16(p.type, p.color)}.png`;
}
// Fallback path used on <img onError> — golden's art ships the complete
// 19-piece set, so a piece is never left broken.
export function pieceImageFallbackPathX16(p: PieceX16): string {
  return `/pieces-16x16/golden/${pieceFileNameX16(p.type, "golden")}.png`;
}

// ─── BOARD SETUP ─────────────────────────────────────────────────────────────
function mkPX16(type: PieceTypeX16, color: PlayerColorX16, id: string): PieceX16 {
  return {
    id, type, color,
    hasMoved: false,
    paladanSuperUsed: false,
    superKnightJumpsLeft: 2,
    sorceressSpellsLeft: 3,
    sorceressDead: false,
    sleepRoundsLeft: 0,
    isEthereal: ["wizard", "sorceress", "conjurer", "warlock", "trickster"].includes(type),
    executionerAxeUsed: false,
    superQueenDoubleJumpDone: false,
    mageSacrificed: false,
    thiefStealUsed: false,
    tricksterMovesCount: 0,
    conjurerSpellsLeft: 1,
    boundRoundsLeft: 0,
  };
}

const BACK: PieceTypeX16[] = [
  "executioner", "elvin-archer", "super-knight", "conjurer", "trickster",
  "gargoyle", "sorceress", "super-queen", "mystic-king", "wizard", "dragon",
  "thief", "warlock", "super-knight", "elvin-archer", "executioner",
];
const FRONT: PieceTypeX16[] = [
  "archer", "assassin", "aerobat-assassin", "cavalier", "mage",
  "paladin", "paladin", "paladin", "paladin", "paladin", "paladin",
  "mage", "cavalier", "aerobat-assassin", "assassin", "archer",
];

export function createInitialBoardX16(): BoardX16 {
  const b: BoardX16 = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));

  // Top (white): back row = row 0, front row = row 1, cols 8-23.
  BACK.forEach((t, i) => { const col = CENTER_LO + i; b[0][col] = mkPX16(t, "white", `white-${t}-${i}`); });
  FRONT.forEach((t, i) => { const col = CENTER_LO + i; b[1][col] = mkPX16(t, "white", `white-f-${t}-${i}`); });

  // Bottom (black): back row = row 31, front row = row 30, cols 8-23.
  BACK.forEach((t, i) => { const col = CENTER_LO + i; b[SIZE - 1][col] = mkPX16(t, "black", `black-${t}-${i}`); });
  FRONT.forEach((t, i) => { const col = CENTER_LO + i; b[SIZE - 2][col] = mkPX16(t, "black", `black-f-${t}-${i}`); });

  // Left (golden): back col = col 0, front col = col 1, rows 8-23.
  BACK.forEach((t, i) => { const row = CENTER_LO + i; b[row][0] = mkPX16(t, "golden", `golden-${t}-${i}`); });
  FRONT.forEach((t, i) => { const row = CENTER_LO + i; b[row][1] = mkPX16(t, "golden", `golden-f-${t}-${i}`); });

  // Right (grey): back col = col 31, front col = col 30, rows 8-23.
  BACK.forEach((t, i) => { const row = CENTER_LO + i; b[row][SIZE - 1] = mkPX16(t, "grey", `grey-${t}-${i}`); });
  FRONT.forEach((t, i) => { const row = CENTER_LO + i; b[row][SIZE - 2] = mkPX16(t, "grey", `grey-f-${t}-${i}`); });

  return b;
}

export function createInitialGameStateX16(): GameStateX16 {
  return {
    board: createInitialBoardX16(),
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
    boundPlayers: [],
    tricksterAliveCount: { white: 0, black: 0, golden: 0, grey: 0 },
  };
}

// ─── MOVE GENERATION — identical piece patterns to rules-16x16.ts, bounded by
// the cross-shaped play area instead of a fixed 16x16 box ───────────────────
const ALL8: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
const ST4: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const KJ: [number, number][] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

function slide(b: BoardX16, r: number, c: number, dirs: [number, number][], color: PlayerColorX16): SquareX16[] {
  const m: SquareX16[] = [];
  for (const [dr, dc] of dirs) {
    let rr = r + dr, cc = c + dc;
    while (inPlayAreaX16(rr, cc)) {
      const t = b[rr][cc];
      if (!t) { m.push({ row: rr, col: cc }); }
      else {
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

function lj(b: BoardX16, r: number, c: number, color: PlayerColorX16): SquareX16[] {
  return KJ.map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
    .filter(s => inPlayAreaX16(s.row, s.col) && b[s.row][s.col]?.color !== color);
}

function os(b: BoardX16, r: number, c: number, color: PlayerColorX16): SquareX16[] {
  return ALL8.map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
    .filter(s => inPlayAreaX16(s.row, s.col) && b[s.row][s.col]?.color !== color);
}

function dd(m: SquareX16[]): SquareX16[] {
  const s = new Set<string>();
  return m.filter(q => {
    const k = `${q.row},${q.col}`;
    if (s.has(k)) return false;
    s.add(k); return true;
  });
}

export function getRawMovesX16(b: BoardX16, r: number, c: number): SquareX16[] {
  const p = b[r][c];
  if (!p || p.sleepRoundsLeft > 0 || p.boundRoundsLeft > 0) return [];
  const { type, color } = p;
  let m: SquareX16[] = [];

  switch (type) {
    case "mystic-king":
      m = [...lj(b, r, c, color), ...os(b, r, c, color)];
      break;
    case "super-queen":
      m = slide(b, r, c, ALL8, color);
      break;
    case "dragon":
      m = [...slide(b, r, c, ALL8, color), ...os(b, r, c, color)];
      KJ.forEach(([dr, dc]) => {
        const sq = { row: r + dr, col: c + dc };
        if (inPlayAreaX16(sq.row, sq.col) && b[sq.row][sq.col] && b[sq.row][sq.col]!.color !== color) m.push(sq);
      });
      break;
    case "gargoyle":
      for (const [dr, dc] of ALL8)
        for (const d of [1, 2]) {
          const rr = r + dr * d, cc = c + dc * d;
          if (inPlayAreaX16(rr, cc) && b[rr][cc]?.color !== color) m.push({ row: rr, col: cc });
        }
      break;
    case "wizard":
      for (const [dr, dc] of ALL8) {
        let rr = r + dr, cc = c + dc;
        while (inPlayAreaX16(rr, cc)) {
          const t = b[rr][cc];
          if (!t) { m.push({ row: rr, col: cc }); }
          else { if (t.color !== color && t.isEthereal) m.push({ row: rr, col: cc }); break; }
          rr += dr; cc += dc;
        }
      }
      break;
    case "sorceress":
      for (const [dr, dc] of ALL8) {
        let rr = r + dr, cc = c + dc;
        while (inPlayAreaX16(rr, cc)) {
          const t = b[rr][cc];
          if (!t) { m.push({ row: rr, col: cc }); }
          else { if (t.color !== color && t.isEthereal) m.push({ row: rr, col: cc }); break; }
          rr += dr; cc += dc;
        }
      }
      break;
    case "conjurer":
    case "warlock":
      for (const [dr, dc] of ALL8) {
        let rr = r + dr, cc = c + dc;
        while (inPlayAreaX16(rr, cc)) {
          const t = b[rr][cc];
          if (!t) { m.push({ row: rr, col: cc }); }
          else { if (t.color !== color && t.isEthereal && t.type !== "wizard" && t.type !== "sorceress") m.push({ row: rr, col: cc }); break; }
          rr += dr; cc += dc;
        }
      }
      break;
    case "trickster":
      for (const [dr, dc] of ALL8) {
        let rr = r + dr, cc = c + dc;
        while (inPlayAreaX16(rr, cc)) {
          const t = b[rr][cc];
          if (!t) { m.push({ row: rr, col: cc }); }
          else { if (t.color !== color && t.isEthereal) m.push({ row: rr, col: cc }); break; }
          rr += dr; cc += dc;
        }
      }
      break;
    case "thief":
      m = slide(b, r, c, ALL8, color);
      break;
    case "super-knight":
      m = lj(b, r, c, color);
      break;
    case "elvin-archer":
      m = [...slide(b, r, c, ALL8, color), ...lj(b, r, c, color), ...os(b, r, c, color)];
      break;
    case "archer":
      m = slide(b, r, c, ALL8, color);
      break;
    case "executioner":
      m = slide(b, r, c, ST4, color);
      break;
    case "assassin":
      m = [...slide(b, r, c, ALL8, color), ...lj(b, r, c, color), ...os(b, r, c, color)];
      break;
    case "aerobat-assassin":
      m = [...slide(b, r, c, ALL8, color), ...os(b, r, c, color)];
      KJ.forEach(([dr, dc]) => {
        const sq = { row: r + dr, col: c + dc };
        if (inPlayAreaX16(sq.row, sq.col) && b[sq.row][sq.col]?.color !== color) m.push(sq);
      });
      break;
    case "cavalier":
      m = [...lj(b, r, c, color), ...os(b, r, c, color)];
      break;
    case "mage":
      m = slide(b, r, c, ALL8, color);
      break;
    case "paladin":
      m = [...os(b, r, c, color)];
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
export function getPaladinSuperMovesX16(b: BoardX16, r: number, c: number): SquareX16[] {
  const p = b[r][c];
  if (!p || p.type !== "paladin" || p.paladanSuperUsed) return [];
  const m: SquareX16[] = [];
  for (const [dr, dc] of ALL8) {
    const rr = r + dr * 3, cc = c + dc * 3;
    if (inPlayAreaX16(rr, cc) && b[rr][cc]?.color !== p.color) m.push({ row: rr, col: cc });
  }
  return m.filter(s => {
    const t = b[s.row][s.col];
    return !(t && (t.type === "wizard" || t.type === "sorceress"));
  });
}

export function findKingX16(b: BoardX16, color: PlayerColorX16): SquareX16 | null {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (b[r][c]?.type === "mystic-king" && b[r][c]?.color === color) return { row: r, col: c };
  return null;
}

export function isKingInCheckX16(b: BoardX16, color: PlayerColorX16, active: PlayerColorX16[]): boolean {
  const k = findKingX16(b, color);
  if (!k) return false;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = b[r][c];
    if (p && p.color !== color && active.includes(p.color)) {
      if (getRawMovesX16(b, r, c).some(m => sqX16Eq(m, k))) return true;
      if (p.type === "paladin" && getPaladinSuperMovesX16(b, r, c).some(m => sqX16Eq(m, k))) return true;
    }
  }
  return false;
}

export function getLegalMovesX16(b: BoardX16, row: number, col: number, active: PlayerColorX16[]): SquareX16[] {
  const p = b[row][col];
  if (!p) return [];
  return getRawMovesX16(b, row, col).filter(to => {
    const t = cloneBoardX16(b);
    t[to.row][to.col] = t[row][col];
    t[row][col] = null;
    return !isKingInCheckX16(t, p.color, active);
  });
}

export function getLegalPaladinSuperMovesX16(b: BoardX16, row: number, col: number, active: PlayerColorX16[]): SquareX16[] {
  const p = b[row][col];
  if (!p) return [];
  return getPaladinSuperMovesX16(b, row, col).filter(to => {
    const t = cloneBoardX16(b);
    t[to.row][to.col] = t[row][col];
    t[row][col] = null;
    return !isKingInCheckX16(t, p.color, active);
  });
}

// ─── PALADIN REVERSE CASTLE ─────────────────────────────────────────────────
// Same ability as the 8x8/12x12-family Paladin: a paladin adjacent to a
// friendly non-paladin piece may swap places with it (in any of the 8
// directions), letting that piece "defend" the paladin. Classic 16x16
// doesn't have this move — added here so the X-board Paladin carries its
// full kit (Normal move + Super Move + Reverse Castle).
export function getCastleMovesX16(b: BoardX16, row: number, col: number): SquareX16[] {
  const piece = b[row][col];
  if (!piece || piece.type !== "paladin") return [];
  const moves: SquareX16[] = [];
  ALL8.forEach(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    if (!inPlayAreaX16(r, c)) return;
    const ally = b[r][c];
    if (ally && ally.color === piece.color && ally.type !== "paladin") moves.push({ row: r, col: c });
  });
  return moves;
}

// ─── MOVE QUALITY ────────────────────────────────────────────────────────────
function evaluateMoveQualityX16(
  board: BoardX16, from: SquareX16, to: SquareX16,
  piece: PieceX16, captured: PieceX16 | null,
  newBoard: BoardX16, active: PlayerColorX16[]
): "great" | "risky" | "normal" {
  let score = 0;
  const pv: Record<PieceTypeX16, number> = {
    "mystic-king": 10, "super-queen": 9, "dragon": 8, "gargoyle": 7, "sorceress": 7,
    "wizard": 6, "warlock": 6, "conjurer": 6, "trickster": 6, "thief": 5,
    "assassin": 6, "elvin-archer": 5, "aerobat-assassin": 5, "super-knight": 5,
    "executioner": 5, "cavalier": 4, "mage": 4, "paladin": 2, "archer": 4,
  };

  if (captured) score += pv[captured.type] * 2;

  for (const enemy of active) {
    if (enemy !== piece.color && isKingInCheckX16(newBoard, enemy, active)) score += 5;
  }

  if (isKingInCheckX16(newBoard, piece.color, active)) score -= 8;

  if (piece.type === "mystic-king") {
    const enemies = active.filter(c => c !== piece.color);
    let threatened = 0;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const ep = newBoard[r][c];
      if (ep && enemies.includes(ep.color)) {
        if (getRawMovesX16(newBoard, r, c).some(m => sqX16Eq(m, to))) threatened++;
      }
    }
    if (threatened > 1) score -= 6;
  }

  if (pv[piece.type] >= 6) {
    const enemies = active.filter(c => c !== piece.color);
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const ep = newBoard[r][c];
      if (ep && enemies.includes(ep.color)) {
        if (getRawMovesX16(newBoard, r, c).some(m => sqX16Eq(m, to))) { score -= 3; break; }
      }
    }
  }
  return score >= 6 ? "great" : score <= -6 ? "risky" : "normal";
}

// ─── FIND HELPERS ─────────────────────────────────────────────────────────────
export function findSorceressX16(b: BoardX16, c: PlayerColorX16): SquareX16 | null {
  for (let r = 0; r < SIZE; r++)
    for (let cc = 0; cc < SIZE; cc++)
      if (b[r][cc]?.type === "sorceress" && b[r][cc]?.color === c) return { row: r, col: cc };
  return null;
}
export function findWizardX16(b: BoardX16, c: PlayerColorX16): SquareX16 | null {
  for (let r = 0; r < SIZE; r++)
    for (let cc = 0; cc < SIZE; cc++)
      if (b[r][cc]?.type === "wizard" && b[r][cc]?.color === c) return { row: r, col: cc };
  return null;
}
export function findConjurerX16(b: BoardX16, c: PlayerColorX16): SquareX16 | null {
  for (let r = 0; r < SIZE; r++)
    for (let cc = 0; cc < SIZE; cc++)
      if (b[r][cc]?.type === "conjurer" && b[r][cc]?.color === c) return { row: r, col: cc };
  return null;
}

// ─── SPELLS — identical mechanics to rules-16x16.ts ──────────────────────────
export function applySleepSpellX16(b: BoardX16, tSq: SquareX16, sSq: SquareX16): BoardX16 {
  const nb = cloneBoardX16(b);
  const t = nb[tSq.row][tSq.col], s = nb[sSq.row][sSq.col];
  if (!t || !s) return nb;
  nb[tSq.row][tSq.col] = { ...t, sleepRoundsLeft: 3 };
  const ns = s.sorceressSpellsLeft - 1;
  if (ns <= 0) nb[sSq.row][sSq.col] = null;
  else nb[sSq.row][sSq.col] = { ...s, sorceressSpellsLeft: ns };
  return nb;
}

export function applyTeleportSpellX16(b: BoardX16, pSq: SquareX16, dSq: SquareX16, sSq: SquareX16): BoardX16 {
  const nb = cloneBoardX16(b);
  const p = nb[pSq.row][pSq.col], s = nb[sSq.row][sSq.col];
  if (!p || !s) return nb;
  nb[dSq.row][dSq.col] = p;
  nb[pSq.row][pSq.col] = null;
  const ns = s.sorceressSpellsLeft - 1;
  if (ns <= 0) nb[sSq.row][sSq.col] = null;
  else nb[sSq.row][sSq.col] = { ...s, sorceressSpellsLeft: ns };
  return nb;
}

export function rollWishDiceX16(): number { return Math.floor(Math.random() * 10) + 1; }

export function applyWizardTeleportX16(b: BoardX16, pSq: SquareX16, dSq: SquareX16): BoardX16 {
  const nb = cloneBoardX16(b);
  const p = nb[pSq.row][pSq.col];
  if (!p) return nb;
  nb[dSq.row][dSq.col] = p;
  nb[pSq.row][pSq.col] = null;
  return nb;
}

// Conjurer revives 1 dead piece
export function applyConjurerReviveX16(b: BoardX16, piece: PieceX16, dSq: SquareX16, cSq: SquareX16): BoardX16 {
  const nb = cloneBoardX16(b);
  const conjurer = nb[cSq.row][cSq.col];
  if (!conjurer) return nb;
  nb[dSq.row][dSq.col] = { ...piece, id: `revived-${Date.now()}` };
  nb[cSq.row][cSq.col] = { ...conjurer, conjurerSpellsLeft: conjurer.conjurerSpellsLeft - 1 };
  return nb;
}

// Warlock binds ONE chosen opponent's pieces for 1 round. Classic 16x16 is
// 2-player, so its Warlock had only a single possible target (the opponent)
// — with 4 kingdoms in play, the caster explicitly picks which one; the
// freeze mechanics themselves (boundRoundsLeft: 1, ticked down exactly like
// sleep) are unchanged from Classic 16x16.
export function applyWarlockBindX16(state: GameStateX16, warlockColor: PlayerColorX16, targetColor: PlayerColorX16): GameStateX16 {
  const ns = cloneStateX16(state);
  if (targetColor === warlockColor) return ns;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = ns.board[r][c];
    if (p && p.color === targetColor) ns.board[r][c] = { ...p, boundRoundsLeft: 1 };
  }
  if (!ns.boundPlayers.includes(targetColor)) ns.boundPlayers.push(targetColor);
  ns.spellMessage = `⛓️ Warlock bound ALL ${targetColor} pieces for 1 round!`;
  return ns;
}

export function getAxeSwingSquaresX16(b: BoardX16, r: number, c: number, color: PlayerColorX16): SquareX16[] {
  return [{ row: r, col: c - 1 }, { row: r, col: c + 1 }, { row: r - 1, col: c }, { row: r + 1, col: c }]
    .filter(s => inPlayAreaX16(s.row, s.col) && b[s.row][s.col] !== null && b[s.row][s.col]!.color !== color);
}

export function applyMageSacrificeX16(b: BoardX16, mSq: SquareX16, qSq: SquareX16): BoardX16 {
  const nb = cloneBoardX16(b);
  const q = nb[qSq.row][qSq.col];
  if (!q || q.type !== "super-queen") return nb;
  nb[mSq.row][mSq.col] = null;
  nb[qSq.row][qSq.col] = { ...q, sorceressDead: false, superQueenDoubleJumpDone: false };
  return nb;
}

export function tickSleepX16(b: BoardX16, color: PlayerColorX16): BoardX16 {
  const nb = cloneBoardX16(b);
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = nb[r][c];
    if (p && p.color === color && p.sleepRoundsLeft > 0) nb[r][c] = { ...p, sleepRoundsLeft: p.sleepRoundsLeft - 1 };
    if (p && p.color === color && p.boundRoundsLeft > 0) nb[r][c] = { ...p, boundRoundsLeft: p.boundRoundsLeft - 1 };
  }
  return nb;
}

// Thief steal — jumps over anyone (triple jump) to steal a piece, once per
// game. The Thief ends up occupying the stolen piece's square.
export function applyThiefStealX16(state: GameStateX16, from: SquareX16, targetSq: SquareX16): GameStateX16 {
  const ns = cloneStateX16(state);
  const board = ns.board;
  const thief = board[from.row][from.col];
  const target = board[targetSq.row][targetSq.col];
  if (!thief || !target) return ns;

  ns.capturedBy[thief.color].push(target);
  board[targetSq.row][targetSq.col] = { ...thief, thiefStealUsed: true, hasMoved: true };
  board[from.row][from.col] = null;
  ns.lastMove = { from, to: targetSq };
  ns.spellMessage = `🗝️ Thief stole the ${target.type}!`;
  return advanceTurnX16(ns);
}

// Thief's steal reaches 2-3 squares in any direction, ignoring blockers.
export function getThiefStealTargetsX16(b: BoardX16, r: number, c: number, color: PlayerColorX16): SquareX16[] {
  const p = b[r][c];
  if (!p || p.type !== "thief" || p.thiefStealUsed || p.sleepRoundsLeft > 0 || p.boundRoundsLeft > 0) return [];
  const targets: SquareX16[] = [];
  for (const [dr, dc] of ALL8) {
    for (const d of [2, 3]) {
      const rr = r + dr * d, cc = c + dc * d;
      if (!inPlayAreaX16(rr, cc)) continue;
      const t = b[rr][cc];
      if (t && t.color !== color) targets.push({ row: rr, col: cc });
    }
  }
  return targets;
}

// Trickster teleport — pure reposition tool, usable on ANY piece — friend or
// foe — moved to any empty square. Not a kill. Unlimited uses.
export function applyTricksterTeleportX16(b: BoardX16, pSq: SquareX16, dSq: SquareX16): BoardX16 {
  const nb = cloneBoardX16(b);
  const p = nb[pSq.row][pSq.col];
  if (!p) return nb;
  nb[dSq.row][dSq.col] = p;
  nb[pSq.row][pSq.col] = null;
  return nb;
}

// ─── WIN CHECK — ALL PIECES ELIMINATED ───────────────────────────────────────
// Same rule as Classic 16x16: capturing the King is just a normal capture. A
// player is eliminated only once every one of their pieces is gone; the last
// kingdom left standing wins.
function countPiecesX16(board: BoardX16, color: PlayerColorX16): number {
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
function getRemainingPlayersX16(board: BoardX16, turnOrder: PlayerColorX16[]): PlayerColorX16[] {
  return turnOrder.filter(c => countPiecesX16(board, c) > 0);
}

// ─── ADVANCE TURN ─────────────────────────────────────────────────────────────
export function advanceTurnX16(state: GameStateX16): GameStateX16 {
  let ns = cloneStateX16(state);
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null;
  ns.pendingAxeSquare = null; ns.selectedSquare = null; ns.validMoves = [];
  ns.superMoves = []; ns.superMoveMode = false; ns.castleMoves = [];
  ns.wishDiceResult = null;

  // Trickster last-stand: the countdown only runs once a player's Trickster
  // is their ONLY remaining piece. If nobody kills it within 10 further
  // turns, the whole board resets to the starting position (same players/
  // turn order) rather than anyone winning outright.
  for (const color of ns.turnOrder) {
    let aliveCount = 0, onlyPieceIsTrickster = false;
    for (let r = 0; r < SIZE; r++) for (let c2 = 0; c2 < SIZE; c2++) {
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
        const fresh = createInitialGameStateX16();
        fresh.turnOrder = [...ns.turnOrder];
        fresh.currentTurn = ns.turnOrder[0];
        fresh.spellMessage = `⏳ ${color}'s Trickster survived as the last piece for 10 rounds — the board has been reset!`;
        return fresh;
      }
    } else {
      ns.tricksterAliveCount[color] = 0;
    }
  }

  const remainingPlayers = getRemainingPlayersX16(ns.board, ns.turnOrder);
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

  // Tick down sleep/bound rounds for the player whose turn is ENDING, not
  // the one about to start — this is what makes "1 round" mean one full
  // skipped turn.
  const outgoing = ns.currentTurn;
  const idx = ns.turnOrder.indexOf(ns.currentTurn);
  const nextIdx = (idx + 1) % ns.turnOrder.length;
  ns.currentTurn = ns.turnOrder[nextIdx];
  ns.turnMovesLeft = 1;

  ns.board = tickSleepX16(ns.board, outgoing);

  ns.boundPlayers = ns.boundPlayers.filter(bp => {
    let stillBound = false;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (ns.board[r][c]?.color === bp && ns.board[r][c]!.boundRoundsLeft > 0) { stillBound = true; break; }
    }
    return stillBound;
  });

  const hasSorc = findSorceressX16(ns.board, ns.currentTurn) !== null;
  if (hasSorc) ns.turnMovesLeft = 2;

  ns.check = null;
  for (const player of ns.turnOrder) {
    if (isKingInCheckX16(ns.board, player, ns.turnOrder)) { ns.check = player; break; }
  }

  return ns;
}

// ─── EXECUTE MOVE ─────────────────────────────────────────────────────────────
export function executeMoveX16(state: GameStateX16, from: SquareX16, to: SquareX16): GameStateX16 {
  let ns = cloneStateX16(state);
  const board = ns.board;
  const piece = board[from.row][from.col]!;
  const target = board[to.row][to.col];
  ns.justEliminated = null;

  if (target) {
    ns.capturedBy[piece.color].push(target);

    if (target.type === "sorceress") {
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (p && p.type === "super-queen" && p.color === target.color) board[r][c] = { ...p, sorceressDead: true };
      }
    }
  }

  const newBoardPreview = cloneBoardX16(board);
  newBoardPreview[to.row][to.col] = piece;
  newBoardPreview[from.row][from.col] = null;
  const quality = evaluateMoveQualityX16(board, from, to, piece, target, newBoardPreview, ns.turnOrder);
  ns.lastMoveQuality = quality;

  const isPS = piece.type === "paladin" && !piece.paladanSuperUsed &&
    (Math.abs(to.row - from.row) > 1 || Math.abs(to.col - from.col) > 1);

  const updatedPiece: PieceX16 = {
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

  const remainingPlayers = getRemainingPlayersX16(ns.board, ns.turnOrder);
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
    const ax = getAxeSwingSquaresX16(board, to.row, to.col, piece.color);
    if (ax.length > 0) {
      ns.pendingAxeSquare = to;
      ns.specialMode = "executioner-axe-swing";
      ns.spellMessage = "⚔️ Executioner: Click adjacent enemy to swing axe, or elsewhere to skip.";
      return ns;
    }
  }

  // Warlock Bind — "he must make one move to do the spell": only offered
  // right after the Warlock completes a normal move.
  if (piece.type === "warlock") {
    const hasEnemies = ns.turnOrder.some(c => c !== piece.color);
    if (hasEnemies) {
      ns.specialMode = "warlock-bind-offer";
      ns.spellMessage = "⛓️ Cast Bind on all enemy pieces, or skip.";
      return ns;
    }
  }

  if (piece.type === "super-queen" && !piece.sorceressDead && ns.turnMovesLeft > 1) {
    ns.turnMovesLeft = ns.turnMovesLeft - 1;
    ns.specialMode = "super-queen-second-move";
    ns.spellMessage = "👑 Super Queen can move again!";
    ns.selectedSquare = to;
    ns.validMoves = getLegalMovesX16(board, to.row, to.col, ns.turnOrder);
    return ns;
  }

  return advanceTurnX16(ns);
}

// ─── PALADIN REVERSE CASTLE (execute) ────────────────────────────────────────
export function executeCastleX16(state: GameStateX16, from: SquareX16, to: SquareX16): GameStateX16 {
  const ns = cloneStateX16(state);
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

  return advanceTurnX16(ns);
}

export function applyAxeSwingX16(state: GameStateX16, tSq: SquareX16): GameStateX16 {
  let ns = cloneStateX16(state);
  const board = ns.board;
  const t = board[tSq.row][tSq.col];
  if (!t) return advanceTurnX16(ns);
  ns.capturedBy[ns.currentTurn].push(t);
  board[tSq.row][tSq.col] = null;

  const remainingPlayers = getRemainingPlayersX16(ns.board, ns.turnOrder);
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
  return advanceTurnX16(ns);
}

// ─── QUIT (elimination) ───────────────────────────────────────────────────────
// A quitting player's whole army is removed from the board and they're
// marked eliminated. The match continues among whoever's left, and only
// declares a winner once exactly one player remains.
export function quitPlayerX16(state: GameStateX16, color: PlayerColorX16): GameStateX16 {
  const ns = cloneStateX16(state);
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (ns.board[r][c]?.color === color) ns.board[r][c] = null;
  }
  ns.selectedSquare = null; ns.validMoves = []; ns.superMoves = []; ns.castleMoves = [];
  ns.superMoveMode = false; ns.specialMode = null; ns.specialData = null;
  ns.spellMessage = null; ns.pendingAxeSquare = null; ns.wishDiceResult = null;
  ns.boundPlayers = ns.boundPlayers.filter(bp => bp !== color);

  const wasCurrent = ns.currentTurn === color;
  const oldOrder = ns.turnOrder;
  const quitterIdx = oldOrder.indexOf(color);

  const remainingPlayers = getRemainingPlayersX16(ns.board, ns.turnOrder);
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
    for (let step = 1; step <= oldOrder.length; step++) {
      const candidate = oldOrder[(quitterIdx + step) % oldOrder.length];
      if (ns.turnOrder.includes(candidate)) { ns.currentTurn = candidate; break; }
    }
  }
  return ns;
}
