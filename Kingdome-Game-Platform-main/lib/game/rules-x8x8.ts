// ─── 8x8 X BOARD — 4-player cross-shaped board ────────────────────────────────
// Four 8x8 "Classic War" armies (Top / Right / Bottom / Left) merged into one
// 24x24 grid with the four corner 8x8 blocks removed, leaving a plus/cross
// shape whose four arms all open onto a shared 8x8 center. Every piece type's
// movement, the Paladin's Super Strike / Reverse Castle / Back-Rank
// Retrieval, unlimited Pass Turn, and elimination-only win/lose logic are
// copied verbatim in spirit from lib/game/rules-8x8.ts — only the board
// shape/size and the 2-player -> 4-player turn/elimination bookkeeping are
// new. No new abilities are introduced.

export type PieceTypeX = "king" | "queen" | "rook" | "bishop" | "knight" | "paladin";
// Matches lib/lobby/types.ts MODE_CONFIG["x-8x8"].colors (White/Black/Grey/
// Golden). "golden" renders using the public/pieces/brown art (there is no
// separate golden folder) — see pieceImagePathX below.
export type PlayerColorX = "white" | "black" | "golden" | "grey";

export interface PieceX {
  type: PieceTypeX;
  color: PlayerColorX;
  id: string;
  hasMoved?: boolean;
  paladanSuperUsed?: boolean;
}

export interface SquareX { row: number; col: number; }
export type BoardX = (PieceX | null)[][];

export const SIZE = 24;
export const ARM = 8;
// The center 8x8 block every arm opens onto.
export const CENTER_LO = 8;
export const CENTER_HI = 15;

// Which side of the cross each color starts on, and which way they face.
// Top = white, Right = grey, Bottom = black, Left = golden — clockwise,
// matching "Player1 Top, Player2 Right, Player3 Bottom, Player4 Left".
export const TURN_ORDER: PlayerColorX[] = ["white", "grey", "black", "golden"];

export interface GameStateX {
  board: BoardX;
  currentTurn: PlayerColorX;
  turnOrder: PlayerColorX[];
  eliminatedPlayers: PlayerColorX[];
  capturedBy: Record<PlayerColorX, PieceX[]>;
  selectedSquare: SquareX | null;
  validMoves: SquareX[];
  superMoves: SquareX[];
  superMoveMode: boolean;
  castleMoves: SquareX[];
  status: "playing" | "finished";
  winner: PlayerColorX | null;
  lastMove: { from: SquareX; to: SquareX } | null;
  // Paladin back-rank retrieval — set when a paladin reaches ANY other
  // player's home edge and its owner has a captured piece to bring back.
  pendingRetrieve: { color: PlayerColorX; square: SquareX } | null;
  justEliminated: PlayerColorX | null;
}

// ─── BOARD SHAPE ────────────────────────────────────────────────────────────
// Valid cells are the whole 24x24 grid MINUS the four 8x8 corner blocks —
// i.e. everywhere except where both the row and the column fall outside the
// center band [8,15]. This yields the cross/plus silhouette from the
// reference image: four 8x8 arms all sharing one 8x8 center.
export function inPlayAreaX(r: number, c: number): boolean {
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
  const rowOutsideCenter = r < CENTER_LO || r > CENTER_HI;
  const colOutsideCenter = c < CENTER_LO || c > CENTER_HI;
  return !(rowOutsideCenter && colOutsideCenter);
}

export const squareEqualsX = (a: SquareX, b: SquareX) => a.row === b.row && a.col === b.col;

export function cloneBoardX(board: BoardX): BoardX {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}
export function cloneGameStateX(state: GameStateX): GameStateX {
  return {
    ...state,
    board: cloneBoardX(state.board),
    turnOrder: [...state.turnOrder],
    eliminatedPlayers: [...state.eliminatedPlayers],
    capturedBy: {
      white: [...state.capturedBy.white], black: [...state.capturedBy.black],
      golden: [...state.capturedBy.golden], grey: [...state.capturedBy.grey],
    },
    validMoves: [...state.validMoves],
    superMoves: [...state.superMoves],
    castleMoves: [...state.castleMoves],
  };
}

// ─── INITIAL BOARD ──────────────────────────────────────────────────────────
// Each player's own arm gets the exact classic 8x8 setup — back row
// (Rook,Knight,Bishop,King,Queen,Bishop,Knight,Rook) at their outermost
// edge, Paladin front row one step in — just rotated to face inward
// toward the shared center, same as the original 8x8 setup rotated to
// face the opponent.
const BACK: PieceTypeX[] = ["rook", "knight", "bishop", "king", "queen", "bishop", "knight", "rook"];

