// ─── TYPES ───────────────────────────────────────────────────────────────────

export type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "paladin";
export type Color = "white" | "black";

export interface Piece {
  type: PieceType;
  color: Color;
  id: string;
  hasMoved?: boolean;
  paladanSuperUsed?: boolean;   // true = super attack already used, locked forever
}

export interface Square {
  row: number;
  col: number;
}

export type Board = (Piece | null)[][];

export interface GameState {
  board: Board;
  currentTurn: Color;
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  selectedSquare: Square | null;
  validMoves: Square[];
  superMoves: Square[];          // ← NEW: super attack squares shown separately
  superMoveMode: boolean;        // ← NEW: true = player pressed "Super Attack" button
  status: "playing" | "white_wins" | "black_wins" | "check";
  check: Color | null;
  lastMove: { from: Square; to: Square } | null;
  passUsed: { white: boolean; black: boolean }; // Mexican Standoff — pass turn
}

// ─── INITIAL BOARD ───────────────────────────────────────────────────────────

export function createInitialBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRow: PieceType[] = ["rook", "knight", "bishop", "king", "queen", "bishop", "knight", "rook"];

  // Black — top (rows 0, 1)
  backRow.forEach((type, col) => {
    board[0][col] = {
      type, color: "black",
      id: `black-${type}-${col}`,
      hasMoved: false,
      paladanSuperUsed: false,
    };
  });
  for (let col = 0; col < 8; col++) {
    board[1][col] = {
      type: "paladin", color: "black",
      id: `black-paladin-${col}`,
      hasMoved: false,
      paladanSuperUsed: false,
    };
  }

  // White — bottom (rows 6, 7)
  for (let col = 0; col < 8; col++) {
    board[6][col] = {
      type: "paladin", color: "white",
      id: `white-paladin-${col}`,
      hasMoved: false,
      paladanSuperUsed: false,
    };
  }
  backRow.forEach((type, col) => {
    board[7][col] = {
      type, color: "white",
      id: `white-${type}-${col}`,
      hasMoved: false,
      paladanSuperUsed: false,
    };
  });

  return board;
}

export function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    currentTurn: "white",
    capturedByWhite: [],
    capturedByBlack: [],
    selectedSquare: null,
    validMoves: [],
    superMoves: [],
    superMoveMode: false,
    status: "playing",
    check: null,
    lastMove: null,
    passUsed: { white: false, black: false },
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function squareEquals(a: Square, b: Square): boolean {
  return a.row === b.row && a.col === b.col;
}

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    board: cloneBoard(state.board),
    capturedByWhite: [...state.capturedByWhite],
    capturedByBlack: [...state.capturedByBlack],
    validMoves: [...state.validMoves],
    superMoves: [...state.superMoves],
    passUsed: { ...state.passUsed },
  };
}

// ─── MOVE GENERATION ─────────────────────────────────────────────────────────

function getSlidingMoves(board: Board, row: number, col: number, dirs: [number, number][]): Square[] {
  const piece = board[row][col]!;
  const moves: Square[] = [];
  for (const [dr, dc] of dirs) {
    let r = row + dr, c = col + dc;
    while (inBounds(r, c)) {
      if (board[r][c] === null) {
        moves.push({ row: r, col: c });
      } else {
        if (board[r][c]!.color !== piece.color) moves.push({ row: r, col: c });
        break;
      }
      r += dr; c += dc;
    }
  }
  return moves;
}

// Normal moves only (no super)
export function getNormalMoves(board: Board, row: number, col: number): Square[] {
  const piece = board[row][col];
  if (!piece) return [];

  const moves: Square[] = [];

  switch (piece.type) {
    case "king": {
      const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      for (const [dr, dc] of dirs) {
        const r = row + dr, c = col + dc;
        if (inBounds(r, c) && board[r][c]?.color !== piece.color)
          moves.push({ row: r, col: c });
      }
      break;
    }
    case "queen": {
      moves.push(...getSlidingMoves(board, row, col, [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]));
      break;
    }
    case "rook": {
      moves.push(...getSlidingMoves(board, row, col, [[-1,0],[1,0],[0,-1],[0,1]]));
      break;
    }
    case "bishop": {
      moves.push(...getSlidingMoves(board, row, col, [[-1,-1],[-1,1],[1,-1],[1,1]]));
      break;
    }
    case "knight": {
      const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of jumps) {
        const r = row + dr, c = col + dc;
        if (inBounds(r, c) && board[r][c]?.color !== piece.color)
          moves.push({ row: r, col: c });
      }
      break;
    }
    case "paladin": {
      // NORMAL only: 1 square any direction
      const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      for (const [dr, dc] of dirs) {
        const r = row + dr, c = col + dc;
        if (inBounds(r, c) && board[r][c]?.color !== piece.color)
          moves.push({ row: r, col: c });
      }
      // ← NO super moves here — super moves are separate
      break;
    }
  }

  return moves;
}

