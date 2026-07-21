export type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "paladin";
export type Color = "white" | "black";

export interface Piece {
  type: PieceType;
  color: Color;
  id: string;
  hasMoved?: boolean;
  paladanSuperUsed?: boolean;
}

export interface Square { row: number; col: number; }
export type Board = (Piece | null)[][];

export interface GameState {
  board: Board;
  currentTurn: Color;
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  selectedSquare: Square | null;
  validMoves: Square[];
  superMoves: Square[];
  superMoveMode: boolean;
  status: "playing" | "white_wins" | "black_wins" | "check";
  check: Color | null;
  lastMove: { from: Square; to: Square } | null;
  passUsed: { white: boolean; black: boolean };
  // UX enhancements
  lastMoveQuality: "great" | "risky" | "normal" | null;
  lastMoveTo: Square | null;
  // Paladin reverse castle — squares adjacent to the selected paladin
  // occupied by a friendly non-paladin piece it can swap places with.
  castleMoves: Square[];
  // Paladin back-rank retrieval — set when a paladin reaches the enemy
  // back rank and its owner has a captured piece available to bring back.
  pendingRetrieve: { color: Color; square: Square } | null;
}

// ─── INITIAL BOARD ────────────────────────────────────────────────────────────
export function createInitialBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const back: PieceType[] = ["rook","knight","bishop","king","queen","bishop","knight","rook"];

  back.forEach((type, col) => {
    b[0][col] = { type, color:"black", id:`b-${type}-${col}`, hasMoved:false, paladanSuperUsed:false };
    b[7][col] = { type, color:"white", id:`w-${type}-${col}`, hasMoved:false, paladanSuperUsed:false };
  });
  for (let col = 0; col < 8; col++) {
    b[1][col] = { type:"paladin", color:"black", id:`b-pal-${col}`, hasMoved:false, paladanSuperUsed:false };
    b[6][col] = { type:"paladin", color:"white", id:`w-pal-${col}`, hasMoved:false, paladanSuperUsed:false };
  }
  return b;
}

export function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    currentTurn: "white",
    capturedByWhite: [], capturedByBlack: [],
    selectedSquare: null, validMoves: [], superMoves: [], superMoveMode: false,
    status: "playing", check: null, lastMove: null,
    passUsed: { white:false, black:false },
    lastMoveQuality: null, lastMoveTo: null,
    castleMoves: [], pendingRetrieve: null,
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const squareEquals = (a: Square, b: Square) => a.row === b.row && a.col === b.col;

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}
export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    board: cloneBoard(state.board),
    capturedByWhite: [...state.capturedByWhite],
    capturedByBlack: [...state.capturedByBlack],
    validMoves: [...state.validMoves],
    superMoves: [...state.superMoves],
    castleMoves: [...state.castleMoves],
    passUsed: { ...state.passUsed },
  };
}

// ─── PIECE VALUES ────────────────────────────────────────────────────────────
const PIECE_VALUE: Record<PieceType, number> = {
  king: 100, queen: 9, rook: 5, bishop: 3, knight: 3, paladin: 2,
};

// ─── MOVE GENERATION ─────────────────────────────────────────────────────────
function slide(board: Board, row: number, col: number, dirs: [number,number][]): Square[] {
  const piece = board[row][col]!;
  const moves: Square[] = [];
  for (const [dr, dc] of dirs) {
    let r = row + dr, c = col + dc;
    while (inBounds(r, c)) {
      if (!board[r][c]) { moves.push({ row:r, col:c }); }
      else { if (board[r][c]!.color !== piece.color) moves.push({ row:r, col:c }); break; }
      r += dr; c += dc;
    }
  }
  return moves;
}