export function createInitialBoardX(): BoardX {
  const b: BoardX = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));

  // Top (white): back row = row 0, front row (paladins) = row 1, cols 8-15.
  BACK.forEach((type, i) => {
    const col = CENTER_LO + i;
    b[0][col] = { type, color: "white", id: `white-${type}-${i}`, hasMoved: false, paladanSuperUsed: false };
    b[1][col] = { type: "paladin", color: "white", id: `white-pal-${i}`, hasMoved: false, paladanSuperUsed: false };
  });

  // Bottom (black): back row = row 23, front row = row 22, cols 8-15.
  BACK.forEach((type, i) => {
    const col = CENTER_LO + i;
    b[SIZE - 1][col] = { type, color: "black", id: `black-${type}-${i}`, hasMoved: false, paladanSuperUsed: false };
    b[SIZE - 2][col] = { type: "paladin", color: "black", id: `black-pal-${i}`, hasMoved: false, paladanSuperUsed: false };
  });

  // Left (golden): back row = col 0, front row = col 1, rows 8-15.
  BACK.forEach((type, i) => {
    const row = CENTER_LO + i;
    b[row][0] = { type, color: "golden", id: `golden-${type}-${i}`, hasMoved: false, paladanSuperUsed: false };
    b[row][1] = { type: "paladin", color: "golden", id: `golden-pal-${i}`, hasMoved: false, paladanSuperUsed: false };
  });

  // Right (grey): back row = col 23, front row = col 22, rows 8-15.
  BACK.forEach((type, i) => {
    const row = CENTER_LO + i;
    b[row][SIZE - 1] = { type, color: "grey", id: `grey-${type}-${i}`, hasMoved: false, paladanSuperUsed: false };
    b[row][SIZE - 2] = { type: "paladin", color: "grey", id: `grey-pal-${i}`, hasMoved: false, paladanSuperUsed: false };
  });

  return b;
}

export function createInitialGameStateX(): GameStateX {
  return {
    board: createInitialBoardX(),
    currentTurn: TURN_ORDER[0],
    turnOrder: [...TURN_ORDER],
    eliminatedPlayers: [],
    capturedBy: { white: [], black: [], golden: [], grey: [] },
    selectedSquare: null, validMoves: [], superMoves: [], superMoveMode: false,
    castleMoves: [], status: "playing", winner: null, lastMove: null,
    pendingRetrieve: null, justEliminated: null,
  };
}

// Which color's home edge a square belongs to (for Paladin back-rank
// retrieval) — null if the square isn't anyone's home edge.
export function homeEdgeOwner(r: number, c: number): PlayerColorX | null {
  if (r === 0 && c >= CENTER_LO && c <= CENTER_HI) return "white";
  if (r === SIZE - 1 && c >= CENTER_LO && c <= CENTER_HI) return "black";
  if (c === 0 && r >= CENTER_LO && r <= CENTER_HI) return "golden";
  if (c === SIZE - 1 && r >= CENTER_LO && r <= CENTER_HI) return "grey";
  return null;
}

// ─── MOVE GENERATION — identical piece patterns to rules-8x8.ts ───────────────
function slideX(board: BoardX, row: number, col: number, dirs: [number, number][]): SquareX[] {
  const piece = board[row][col]!;
  const moves: SquareX[] = [];
  for (const [dr, dc] of dirs) {
    let r = row + dr, c = col + dc;
    while (inPlayAreaX(r, c)) {
      if (!board[r][c]) { moves.push({ row: r, col: c }); }
      else { if (board[r][c]!.color !== piece.color) moves.push({ row: r, col: c }); break; }
      r += dr; c += dc;
    }
  }
  return moves;
}

const ALL8: [number, number][] = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ORTHO4: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG4: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const KNIGHT_JUMPS: [number, number][] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

export function getNormalMovesX(board: BoardX, row: number, col: number): SquareX[] {
  const piece = board[row][col]; if (!piece) return [];
  const moves: SquareX[] = [];

  switch (piece.type) {
    case "king":
      ALL8.forEach(([dr, dc]) => {
        const r = row + dr, c = col + dc;
        if (inPlayAreaX(r, c) && board[r][c]?.color !== piece.color) moves.push({ row: r, col: c });
      });
      break;
    case "queen":
      moves.push(...slideX(board, row, col, ALL8));
      break;
    case "rook":
      moves.push(...slideX(board, row, col, ORTHO4));
      break;
    case "bishop":
      moves.push(...slideX(board, row, col, DIAG4));
      break;
    case "knight":
      KNIGHT_JUMPS.forEach(([dr, dc]) => {
        const r = row + dr, c = col + dc;
        if (inPlayAreaX(r, c) && board[r][c]?.color !== piece.color) moves.push({ row: r, col: c });
      });
      break;
    case "paladin":
      ALL8.forEach(([dr, dc]) => {
        const r = row + dr, c = col + dc;
        if (inPlayAreaX(r, c) && board[r][c]?.color !== piece.color) moves.push({ row: r, col: c });
      });
      break;
  }
  return moves;
}

