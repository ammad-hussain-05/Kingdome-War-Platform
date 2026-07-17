export type PieceType16 =
  | "mystic-king" | "super-queen" | "wizard" | "sorceress" | "conjurer" | "warlock"
  | "trickster" | "dragon" | "gargoyle" | "thief" | "super-knight" | "elvin-archer"
  | "executioner" | "assassin" | "cavalier" | "mage" | "paladin"
  | "archer" | "aerobat-assassin";

export type TriColor = "white" | "black" | "grey";
export type TriBoardId = "A" | "B" | "C" | "T";

export const ALL_COLORS: TriColor[] = ["white", "black", "grey"];
export const KINGDOM_BOARD_IDS: TriBoardId[] = ["A", "B", "C"];
export const ALL_BOARD_IDS: TriBoardId[] = ["A", "B", "C", "T"];

export interface Piece16 {
  id: string;
  type: PieceType16;
  color: TriColor;
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
  tricksterStealUsed: boolean;
  tricksterMovesCount: number;
  conjurerSpellsLeft: number;
  warlockBindUsed: boolean;
  boundRoundsLeft: number;
}

export interface Square {
  row: number;
  col: number;
}

export interface TriSquare extends Square {
  boardId: TriBoardId;
}

export type Board16 = (Piece16 | null)[][];

export type SpecialMode =
  | null | "wizard-teleport-select-piece" | "wizard-teleport-select-dest"
  | "sorceress-sleep-select" | "sorceress-teleport-select"
  | "executioner-axe-swing"
  | "super-queen-second-move"
  | "conjurer-revive-select"
  | "thief-steal-select"
  | "trickster-steal-select";

export interface TriGameState16 {
  boards: Record<TriBoardId, Board16>;
  currentTurn: TriColor;
  turnOrder: TriColor[];
  eliminatedPlayers: TriColor[];
  capturedBy: Record<TriColor, Piece16[]>;
  selectedSquare: TriSquare | null;
  validMoves: TriSquare[];
  status: "playing" | "finished";
  winner: TriColor | null;
  lastMove: { from: TriSquare; to: TriSquare } | null;
  check: TriColor | null;
  specialMode: SpecialMode;
  specialData: any;
  wishDiceResult: number | null;
  turnMovesLeft: number;
  pendingAxeSquare: TriSquare | null;
  spellMessage: string | null;
  lastMoveQuality: "great" | "risky" | "normal" | null;
  justEliminated: TriColor | null;
  passUsed: Record<TriColor, boolean>;
  boundPlayers: TriColor[];
  tricksterAliveCount: Record<TriColor, number>;
}

// ─── GEOMETRY ────────────────────────────────────────────────────────────────
// Same technique as Tri 8x8/12x12: kingdom boards (A/B/C) are plain 16x16
// grids; the shared battlefield ("T") is a fixed-width 16-row x 31-col array
// with a triangular mask applied via the bounds check (TRI_ROWS=KINGDOM_SIZE,
// TRI_COLS=2*(TRI_ROWS-1)+1).
export const KINGDOM_SIZE = 16;
export const TRI_ROWS = 16;
export const TRI_COL_CENTER = 15;
export const TRI_COLS = 31;

export function inBoundsFor(boardId: TriBoardId, r: number, c: number): boolean {
  if (boardId === "T") {
    return r >= 0 && r < TRI_ROWS && c >= TRI_COL_CENTER - r && c <= TRI_COL_CENTER + r;
  }
  return r >= 0 && r < KINGDOM_SIZE && c >= 0 && c < KINGDOM_SIZE;
}

export const squareEquals = (a: Square, b: Square) => a.row === b.row && a.col === b.col;
export const triSquareEquals = (a: TriSquare, b: TriSquare) =>
  a.boardId === b.boardId && a.row === b.row && a.col === b.col;

export function cloneBoard16(board: Board16): Board16 {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

export function cloneBoardsTri16(boards: Record<TriBoardId, Board16>): Record<TriBoardId, Board16> {
  const out = {} as Record<TriBoardId, Board16>;
  for (const id of ALL_BOARD_IDS) out[id] = cloneBoard16(boards[id]);
  return out;
}

export function cloneTriGameState16(state: TriGameState16): TriGameState16 {
  return {
    ...state,
    boards: cloneBoardsTri16(state.boards),
    turnOrder: [...state.turnOrder],
    eliminatedPlayers: [...state.eliminatedPlayers],
    capturedBy: {
      white: [...state.capturedBy.white],
      black: [...state.capturedBy.black],
      grey: [...state.capturedBy.grey],
    },
    validMoves: [...state.validMoves],
    specialData: state.specialData ? { ...state.specialData } : null,
    boundPlayers: [...state.boundPlayers],
    tricksterAliveCount: { ...state.tricksterAliveCount },
  };
}

function mkPiece(type: PieceType16, color: TriColor, id: string): Piece16 {
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
    tricksterStealUsed: false,
    tricksterMovesCount: 0,
    conjurerSpellsLeft: 1,
    warlockBindUsed: false,
    boundRoundsLeft: 0,
  };
}

