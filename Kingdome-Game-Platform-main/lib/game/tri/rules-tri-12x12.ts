export type PieceType12 =
  | "mystic-king" | "super-queen" | "dragon" | "gargoyle"
  | "wizard" | "sorceress" | "super-knight" | "assassin"
  | "executioner" | "cavalier" | "mage" | "elvin-archer" | "paladin";

export type TriColor = "white" | "black" | "grey";
export type TriBoardId = "A" | "B" | "C" | "T";

export const ALL_COLORS: TriColor[] = ["white", "black", "grey"];
export const KINGDOM_BOARD_IDS: TriBoardId[] = ["A", "B", "C"];
export const ALL_BOARD_IDS: TriBoardId[] = ["A", "B", "C", "T"];

export interface Piece12 {
  id: string;
  type: PieceType12;
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
}

export interface Square {
  row: number;
  col: number;
}

export interface TriSquare extends Square {
  boardId: TriBoardId;
}

export type Board12 = (Piece12 | null)[][];

export type SpecialMode =
  | null | "wizard-teleport-select-piece" | "wizard-teleport-select-dest"
  | "sorceress-sleep-select" | "sorceress-teleport-select"
  | "executioner-axe-swing" | "super-queen-second-move";

export interface TriGameState12 {
  boards: Record<TriBoardId, Board12>;
  currentTurn: TriColor;
  turnOrder: TriColor[];
  eliminatedPlayers: TriColor[];
  capturedBy: Record<TriColor, Piece12[]>;
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
}

// ─── GEOMETRY ────────────────────────────────────────────────────────────────
// Kingdom boards (A/B/C) are plain 12x12 grids. The shared battlefield ("T")
// is an isoceles triangle stored as a fixed-width 12-row x 23-col array, mask
// applied purely via the bounds check (same technique as the 8x8 Tri board,
// scaled up: TRI_ROWS = KINGDOM_SIZE, TRI_COLS = 2*(TRI_ROWS-1)+1).
export const KINGDOM_SIZE = 12;
export const TRI_ROWS = 12;
export const TRI_COL_CENTER = 11;
export const TRI_COLS = 23;

export function inBoundsFor(boardId: TriBoardId, r: number, c: number): boolean {
  if (boardId === "T") {
    return r >= 0 && r < TRI_ROWS && c >= TRI_COL_CENTER - r && c <= TRI_COL_CENTER + r;
  }
  return r >= 0 && r < KINGDOM_SIZE && c >= 0 && c < KINGDOM_SIZE;
}

export const squareEquals = (a: Square, b: Square) => a.row === b.row && a.col === b.col;
export const triSquareEquals = (a: TriSquare, b: TriSquare) =>
  a.boardId === b.boardId && a.row === b.row && a.col === b.col;