// Super moves only — paladin exclusive, once per paladin lifetime
export function getSuperMoves(board: Board, row: number, col: number): Square[] {
  const piece = board[row][col];
  if (!piece || piece.type !== "paladin") return [];

  // Already used super? Locked forever — return empty
  if (piece.paladanSuperUsed) return [];

  const moves: Square[] = [];
  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

  for (const [dr, dc] of dirs) {
    const r = row + dr * 2, c = col + dc * 2;
    if (!inBounds(r, c)) continue;
    if (board[r][c]?.color === piece.color) continue; // can't land on own piece

    const isStraight = Math.abs(dr) + Math.abs(dc) === 1;

    if (isStraight) {
      // Straight 2 squares: can jump over middle (surprise attack — always allowed)
      moves.push({ row: r, col: c });
    } else {
      // Diagonal 2 squares: mid must be clear
      const midR = row + dr, midC = col + dc;
      if (!board[midR][midC]) {
        moves.push({ row: r, col: c });
      }
    }
  }

  return moves;
}

// ─── LEGAL MOVES (filters moves that leave own king in check) ────────────────

export function getLegalMoves(board: Board, row: number, col: number): Square[] {
  const piece = board[row][col];
  if (!piece) return [];
  const raw = getNormalMoves(board, row, col);
  return raw.filter(move => {
    const testBoard = cloneBoard(board);
    testBoard[move.row][move.col] = testBoard[row][col];
    testBoard[row][col] = null;
    return !isKingInCheck(testBoard, piece.color);
  });
}

export function getLegalSuperMoves(board: Board, row: number, col: number): Square[] {
  const piece = board[row][col];
  if (!piece) return [];
  const raw = getSuperMoves(board, row, col);
  return raw.filter(move => {
    const testBoard = cloneBoard(board);
    testBoard[move.row][move.col] = testBoard[row][col];
    testBoard[row][col] = null;
    return !isKingInCheck(testBoard, piece.color);
  });
}

// ─── CHECK DETECTION ─────────────────────────────────────────────────────────

export function isKingInCheck(board: Board, color: Color): boolean {
  let kingRow = -1, kingCol = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.type === "king" && board[r][c]?.color === color) {
        kingRow = r; kingCol = c;
      }
    }
  }
  if (kingRow === -1) return false;

  const enemy = color === "white" ? "black" : "white";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === enemy) {
        // Check both normal and super moves of enemy
        const allMoves = [
          ...getNormalMoves(board, r, c),
          ...getSuperMoves(board, r, c),
        ];
        if (allMoves.some(m => m.row === kingRow && m.col === kingCol)) return true;
      }
    }
  }
  return false;
}

export function isCheckmate(board: Board, color: Color): boolean {
  if (!isKingInCheck(board, color)) return false;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === color) {
        if (getLegalMoves(board, r, c).length > 0) return false;
        if (getLegalSuperMoves(board, r, c).length > 0) return false;
      }
    }
  }
  return true;
}

// ─── MOVE EXECUTION ──────────────────────────────────────────────────────────

export function executeMove(
  state: GameState,
  from: Square,
  to: Square,
  isSuper = false,   // ← NEW flag: was this a super move?
): GameState {
  const newState = cloneGameState(state);
  const board = newState.board;
  const piece = board[from.row][from.col]!;
  const target = board[to.row][to.col];

  // Capture
  if (target) {
    if (piece.color === "white") newState.capturedByWhite.push(target);
    else newState.capturedByBlack.push(target);
  }

  // If super move — permanently mark this paladin
  board[to.row][to.col] = {
    ...piece,
    hasMoved: true,
    paladanSuperUsed: isSuper ? true : piece.paladanSuperUsed,
  };
  board[from.row][from.col] = null;

  newState.lastMove = { from, to };
  newState.selectedSquare = null;
  newState.validMoves = [];
  newState.superMoves = [];
  newState.superMoveMode = false;

  // Switch turn
  const nextTurn: Color = piece.color === "white" ? "black" : "white";
  newState.currentTurn = nextTurn;

  // Check / Checkmate
  if (isCheckmate(board, nextTurn)) {
    newState.status = piece.color === "white" ? "white_wins" : "black_wins";
  } else if (isKingInCheck(board, nextTurn)) {
    newState.check = nextTurn;
    newState.status = "check";
  } else {
    newState.check = null;
    newState.status = "playing";
  }

  return newState;
}

// ─── PASS TURN (Mexican Standoff) ────────────────────────────────────────────
// Player can pass their turn once per game — "hit the clock"

export function passTurn(state: GameState): GameState {
  const newState = cloneGameState(state);
  const color = state.currentTurn;

  // Can only pass once per player
  if (newState.passUsed[color]) return state; // already used, ignore

  newState.passUsed[color] = true;
  newState.currentTurn = color === "white" ? "black" : "white";
  newState.selectedSquare = null;
  newState.validMoves = [];
  newState.superMoves = [];
  newState.superMoveMode = false;

  return newState;
}