export type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "paladin";
export type TriColor = "white" | "black" | "grey";
export type TriBoardId = "A" | "B" | "C" | "T";

export const ALL_COLORS: TriColor[] = ["white", "black", "grey"];

export const KINGDOM_BOARD_IDS: TriBoardId[] = ["A", "B", "C"];
export const ALL_BOARD_IDS: TriBoardId[] = ["A", "B", "C", "T"];

export interface Piece {
  type: PieceType;
  color: TriColor;
  id: string;
  hasMoved?: boolean;
  paladanSuperUsed?: boolean;
}

export interface Square {
  row: number;
  col: number;
}

export interface TriSquare extends Square {
  boardId: TriBoardId;
}

export type Board = (Piece | null)[][];

export interface TriGameState8 {
  boards: Record<TriBoardId, Board>;
  currentTurn: TriColor;
  turnOrder: TriColor[];
  eliminatedPlayers: TriColor[];
  capturedBy: Record<TriColor, Piece[]>;
  selectedSquare: TriSquare | null;
  validMoves: TriSquare[];
  superMoves: TriSquare[];
  superMoveMode: boolean;
  status: "playing" | "finished";
  winner: TriColor | null;
  check: TriColor | null;
  lastMove: { from: TriSquare; to: TriSquare } | null;
  passUsed: Record<TriColor, boolean>;
  lastMoveQuality: "great" | "risky" | "normal" | null;
  lastMoveTo: TriSquare | null;
}

const PIECE_VALUE: Record<PieceType, number> = {
  king: 100,
  queen: 9,
  rook: 5,
  bishop: 3,
  knight: 3,
  paladin: 2,
};

// ─── GEOMETRY ──────────────────────────────────────────────────────────────
// Kingdom boards (A/B/C) are plain 8x8 grids. The shared battlefield ("T") is
// an isoceles triangle stored as a fixed-width 8-row x 15-col array so the
// exact same (row, col) move math works everywhere — only the bounds check
// differs. Row 0 = apex (1 cell), row 7 = base (15 cells), columns centered
// on col 7. Cells outside the triangular mask are permanently unused.
export const KINGDOM_SIZE = 8;
export const TRI_ROWS = 8;
export const TRI_COL_CENTER = 7;
export const TRI_COLS = 15;

export function inBoundsFor(boardId: TriBoardId, r: number, c: number): boolean {
  if (boardId === "T") {
    return r >= 0 && r < TRI_ROWS && c >= TRI_COL_CENTER - r && c <= TRI_COL_CENTER + r;
  }
  return r >= 0 && r < KINGDOM_SIZE && c >= 0 && c < KINGDOM_SIZE;
}

export const squareEquals = (a: Square, b: Square) =>
  a.row === b.row && a.col === b.col;

export const triSquareEquals = (a: TriSquare, b: TriSquare) =>
  a.boardId === b.boardId && a.row === b.row && a.col === b.col;

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

export function cloneBoards(boards: Record<TriBoardId, Board>): Record<TriBoardId, Board> {
  const out = {} as Record<TriBoardId, Board>;
  for (const id of ALL_BOARD_IDS) out[id] = cloneBoard(boards[id]);
  return out;
}

export function cloneTriGameState(state: TriGameState8): TriGameState8 {
  return {
    ...state,
    boards: cloneBoards(state.boards),
    turnOrder: [...state.turnOrder],
    eliminatedPlayers: [...state.eliminatedPlayers],
    capturedBy: {
      white: [...state.capturedBy.white],
      black: [...state.capturedBy.black],
      grey: [...state.capturedBy.grey],
    },
    validMoves: [...state.validMoves],
    superMoves: [...state.superMoves],
    passUsed: { ...state.passUsed },
  };
}

function mkPiece(type: PieceType, color: TriColor, id: string): Piece {
  return {
    type,
    color,
    id,
    hasMoved: false,
    paladanSuperUsed: false,
  };
}