export function getSuperMovesX(board: BoardX, row: number, col: number): SquareX[] {
  const piece = board[row][col];
  if (!piece || piece.type !== "paladin" || piece.paladanSuperUsed) return [];
  const moves: SquareX[] = [];
  for (const [dr, dc] of ALL8) {
    const r = row + dr * 2, c = col + dc * 2;
    if (!inPlayAreaX(r, c) || board[r][c]?.color === piece.color) continue;
    const isStraight = Math.abs(dr) + Math.abs(dc) === 1;
    if (isStraight) {
      moves.push({ row: r, col: c }); // can jump
    } else {
      const midR = row + dr, midC = col + dc;
      if (!board[midR][midC]) moves.push({ row: r, col: c });
    }
  }
  return moves;
}

// ─── PALADIN REVERSE CASTLE ─────────────────────────────────────────────────
export function getCastleMovesX(board: BoardX, row: number, col: number): SquareX[] {
  const piece = board[row][col];
  if (!piece || piece.type !== "paladin") return [];
  const moves: SquareX[] = [];
  ALL8.forEach(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    if (!inPlayAreaX(r, c)) return;
    const ally = board[r][c];
    if (ally && ally.color === piece.color && ally.type !== "paladin") moves.push({ row: r, col: c });
  });
  return moves;
}

// No self-check restriction — matches rules-8x8.ts, where getLegalMoves is
// just getNormalMoves unfiltered (king capture is a normal capture, not a
// game-ending event, so there's nothing to protect against here).
export function getLegalMovesX(board: BoardX, row: number, col: number): SquareX[] {
  return getNormalMovesX(board, row, col);
}
export function getLegalSuperMovesX(board: BoardX, row: number, col: number): SquareX[] {
  return getSuperMovesX(board, row, col);
}

// ─── ELIMINATION / WIN CHECK ─────────────────────────────────────────────────
// Same rule as 8x8/12x12/16x16: capturing a King is just a normal capture.
// A player is eliminated only once every one of their pieces is gone; the
// last player left standing wins.
function countPiecesX(board: BoardX, color: PlayerColorX): number {
  let n = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c]?.color === color) n++;
  return n;
}