export function getNormalMoves(board: Board, row: number, col: number): Square[] {
  const piece = board[row][col]; if (!piece) return [];
  const moves: Square[] = [];

  switch (piece.type) {
    case "king": {
      const dirs: [number,number][] = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      dirs.forEach(([dr,dc]) => {
        const r=row+dr, c=col+dc;
        if (inBounds(r,c) && board[r][c]?.color !== piece.color) moves.push({row:r,col:c});
      });
      break;
    }
    case "queen":
      moves.push(...slide(board,row,col,[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]));
      break;
    case "rook":
      moves.push(...slide(board,row,col,[[-1,0],[1,0],[0,-1],[0,1]]));
      break;
    case "bishop":
      moves.push(...slide(board,row,col,[[-1,-1],[-1,1],[1,-1],[1,1]]));
      break;
    case "knight": {
      const jumps: [number,number][] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      jumps.forEach(([dr,dc]) => {
        const r=row+dr, c=col+dc;
        if (inBounds(r,c) && board[r][c]?.color !== piece.color) moves.push({row:r,col:c});
      });
      break;
    }
    case "paladin": {
      const dirs: [number,number][] = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      dirs.forEach(([dr,dc]) => {
        const r=row+dr, c=col+dc;
        if (inBounds(r,c) && board[r][c]?.color !== piece.color) moves.push({row:r,col:c});
      });
      break;
    }
  }
  return moves;
}

export function getSuperMoves(board: Board, row: number, col: number): Square[] {
  const piece = board[row][col];
  if (!piece || piece.type !== "paladin" || piece.paladanSuperUsed) return [];
  const moves: Square[] = [];
  const dirs: [number,number][] = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  for (const [dr, dc] of dirs) {
    const r = row + dr * 2, c = col + dc * 2;
    if (!inBounds(r, c) || board[r][c]?.color === piece.color) continue;
    const isStraight = Math.abs(dr) + Math.abs(dc) === 1;
    if (isStraight) {
      moves.push({ row:r, col:c }); // can jump
    } else {
      const midR = row + dr, midC = col + dc;
      if (!board[midR][midC]) moves.push({ row:r, col:c });
    }
  }
  return moves;
}

// ─── PALADIN REVERSE CASTLE ───────────────────────────────────────────────────
// A paladin adjacent to a friendly non-paladin piece may swap places with it
// (in any of the 8 directions), letting that piece "defend" the paladin.
export function getCastleMoves(board: Board, row: number, col: number): Square[] {
  const piece = board[row][col];
  if (!piece || piece.type !== "paladin") return [];
  const dirs: [number,number][] = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const moves: Square[] = [];
  dirs.forEach(([dr,dc]) => {
    const r = row+dr, c = col+dc;
    if (!inBounds(r,c)) return;
    const ally = board[r][c];
    if (ally && ally.color === piece.color && ally.type !== "paladin") moves.push({ row:r, col:c });
  });
  return moves;
}

export function getLegalCastleMoves(board: Board, row: number, col: number): Square[] {
  return getCastleMoves(board, row, col);
}

// ─── CHECK DETECTION ─────────────────────────────────────────────────────────
export function isKingInCheck(board: Board, color: Color): boolean {
  let kr = -1, kc = -1;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === "king" && board[r][c]?.color === color) { kr=r; kc=c; }
  if (kr === -1) return false;
  const enemy = color === "white" ? "black" : "white";
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === enemy) {
        const all = [...getNormalMoves(board,r,c), ...getSuperMoves(board,r,c)];
        if (all.some(m => m.row === kr && m.col === kc)) return true;
      }
  return false;
}

// export function getLegalMoves(board: Board, row: number, col: number): Square[] {
//   const piece = board[row][col]; if (!piece) return [];
//   return getNormalMoves(board,row,col).filter(move => {
//     const t = cloneBoard(board);
//     t[move.row][move.col] = t[row][col]; t[row][col] = null;
//     return !isKingInCheck(t, piece.color);
//   });
// }

export function getLegalMoves(board: Board, row: number, col: number): Square[] {
  const piece = board[row][col];
  if (!piece) return [];
  return getNormalMoves(board, row, col);
}