// ─── PIECE ART ───────────────────────────────────────────────────────────────
// White/black follow the exact naming table from lib/game/rules-16x16.ts's
// `pieceImagePath16`. Grey is its own asset set with real inconsistencies
// (verified against public/pieces-16x16/grey on disk): most pieces are
// "<Name> Gray", four dash-style pieces use "Silver" instead of "Gray"
// (Conjuror/Warlock/Trickster/Aerobat Assassin), and Paladin drops the dash
// entirely ("Paladin Gray", not "Paladin - Gray").
const NAME_WB: Record<PieceType16, [string, string]> = {
  "mystic-king": ["Mystic King White", "Mystic King black"],
  "super-queen": ["Super Queen White", "Super Queen black"],
  "dragon": ["Dragon White", "Dragon black"],
  "gargoyle": ["Gargoyle White", "Gargoyle black"],
  "wizard": ["Wizard White", "Wizard black"],
  "sorceress": ["Sorceress White", "Sorceress black"],
  "executioner": ["Executioner White", "Executioner black"],
  "assassin": ["Assassin White", "Assassin black"],
  "super-knight": ["Super Knight White", "Super Knight Black"],
  "elvin-archer": ["Elven Archer White", "Elven Archer Black"],
  "conjurer": ["Conjuror - White", "Conjuror - Black"],
  "warlock": ["Warlock - White", "Warlock - Black"],
  "trickster": ["Trickster - White", "Trickster - Black"],
  "aerobat-assassin": ["Aerobat Assassin - White", "Aerobat Assassin - Black"],
  "cavalier": ["Cavalier Prince White", "Cavalier Prince Black"],
  "mage": ["Mage-Princess White", "Mage-Princess Black"],
  "paladin": ["Paladin - White", "Paladin - Black"],
  "archer": ["Elven Archer White", "Elven Archer Black"],
  "thief": ["Assassin White", "Assassin black"],
};

const NAME_GREY: Record<PieceType16, string> = {
  "mystic-king": "Mystic King Gray", "super-queen": "Super Queen Gray", "dragon": "Dragon Gray",
  "gargoyle": "Gargoyle Gray", "wizard": "Wizard Gray", "sorceress": "Sorceress Gray",
  "executioner": "Executioner Gray", "assassin": "Assassin Gray", "super-knight": "Super Knight Gray",
  "elvin-archer": "Elven Archer Gray", "conjurer": "Conjuror - Silver", "warlock": "Warlock - Silver",
  "trickster": "Trickster - Silver", "aerobat-assassin": "Aerobat Assassin - Silver",
  "cavalier": "Cavalier Prince Gray", "mage": "Mage-Princess Gray", "paladin": "Paladin Gray",
  "archer": "Elven Archer Gray", "thief": "Assassin Gray",
};

export function pieceImagePathTri16(p: Piece16): string {
  const name = p.color === "grey" ? NAME_GREY[p.type] : NAME_WB[p.type][p.color === "white" ? 0 : 1];
  return `/pieces-16x16/${p.color}/${name}.png`;
}

// ─── BOARD SETUP ─────────────────────────────────────────────────────────────
// Same 16-wide back/front rank layout as the classic board, reused verbatim
// (just recolored per kingdom).
const BACK: PieceType16[] = [
  "executioner", "elvin-archer", "super-knight", "conjurer", "trickster",
  "gargoyle", "sorceress", "super-queen", "mystic-king", "wizard", "dragon",
  "thief", "warlock", "super-knight", "elvin-archer", "executioner",
];

const FRONT: PieceType16[] = [
  "archer", "assassin", "aerobat-assassin", "cavalier", "mage",
  "paladin", "paladin", "paladin", "paladin", "paladin", "paladin",
  "mage", "cavalier", "aerobat-assassin", "assassin", "archer",
];

export function createEmptyBoard(): Board16 {
  return Array(KINGDOM_SIZE).fill(null).map(() => Array(KINGDOM_SIZE).fill(null));
}

export function createEmptyTriBoard(): Board16 {
  return Array(TRI_ROWS).fill(null).map(() => Array(TRI_COLS).fill(null));
}

/**
 * Same placement rule as Tri 8x8/12x12: each kingdom starts on the edge
 * FARTHEST from its connector. White sits above the battlefield (rows 0/1),
 * connector on row KINGDOM_SIZE-1. Black/Grey sit below (rows
 * KINGDOM_SIZE-2/KINGDOM_SIZE-1), connector on row 0.
 */
export function createPlayerBoard(color: TriColor): Board16 {
  const b = createEmptyBoard();
  const backRow = color === "white" ? 0 : KINGDOM_SIZE - 1;
  const frontRow = color === "white" ? 1 : KINGDOM_SIZE - 2;
  const prefix = color[0];

  BACK.forEach((type, col) => {
    b[backRow][col] = mkPiece(type, color, `${prefix}-b-${col}`);
  });
  FRONT.forEach((type, col) => {
    b[frontRow][col] = mkPiece(type, color, `${prefix}-f-${col}`);
  });

  return b;
}

export function createInitialTriGameState16(): TriGameState16 {
  return {
    boards: {
      A: createPlayerBoard("white"),
      B: createPlayerBoard("black"),
      C: createPlayerBoard("grey"),
      T: createEmptyTriBoard(),
    },
    currentTurn: "white",
    turnOrder: ["white", "black", "grey"],
    eliminatedPlayers: [],
    capturedBy: { white: [], black: [], grey: [] },
    selectedSquare: null,
    validMoves: [],
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
    passUsed: { white: false, black: false, grey: false },
    boundPlayers: [],
    tricksterAliveCount: { white: 0, black: 0, grey: 0 },
  };
}