function applyEliminationCheckX(ns: GameStateX): GameStateX {
  const remaining = ns.turnOrder.filter(c => countPiecesX(ns.board, c) > 0);
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

function advanceTurnColor(ns: GameStateX): PlayerColorX {
  const idx = ns.turnOrder.indexOf(ns.currentTurn);
  const nextIdx = (idx + 1) % ns.turnOrder.length;
  return ns.turnOrder[nextIdx];
}

// A player's own previously-captured pieces may be scattered across any of
// the OTHER three players' capturedBy buckets (whoever actually took them).
export function myLostPiecesPool(state: GameStateX, color: PlayerColorX): PieceX[] {
  const pool: PieceX[] = [];
  (Object.keys(state.capturedBy) as PlayerColorX[]).forEach(owner => {
    if (owner === color) return;
    pool.push(...state.capturedBy[owner].filter(p => p.color === color));
  });
  return pool;
}

// ─── EXECUTE MOVE ────────────────────────────────────────────────────────────
export function executeMoveX(state: GameStateX, from: SquareX, to: SquareX, isSuper = false): GameStateX {
  const ns = cloneGameStateX(state);
  const board = ns.board;
  const piece = board[from.row][from.col]!;
  const target = board[to.row][to.col];

  if (target) ns.capturedBy[piece.color].push(target);

  board[to.row][to.col] = {
    ...piece, hasMoved: true,
    paladanSuperUsed: isSuper ? true : piece.paladanSuperUsed,
  };
  board[from.row][from.col] = null;

  ns.lastMove = { from, to };
  ns.selectedSquare = null; ns.validMoves = []; ns.superMoves = []; ns.castleMoves = [];
  ns.superMoveMode = false;
  ns.justEliminated = null;

  ns.status = "playing";
  const eliminated = applyEliminationCheckX(ns);
  if (eliminated.status === "finished") { eliminated.pendingRetrieve = null; return eliminated; }

  // Paladin reaching ANY other player's home edge (like reaching the enemy
  // back rank in 2-player 8x8) may retrieve one of its own previously lost
  // pieces. Turn stays with the mover until resolved.
  if (piece.type === "paladin") {
    const owner = homeEdgeOwner(to.row, to.col);
    if (owner && owner !== piece.color) {
      const pool = myLostPiecesPool(eliminated, piece.color);
      if (pool.length > 0) {
        eliminated.pendingRetrieve = { color: piece.color, square: to };
        return eliminated;
      }
    }
  }

  eliminated.pendingRetrieve = null;
  eliminated.currentTurn = advanceTurnColor(eliminated);
  return eliminated;
}

// ─── PALADIN BACK-RANK RETRIEVAL ─────────────────────────────────────────────
export function retrieveCapturedPieceX(state: GameStateX, capturedPieceId: string): GameStateX {
  if (!state.pendingRetrieve) return state;
  const { color, square } = state.pendingRetrieve;
  const ns = cloneGameStateX(state);
  let revived: PieceX | null = null;
  (Object.keys(ns.capturedBy) as PlayerColorX[]).some(owner => {
    if (owner === color) return false;
    const idx = ns.capturedBy[owner].findIndex(p => p.id === capturedPieceId);
    if (idx === -1) return false;
    [revived] = ns.capturedBy[owner].splice(idx, 1);
    return true;
  });
  if (!revived) { ns.pendingRetrieve = null; return ns; }
  const revivedPiece: PieceX = revived;

  ns.board[square.row][square.col] = {
    ...revivedPiece, color, hasMoved: true, paladanSuperUsed: false,
    id: `retr-${revivedPiece.type}-${square.row}-${square.col}`,
  };
  ns.pendingRetrieve = null;
  ns.currentTurn = advanceTurnColor(ns);
  return ns;
}

export function skipRetrieveX(state: GameStateX): GameStateX {
  if (!state.pendingRetrieve) return state;
  const ns = cloneGameStateX(state);
  ns.pendingRetrieve = null;
  ns.currentTurn = advanceTurnColor(ns);
  return ns;
}

// ─── PALADIN REVERSE CASTLE (execute) ────────────────────────────────────────
export function executeCastleX(state: GameStateX, from: SquareX, to: SquareX): GameStateX {
  const ns = cloneGameStateX(state);
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
  ns.superMoveMode = false;
  ns.pendingRetrieve = null;
  ns.currentTurn = advanceTurnColor(ns);
  ns.status = "playing";

  return ns;
}

// ─── PASS TURN (Mexican Standoff) — unlimited, same as 8x8 ───────────────────
export function passTurnX(state: GameStateX): GameStateX {
  const ns = cloneGameStateX(state);
  ns.currentTurn = advanceTurnColor(ns);
  ns.selectedSquare = null; ns.validMoves = []; ns.superMoves = []; ns.castleMoves = [];
  ns.superMoveMode = false;
  return ns;
}

// ─── QUIT (elimination) ───────────────────────────────────────────────────────
// A quitting player's whole army is removed from the board and they're
// marked eliminated, same semantics as "their army is completely removed".
// The match continues among whoever's left, and only declares a winner once
// exactly one player remains.
// ─── PIECE ART ────────────────────────────────────────────────────────────
// public/pieces has white/black/brown/grey folders. white & black ship both
// suffixed (" - White"/" - Black") and unsuffixed filenames — use suffixed.
// grey ships suffixed art only. brown ships unsuffixed art only, and is the
// folder "golden" (the 4th X-board color) renders from.
function pieceFileNameX(type: PieceTypeX, color: PlayerColorX): string {
  const cap = type.charAt(0).toUpperCase() + type.slice(1);
  if (color === "golden") return cap;
  const suffix = color === "white" ? "White" : color === "black" ? "Black" : "Grey";
  return `${cap} - ${suffix}`;
}
export function pieceImagePathX(p: PieceX): string {
  const folder = p.color === "golden" ? "brown" : p.color;
  return `/pieces/${folder}/${pieceFileNameX(p.type, p.color)}.png`;
}

export function quitPlayerX(state: GameStateX, color: PlayerColorX): GameStateX {
  const ns = cloneGameStateX(state);
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (ns.board[r][c]?.color === color) ns.board[r][c] = null;
  }
  ns.selectedSquare = null; ns.validMoves = []; ns.superMoves = []; ns.castleMoves = [];
  ns.superMoveMode = false; ns.pendingRetrieve = null;

  const wasCurrent = ns.currentTurn === color;
  const oldOrder = ns.turnOrder;
  const quitterIdx = oldOrder.indexOf(color);

  const eliminated = applyEliminationCheckX(ns);
  if (eliminated.status !== "finished" && wasCurrent && quitterIdx !== -1) {
    // Walk forward from the quitter's old slot in the ORIGINAL rotation
    // order until hitting a color that's still active — advanceTurnColor
    // can't be used here since it relies on currentTurn already being a
    // member of the (now quitter-less) turnOrder.
    for (let step = 1; step <= oldOrder.length; step++) {
      const candidate = oldOrder[(quitterIdx + step) % oldOrder.length];
      if (eliminated.turnOrder.includes(candidate)) { eliminated.currentTurn = candidate; break; }
    }
  }
  return eliminated;
}