// export function getLegalSuperMoves(board: Board, row: number, col: number): Square[] {
//   const piece = board[row][col]; if (!piece) return [];
//   return getSuperMoves(board,row,col).filter(move => {
//     const t = cloneBoard(board);
//     t[move.row][move.col] = t[row][col]; t[row][col] = null;
//     return !isKingInCheck(t, piece.color);
//   });
// }


export function getLegalSuperMoves(board: Board, row: number, col: number): Square[] {
  const piece = board[row][col];
  if (!piece) return [];
  return getSuperMoves(board, row, col);
}

export function isCheckmate(board: Board, color: Color): boolean {
  if (!isKingInCheck(board, color)) return false;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === color)
        if (getLegalMoves(board,r,c).length > 0 || getLegalSuperMoves(board,r,c).length > 0) return false;
  return true;
}

// ─── STALEMATE ───────────────────────────────────────────────────────────────
export function isStalemate(board: Board, color: Color): boolean {
  if (isKingInCheck(board, color)) return false;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === color)
        if (getLegalMoves(board,r,c).length > 0 || getLegalSuperMoves(board,r,c).length > 0) return false;
  return true;
}

// ─── MOVE QUALITY EVALUATOR ──────────────────────────────────────────────────
// function evaluateMoveQuality(
//   board: Board, from: Square, to: Square,
//   piece: Piece, captured: Piece | null,
//   newBoard: Board, color: Color
// ): "great" | "risky" | "normal" {
//   let score = 0;
//   const enemy = color === "white" ? "black" : "white";

//   // Captured a piece = good
//   if (captured) score += PIECE_VALUE[captured.type] * 2;

//   // Checking the enemy king = great
//   if (isKingInCheck(newBoard, enemy)) score += 5;

//   // Own king now in check = very bad
//   if (isKingInCheck(newBoard, color)) score -= 10;

//   // Moving king to threatened square = risky
//   if (piece.type === "king") {
//     let threatened = 0;
//     for (let r = 0; r < 8; r++)
//       for (let c = 0; c < 8; c++) {
//         const ep = newBoard[r][c];
//         if (ep && ep.color === enemy) {
//           if (getNormalMoves(newBoard,r,c).some(m => squareEquals(m,to))) threatened++;
//         }
//       }
//     if (threatened > 0) score -= 7;
//   }

//   // Moving valuable piece to threatened square = risky
//   if (PIECE_VALUE[piece.type] >= 5) {
//     for (let r = 0; r < 8; r++)
//       for (let c = 0; c < 8; c++) {
//         const ep = newBoard[r][c];
//         if (ep && ep.color === enemy) {
//           if (getNormalMoves(newBoard,r,c).some(m => squareEquals(m,to))) { score -= 4; break; }
//         }
//       }
//   }

//   // Centre control bonus (for early game)
//   const centre = [{row:3,col:3},{row:3,col:4},{row:4,col:3},{row:4,col:4}];
//   if (centre.some(s => squareEquals(s, to)) && !piece.hasMoved) score += 2;

//   if (score >= 4) return "great";
//   if (score <= -4) return "risky";
//   return "normal";
// }


function evaluateMoveQuality(
  board: Board,
  from: Square,
  to: Square,
  piece: Piece,
  captured: Piece | null,
  newBoard: Board,
  color: Color
): "great" | "risky" | "normal" {
  let score = 0;
  const enemy = color === "white" ? "black" : "white";

  if (captured) score += PIECE_VALUE[captured.type] * 2;

  // Valuable piece moved into danger
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const ep = newBoard[r][c];
      if (!ep || ep.color !== enemy) continue;

      const threatens =
        getNormalMoves(newBoard, r, c).some(m => squareEquals(m, to)) ||
        getSuperMoves(newBoard, r, c).some(m => squareEquals(m, to));

      if (threatens) {
        score -= PIECE_VALUE[piece.type] >= 5 ? 4 : 2;
        break;
      }
    }
  }

  const centre = [
    { row: 3, col: 3 },
    { row: 3, col: 4 },
    { row: 4, col: 3 },
    { row: 4, col: 4 },
  ];

  if (centre.some(s => squareEquals(s, to)) && !piece.hasMoved) score += 2;

  if (score >= 4) return "great";
  if (score <= -4) return "risky";
  return "normal";
}

