export type PlayerColor16 = "white" | "black";

export type PieceType16 =
  | "mystic-king" | "super-queen" | "wizard" | "sorceress" | "conjurer" | "warlock"
  | "trickster" | "dragon" | "gargoyle" | "thief" | "super-knight" | "elvin-archer"
  | "executioner" | "assassin" | "cavalier" | "mage" | "paladin"
  | "archer" | "aerobat-assassin";

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
  // Trickster
  tricksterStealUsed: boolean;
  tricksterMovesCount: number;
  // Conjurer
  conjurerSpellsLeft: number;
  // Warlock
  warlockBindUsed: boolean;
  // Bound (from Warlock)
  boundRoundsLeft: number;
}

export interface Square16 { row: number; col: number; }
export type Board16 = (Piece16 | null)[][];

export type SpecialMode16 =
  | null
  | "wizard-teleport-select-piece" | "wizard-teleport-select-dest"
  | "sorceress-sleep-select" | "sorceress-teleport-select"
  | "executioner-axe-swing"
  | "super-queen-second-move"
  | "conjurer-revive-select"
  | "warlock-bind-active"
  | "thief-steal-jump"
  | "trickster-steal-jump";

export interface GameState16 {
  board: Board16;
  currentTurn: PlayerColor16;
  turnOrder: PlayerColor16[];
  eliminatedPlayers: PlayerColor16[];
  capturedBy: Record<"white" | "black", Piece16[]>;
  selectedSquare: Square16 | null;
  validMoves: Square16[];
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
  "archer":           p.color === "white" ? "Elven Archer White" : "Elven Archer Black",
  "thief":            p.color === "white" ? "Assassin White" : "Assassin black",
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
    tricksterStealUsed: false,
    tricksterMovesCount: 0,
    conjurerSpellsLeft: 1,
    warlockBindUsed: false,
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
    case "gargoyle":
      // Slide any dir + L-shape capture only (can fly over own pieces)
      m = [...slide16(b,r,c,ALL8_16,color)];
      KJ_16.forEach(([dr,dc]) => {
        const sq = { row: r+dr, col: c+dc };
        if (inB16(sq.row,sq.col) && b[sq.row][sq.col] && b[sq.row][sq.col]!.color !== color)
          m.push(sq);
      });
      break;

    case "wizard":
      // Ethereal — slides any dir, only kills wizard/sorceress
      for (const [dr,dc] of ALL8_16) {
        let rr = r+dr, cc = c+dc;
        while (inB16(rr,cc)) {
          const t = b[rr][cc];
          if (!t) { m.push({ row:rr, col:cc }); }
          else {
            if (t.color !== color && (t.type==="wizard"||t.type==="sorceress"||t.type==="conjurer"||t.type==="warlock"||t.type==="trickster"))
              m.push({ row:rr, col:cc });
            break;
          }
          rr+=dr; cc+=dc;
        }
      }
      break;

    case "sorceress":
    case "conjurer":
    case "warlock":
      // Ethereal — slides any dir, only kills ethereals
      m = slide16(b,r,c,ALL8_16,color);
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
      m = [...os16(b,r,c,color)];
      if (!p.paladanSuperUsed) {
        for (const [dr,dc] of ALL8_16) {
          for (const d of [2,3]) {
            const rr = r+dr*d, cc = c+dc*d;
            if (inB16(rr,cc) && b[rr][cc]?.color !== color) m.push({ row:rr, col:cc });
          }
        }
      }
      break;
  }

  return dd16(m);
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