export function createEmptyBoard(): Board {
  return Array(8).fill(null).map(() => Array(8).fill(null));
}

export function createEmptyTriBoard(): Board {
  return Array(TRI_ROWS).fill(null).map(() => Array(TRI_COLS).fill(null));
}

/**
 * Each player starts on their own kingdom board, positioned on the edge
 * FARTHEST from their connector so they must march toward the Tri Gate:
 * White sits above the battlefield and starts at the top (row 0/1) of its
 * board, since its connector is on row 7. Black and Grey sit below the
 * battlefield and start at the bottom (row 6/7) of their boards, since their
 * connectors are on row 0.
 * Board A = white, Board B = black, Board C = grey.
 * Board T is the shared triangular battlefield — empty until pieces cross into it.
 */
export function createPlayerBoard(color: TriColor): Board {
  const b = createEmptyBoard();
  const back: PieceType[] = ["rook", "knight", "bishop", "king", "queen", "bishop", "knight", "rook"];

  const backRow = color === "white" ? 0 : 7;
  const frontRow = color === "white" ? 1 : 6;
  const prefix = color[0];

  back.forEach((type, col) => {
    b[backRow][col] = mkPiece(type, color, `${prefix}-${type}-${col}`);
  });

  for (let col = 0; col < 8; col++) {
    b[frontRow][col] = mkPiece("paladin", color, `${prefix}-pal-${col}`);
  }

  return b;
}

export function createInitialTriGameState8(): TriGameState8 {
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
    capturedBy: {
      white: [],
      black: [],
      grey: [],
    },
    selectedSquare: null,
    validMoves: [],
    superMoves: [],
    superMoveMode: false,
    status: "playing",
    winner: null,
    check: null,
    lastMove: null,
    passUsed: {
      white: false,
      black: false,
      grey: false,
    },
    lastMoveQuality: null,
    lastMoveTo: null,
  };
}

// ─── MOVEMENT ────────────────────────────────────────────────────────────────
// Same movement math as the classic 8x8 board — only the bounds check is
// parameterized per board, so a rook/bishop/queen slides, a knight jumps, and
// a king/paladin steps identically whether it's on a kingdom board or the
// triangular battlefield.
function slide(board: Board, row: number, col: number, dirs: [number, number][], boardId: TriBoardId): Square[] {
  const piece = board[row][col];
  if (!piece) return [];

  const moves: Square[] = [];

  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;

    while (inBoundsFor(boardId, r, c)) {
      const target = board[r][c];

      if (!target) {
        moves.push({ row: r, col: c });
      } else {
        if (target.color !== piece.color) moves.push({ row: r, col: c });
        break;
      }

      r += dr;
      c += dc;
    }
  }

  return moves;
}

export function getNormalMoves(board: Board, row: number, col: number, boardId: TriBoardId): Square[] {
  const piece = board[row][col];
  if (!piece) return [];

  const moves: Square[] = [];

  switch (piece.type) {
    case "king": {
      const dirs: [number, number][] = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ];

      dirs.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (inBoundsFor(boardId, r, c) && board[r][c]?.color !== piece.color) {
          moves.push({ row: r, col: c });
        }
      });
      break;
    }

    case "queen":
      moves.push(...slide(board, row, col, [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ], boardId));
      break;

    case "rook":
      moves.push(...slide(board, row, col, [
        [-1, 0], [1, 0], [0, -1], [0, 1],
      ], boardId));
      break;

    case "bishop":
      moves.push(...slide(board, row, col, [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ], boardId));
      break;

    case "knight": {
      const jumps: [number, number][] = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];

      jumps.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (inBoundsFor(boardId, r, c) && board[r][c]?.color !== piece.color) {
          moves.push({ row: r, col: c });
        }
      });
      break;
    }

    case "paladin": {
      const dirs: [number, number][] = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ];

      dirs.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (inBoundsFor(boardId, r, c) && board[r][c]?.color !== piece.color) {
          moves.push({ row: r, col: c });
        }
      });
      break;
    }
  }

  return moves;
}