// ─── EXECUTE MOVE ─────────────────────────────────────────────────────────────
// export function executeMove(
//   state: GameState, from: Square, to: Square, isSuper = false
// ): GameState {
//   const ns = cloneGameState(state);
//   const board = ns.board;
//   const piece = board[from.row][from.col]!;
//   const target = board[to.row][to.col];

//   if (target) {
//     if (piece.color === "white") ns.capturedByWhite.push(target);
//     else ns.capturedByBlack.push(target);
//   }

//   // Evaluate quality BEFORE move
//   const newBoardPreview = cloneBoard(board);
//   newBoardPreview[to.row][to.col] = piece;
//   newBoardPreview[from.row][from.col] = null;
//   ns.lastMoveQuality = evaluateMoveQuality(board, from, to, piece, target, newBoardPreview, piece.color);
//   ns.lastMoveTo = to;

//   board[to.row][to.col] = {
//     ...piece, hasMoved: true,
//     paladanSuperUsed: isSuper ? true : piece.paladanSuperUsed,
//   };
//   board[from.row][from.col] = null;

//   ns.lastMove = { from, to };
//   ns.selectedSquare = null;
//   ns.validMoves = [];
//   ns.superMoves = [];
//   ns.superMoveMode = false;

//   const next: Color = piece.color === "white" ? "black" : "white";
//   ns.currentTurn = next;

//   if (isCheckmate(board, next)) {
//     ns.status = piece.color === "white" ? "white_wins" : "black_wins";
//   } else if (isStalemate(board, next)) {
//     // Stalemate = draw, treat as playing for now
//     ns.status = "playing";
//     ns.check = null;
//   } else if (isKingInCheck(board, next)) {
//     ns.check = next;
//     ns.status = "check";
//   } else {
//     ns.check = null;
//     ns.status = "playing";
//   }

//   return ns;
// }



export function executeMove(
  state: GameState,
  from: Square,
  to: Square,
  isSuper = false
): GameState {
  const ns = cloneGameState(state);
  const board = ns.board;
  const piece = board[from.row][from.col]!;
  const target = board[to.row][to.col];

  if (target) {
    if (piece.color === "white") ns.capturedByWhite.push(target);
    else ns.capturedByBlack.push(target);
  }

  const newBoardPreview = cloneBoard(board);
  newBoardPreview[to.row][to.col] = piece;
  newBoardPreview[from.row][from.col] = null;

  ns.lastMoveQuality = evaluateMoveQuality(
    board,
    from,
    to,
    piece,
    target,
    newBoardPreview,
    piece.color
  );
  ns.lastMoveTo = to;

  board[to.row][to.col] = {
    ...piece,
    hasMoved: true,
    paladanSuperUsed: isSuper ? true : piece.paladanSuperUsed,
  };
  board[from.row][from.col] = null;

  ns.lastMove = { from, to };
  ns.selectedSquare = null;
  ns.validMoves = [];
  ns.superMoves = [];
  ns.castleMoves = [];
  ns.superMoveMode = false;

  const winner = getWinnerByElimination(board);

  if (winner) {
    ns.status = winner;
    ns.check = null;
    ns.pendingRetrieve = null;
    return ns;
  }

  // Paladin reaching the enemy back rank (like a pawn) may retrieve one of
  // its own previously-captured pieces. Turn stays with the mover until the
  // retrieval is resolved (see retrieveCapturedPiece / skipRetrieve below).
  if (piece.type === "paladin") {
    const backRank = piece.color === "white" ? 0 : 7;
    if (to.row === backRank) {
      const pool = piece.color === "white" ? ns.capturedByBlack : ns.capturedByWhite;
      if (pool.length > 0) {
        ns.pendingRetrieve = { color: piece.color, square: to };
        ns.status = "playing";
        ns.check = null;
        return ns;
      }
    }
  }

  ns.pendingRetrieve = null;
  ns.currentTurn = piece.color === "white" ? "black" : "white";
  ns.status = "playing";
  ns.check = null;

  return ns;
}

