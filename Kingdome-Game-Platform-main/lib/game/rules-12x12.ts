// ─── TYPES ───────────────────────────────────────────────────────────────────

export type PlayerColor = "white" | "black" | "grey";

export type PieceType12 =
  | "mystic-king" | "super-queen" | "dragon" | "gargoyle"
  | "wizard" | "sorceress" | "super-knight" | "assassin"
  | "executioner" | "cavalier" | "mage" | "elvin-archer" | "paladin";

export interface Piece12 {
  id: string;
  type: PieceType12;
  color: PlayerColor;
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

// Wing identifies which of the 3 boards a square belongs to, or "center" for the bridge
export type Wing = "white" | "black" | "grey" | "center";

export interface Square12 {
  row: number;
  col: number;
  wing: Wing;
}

export type WingBoard = (Piece12 | null)[][];

export interface TriBoard {
  white: WingBoard;  // 12x12 grid for white's wing
  black: WingBoard;  // 12x12 grid for black's wing
  grey: WingBoard;   // 12x12 grid for grey's wing
  center: (Piece12 | null)[][]; // triangular bridge zone (6 rows, variable cols)
}

export type SpecialMode =
  | null
  | "wizard-teleport-select-piece"
  | "wizard-teleport-select-dest"
  | "sorceress-sleep-select"
  | "sorceress-teleport-select"
  | "executioner-axe-swing"
  | "mage-sacrifice-confirm"
  | "super-queen-second-move"
  | "king-morph-confirm";

export interface GameState12 {
  board: TriBoard;
  currentTurn: PlayerColor;
  turnOrder: PlayerColor[];
  eliminatedPlayers: PlayerColor[];
  capturedBy: Record<PlayerColor, Piece12[]>;
  selectedSquare: Square12 | null;
  validMoves: Square12[];
  status: "playing" | "finished";
  winner: PlayerColor | null;
  lastMove: { from: Square12; to: Square12 } | null;
  check: PlayerColor | null;
  specialMode: SpecialMode;
  specialData: any;
  wishDiceResult: number | null;
  turnMovesLeft: number;
  pendingAxeSquare: Square12 | null;
  spellMessage: string | null;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function sq12Eq(a: Square12, b: Square12): boolean {
  return a.row === b.row && a.col === b.col && a.wing === b.wing;
}

export function inBoundsWing(r: number, c: number): boolean {
  return r >= 0 && r < 12 && c >= 0 && c < 12;
}

// Center bridge: 6 rows. Row 0 has 1 cell, row 1 has 3, row 2 has 5, etc.
// Each row i has (2*i + 1) cells
export function centerRowWidth(row: number): number {
  return 2 * row + 1;
}

export function inBoundsCenter(r: number, c: number): boolean {
  if (r < 0 || r >= 6) return false;
  return c >= 0 && c < centerRowWidth(r);
}

export function cloneWingBoard(board: WingBoard): WingBoard {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

export function cloneTriBoard(board: TriBoard): TriBoard {
  return {
    white: cloneWingBoard(board.white),
    black: cloneWingBoard(board.black),
    grey: cloneWingBoard(board.grey),
    center: board.center.map(row => row.map(cell => cell ? { ...cell } : null)),
  };
}

export function cloneState12(state: GameState12): GameState12 {
  return {
    ...state,
    board: cloneTriBoard(state.board),
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

// ─── BOARD ACCESS ─────────────────────────────────────────────────────────────

export function getPiece(board: TriBoard, sq: Square12): Piece12 | null {
  if (sq.wing === "center") {
    if (!inBoundsCenter(sq.row, sq.col)) return null;
    return board.center[sq.row]?.[sq.col] ?? null;
  }
  if (!inBoundsWing(sq.row, sq.col)) return null;
  return board[sq.wing][sq.row][sq.col];
}

export function setPiece(board: TriBoard, sq: Square12, piece: Piece12 | null): void {
  if (sq.wing === "center") {
    if (inBoundsCenter(sq.row, sq.col)) {
      board.center[sq.row][sq.col] = piece;
    }
  } else {
    if (inBoundsWing(sq.row, sq.col)) {
      board[sq.wing][sq.row][sq.col] = piece;
    }
  }
}

// ─── IMAGE PATH ───────────────────────────────────────────────────────────────

export function pieceImagePath(piece: Piece12): string {
  const folder = piece.color;
  const suffix =
    piece.color === "white" ? "White" :
    piece.color === "grey" ? "Gray" :
    piece.type === "super-knight" ? "Black" : "black";

  const nameMap: Record<PieceType12, string> = {
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
    "paladin": "Gargoyle",
  };

  return `/pieces-12x12/${folder}/${nameMap[piece.type]} ${suffix}.png`;
}

// ─── BOARD SETUP ──────────────────────────────────────────────────────────────

function mkPiece(type: PieceType12, color: PlayerColor, id: string): Piece12 {
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

const BACK_ROW: PieceType12[] = [
  "executioner","assassin","super-knight","gargoyle",
  "mystic-king","super-queen","sorceress","wizard",
  "dragon","super-knight","assassin","executioner",
];

const FRONT_ROW: PieceType12[] = [
  "paladin","paladin","cavalier","elvin-archer",
  "mage","paladin","paladin","mage",
  "elvin-archer","cavalier","paladin","paladin",
];

function createEmptyWing(): WingBoard {
  return Array(12).fill(null).map(() => Array(12).fill(null));
}

function createEmptyCenter(): (Piece12 | null)[][] {
  const center: (Piece12 | null)[][] = [];
  for (let r = 0; r < 6; r++) {
    center.push(Array(centerRowWidth(r)).fill(null));
  }
  return center;
}

function setupWing(wing: WingBoard, color: PlayerColor): void {
  // Row 11 = back row (farthest from center), Row 10 = front row
  BACK_ROW.forEach((type, col) => {
    wing[11][col] = mkPiece(type, color, `${color[0]}-back-${col}`);
  });
  FRONT_ROW.forEach((type, col) => {
    wing[10][col] = mkPiece(type, color, `${color[0]}-front-${col}`);
  });
}

export function createInitialTriBoard(): TriBoard {
  const board: TriBoard = {
    white: createEmptyWing(),
    black: createEmptyWing(),
    grey: createEmptyWing(),
    center: createEmptyCenter(),
  };

  setupWing(board.white, "white");
  setupWing(board.black, "black");
  setupWing(board.grey, "grey");

  return board;
}

export function createInitialGameState12(): GameState12 {
  return {
    board: createInitialTriBoard(),
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
  };
}

// ─── WING EDGE CONNECTIONS ────────────────────────────────────────────────────
// When a piece moves off row 0 of a wing, it enters the center bridge.
// Each wing's row 0 connects to specific center cells.
// Wing row 0, cols 0-11 connect to center.
// 
// The center bridge is a triangular area where all 3 wings meet.
// Wing row 0 is the edge closest to center.
//
// Mapping: Each wing's row 0 cols 3-8 (6 cells) connect to center row 5 (11 cells)
// distributed evenly. Simpler approach: row 0 of each wing connects to center.

interface BridgeConnection {
  wing: Wing;
  wingRow: number;
  wingCol: number;
  centerRow: number;
  centerCol: number;
}

// Each wing's row 0 center columns (4,5,6,7) connect to center row 5
// White connects to center row 5, cols 0-3
// Black connects to center row 5, cols 4-7
// Grey connects to center row 5, cols 8-10
function getWingToCenterConnections(wing: PlayerColor): BridgeConnection[] {
  const connections: BridgeConnection[] = [];
  // Each wing's row 0, cols 4-7 connect to center
  const offsets: Record<PlayerColor, number> = { white: 0, black: 4, grey: 7 };
  const base = offsets[wing];
  for (let i = 0; i < 4; i++) {
    connections.push({
      wing,
      wingRow: 0,
      wingCol: 4 + i,
      centerRow: 5,
      centerCol: Math.min(base + i, 10),
    });
  }
  return connections;
}

// Get all squares adjacent to a given square (including cross-wing via center)
function getAdjacentSquares(board: TriBoard, sq: Square12, dirs: [number, number][]): Square12[] {
  const results: Square12[] = [];

  if (sq.wing === "center") {
    // Movement within center
    for (const [dr, dc] of dirs) {
      const nr = sq.row + dr;
      const nc = sq.col + dc;
      if (inBoundsCenter(nr, nc)) {
        results.push({ row: nr, col: nc, wing: "center" });
      }
      // If moving out of center (row 5 edge) -> enter a wing's row 0
      if (sq.row === 5 && dr === 1) {
        // Determine which wing based on col position
        if (nc >= 0 && nc < 4) {
          results.push({ row: 0, col: 4 + (nc % 4), wing: "white" });
        } else if (nc >= 4 && nc < 8) {
          results.push({ row: 0, col: 4 + (nc - 4), wing: "black" });
        } else if (nc >= 8 && nc < 11) {
          results.push({ row: 0, col: 4 + (nc - 8), wing: "grey" });
        }
      }
    }
  } else {
    // Movement within a wing
    for (const [dr, dc] of dirs) {
      const nr = sq.row + dr;
      const nc = sq.col + dc;
      if (inBoundsWing(nr, nc)) {
        results.push({ row: nr, col: nc, wing: sq.wing });
      }
      // If moving past row 0 (toward center)
      if (sq.row === 0 && dr === -1 && nc >= 4 && nc <= 7) {
        const offsets: Record<string, number> = { white: 0, black: 4, grey: 7 };
        const base = offsets[sq.wing as string] ?? 0;
        const centerCol = base + (nc - 4);
        if (inBoundsCenter(5, centerCol)) {
          results.push({ row: 5, col: centerCol, wing: "center" });
        }
      }
    }
  }

  return results;
}

// ─── MOVE GENERATION ─────────────────────────────────────────────────────────

const ALL8: [number,number][] = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
const STRAIGHT4: [number,number][] = [[-1,0],[1,0],[0,-1],[0,1]];
const KNIGHT_JUMPS: [number,number][] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

function slidingTri(board: TriBoard, sq: Square12, dirs: [number,number][], color: PlayerColor): Square12[] {
  const moves: Square12[] = [];
  for (const [dr, dc] of dirs) {
    let current = sq;
    for (let step = 0; step < 12; step++) {
      const nexts = getAdjacentSquares(board, current, [[dr, dc]]);
      if (nexts.length === 0) break;
      const next = nexts[0];
      const target = getPiece(board, next);
      if (!target) {
        moves.push(next);
        current = next;
      } else {
        if (target.color !== color) moves.push(next);
        break;
      }
    }
  }
  return moves;
}

function oneStepTri(board: TriBoard, sq: Square12, color: PlayerColor): Square12[] {
  const all = getAdjacentSquares(board, sq, ALL8);
  return all.filter(s => {
    const p = getPiece(board, s);
    return !p || p.color !== color;
  });
}

function lJumpsTri(board: TriBoard, sq: Square12, color: PlayerColor): Square12[] {
  const moves: Square12[] = [];
  for (const [dr, dc] of KNIGHT_JUMPS) {
    let target: Square12;
    if (sq.wing === "center") {
      const nr = sq.row + dr;
      const nc = sq.col + dc;
      if (inBoundsCenter(nr, nc)) {
        target = { row: nr, col: nc, wing: "center" };
      } else continue;
    } else {
      const nr = sq.row + dr;
      const nc = sq.col + dc;
      if (inBoundsWing(nr, nc)) {
        target = { row: nr, col: nc, wing: sq.wing };
      } else continue;
    }
    const p = getPiece(board, target);
    if (!p || p.color !== color) {
      moves.push(target);
    }
  }
  return moves;
}

function dedup(moves: Square12[]): Square12[] {
  const seen = new Set<string>();
  return moves.filter(sq => {
    const k = `${sq.wing}-${sq.row}-${sq.col}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

export function getRawMoves12(board: TriBoard, sq: Square12): Square12[] {
  const piece = getPiece(board, sq);
  if (!piece) return [];
  if (piece.sleepRoundsLeft > 0) return [];
  const { type, color } = piece;
  let moves: Square12[] = [];

  switch (type) {
    case "mystic-king":
      moves.push(...lJumpsTri(board, sq, color));
      moves.push(...oneStepTri(board, sq, color));
      break;
    case "super-queen":
      moves.push(...slidingTri(board, sq, ALL8, color));
      break;
    case "dragon":
    case "gargoyle":
      moves.push(...slidingTri(board, sq, ALL8, color));
      lJumpsTri(board, sq, color)
        .filter(s => { const p = getPiece(board, s); return p !== null && p.color !== color; })
        .forEach(s => moves.push(s));
      break;
    case "wizard":
      for (const [dr, dc] of ALL8) {
        let current = sq;
        for (let step = 0; step < 12; step++) {
          const nexts = getAdjacentSquares(board, current, [[dr, dc]]);
          if (nexts.length === 0) break;
          const next = nexts[0];
          const t = getPiece(board, next);
          if (!t) {
            moves.push(next);
            current = next;
          } else {
            if (t.color !== color && (t.type === "wizard" || t.type === "sorceress"))
              moves.push(next);
            break;
          }
        }
      }
      break;
    case "sorceress":
      moves.push(...slidingTri(board, sq, ALL8, color));
      break;
    case "super-knight":
      moves.push(...lJumpsTri(board, sq, color));
      break;
    case "assassin":
      moves.push(...slidingTri(board, sq, ALL8, color));
      moves.push(...lJumpsTri(board, sq, color));
      moves.push(...oneStepTri(board, sq, color));
      break;
    case "executioner":
      moves.push(...slidingTri(board, sq, STRAIGHT4, color));
      break;
    case "cavalier":
      moves.push(...lJumpsTri(board, sq, color));
      moves.push(...oneStepTri(board, sq, color));
      break;
    case "mage":
      moves.push(...slidingTri(board, sq, ALL8, color));
      break;
    case "elvin-archer":
      moves.push(...slidingTri(board, sq, ALL8, color));
      moves.push(...lJumpsTri(board, sq, color));
      moves.push(...oneStepTri(board, sq, color));
      break;
    case "paladin":
      moves.push(...oneStepTri(board, sq, color));
      if (!piece.paladanSuperUsed) {
        for (const [dr, dc] of ALL8) {
          for (const dist of [2, 3]) {
            let target: Square12 | null = null;
            if (sq.wing !== "center") {
              const r = sq.row + dr * dist;
              const c = sq.col + dc * dist;
              if (inBoundsWing(r, c)) {
                target = { row: r, col: c, wing: sq.wing };
              }
            } else {
              const r = sq.row + dr * dist;
              const c = sq.col + dc * dist;
              if (inBoundsCenter(r, c)) {
                target = { row: r, col: c, wing: "center" };
              }
            }
            if (target) {
              const p = getPiece(board, target);
              if (!p || p.color !== color) moves.push(target);
            }
          }
        }
      }
      break;
  }

  return dedup(moves);
}

// ─── CHECK DETECTION ─────────────────────────────────────────────────────────

export function findKing12(board: TriBoard, color: PlayerColor): Square12 | null {
  // Search all wings and center
  const wings: Wing[] = ["white", "black", "grey"];
  for (const w of wings) {
    for (let r = 0; r < 12; r++)
      for (let c = 0; c < 12; c++)
        if (board[w][r][c]?.type === "mystic-king" && board[w][r][c]?.color === color)
          return { row: r, col: c, wing: w };
  }
  // Check center
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < centerRowWidth(r); c++)
      if (board.center[r]?.[c]?.type === "mystic-king" && board.center[r][c]?.color === color)
        return { row: r, col: c, wing: "center" };
  return null;
}

function allSquares(): Square12[] {
  const result: Square12[] = [];
  const wings: Wing[] = ["white", "black", "grey"];
  for (const w of wings) {
    for (let r = 0; r < 12; r++)
      for (let c = 0; c < 12; c++)
        result.push({ row: r, col: c, wing: w });
  }
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < centerRowWidth(r); c++)
      result.push({ row: r, col: c, wing: "center" });
  return result;
}

export function isKingInCheck12(board: TriBoard, color: PlayerColor, activePlayers: PlayerColor[]): boolean {
  const king = findKing12(board, color);
  if (!king) return false;
  for (const sq of allSquares()) {
    const p = getPiece(board, sq);
    if (p && p.color !== color && activePlayers.includes(p.color)) {
      const moves = getRawMoves12(board, sq);
      if (moves.some(m => sq12Eq(m, king))) return true;
    }
  }
  return false;
}

export function getLegalMoves12(board: TriBoard, sq: Square12, activePlayers: PlayerColor[]): Square12[] {
  const piece = getPiece(board, sq);
  if (!piece) return [];
  const raw = getRawMoves12(board, sq);
  return raw.filter(to => {
    const test = cloneTriBoard(board);
    const p = getPiece(test, sq);
    setPiece(test, to, p);
    setPiece(test, sq, null);
    return !isKingInCheck12(test, piece.color, activePlayers);
  });
}

// ─── SLEEP TICK ───────────────────────────────────────────────────────────────

export function tickSleep(board: TriBoard, color: PlayerColor): TriBoard {
  const b = cloneTriBoard(board);
  for (const sq of allSquares()) {
    const p = getPiece(b, sq);
    if (p && p.color === color && p.sleepRoundsLeft > 0) {
      setPiece(b, sq, { ...p, sleepRoundsLeft: p.sleepRoundsLeft - 1 });
    }
  }
  return b;
}

// ─── FIND PIECES ─────────────────────────────────────────────────────────────

export function findSorceress(board: TriBoard, color: PlayerColor): Square12 | null {
  for (const sq of allSquares()) {
    const p = getPiece(board, sq);
    if (p?.type === "sorceress" && p.color === color) return sq;
  }
  return null;
}

export function findWizard(board: TriBoard, color: PlayerColor): Square12 | null {
  for (const sq of allSquares()) {
    const p = getPiece(board, sq);
    if (p?.type === "wizard" && p.color === color) return sq;
  }
  return null;
}

// ─── SPELL FUNCTIONS ─────────────────────────────────────────────────────────

export function applySleepSpell(board: TriBoard, targetSq: Square12, sorcSq: Square12): TriBoard {
  const b = cloneTriBoard(board);
  const target = getPiece(b, targetSq);
  const sorc = getPiece(b, sorcSq);
  if (!target || !sorc) return b;
  setPiece(b, targetSq, { ...target, sleepRoundsLeft: 3 });
  const newSpells = sorc.sorceressSpellsLeft - 1;
  if (newSpells <= 0) setPiece(b, sorcSq, null);
  else setPiece(b, sorcSq, { ...sorc, sorceressSpellsLeft: newSpells });
  return b;
}

export function applyTeleportSpell(board: TriBoard, pieceSq: Square12, destSq: Square12, sorcSq: Square12): TriBoard {
  const b = cloneTriBoard(board);
  const piece = getPiece(b, pieceSq);
  const sorc = getPiece(b, sorcSq);
  if (!piece || !sorc) return b;
  setPiece(b, destSq, piece);
  setPiece(b, pieceSq, null);
  const newSpells = sorc.sorceressSpellsLeft - 1;
  if (newSpells <= 0) setPiece(b, sorcSq, null);
  else setPiece(b, sorcSq, { ...sorc, sorceressSpellsLeft: newSpells });
  return b;
}

export function rollWishDice(): number {
  return Math.floor(Math.random() * 10) + 1;
}

export function applyWizardTeleport(board: TriBoard, pieceSq: Square12, destSq: Square12): TriBoard {
  const b = cloneTriBoard(board);
  const piece = getPiece(b, pieceSq);
  if (!piece) return b;
  setPiece(b, destSq, piece);
  setPiece(b, pieceSq, null);
  return b;
}

export function getAxeSwingSquares(board: TriBoard, sq: Square12, color: PlayerColor): Square12[] {
  const adjacent = getAdjacentSquares(board, sq, STRAIGHT4);
  return adjacent.filter(s => {
    const p = getPiece(board, s);
    return p !== null && p.color !== color;
  });
}

export function applyMageSacrifice(board: TriBoard, mageSq: Square12, queenSq: Square12): TriBoard {
  const b = cloneTriBoard(board);
  const queen = getPiece(b, queenSq);
  if (!queen || queen.type !== "super-queen") return b;
  setPiece(b, mageSq, null);
  setPiece(b, queenSq, { ...queen, superQueenDoubleJumpDone: false });
  return b;
}

// ─── ADVANCE TURN ────────────────────────────────────────────────────────────

export function advanceTurn(state: GameState12): GameState12 {
  const ns = cloneState12(state);
  ns.specialMode = null;
  ns.specialData = null;
  ns.spellMessage = null;
  ns.pendingAxeSquare = null;
  ns.turnMovesLeft = 1;
  ns.selectedSquare = null;
  ns.validMoves = [];

  if (ns.turnOrder.length === 1) {
    ns.status = "finished";
    ns.winner = ns.turnOrder[0];
    return ns;
  }

  const idx = ns.turnOrder.indexOf(ns.currentTurn);
  ns.currentTurn = ns.turnOrder[(idx + 1) % ns.turnOrder.length];
  ns.board = tickSleep(ns.board, ns.currentTurn);

  const hasSorceress = findSorceress(ns.board, ns.currentTurn) !== null;
  ns.turnMovesLeft = hasSorceress ? 2 : 1;

  ns.check = null;
  for (const player of ns.turnOrder) {
    if (isKingInCheck12(ns.board, player, ns.turnOrder)) {
      ns.check = player;
      break;
    }
  }

  return ns;
}

// ─── EXECUTE MOVE ────────────────────────────────────────────────────────────

export function executeMove12(state: GameState12, from: Square12, to: Square12): GameState12 {
  const ns = cloneState12(state);
  const board = ns.board;
  const piece = getPiece(board, from)!;
  const target = getPiece(board, to);

  if (target) {
    ns.capturedBy[piece.color].push(target);
    if (target.type === "mystic-king") {
      ns.eliminatedPlayers.push(target.color);
      ns.turnOrder = ns.turnOrder.filter(p => p !== target.color);
      // Remove all pieces of eliminated player
      for (const sq of allSquares()) {
        const p = getPiece(board, sq);
        if (p?.color === target.color) setPiece(board, sq, null);
      }
    }
    if (target.type === "sorceress") {
      for (const sq of allSquares()) {
        const p = getPiece(board, sq);
        if (p && p.type === "super-queen" && p.color === target.color) {
          setPiece(board, sq, { ...p, sorceressDead: true });
        }
      }
    }
  }

  const isPaladanSuper =
    piece.type === "paladin" && !piece.paladanSuperUsed &&
    (Math.abs(to.row - from.row) > 1 || Math.abs(to.col - from.col) > 1);

  setPiece(board, to, {
    ...piece,
    hasMoved: true,
    paladanSuperUsed: isPaladanSuper ? true : piece.paladanSuperUsed,
    executionerAxeUsed: false,
  });
  setPiece(board, from, null);

  ns.lastMove = { from, to };
  ns.selectedSquare = null;
  ns.validMoves = [];
  ns.specialMode = null;
  ns.specialData = null;
  ns.spellMessage = null;
  ns.wishDiceResult = null;

  // Executioner axe swing
  if (piece.type === "executioner") {
    const axeSquares = getAxeSwingSquares(board, to, piece.color);
    if (axeSquares.length > 0) {
      ns.pendingAxeSquare = to;
      ns.specialMode = "executioner-axe-swing";
      ns.spellMessage = "Executioner can swing axe! Click adjacent enemy or click elsewhere to skip.";
      return ns;
    }
  }

  // Super queen double move
  if (piece.type === "super-queen" && !piece.sorceressDead && ns.turnMovesLeft > 1) {
    ns.turnMovesLeft = ns.turnMovesLeft - 1;
    ns.specialMode = "super-queen-second-move";
    ns.spellMessage = "Super Queen can move again!";
    ns.selectedSquare = to;
    ns.validMoves = getLegalMoves12(board, to, ns.turnOrder);
    return ns;
  }

  return advanceTurn(ns);
}

// ─── APPLY AXE SWING ─────────────────────────────────────────────────────────

export function applyAxeSwing(state: GameState12, targetSq: Square12): GameState12 {
  const ns = cloneState12(state);
  const board = ns.board;
  const target = getPiece(board, targetSq);
  if (!target) return advanceTurn(ns);
  ns.capturedBy[ns.currentTurn].push(target);
  if (target.type === "mystic-king") {
    ns.eliminatedPlayers.push(target.color);
    ns.turnOrder = ns.turnOrder.filter(p => p !== target.color);
    for (const sq of allSquares()) {
      const p = getPiece(board, sq);
      if (p?.color === target.color) setPiece(board, sq, null);
    }
  } else {
    setPiece(board, targetSq, null);
  }
  return advanceTurn(ns);
}