// ─── MOVEMENT ────────────────────────────────────────────────────────────────
// Ported case-for-case from lib/game/rules-16x16.ts's getRawMoves16, only
// parameterized by boardId (via inBoundsFor) instead of the classic's fixed
// inB16. Wizard's and Trickster's custom ethereal-capture loops are kept as
// separate inline code (not consolidated into the shared `slide` helper)
// even though they're behaviorally equivalent to it, to stay maximally
// faithful to the original source rather than relying on that equivalence.
const ALL8: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
const ST4: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const KJ: [number, number][] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

function slide(board: Board16, r: number, c: number, dirs: [number, number][], boardId: TriBoardId, color: TriColor): Square[] {
  const m: Square[] = [];
  for (const [dr, dc] of dirs) {
    let rr = r + dr, cc = c + dc;
    while (inBoundsFor(boardId, rr, cc)) {
      const t = board[rr][cc];
      if (!t) { m.push({ row: rr, col: cc }); }
      else {
        const movingPiece = board[r][c]!;
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

function lj(board: Board16, r: number, c: number, boardId: TriBoardId, color: TriColor): Square[] {
  return KJ.map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
    .filter(s => inBoundsFor(boardId, s.row, s.col) && board[s.row][s.col]?.color !== color);
}

function os(board: Board16, r: number, c: number, boardId: TriBoardId, color: TriColor): Square[] {
  return ALL8.map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
    .filter(s => inBoundsFor(boardId, s.row, s.col) && board[s.row][s.col]?.color !== color);
}

function dd(m: Square[]): Square[] {
  const seen = new Set<string>();
  return m.filter(q => {
    const k = `${q.row},${q.col}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function getRawMovesTri16(board: Board16, r: number, c: number, boardId: TriBoardId): Square[] {
  const p = board[r][c];
  if (!p || p.sleepRoundsLeft > 0 || p.boundRoundsLeft > 0) return [];
  const { type, color } = p;
  let m: Square[] = [];

  switch (type) {
    case "mystic-king":
      m = [...lj(board, r, c, boardId, color), ...os(board, r, c, boardId, color)];
      break;

    case "super-queen":
      m = slide(board, r, c, ALL8, boardId, color);
      break;

    case "dragon":
    case "gargoyle":
      m = [...slide(board, r, c, ALL8, boardId, color)];
      KJ.forEach(([dr, dc]) => {
        const sq = { row: r + dr, col: c + dc };
        if (inBoundsFor(boardId, sq.row, sq.col) && board[sq.row][sq.col] && board[sq.row][sq.col]!.color !== color) m.push(sq);
      });
      break;

    case "wizard":
      for (const [dr, dc] of ALL8) {
        let rr = r + dr, cc = c + dc;
        while (inBoundsFor(boardId, rr, cc)) {
          const t = board[rr][cc];
          if (!t) { m.push({ row: rr, col: cc }); }
          else {
            if (t.color !== color && (t.type === "wizard" || t.type === "sorceress" || t.type === "conjurer" || t.type === "warlock" || t.type === "trickster"))
              m.push({ row: rr, col: cc });
            break;
          }
          rr += dr; cc += dc;
        }
      }
      break;

    case "sorceress":
    case "conjurer":
    case "warlock":
      m = slide(board, r, c, ALL8, boardId, color);
      break;

    case "trickster":
      for (const [dr, dc] of ALL8) {
        let rr = r + dr, cc = c + dc;
        while (inBoundsFor(boardId, rr, cc)) {
          const t = board[rr][cc];
          if (!t) { m.push({ row: rr, col: cc }); }
          else {
            if (t.color !== color && t.isEthereal) m.push({ row: rr, col: cc });
            break;
          }
          rr += dr; cc += dc;
        }
      }
      break;

    case "thief":
      m = slide(board, r, c, ALL8, boardId, color);
      break;

    case "super-knight":
      m = lj(board, r, c, boardId, color);
      break;

    case "elvin-archer":
      m = [...slide(board, r, c, ALL8, boardId, color), ...lj(board, r, c, boardId, color), ...os(board, r, c, boardId, color)];
      break;

    case "archer":
      m = slide(board, r, c, ALL8, boardId, color);
      break;

    case "executioner":
      m = slide(board, r, c, ST4, boardId, color);
      break;

    case "assassin":
      m = [...slide(board, r, c, ALL8, boardId, color), ...lj(board, r, c, boardId, color), ...os(board, r, c, boardId, color)];
      break;

    case "aerobat-assassin":
      m = [...slide(board, r, c, ALL8, boardId, color), ...os(board, r, c, boardId, color)];
      KJ.forEach(([dr, dc]) => {
        const sq = { row: r + dr, col: c + dc };
        if (inBoundsFor(boardId, sq.row, sq.col) && board[sq.row][sq.col]?.color !== color) m.push(sq);
      });
      break;

    case "cavalier":
      m = [...lj(board, r, c, boardId, color), ...os(board, r, c, boardId, color)];
      break;

    case "mage":
      m = slide(board, r, c, ALL8, boardId, color);
      break;

    case "paladin":
      m = [...os(board, r, c, boardId, color)];
      if (!p.paladanSuperUsed) {
        for (const [dr, dc] of ALL8) {
          for (const d of [2, 3]) {
            const rr = r + dr * d, cc = c + dc * d;
            if (inBoundsFor(boardId, rr, cc) && board[rr][cc]?.color !== color) m.push({ row: rr, col: cc });
          }
        }
      }
      break;
  }

  return dd(m);
}

// ─── CHECK DETECTION ─────────────────────────────────────────────────────────
// Same-board-only threat scan, consistent with the rest of Tri's philosophy.
export function findKingTri16(boards: Record<TriBoardId, Board16>, color: TriColor): TriSquare | null {
  for (const boardId of ALL_BOARD_IDS) {
    const board = boards[boardId];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (board[r][c]?.type === "mystic-king" && board[r][c]?.color === color) {
          return { boardId, row: r, col: c };
        }
      }
    }
  }
  return null;
}

export function isKingInCheckTri16(boards: Record<TriBoardId, Board16>, color: TriColor, turnOrder: TriColor[]): boolean {
  const k = findKingTri16(boards, color);
  if (!k) return false;
  const board = boards[k.boardId];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (p && p.color !== color && turnOrder.includes(p.color)) {
        if (getRawMovesTri16(board, r, c, k.boardId).some(m => m.row === k.row && m.col === k.col)) return true;
      }
    }
  }
  return false;
}

function simulateMoveTri16(boards: Record<TriBoardId, Board16>, from: TriSquare, to: TriSquare): Record<TriBoardId, Board16> {
  const clone = cloneBoardsTri16(boards);
  const fromBoard = clone[from.boardId];
  const toBoard = clone[to.boardId];
  const piece = fromBoard[from.row][from.col];
  toBoard[to.row][to.col] = piece;
  fromBoard[from.row][from.col] = null;
  return clone;
}

// ─── CONNECTORS ──────────────────────────────────────────────────────────────
// Same mechanic as Tri 8x8/12x12, coordinates recomputed for the 16-wide
// kingdom / 31-wide triangle: kingdom-side `from` = center 3 columns [7,8,9];
// triangle-side `to` = white just below the apex, black on the base's left
// flank, grey on the base's right flank.
interface ConnectorLink { from: Square; to: Square; }

const CONNECTOR_LINKS: Record<TriColor, ConnectorLink[]> = {
  white: [
    { from: { row: KINGDOM_SIZE - 1, col: 7 }, to: { row: 1, col: TRI_COL_CENTER - 1 } },
    { from: { row: KINGDOM_SIZE - 1, col: 8 }, to: { row: 1, col: TRI_COL_CENTER } },
    { from: { row: KINGDOM_SIZE - 1, col: 9 }, to: { row: 1, col: TRI_COL_CENTER + 1 } },
  ],
  black: [
    { from: { row: 0, col: 7 }, to: { row: TRI_ROWS - 1, col: 0 } },
    { from: { row: 0, col: 8 }, to: { row: TRI_ROWS - 1, col: 1 } },
    { from: { row: 0, col: 9 }, to: { row: TRI_ROWS - 1, col: 2 } },
  ],
  grey: [
    { from: { row: 0, col: 7 }, to: { row: TRI_ROWS - 1, col: TRI_COLS - 3 } },
    { from: { row: 0, col: 8 }, to: { row: TRI_ROWS - 1, col: TRI_COLS - 2 } },
    { from: { row: 0, col: 9 }, to: { row: TRI_ROWS - 1, col: TRI_COLS - 1 } },
  ],
};

const CONNECTOR_BOARD: Record<TriColor, TriBoardId> = { white: "A", black: "B", grey: "C" };

export function getConnectorCell(color: TriColor, boardId: TriBoardId, sq: Square): ConnectorLink | null {
  if (CONNECTOR_BOARD[color] !== boardId) return null;
  return CONNECTOR_LINKS[color].find(link => squareEquals(link.from, sq)) ?? null;
}

export function getConnectorCrossing(color: TriColor, from: TriSquare): TriSquare | null {
  const link = getConnectorCell(color, from.boardId, from);
  if (!link) return null;
  return { boardId: "T", row: link.to.row, col: link.to.col };
}

export function isConnectorCell(color: TriColor, boardId: TriBoardId, sq: Square): boolean {
  return getConnectorCell(color, boardId, sq) !== null;
}

export function getLegalMovesTri16(state: TriGameState16, from: TriSquare): TriSquare[] {
  const board = state.boards[from.boardId];
  const piece = board[from.row][from.col];
  if (!piece || piece.color !== state.currentTurn) return [];

  const raw = getRawMovesTri16(board, from.row, from.col, from.boardId).map(m => ({
    boardId: from.boardId, row: m.row, col: m.col,
  }));

  const candidates: TriSquare[] = [...raw];

  if (from.boardId !== "T") {
    const crossing = getConnectorCrossing(piece.color, from);
    if (crossing) {
      const target = state.boards.T[crossing.row][crossing.col];
      if (!target || target.color !== piece.color) candidates.push(crossing);
    }
  }

  return candidates.filter(to => {
    const simulated = simulateMoveTri16(state.boards, from, to);
    return !isKingInCheckTri16(simulated, piece.color, state.turnOrder);
  });
}

// ─── FIND PIECES ─────────────────────────────────────────────────────────────
export function findPieceTri16(boards: Record<TriBoardId, Board16>, color: TriColor, type: PieceType16): TriSquare | null {
  for (const boardId of ALL_BOARD_IDS) {
    const board = boards[boardId];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (board[r][c]?.type === type && board[r][c]?.color === color) return { boardId, row: r, col: c };
      }
    }
  }
  return null;
}

// ─── SPELLS ──────────────────────────────────────────────────────────────────
// All same-board-only (the caller only ever passes target squares matching
// the casting piece's own board), mirroring Tri 12x12's approach.
export function applySleepSpellTri16(
  boards: Record<TriBoardId, Board16>, tSq: TriSquare, sSq: TriSquare
): Record<TriBoardId, Board16> {
  const nb = cloneBoardsTri16(boards);
  const tBoard = nb[tSq.boardId], sBoard = nb[sSq.boardId];
  const t = tBoard[tSq.row][tSq.col], s = sBoard[sSq.row][sSq.col];
  if (!t || !s) return nb;
  tBoard[tSq.row][tSq.col] = { ...t, sleepRoundsLeft: 3 };
  const left = s.sorceressSpellsLeft - 1;
  sBoard[sSq.row][sSq.col] = left <= 0 ? null : { ...s, sorceressSpellsLeft: left };
  return nb;
}

export function applyTeleportSpellTri16(
  boards: Record<TriBoardId, Board16>, pSq: TriSquare, dSq: TriSquare, sSq: TriSquare
): Record<TriBoardId, Board16> {
  const nb = cloneBoardsTri16(boards);
  const pBoard = nb[pSq.boardId], dBoard = nb[dSq.boardId], sBoard = nb[sSq.boardId];
  const p = pBoard[pSq.row][pSq.col], s = sBoard[sSq.row][sSq.col];
  if (!p || !s) return nb;
  dBoard[dSq.row][dSq.col] = p;
  pBoard[pSq.row][pSq.col] = null;
  const left = s.sorceressSpellsLeft - 1;
  sBoard[sSq.row][sSq.col] = left <= 0 ? null : { ...s, sorceressSpellsLeft: left };
  return nb;
}

export function rollWishDiceTri16(): number {
  return Math.floor(Math.random() * 10) + 1;
}

export function applyWizardTeleportTri16(
  boards: Record<TriBoardId, Board16>, pSq: TriSquare, dSq: TriSquare
): Record<TriBoardId, Board16> {
  const nb = cloneBoardsTri16(boards);
  const pBoard = nb[pSq.boardId], dBoard = nb[dSq.boardId];
  const p = pBoard[pSq.row][pSq.col];
  if (!p) return nb;
  dBoard[dSq.row][dSq.col] = p;
  pBoard[pSq.row][pSq.col] = null;
  return nb;
}

export function applyMageSacrificeTri16(
  boards: Record<TriBoardId, Board16>, mSq: TriSquare, qSq: TriSquare
): Record<TriBoardId, Board16> {
  const nb = cloneBoardsTri16(boards);
  const mBoard = nb[mSq.boardId], qBoard = nb[qSq.boardId];
  const q = qBoard[qSq.row][qSq.col];
  if (!q || q.type !== "super-queen") return nb;
  mBoard[mSq.row][mSq.col] = null;
  // Matches the 16x16-specific behavior (resets sorceressDead too, unlike 12x12).
  qBoard[qSq.row][qSq.col] = { ...q, sorceressDead: false, superQueenDoubleJumpDone: false };
  return nb;
}

// Conjurer: revive a piece from capturedBy[color] onto an empty square on
// the conjurer's own board, consuming its single charge.
export function applyConjurerReviveTri16(
  boards: Record<TriBoardId, Board16>, deadPiece: Piece16, destSq: TriSquare, conjurerSq: TriSquare
): Record<TriBoardId, Board16> {
  const nb = cloneBoardsTri16(boards);
  const destBoard = nb[destSq.boardId], conjBoard = nb[conjurerSq.boardId];
  const conjurer = conjBoard[conjurerSq.row][conjurerSq.col];
  if (!conjurer) return nb;
  destBoard[destSq.row][destSq.col] = { ...deadPiece, id: `revived-${Date.now()}` };
  conjBoard[conjurerSq.row][conjurerSq.col] = { ...conjurer, conjurerSpellsLeft: conjurer.conjurerSpellsLeft - 1 };
  return nb;
}

// Warlock: binds every enemy piece on the warlock's OWN board for 1 round
// (same-board-only, unlike the classic 2-player version which binds the
// entire single board — here that's the natural equivalent since a kingdom
// board only ever holds its own kingdom's pieces; binding only matters once
// pieces have crossed onto the shared Tri Gate).
export function applyWarlockBindTri16(state: TriGameState16, warlockSq: TriSquare): TriGameState16 {
  const ns = cloneTriGameState16(state);
  const board = ns.boards[warlockSq.boardId];
  const warlock = board[warlockSq.row][warlockSq.col];
  if (!warlock) return ns;

  const boundColors = new Set<TriColor>();
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (p && p.color !== warlock.color) {
        board[r][c] = { ...p, boundRoundsLeft: 1 };
        boundColors.add(p.color);
      }
    }
  }
  board[warlockSq.row][warlockSq.col] = { ...warlock, warlockBindUsed: true };
  for (const c of boundColors) if (!ns.boundPlayers.includes(c)) ns.boundPlayers.push(c);
  ns.spellMessage = boundColors.size > 0
    ? `⛓️ Warlock bound enemy pieces on this board for 1 round!`
    : `⛓️ No enemies present on this board to bind.`;
  return ns;
}

export function getAxeSwingSquaresTri16(board: Board16, r: number, c: number, color: TriColor, boardId: TriBoardId): TriSquare[] {
  return [{ row: r, col: c - 1 }, { row: r, col: c + 1 }, { row: r - 1, col: c }, { row: r + 1, col: c }]
    .filter(s => inBoundsFor(boardId, s.row, s.col) && board[s.row][s.col] !== null && board[s.row][s.col]!.color !== color)
    .map(s => ({ boardId, row: s.row, col: s.col }));
}

// Thief: NEW working ability (dead code in the classic board — see plan).
// Ranged removal, reach 3 (Chebyshev distance), same board, never the king.
export function getThiefStealSquaresTri16(board: Board16, r: number, c: number, color: TriColor, boardId: TriBoardId): TriSquare[] {
  const out: TriSquare[] = [];
  for (let rr = 0; rr < board.length; rr++) {
    for (let cc = 0; cc < board[rr].length; cc++) {
      if (!inBoundsFor(boardId, rr, cc)) continue;
      const t = board[rr][cc];
      if (!t || t.color === color || t.type === "mystic-king") continue;
      if (Math.max(Math.abs(rr - r), Math.abs(cc - c)) <= 3) out.push({ boardId, row: rr, col: cc });
    }
  }
  return out;
}

export function applyThiefStealTri16(state: TriGameState16, thiefSq: TriSquare, targetSq: TriSquare): TriGameState16 {
  const ns = cloneTriGameState16(state);
  const board = ns.boards[thiefSq.boardId];
  const thief = board[thiefSq.row][thiefSq.col];
  const target = board[targetSq.row][targetSq.col];
  if (!thief || !target || target.type === "mystic-king" || target.color === thief.color) return ns;
  ns.capturedBy[thief.color].push(target);
  board[targetSq.row][targetSq.col] = null;
  board[thiefSq.row][thiefSq.col] = { ...thief, thiefStealUsed: true };
  ns.spellMessage = `🗝️ Thief stole the ${target.type}!`;
  return ns;
}

// Trickster: NEW working ability (dead code in the classic board — see
// plan). Ranged removal, reach 1 ("touch"), same board, any piece.
export function getTricksterStealSquaresTri16(board: Board16, r: number, c: number, color: TriColor, boardId: TriBoardId): TriSquare[] {
  const out: TriSquare[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr, cc = c + dc;
      if (!inBoundsFor(boardId, rr, cc)) continue;
      const t = board[rr][cc];
      if (t && t.color !== color) out.push({ boardId, row: rr, col: cc });
    }
  }
  return out;
}

export function applyTricksterStealTri16(state: TriGameState16, tricksterSq: TriSquare, targetSq: TriSquare): TriGameState16 {
  const ns = cloneTriGameState16(state);
  const board = ns.boards[tricksterSq.boardId];
  const trickster = board[tricksterSq.row][tricksterSq.col];
  const target = board[targetSq.row][targetSq.col];
  if (!trickster || !target || target.color === trickster.color) return ns;
  ns.capturedBy[trickster.color].push(target);
  board[targetSq.row][targetSq.col] = null;
  board[tricksterSq.row][tricksterSq.col] = { ...trickster, tricksterStealUsed: true };
  ns.spellMessage = `🃏 Trickster stole the ${target.type}!`;
  return ns;
}

function tickSleepAndBindTri16(boards: Record<TriBoardId, Board16>, color: TriColor): Record<TriBoardId, Board16> {
  const nb = cloneBoardsTri16(boards);
  for (const boardId of ALL_BOARD_IDS) {
    const board = nb[boardId];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          const next = { ...p };
          if (next.sleepRoundsLeft > 0) next.sleepRoundsLeft -= 1;
          if (next.boundRoundsLeft > 0) next.boundRoundsLeft -= 1;
          board[r][c] = next;
        }
      }
    }
  }
  return nb;
}

// ─── MOVE QUALITY ────────────────────────────────────────────────────────────
const PIECE_VALUE: Record<PieceType16, number> = {
  "mystic-king": 10, "super-queen": 9, "dragon": 8, "gargoyle": 7, "sorceress": 7,
  "wizard": 6, "warlock": 6, "conjurer": 6, "trickster": 6, "thief": 5,
  "assassin": 6, "elvin-archer": 5, "aerobat-assassin": 5, "super-knight": 5,
  "executioner": 5, "cavalier": 4, "mage": 4, "paladin": 2, "archer": 4,
};

function evaluateMoveQualityTri16(
  to: TriSquare,
  piece: Piece16,
  captured: Piece16 | null,
  newBoards: Record<TriBoardId, Board16>,
  turnOrder: TriColor[]
): "great" | "risky" | "normal" {
  let score = 0;
  if (captured) score += PIECE_VALUE[captured.type] * 2;

  for (const enemy of turnOrder) {
    if (enemy !== piece.color && isKingInCheckTri16(newBoards, enemy, turnOrder)) score += 5;
  }
  if (isKingInCheckTri16(newBoards, piece.color, turnOrder)) score -= 8;

  const destBoard = newBoards[to.boardId];
  const enemies = turnOrder.filter(c => c !== piece.color);
  let threatened = 0;
  for (let r = 0; r < destBoard.length; r++) {
    for (let c = 0; c < destBoard[r].length; c++) {
      const ep = destBoard[r][c];
      if (ep && enemies.includes(ep.color) && getRawMovesTri16(destBoard, r, c, to.boardId).some(m => m.row === to.row && m.col === to.col)) {
        threatened++;
      }
    }
  }
  if (piece.type === "mystic-king" && threatened > 1) score -= 6;
  if (PIECE_VALUE[piece.type] >= 6 && threatened > 0) score -= 3;

  return score >= 6 ? "great" : score <= -6 ? "risky" : "normal";
}

// ─── TURN ORDER / ELIMINATION ────────────────────────────────────────────────
// A player is eliminated only once every one of their pieces is gone from
// every board — king capture is a normal capture only. Elimination is
// recomputed against the full ALL_COLORS set every time a capturing action
// resolves, and again as a safety net inside advanceTurnTri16 so every code
// path (moves, axe swings, and every spell) converges on the same result.
function getNextTurn(current: TriColor, turnOrder: TriColor[]): TriColor {
  const idx = turnOrder.indexOf(current);
  return turnOrder[(idx + 1) % turnOrder.length];
}

function countPiecesTri16(boards: Record<TriBoardId, Board16>, color: TriColor): number {
  let count = 0;
  for (const boardId of ALL_BOARD_IDS) {
    const board = boards[boardId];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (board[r][c]?.color === color) count++;
      }
    }
  }
  return count;
}

function getRemainingPlayersTri16(boards: Record<TriBoardId, Board16>, turnOrder: TriColor[]): TriColor[] {
  return turnOrder.filter(color => countPiecesTri16(boards, color) > 0);
}

function eliminateColorFromAllBoards(boards: Record<TriBoardId, Board16>, color: TriColor): void {
  for (const boardId of ALL_BOARD_IDS) {
    const b = boards[boardId];
    for (let r = 0; r < b.length; r++) {
      for (let c = 0; c < b[r].length; c++) {
        if (b[r][c]?.color === color) b[r][c] = null;
      }
    }
  }
}

export function advanceTurnTri16(state: TriGameState16): TriGameState16 {
  const ns = cloneTriGameState16(state);
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null;
  ns.pendingAxeSquare = null; ns.selectedSquare = null; ns.validMoves = [];
  ns.justEliminated = null;

  // Trickster 10-turn timeout — in the classic 2-player game this ends the
  // game outright; here it just eliminates that specific color (piece wipe)
  // so the remaining players keep fighting, consistent with "one player
  // leaving doesn't end the match".
  for (const color of ns.turnOrder) {
    if (findPieceTri16(ns.boards, color, "trickster") !== null) {
      const count = (ns.tricksterAliveCount[color] || 0) + 1;
      ns.tricksterAliveCount[color] = count;
      if (count > 10 && !ns.eliminatedPlayers.includes(color)) {
        eliminateColorFromAllBoards(ns.boards, color);
      }
    }
  }

  const remainingPlayers = getRemainingPlayersTri16(ns.boards, ns.turnOrder);
  ns.eliminatedPlayers = ALL_COLORS.filter(p => !remainingPlayers.includes(p));

  if (remainingPlayers.length === 1) {
    ns.turnOrder = remainingPlayers;
    ns.status = "finished";
    ns.winner = remainingPlayers[0];
    ns.currentTurn = remainingPlayers[0];
    return ns;
  }

  // Walk the ORIGINAL (pre-shrink) turn order to find the next surviving
  // player — robust even if ns.currentTurn itself was just eliminated above
  // (e.g. their own trickster timed out on this very turn-advance).
  let next = getNextTurn(ns.currentTurn, ns.turnOrder);
  while (!remainingPlayers.includes(next)) {
    next = getNextTurn(next, ns.turnOrder);
  }
  ns.currentTurn = next;
  ns.turnOrder = remainingPlayers;
  ns.turnMovesLeft = 1;

  ns.boards = tickSleepAndBindTri16(ns.boards, ns.currentTurn);

  // Remove expired bound-player markers.
  ns.boundPlayers = ns.boundPlayers.filter(bp => {
    for (const boardId of ALL_BOARD_IDS) {
      const b = ns.boards[boardId];
      for (let r = 0; r < b.length; r++) {
        for (let c = 0; c < b[r].length; c++) {
          if (b[r][c]?.color === bp && b[r][c]!.boundRoundsLeft > 0) return true;
        }
      }
    }
    return false;
  });

  const hasSorc = findPieceTri16(ns.boards, ns.currentTurn, "sorceress") !== null;
  if (hasSorc) ns.turnMovesLeft = 2;

  ns.check = null;
  for (const player of ns.turnOrder) {
    if (isKingInCheckTri16(ns.boards, player, ns.turnOrder)) { ns.check = player; break; }
  }

  return ns;
}

export function executeMoveTri16(state: TriGameState16, from: TriSquare, to: TriSquare): TriGameState16 {
  const ns = cloneTriGameState16(state);
  const fromBoard = ns.boards[from.boardId];
  const toBoard = ns.boards[to.boardId];
  const piece = fromBoard[from.row][from.col];
  if (!piece) return state;

  const target = toBoard[to.row][to.col];
  ns.justEliminated = null;

  if (target) {
    ns.capturedBy[piece.color].push(target);

    if (target.type === "sorceress") {
      for (const boardId of ALL_BOARD_IDS) {
        const b = ns.boards[boardId];
        for (let r = 0; r < b.length; r++) {
          for (let c = 0; c < b[r].length; c++) {
            const p = b[r][c];
            if (p && p.type === "super-queen" && p.color === target.color) b[r][c] = { ...p, sorceressDead: true };
          }
        }
      }
    }
  }

  const sameBoard = from.boardId === to.boardId;
  const isSuperPaladinMove = sameBoard && piece.type === "paladin" && !piece.paladanSuperUsed &&
    (Math.abs(to.row - from.row) > 1 || Math.abs(to.col - from.col) > 1);

  const newBoardsPreview = cloneBoardsTri16(ns.boards);
  newBoardsPreview[to.boardId][to.row][to.col] = piece;
  newBoardsPreview[from.boardId][from.row][from.col] = null;
  ns.lastMoveQuality = evaluateMoveQualityTri16(to, piece, target, newBoardsPreview, ns.turnOrder);

  toBoard[to.row][to.col] = {
    ...piece,
    hasMoved: true,
    paladanSuperUsed: isSuperPaladinMove ? true : piece.paladanSuperUsed,
    executionerAxeUsed: false,
    tricksterMovesCount: piece.type === "trickster" ? piece.tricksterMovesCount + 1 : piece.tricksterMovesCount,
  };
  fromBoard[from.row][from.col] = null;

  ns.lastMove = { from, to };
  ns.selectedSquare = null; ns.validMoves = [];
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null; ns.wishDiceResult = null;

  const remainingPlayers = getRemainingPlayersTri16(ns.boards, ns.turnOrder);
  const newlyEliminated = ALL_COLORS.filter(p => !remainingPlayers.includes(p) && !ns.eliminatedPlayers.includes(p));
  ns.eliminatedPlayers = ALL_COLORS.filter(p => !remainingPlayers.includes(p));
  if (newlyEliminated.length > 0) ns.justEliminated = newlyEliminated[0];

  if (remainingPlayers.length === 1) {
    ns.turnOrder = remainingPlayers;
    ns.status = "finished";
    ns.winner = remainingPlayers[0];
    ns.currentTurn = remainingPlayers[0];
    return ns;
  }
  ns.turnOrder = remainingPlayers;

  if (piece.type === "executioner") {
    const board = ns.boards[to.boardId];
    const ax = getAxeSwingSquaresTri16(board, to.row, to.col, piece.color, to.boardId);
    if (ax.length > 0) {
      ns.pendingAxeSquare = to;
      ns.specialMode = "executioner-axe-swing";
      ns.spellMessage = "⚔️ Executioner: click an adjacent enemy to swing the axe, or elsewhere to skip.";
      return ns;
    }
  }

  if (piece.type === "super-queen" && !piece.sorceressDead && ns.turnMovesLeft > 1) {
    ns.turnMovesLeft = ns.turnMovesLeft - 1;
    ns.specialMode = "super-queen-second-move";
    ns.spellMessage = "👑 Super Queen can move again!";
    ns.selectedSquare = to;
    ns.validMoves = getLegalMovesTri16(ns, to);
    return ns;
  }

  return advanceTurnTri16(ns);
}

export function applyAxeSwingTri16(state: TriGameState16, tSq: TriSquare): TriGameState16 {
  const ns = cloneTriGameState16(state);
  const board = ns.boards[tSq.boardId];
  const t = board[tSq.row][tSq.col];
  if (!t) return advanceTurnTri16(ns);

  ns.capturedBy[ns.currentTurn].push(t);
  // Axe swing always removes the target as a normal capture — including a
  // king — without eliminating the player by itself (fixing the classic
  // 16x16's leftover king-capture-elimination inconsistency in this one
  // path; the rest of that file is already piece-count-based).
  board[tSq.row][tSq.col] = null;

  const remainingPlayers = getRemainingPlayersTri16(ns.boards, ns.turnOrder);
  const newlyEliminated = ALL_COLORS.filter(p => !remainingPlayers.includes(p) && !ns.eliminatedPlayers.includes(p));
  ns.eliminatedPlayers = ALL_COLORS.filter(p => !remainingPlayers.includes(p));
  if (newlyEliminated.length > 0) ns.justEliminated = newlyEliminated[0];

  if (remainingPlayers.length === 1) {
    ns.turnOrder = remainingPlayers;
    ns.status = "finished";
    ns.winner = remainingPlayers[0];
    ns.currentTurn = remainingPlayers[0];
    return ns;
  }
  ns.turnOrder = remainingPlayers;

  return advanceTurnTri16(ns);
}

/**
 * Forced elimination for a player who left the game (manual surrender or
 * disconnect) — same pattern as Tri 8x8/12x12's version: removal from
 * `turnOrder` is explicit rather than piece-count-derived, since a player
 * who quits may still have pieces on the board at the moment they leave.
 */
export function eliminatePlayerTri16(state: TriGameState16, color: TriColor): TriGameState16 {
  const ns = cloneTriGameState16(state);
  eliminateColorFromAllBoards(ns.boards, color);

  ns.selectedSquare = null;
  ns.validMoves = [];
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null;
  ns.wishDiceResult = null; ns.pendingAxeSquare = null;

  if (!ns.eliminatedPlayers.includes(color)) ns.eliminatedPlayers.push(color);
  const remainingPlayers = ns.turnOrder.filter(p => p !== color);

  if (remainingPlayers.length === 1) {
    ns.turnOrder = remainingPlayers;
    ns.status = "finished";
    ns.winner = remainingPlayers[0];
    ns.currentTurn = remainingPlayers[0];
    return ns;
  }

  if (ns.currentTurn === color) {
    let next = getNextTurn(color, ns.turnOrder);
    while (!remainingPlayers.includes(next)) {
      next = getNextTurn(next, ns.turnOrder);
    }
    ns.currentTurn = next;
  }

  ns.turnOrder = remainingPlayers;
  ns.status = "playing";
  return ns;
}

export function passTurnTri16(state: TriGameState16): TriGameState16 {
  const ns = cloneTriGameState16(state);
  const color = ns.currentTurn;

  if (ns.passUsed[color]) return state;

  ns.passUsed[color] = true;
  ns.currentTurn = getNextTurn(color, ns.turnOrder);
  ns.selectedSquare = null;
  ns.validMoves = [];
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null;
  ns.wishDiceResult = null; ns.pendingAxeSquare = null;
  ns.lastMoveQuality = null;

  return ns;
}