// ─── PALADIN BACK-RANK RETRIEVAL ──────────────────────────────────────────────
export function retrieveCapturedPiece(state: GameState, capturedPieceId: string): GameState {
  if (!state.pendingRetrieve) return state;
  const { color, square } = state.pendingRetrieve;
  const ns = cloneGameState(state);
  const pool = color === "white" ? ns.capturedByBlack : ns.capturedByWhite;
  const idx = pool.findIndex(p => p.id === capturedPieceId);
  if (idx === -1) { ns.pendingRetrieve = null; return ns; }

  const [revived] = pool.splice(idx, 1);
  ns.board[square.row][square.col] = {
    ...revived, color, hasMoved: true, paladanSuperUsed: false,
    id: `retr-${revived.type}-${square.row}-${square.col}`,
  };
  ns.pendingRetrieve = null;
  ns.currentTurn = color === "white" ? "black" : "white";
  return ns;
}

export function skipRetrieve(state: GameState): GameState {
  if (!state.pendingRetrieve) return state;
  const color = state.pendingRetrieve.color;
  const ns = cloneGameState(state);
  ns.pendingRetrieve = null;
  ns.currentTurn = color === "white" ? "black" : "white";
  return ns;
}

// ─── PALADIN REVERSE CASTLE (execute) ─────────────────────────────────────────
export function executeCastle(state: GameState, from: Square, to: Square): GameState {
  const ns = cloneGameState(state);
  const board = ns.board;
  const paladin = board[from.row][from.col];
  const ally = board[to.row][to.col];
  if (!paladin || paladin.type !== "paladin" || !ally || ally.type === "paladin" || ally.color !== paladin.color) {
    return state;
  }

  board[from.row][from.col] = { ...ally, hasMoved: true };
  board[to.row][to.col] = { ...paladin, hasMoved: true };

  ns.lastMove = { from, to };
  ns.selectedSquare = null;
  ns.validMoves = [];
  ns.superMoves = [];
  ns.castleMoves = [];
  ns.superMoveMode = false;
  ns.lastMoveQuality = null;
  ns.lastMoveTo = null;
  ns.pendingRetrieve = null;
  ns.currentTurn = paladin.color === "white" ? "black" : "white";
  ns.status = "playing";
  ns.check = null;

  return ns;
}

// ─── PASS TURN (Mexican Standoff) ─────────────────────────────────────────────
// Either player may pass on their turn — unlimited uses, per the reference
// rules ("you don't have to move... let your opponent make another move").
export function passTurn(state: GameState): GameState {
  const ns = cloneGameState(state);
  const color = state.currentTurn;
  ns.currentTurn = color === "white" ? "black" : "white";
  ns.selectedSquare = null;
  ns.validMoves = [];
  ns.superMoves = [];
  ns.castleMoves = [];
  ns.superMoveMode = false;
  ns.lastMoveQuality = null;
  ns.lastMoveTo = null;
  return ns;
}

function countPieces(board: Board, color: Color): number {
  let count = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === color) count++;
    }
  }
  return count;
}

function getWinnerByElimination(board: Board): "white_wins" | "black_wins" | null {
  const whiteCount = countPieces(board, "white");
  const blackCount = countPieces(board, "black");

  if (whiteCount === 0) return "black_wins";
  if (blackCount === 0) return "white_wins";
  return null;
}