// ─── MOVE QUALITY ────────────────────────────────────────────────────────────
function evaluateMoveQuality16(
  board: Board16, from: Square16, to: Square16,
  piece: Piece16, captured: Piece16 | null,
  newBoard: Board16, active: PlayerColor16[]
): "great" | "risky" | "normal" {
  let score = 0;
  const pv: Record<PieceType16, number> = {
    "mystic-king":10,"super-queen":9,"dragon":8,"gargoyle":7,"sorceress":7,
    "wizard":6,"warlock":6,"conjurer":6,"trickster":6,"thief":5,
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

// Warlock binds all enemy pieces for 1 round
export function applyWarlockBind16(state: GameState16, warlockColor: PlayerColor16): GameState16 {
  const ns = cloneState16(state);
  const enemy = warlockColor === "white" ? "black" : "white";
  // Mark all enemy pieces as bound
  for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
    const p = ns.board[r][c];
    if (p && p.color === enemy) ns.board[r][c] = { ...p, boundRoundsLeft: 1 };
  }
  // Mark warlock as used
  for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
    const p = ns.board[r][c];
    if (p && p.type === "warlock" && p.color === warlockColor)
      ns.board[r][c] = { ...p, warlockBindUsed: true };
  }
  if (!ns.boundPlayers.includes(enemy)) ns.boundPlayers.push(enemy);
  ns.spellMessage = `⛓️ Warlock bound ALL ${enemy} pieces for 1 round!`;
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

function checkWinner16(board: Board16, turnOrder: PlayerColor16[]): PlayerColor16 | null {
  for (const color of turnOrder) {
    if (checkAllEliminated16(board, color)) {
      // This player has no pieces — opponent wins
      return turnOrder.find(c => c !== color) || null;
    }
  }
  return null;
}

// ─── ADVANCE TURN ─────────────────────────────────────────────────────────────
export function advanceTurn16(state: GameState16): GameState16 {
  const ns = cloneState16(state);
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null;
  ns.pendingAxeSquare = null; ns.selectedSquare = null; ns.validMoves = [];
  ns.justEliminated = null;

  // Trickster game-over check: if trickster alive > 10 moves
  for (const color of ns.turnOrder) {
    const tricksterAlive = ns.turnOrder.some(c => {
      for (let r = 0; r < 16; r++) for (let c2 = 0; c2 < 16; c2++)
        if (ns.board[r][c2]?.type === "trickster" && ns.board[r][c2]?.color === c) return true;
      return false;
    });
    if (tricksterAlive) {
      const count = (ns.tricksterAliveCount[color] || 0) + 1;
      ns.tricksterAliveCount[color] = count;
      if (count > 10) {
        // Trickster owner loses — game over
        const loser = color;
        const winner = ns.turnOrder.find(c => c !== loser)!;
        ns.status = "finished"; ns.winner = winner; ns.currentTurn = winner;
        return ns;
      }
    }
  }

  const w = checkWinner16(ns.board, ns.turnOrder);
  if (w) { ns.status = "finished"; ns.winner = w; ns.currentTurn = w; return ns; }

  const idx = ns.turnOrder.indexOf(ns.currentTurn);
  const nextIdx = (idx + 1) % ns.turnOrder.length;
  ns.currentTurn = ns.turnOrder[nextIdx];
  ns.turnMovesLeft = 1;

  ns.board = tickSleep16(ns.board, ns.currentTurn);

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
  const ns = cloneState16(state);
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
  ns.specialMode = null; ns.specialData = null; ns.spellMessage = null; ns.wishDiceResult = null;

  const w = checkWinner16(ns.board, ns.turnOrder);
  if (w) { ns.status = "finished"; ns.winner = w; ns.currentTurn = w; return ns; }

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

export function applyAxeSwing16(state: GameState16, tSq: Square16): GameState16 {
  const ns = cloneState16(state);
  const board = ns.board;
  const t = board[tSq.row][tSq.col];
  if (!t) return advanceTurn16(ns);
  ns.capturedBy[ns.currentTurn].push(t);
  if (t.type === "mystic-king") {
    ns.eliminatedPlayers.push(t.color);
    ns.justEliminated = t.color;
    ns.turnOrder = ns.turnOrder.filter(p => p !== t.color);
    for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++)
      if (board[r][c]?.color === t.color) board[r][c] = null;
    const w = checkWinner16(ns.board, ns.turnOrder);
    if (w) { ns.status = "finished"; ns.winner = w; ns.currentTurn = w; return ns; }
  } else {
    board[tSq.row][tSq.col] = null;
  }
  return advanceTurn16(ns);
}

// Thief steal — triple jump, take enemy piece
export function applyThiefSteal16(state: GameState16, from: Square16, targetSq: Square16): GameState16 {
  const ns = cloneState16(state);
  const board = ns.board;
  const thief = board[from.row][from.col];
  const target = board[targetSq.row][targetSq.col];
  if (!thief || !target || target.type === "mystic-king") return ns;

  ns.capturedBy[thief.color].push(target);
  board[targetSq.row][targetSq.col] = null;
  board[from.row][from.col] = { ...thief, thiefStealUsed: true };
  ns.spellMessage = `🗝️ Thief stole the ${target.type}!`;
  return advanceTurn16(ns);
}