export function cloneBoard12(board: Board12): Board12 {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

export function cloneBoardsTri12(boards: Record<TriBoardId, Board12>): Record<TriBoardId, Board12> {
  const out = {} as Record<TriBoardId, Board12>;
  for (const id of ALL_BOARD_IDS) out[id] = cloneBoard12(boards[id]);
  return out;
}

export function cloneTriGameState12(state: TriGameState12): TriGameState12 {
  return {
    ...state,
    boards: cloneBoardsTri12(state.boards),
    turnOrder: [...state.turnOrder],
    eliminatedPlayers: [...state.eliminatedPlayers],
    capturedBy: {
      white: [...state.capturedBy.white],
      black: [...state.capturedBy.black],
      grey: [...state.capturedBy.grey],
    },
    validMoves: [...state.validMoves],
    specialData: state.specialData ? { ...state.specialData } : null,
  };
}

function mkPiece(type: PieceType12, color: TriColor, id: string): Piece12 {
  return {
    id, type, color,
    hasMoved: false,
    paladanSuperUsed: false,
    superKnightJumpsLeft: 2,
    sorceressSpellsLeft: 3,
    sorceressDead: false,
    sleepRoundsLeft: 0,
    isEthereal: type === "wizard" || type === "sorceress",
    executionerAxeUsed: false,
    superQueenDoubleJumpDone: false,
    mageSacrificed: false,
  };
}

// ─── PIECE ART ───────────────────────────────────────────────────────────────
// Same art as the classic 12x12 board — some types alias to shared artwork
// (cavalier→Mystic King, mage→Sorceress, elvin-archer→Assassin), matching
// `pieceImagePath` in lib/game/rules-12x12.ts.
export function pieceImagePathTri12(p: Piece12): string {
  const nm: Record<PieceType12, string> = {
    "mystic-king": "Mystic King",
    "super-queen": "Super Queen",
    "dragon": "Dragon",
    "gargoyle": "Gargoyle",
    "wizard": "Wizard",
    "sorceress": "Sorceress",
    "super-knight": "Super Knight",
    "assassin": "Assassin",
    "executioner": "Executioner",
    "cavalier": "Mystic King",
    "mage": "Sorceress",
    "elvin-archer": "Assassin",
    "paladin": "Paladin",
  };
  const label = p.color === "white" ? "White" : p.color === "black" ? "Black" : "Gray";
  const base = nm[p.type];
  // The grey Paladin asset is named without the " - " separator the other
  // colors/pieces use (public/pieces-12x12/grey/Paladin Gray.png) — match
  // the actual filenames on disk rather than assuming a uniform pattern.
  const sep = base === "Paladin" && p.color !== "grey" ? " - " : " ";
  return `/pieces-12x12/${p.color}/${base}${sep}${label}.png`;
}

// ─── BOARD SETUP ─────────────────────────────────────────────────────────────
// Same 12-wide back/front rank layout as the classic board, reused verbatim
// (just recolored per kingdom).
const BACK: PieceType12[] = [
  "executioner", "assassin", "super-knight", "dragon", "sorceress", "super-queen",
  "mystic-king", "wizard", "gargoyle", "super-knight", "assassin", "executioner",
];

const FRONT: PieceType12[] = [
  "elvin-archer", "cavalier", "mage", "paladin", "paladin", "paladin",
  "paladin", "paladin", "paladin", "mage", "cavalier", "elvin-archer",
];

export function createEmptyBoard(): Board12 {
  return Array(KINGDOM_SIZE).fill(null).map(() => Array(KINGDOM_SIZE).fill(null));
}

export function createEmptyTriBoard(): Board12 {
  return Array(TRI_ROWS).fill(null).map(() => Array(TRI_COLS).fill(null));
}

/**
 * Each player starts on the edge of their kingdom FARTHEST from their
 * connector (same placement rule as Tri 8x8): White sits above the
 * battlefield and starts at the top (rows 0/1), since its connector is on
 * row KINGDOM_SIZE-1. Black and Grey sit below the battlefield and start at
 * the bottom (rows KINGDOM_SIZE-2/KINGDOM_SIZE-1), since their connectors
 * are on row 0.
 */
export function createPlayerBoard(color: TriColor): Board12 {
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

export function createInitialTriGameState12(): TriGameState12 {
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
  };
}

// ─── MOVEMENT ────────────────────────────────────────────────────────────────
// Same shapes as the classic 12x12 board's move generators, parameterized by
// boardId so a piece slides/jumps/steps identically on a kingdom board or on
// the shared triangular battlefield.
const ALL8: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
const ST4: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const KJ: [number, number][] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

function slide(board: Board12, r: number, c: number, dirs: [number, number][], boardId: TriBoardId, color: TriColor): Square[] {
  const m: Square[] = [];
  for (const [dr, dc] of dirs) {
    let rr = r + dr, cc = c + dc;
    while (inBoundsFor(boardId, rr, cc)) {
      const t = board[rr][cc];
      if (!t) { m.push({ row: rr, col: cc }); }
      else { if (t.color !== color) m.push({ row: rr, col: cc }); break; }
      rr += dr; cc += dc;
    }
  }
  return m;
}

function lj(board: Board12, r: number, c: number, boardId: TriBoardId, color: TriColor): Square[] {
  return KJ.map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
    .filter(s => inBoundsFor(boardId, s.row, s.col) && board[s.row][s.col]?.color !== color);
}

function os(board: Board12, r: number, c: number, boardId: TriBoardId, color: TriColor): Square[] {
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

export function getRawMovesTri12(board: Board12, r: number, c: number, boardId: TriBoardId): Square[] {
  const p = board[r][c];
  if (!p || p.sleepRoundsLeft > 0) return [];
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
      m = [
        ...slide(board, r, c, ALL8, boardId, color),
        ...lj(board, r, c, boardId, color).filter(s => board[s.row][s.col] && board[s.row][s.col]!.color !== color),
      ];
      break;
    case "wizard":
      for (const [dr, dc] of ALL8) {
        let rr = r + dr, cc = c + dc;
        while (inBoundsFor(boardId, rr, cc)) {
          const t = board[rr][cc];
          if (!t) { m.push({ row: rr, col: cc }); }
          else { if (t.color !== color && (t.type === "wizard" || t.type === "sorceress")) m.push({ row: rr, col: cc }); break; }
          rr += dr; cc += dc;
        }
      }
      break;
    case "sorceress":
      m = slide(board, r, c, ALL8, boardId, color);
      break;
    case "super-knight":
      m = lj(board, r, c, boardId, color);
      break;
    case "assassin":
      m = [...slide(board, r, c, ALL8, boardId, color), ...lj(board, r, c, boardId, color), ...os(board, r, c, boardId, color)];
      break;
    case "executioner":
      m = slide(board, r, c, ST4, boardId, color);
      break;
    case "cavalier":
      m = [...lj(board, r, c, boardId, color), ...os(board, r, c, boardId, color)];
      break;
    case "mage":
      m = slide(board, r, c, ALL8, boardId, color);
      break;
    case "elvin-archer":
      m = [...slide(board, r, c, ALL8, boardId, color), ...lj(board, r, c, boardId, color), ...os(board, r, c, boardId, color)];
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
// A king can only be threatened by pieces on the SAME board it currently sits
// on (consistent with the rest of Tri's same-board-only philosophy — attacks,
// like spells, never reach across boards; only the connector-crossing move
// itself crosses boards).
export function findKingTri12(boards: Record<TriBoardId, Board12>, color: TriColor): TriSquare | null {
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

export function isKingInCheckTri12(boards: Record<TriBoardId, Board12>, color: TriColor, turnOrder: TriColor[]): boolean {
  const k = findKingTri12(boards, color);
  if (!k) return false;
  const board = boards[k.boardId];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (p && p.color !== color && turnOrder.includes(p.color)) {
        if (getRawMovesTri12(board, r, c, k.boardId).some(m => m.row === k.row && m.col === k.col)) return true;
      }
    }
  }
  return false;
}

function simulateMoveTri12(boards: Record<TriBoardId, Board12>, from: TriSquare, to: TriSquare): Record<TriBoardId, Board12> {
  const clone = cloneBoardsTri12(boards);
  const fromBoard = clone[from.boardId];
  const toBoard = clone[to.boardId];
  const piece = fromBoard[from.row][from.col];
  toBoard[to.row][to.col] = piece;
  fromBoard[from.row][from.col] = null;
  return clone;
}

// ─── CONNECTORS ──────────────────────────────────────────────────────────────
// One-way doorways: 3 cells on the edge of each kingdom board nearest the
// triangle, each mapped to a specific cell on the shared battlefield — same
// mechanic as Tri 8x8, coordinates recomputed for the bigger board:
//   kingdom-side (`from`): center 3 columns [4,5,6] of the 12-wide edge.
//   triangle-side (`to`): white lands just below the apex (row 1, columns
//     straddling TRI_COL_CENTER); black lands on the base's left flank; grey
//     lands on the base's right flank.
interface ConnectorLink { from: Square; to: Square; }

const CONNECTOR_LINKS: Record<TriColor, ConnectorLink[]> = {
  white: [
    { from: { row: KINGDOM_SIZE - 1, col: 4 }, to: { row: 1, col: TRI_COL_CENTER - 1 } },
    { from: { row: KINGDOM_SIZE - 1, col: 5 }, to: { row: 1, col: TRI_COL_CENTER } },
    { from: { row: KINGDOM_SIZE - 1, col: 6 }, to: { row: 1, col: TRI_COL_CENTER + 1 } },
  ],
  black: [
    { from: { row: 0, col: 4 }, to: { row: TRI_ROWS - 1, col: 0 } },
    { from: { row: 0, col: 5 }, to: { row: TRI_ROWS - 1, col: 1 } },
    { from: { row: 0, col: 6 }, to: { row: TRI_ROWS - 1, col: 2 } },
  ],
  grey: [
    { from: { row: 0, col: 4 }, to: { row: TRI_ROWS - 1, col: TRI_COLS - 3 } },
    { from: { row: 0, col: 5 }, to: { row: TRI_ROWS - 1, col: TRI_COLS - 2 } },
    { from: { row: 0, col: 6 }, to: { row: TRI_ROWS - 1, col: TRI_COLS - 1 } },
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

export function getLegalMovesTri12(state: TriGameState12, from: TriSquare): TriSquare[] {
  const board = state.boards[from.boardId];
  const piece = board[from.row][from.col];
  if (!piece || piece.color !== state.currentTurn) return [];

  const raw = getRawMovesTri12(board, from.row, from.col, from.boardId).map(m => ({
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
    const simulated = simulateMoveTri12(state.boards, from, to);
    return !isKingInCheckTri12(simulated, piece.color, state.turnOrder);
  });
}

// ─── FIND PIECES ─────────────────────────────────────────────────────────────
export function findPieceTri12(boards: Record<TriBoardId, Board12>, color: TriColor, type: PieceType12): TriSquare | null {
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
// All spells are scoped to a single board by the CALLER (the component only
// ever passes target squares whose boardId matches the casting piece's own
// board) — these functions themselves don't re-check board equality, mirroring
// how the classic 12x12 board validates targets inline at the click-handler
// level rather than inside the apply functions.
export function applySleepSpellTri12(
  boards: Record<TriBoardId, Board12>, tSq: TriSquare, sSq: TriSquare
): Record<TriBoardId, Board12> {
  const nb = cloneBoardsTri12(boards);
  const tBoard = nb[tSq.boardId], sBoard = nb[sSq.boardId];
  const t = tBoard[tSq.row][tSq.col], s = sBoard[sSq.row][sSq.col];
  if (!t || !s) return nb;
  tBoard[tSq.row][tSq.col] = { ...t, sleepRoundsLeft: 3 };
  const left = s.sorceressSpellsLeft - 1;
  sBoard[sSq.row][sSq.col] = left <= 0 ? null : { ...s, sorceressSpellsLeft: left };
  return nb;
}

export function applyTeleportSpellTri12(
  boards: Record<TriBoardId, Board12>, pSq: TriSquare, dSq: TriSquare, sSq: TriSquare
): Record<TriBoardId, Board12> {
  const nb = cloneBoardsTri12(boards);
  const pBoard = nb[pSq.boardId], dBoard = nb[dSq.boardId], sBoard = nb[sSq.boardId];
  const p = pBoard[pSq.row][pSq.col], s = sBoard[sSq.row][sSq.col];
  if (!p || !s) return nb;
  dBoard[dSq.row][dSq.col] = p;
  pBoard[pSq.row][pSq.col] = null;
  const left = s.sorceressSpellsLeft - 1;
  sBoard[sSq.row][sSq.col] = left <= 0 ? null : { ...s, sorceressSpellsLeft: left };
  return nb;
}

export function rollWishDiceTri12(): number {
  return Math.floor(Math.random() * 10) + 1;
}

export function applyWizardTeleportTri12(
  boards: Record<TriBoardId, Board12>, pSq: TriSquare, dSq: TriSquare
): Record<TriBoardId, Board12> {
  const nb = cloneBoardsTri12(boards);
  const pBoard = nb[pSq.boardId], dBoard = nb[dSq.boardId];
  const p = pBoard[pSq.row][pSq.col];
  if (!p) return nb;
  dBoard[dSq.row][dSq.col] = p;
  pBoard[pSq.row][pSq.col] = null;
  return nb;
}

export function getAxeSwingSquaresTri12(board: Board12, r: number, c: number, color: TriColor, boardId: TriBoardId): TriSquare[] {
  return [{ row: r, col: c - 1 }, { row: r, col: c + 1 }, { row: r - 1, col: c }, { row: r + 1, col: c }]
    .filter(s => inBoundsFor(boardId, s.row, s.col) && board[s.row][s.col] !== null && board[s.row][s.col]!.color !== color)
    .map(s => ({ boardId, row: s.row, col: s.col }));
}

export function applyMageSacrificeTri12(
  boards: Record<TriBoardId, Board12>, mSq: TriSquare, qSq: TriSquare
): Record<TriBoardId, Board12> {
  const nb = cloneBoardsTri12(boards);
  const mBoard = nb[mSq.boardId], qBoard = nb[qSq.boardId];
  const q = qBoard[qSq.row][qSq.col];
  if (!q || q.type !== "super-queen") return nb;
  mBoard[mSq.row][mSq.col] = null;
  qBoard[qSq.row][qSq.col] = { ...q, superQueenDoubleJumpDone: false };
  return nb;
}

function tickSleepTri12(boards: Record<TriBoardId, Board12>, color: TriColor): Record<TriBoardId, Board12> {
  const nb = cloneBoardsTri12(boards);
  for (const boardId of ALL_BOARD_IDS) {
    const board = nb[boardId];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const p = board[r][c];
        if (p && p.color === color && p.sleepRoundsLeft > 0) {
          board[r][c] = { ...p, sleepRoundsLeft: p.sleepRoundsLeft - 1 };
        }
      }
    }
  }
  return nb;
}

// ─── MOVE QUALITY ────────────────────────────────────────────────────────────
const PIECE_VALUE: Record<PieceType12, number> = {
  "mystic-king": 10, "super-queen": 9, "dragon": 8, "gargoyle": 7, "sorceress": 7,
  "wizard": 6, "assassin": 6, "elvin-archer": 5, "super-knight": 5, "executioner": 5,
  "cavalier": 4, "mage": 4, "paladin": 2,
};

function evaluateMoveQualityTri12(
  to: TriSquare,
  piece: Piece12,
  captured: Piece12 | null,
  newBoards: Record<TriBoardId, Board12>,
  turnOrder: TriColor[]
): "great" | "risky" | "normal" {
  let score = 0;
  if (captured) score += PIECE_VALUE[captured.type] * 2;

  for (const enemy of turnOrder) {
    if (enemy !== piece.color && isKingInCheckTri12(newBoards, enemy, turnOrder)) score += 5;
  }
  if (isKingInCheckTri12(newBoards, piece.color, turnOrder)) score -= 8;

  const destBoard = newBoards[to.boardId];
  const enemies = turnOrder.filter(c => c !== piece.color);
  let threatened = 0;
  for (let r = 0; r < destBoard.length; r++) {
    for (let c = 0; c < destBoard[r].length; c++) {
      const ep = destBoard[r][c];
      if (ep && enemies.includes(ep.color) && getRawMovesTri12(destBoard, r, c, to.boardId).some(m => m.row === to.row && m.col === to.col)) {
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
// every board — capturing their Mystic King is just a normal capture, not an
// elimination trigger. Elimination is recomputed against the FULL ALL_COLORS
// set (not the already-shrunk turnOrder) every time, mirroring Tri 8x8's
// executeMoveTri8: otherwise a color that drops out of turnOrder could no
// longer be "seen" by the filter and would silently un-eliminate.
function getNextTurn(current: TriColor, turnOrder: TriColor[]): TriColor {
  const idx = turnOrder.indexOf(current);
  return turnOrder[(idx + 1) % turnOrder.length];
}

function countPiecesTri12(boards: Record<TriBoardId, Board12>, color: TriColor): number {
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

function getRemainingPlayersTri12(boards: Record<TriBoardId, Board12>, turnOrder: TriColor[]): TriColor[] {
  return turnOrder.filter(color => countPiecesTri12(boards, color) > 0);
}

function eliminateColorFromAllBoards(boards: Record<TriBoardId, Board12>, color: TriColor): void {
  for (const boardId of ALL_BOARD_IDS) {
    const b = boards[boardId];
    for (let r = 0; r < b.length; r++) {
      for (let c = 0; c < b[r].length; c++) {
        if (b[r][c]?.color === color) b[r][c] = null;
      }
    }
  }
}

export function advanceTurnTri12(state: TriGameState12): TriGameState12 {
  const ns = cloneTriGameState12(state);
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null;
  ns.pendingAxeSquare = null; ns.selectedSquare = null; ns.validMoves = [];
  ns.justEliminated = null;

  if (ns.turnOrder.length === 1) {
    ns.status = "finished";
    ns.winner = ns.turnOrder[0];
    ns.currentTurn = ns.turnOrder[0];
    return ns;
  }

  const idx = ns.turnOrder.indexOf(ns.currentTurn);
  ns.currentTurn = ns.turnOrder[(idx + 1) % ns.turnOrder.length];
  ns.turnMovesLeft = 1;

  ns.boards = tickSleepTri12(ns.boards, ns.currentTurn);

  const hasSorc = findPieceTri12(ns.boards, ns.currentTurn, "sorceress") !== null;
  if (hasSorc) ns.turnMovesLeft = 2;

  ns.check = null;
  for (const player of ns.turnOrder) {
    if (isKingInCheckTri12(ns.boards, player, ns.turnOrder)) { ns.check = player; break; }
  }

  return ns;
}

export function executeMoveTri12(state: TriGameState12, from: TriSquare, to: TriSquare): TriGameState12 {
  const ns = cloneTriGameState12(state);
  const fromBoard = ns.boards[from.boardId];
  const toBoard = ns.boards[to.boardId];
  const piece = fromBoard[from.row][from.col];
  if (!piece) return state;

  const target = toBoard[to.row][to.col];
  ns.justEliminated = null;

  if (target) {
    ns.capturedBy[piece.color].push(target);

    // King capture is a normal capture only — it does NOT eliminate the
    // player. Elimination is determined below, purely by piece count.
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

  const newBoardsPreview = cloneBoardsTri12(ns.boards);
  newBoardsPreview[to.boardId][to.row][to.col] = piece;
  newBoardsPreview[from.boardId][from.row][from.col] = null;
  ns.lastMoveQuality = evaluateMoveQualityTri12(to, piece, target, newBoardsPreview, ns.turnOrder);

  toBoard[to.row][to.col] = {
    ...piece,
    hasMoved: true,
    paladanSuperUsed: isSuperPaladinMove ? true : piece.paladanSuperUsed,
    executionerAxeUsed: false,
  };
  fromBoard[from.row][from.col] = null;

  ns.lastMove = { from, to };
  ns.selectedSquare = null; ns.validMoves = [];
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null; ns.wishDiceResult = null;

  const remainingPlayers = getRemainingPlayersTri12(ns.boards, ns.turnOrder);
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
    const ax = getAxeSwingSquaresTri12(board, to.row, to.col, piece.color, to.boardId);
    if (ax.length > 0) {
      ns.pendingAxeSquare = to;
      ns.specialMode = "executioner-axe-swing";
      ns.spellMessage = "Executioner: click an adjacent enemy to swing the axe, or elsewhere to skip.";
      return ns;
    }
  }

  if (piece.type === "super-queen" && !piece.sorceressDead && ns.turnMovesLeft > 1) {
    ns.turnMovesLeft = ns.turnMovesLeft - 1;
    ns.specialMode = "super-queen-second-move";
    ns.spellMessage = "Super Queen can move again!";
    ns.selectedSquare = to;
    ns.validMoves = getLegalMovesTri12(ns, to);
    return ns;
  }

  return advanceTurnTri12(ns);
}

export function applyAxeSwingTri12(state: TriGameState12, tSq: TriSquare): TriGameState12 {
  const ns = cloneTriGameState12(state);
  const board = ns.boards[tSq.boardId];
  const t = board[tSq.row][tSq.col];
  if (!t) return advanceTurnTri12(ns);

  ns.capturedBy[ns.currentTurn].push(t);
  // The axe swing removes whatever it hits — including a king — as a normal
  // capture. It does not eliminate the player by itself; elimination is
  // purely piece-count-driven, checked below.
  board[tSq.row][tSq.col] = null;

  const remainingPlayers = getRemainingPlayersTri12(ns.boards, ns.turnOrder);
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

  return advanceTurnTri12(ns);
}

/**
 * Forced elimination for a player who left the game (manual surrender or
 * disconnect) — same pattern as Tri 8x8's `eliminatePlayerTri8`, but removal
 * from `turnOrder` is explicit rather than piece-count-derived, since a
 * player who quits may still have pieces (including their king) on the
 * board at the moment they leave.
 */
export function eliminatePlayerTri12(state: TriGameState12, color: TriColor): TriGameState12 {
  const ns = cloneTriGameState12(state);
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

export function passTurnTri12(state: TriGameState12): TriGameState12 {
  const ns = cloneTriGameState12(state);
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