export function getSuperMoves(board: Board, row: number, col: number, boardId: TriBoardId): Square[] {
  const piece = board[row][col];

  if (!piece || piece.type !== "paladin" || piece.paladanSuperUsed) return [];

  const moves: Square[] = [];
  const dirs: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  for (const [dr, dc] of dirs) {
    const r = row + dr * 2;
    const c = col + dc * 2;

    if (!inBoundsFor(boardId, r, c) || board[r][c]?.color === piece.color) continue;

    const isStraight = Math.abs(dr) + Math.abs(dc) === 1;

    if (isStraight) {
      moves.push({ row: r, col: c });
    } else {
      const midR = row + dr;
      const midC = col + dc;
      if (!board[midR][midC]) moves.push({ row: r, col: c });
    }
  }

  return moves;
}

// ─── CONNECTORS ────────────────────────────────────────────────────────────
// One-way doorways: 3 cells on the edge of each kingdom board nearest the
// triangle, each mapped to a specific cell on the shared battlefield. A piece
// standing on one of these cells gains an extra move onto the battlefield.
// There is no move back — once a piece is on "T" it stays there.
interface ConnectorLink {
  from: Square;
  to: Square;
}

const CONNECTOR_LINKS: Record<TriColor, ConnectorLink[]> = {
  white: [
    { from: { row: 7, col: 3 }, to: { row: 1, col: 6 } },
    { from: { row: 7, col: 4 }, to: { row: 1, col: 7 } },
    { from: { row: 7, col: 5 }, to: { row: 1, col: 8 } },
  ],
  black: [
    { from: { row: 0, col: 5 }, to: { row: 7, col: 0 } },
    { from: { row: 0, col: 6 }, to: { row: 7, col: 1 } },
    { from: { row: 0, col: 7 }, to: { row: 7, col: 2 } },
  ],
  grey: [
    { from: { row: 0, col: 0 }, to: { row: 7, col: 12 } },
    { from: { row: 0, col: 1 }, to: { row: 7, col: 13 } },
    { from: { row: 0, col: 2 }, to: { row: 7, col: 14 } },
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

export function getLegalMovesTri8(state: TriGameState8, from: TriSquare): TriSquare[] {
  const board = state.boards[from.boardId];
  const piece = board[from.row][from.col];

  if (!piece || piece.color !== state.currentTurn) return [];

  const normal = getNormalMoves(board, from.row, from.col, from.boardId).map(m => ({
    boardId: from.boardId,
    row: m.row,
    col: m.col,
  }));

  const moves = [...normal];

  if (from.boardId !== "T") {
    const crossing = getConnectorCrossing(piece.color, from);
    if (crossing) {
      const target = state.boards.T[crossing.row][crossing.col];
      if (!target || target.color !== piece.color) moves.push(crossing);
    }
  }

  return moves;
}

export function getLegalSuperMovesTri8(state: TriGameState8, from: TriSquare): TriSquare[] {
  const board = state.boards[from.boardId];
  const piece = board[from.row][from.col];

  if (!piece || piece.color !== state.currentTurn) return [];

  return getSuperMoves(board, from.row, from.col, from.boardId).map(m => ({
    boardId: from.boardId,
    row: m.row,
    col: m.col,
  }));
}

function countPiecesOnAllBoards(boards: Record<TriBoardId, Board>, color: TriColor): number {
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

function getRemainingPlayers(boards: Record<TriBoardId, Board>, turnOrder: TriColor[]): TriColor[] {
  return turnOrder.filter(color => countPiecesOnAllBoards(boards, color) > 0);
}

function getNextTurn(current: TriColor, turnOrder: TriColor[]): TriColor {
  const idx = turnOrder.indexOf(current);
  return turnOrder[(idx + 1) % turnOrder.length];
}

function evaluateMoveQuality(
  piece: Piece,
  captured: Piece | null
): "great" | "risky" | "normal" {
  let score = 0;

  if (captured) score += PIECE_VALUE[captured.type] * 2;

  if (score >= 4) return "great";
  if (score <= -4) return "risky";
  return "normal";
}

export function executeMoveTri8(
  state: TriGameState8,
  from: TriSquare,
  to: TriSquare,
  isSuper = false
): TriGameState8 {
  const ns = cloneTriGameState(state);

  const fromBoard = ns.boards[from.boardId];
  const toBoard = ns.boards[to.boardId];

  const piece = fromBoard[from.row][from.col];
  if (!piece) return state;

  const target = toBoard[to.row][to.col];

  if (target) {
    ns.capturedBy[piece.color].push(target);
  }

  ns.lastMoveQuality = evaluateMoveQuality(piece, target);
  ns.lastMoveTo = to;

  toBoard[to.row][to.col] = {
    ...piece,
    hasMoved: true,
    paladanSuperUsed: isSuper ? true : piece.paladanSuperUsed,
  };

  fromBoard[from.row][from.col] = null;

  ns.lastMove = { from, to };
  ns.selectedSquare = null;
  ns.validMoves = [];
  ns.superMoves = [];
  ns.superMoveMode = false;

  // Elimination must be tracked against the FULL original color set, not the
  // already-shrunk turnOrder — otherwise a color eliminated on move N drops
  // out of turnOrder and this filter can no longer "see" it, silently
  // wiping the eliminated flag back off on move N+1.
  const remainingPlayers = getRemainingPlayers(ns.boards, ns.turnOrder);
  ns.eliminatedPlayers = ALL_COLORS.filter(p => !remainingPlayers.includes(p));

  if (remainingPlayers.length === 1) {
    ns.status = "finished";
    ns.winner = remainingPlayers[0];
    return ns;
  }

  ns.turnOrder = remainingPlayers;
  ns.currentTurn = getNextTurn(piece.color, ns.turnOrder);
  ns.status = "playing";
  ns.check = null;

  return ns;
}

/**
 * Forced elimination for a player who left the game (manual surrender or
 * disconnect) — clears their pieces from every board and then runs through
 * the exact same remaining-players/winner check `executeMoveTri8` uses after
 * a capture, so a departure converges to a winner via the identical path.
 */
export function eliminatePlayerTri8(state: TriGameState8, color: TriColor): TriGameState8 {
  const ns = cloneTriGameState(state);

  for (const boardId of ALL_BOARD_IDS) {
    const board = ns.boards[boardId];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (board[r][c]?.color === color) board[r][c] = null;
      }
    }
  }

  ns.selectedSquare = null;
  ns.validMoves = [];
  ns.superMoves = [];
  ns.superMoveMode = false;

  const remainingPlayers = getRemainingPlayers(ns.boards, ns.turnOrder);
  ns.eliminatedPlayers = ALL_COLORS.filter(p => !remainingPlayers.includes(p));

  if (remainingPlayers.length === 1) {
    ns.status = "finished";
    ns.winner = remainingPlayers[0];
    return ns;
  }

  if (ns.currentTurn === color) {
    // Walk the original (pre-departure) turn order to find the next player
    // who's still in the game, rather than assuming the departed color was
    // last in line.
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

export function passTurnTri8(state: TriGameState8): TriGameState8 {
  const ns = cloneTriGameState(state);
  const color = ns.currentTurn;

  if (ns.passUsed[color]) return state;

  ns.passUsed[color] = true;
  ns.currentTurn = getNextTurn(color, ns.turnOrder);
  ns.selectedSquare = null;
  ns.validMoves = [];
  ns.superMoves = [];
  ns.superMoveMode = false;
  ns.lastMoveQuality = null;
  ns.lastMoveTo = null;

  return ns;
}
