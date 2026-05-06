export type PlayerColor = "white" | "black" | "grey";

export type PieceType12 =
  | "mystic-king" | "super-queen" | "dragon" | "gargoyle"
  | "wizard" | "sorceress" | "super-knight" | "assassin"
  | "executioner" | "cavalier" | "mage" | "elvin-archer" | "paladin";

export interface Piece12 {
  id: string; type: PieceType12; color: PlayerColor;
  hasMoved: boolean; paladanSuperUsed: boolean; superKnightJumpsLeft: number;
  sorceressSpellsLeft: number; sorceressDead: boolean; sleepRoundsLeft: number;
  isEthereal: boolean; executionerAxeUsed: boolean;
  superQueenDoubleJumpDone: boolean; mageSacrificed: boolean;
}

export interface Square12 { row: number; col: number; }
export type Board12 = (Piece12 | null)[][];

export type SpecialMode =
  | null | "wizard-teleport-select-piece" | "wizard-teleport-select-dest"
  | "sorceress-sleep-select" | "sorceress-teleport-select"
  | "executioner-axe-swing" | "super-queen-second-move";

export interface GameState12 {
  board: Board12; currentTurn: PlayerColor;
  turnOrder: PlayerColor[];       // living players only
  eliminatedPlayers: PlayerColor[];
  capturedBy: Record<PlayerColor, Piece12[]>;
  selectedSquare: Square12 | null; validMoves: Square12[];
  status: "playing" | "finished"; winner: PlayerColor | null;
  lastMove: { from: Square12; to: Square12 } | null;
  check: PlayerColor | null;
  specialMode: SpecialMode; specialData: any;
  wishDiceResult: number | null; turnMovesLeft: number;
  pendingAxeSquare: Square12 | null; spellMessage: string | null;
  // Move quality for UX feedback
  lastMoveQuality: "great" | "risky" | "normal" | null;
  // Elimination event for popup
  justEliminated: PlayerColor | null;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export const sq12Eq = (a: Square12, b: Square12) => a.row === b.row && a.col === b.col;
export const inB = (r: number, c: number) => r >= 0 && r < 12 && c >= 0 && c < 12;

export function cloneBoard12(b: Board12): Board12 {
  return b.map(row => row.map(cell => cell ? { ...cell } : null));
}
export function cloneState12(s: GameState12): GameState12 {
  return {
    ...s, board: cloneBoard12(s.board),
    turnOrder: [...s.turnOrder], eliminatedPlayers: [...s.eliminatedPlayers],
    capturedBy: { white:[...s.capturedBy.white], black:[...s.capturedBy.black], grey:[...s.capturedBy.grey] },
    validMoves: [...s.validMoves],
    specialData: s.specialData ? { ...s.specialData } : null,
  };
}

export function pieceImagePath(p: Piece12): string {
  const folder = p.color;
  const suffix = p.color==="white"?"White":p.color==="grey"?"Gray":p.type==="super-knight"?"Black":"black";
  const nm: Record<PieceType12,string> = {
    "mystic-king":"Mystic King","super-queen":"Super Queen","dragon":"Dragon","gargoyle":"Gargoyle",
    "wizard":"Wizard","sorceress":"Sorceress","super-knight":"Super Knight","assassin":"Assassin",
    "executioner":"Executioner","cavalier":"Mystic King","mage":"Sorceress","elvin-archer":"Assassin","paladin":"Gargoyle",
  };
  return `/pieces-12x12/${folder}/${nm[p.type]} ${suffix}.png`;
}

// ─── BOARD SETUP ─────────────────────────────────────────────────────────────
function mkP(type: PieceType12, color: PlayerColor, id: string): Piece12 {
  return { id, type, color, hasMoved:false, paladanSuperUsed:false, superKnightJumpsLeft:2,
    sorceressSpellsLeft:3, sorceressDead:false, sleepRoundsLeft:0,
    isEthereal:type==="wizard"||type==="sorceress", executionerAxeUsed:false,
    superQueenDoubleJumpDone:false, mageSacrificed:false };
}

const BACK:  PieceType12[] = ["executioner","assassin","super-knight","gargoyle","mystic-king","super-queen","sorceress","wizard","dragon","super-knight","assassin","executioner"];
const FRONT: PieceType12[] = ["paladin","paladin","cavalier","elvin-archer","mage","paladin","paladin","mage","elvin-archer","cavalier","paladin","paladin"];

export function createInitialBoard12(): Board12 {
  const b: Board12 = Array(12).fill(null).map(()=>Array(12).fill(null));
  BACK.forEach((t,c)=>{ b[11][c]=mkP(t,"white",`w-b${c}`); b[0][c]=mkP(t,"black",`k-b${c}`); });
  FRONT.forEach((t,c)=>{ b[10][c]=mkP(t,"white",`w-f${c}`); b[1][c]=mkP(t,"black",`k-f${c}`); });
  // Grey on right cols 10-11, rows 2-9
  [2,3,4,5,6,7,8,9].forEach((row,i)=>{
    if(i<BACK.length)  b[row][11]=mkP(BACK[i], "grey",`g-b${row}`);
    if(i<FRONT.length&&!b[row][10]) b[row][10]=mkP(FRONT[i],"grey",`g-f${row}`);
  });
  return b;
}

export function createInitialGameState12(): GameState12 {
  return {
    board:createInitialBoard12(), currentTurn:"white",
    turnOrder:["white","black","grey"], eliminatedPlayers:[],
    capturedBy:{white:[],black:[],grey:[]},
    selectedSquare:null, validMoves:[], status:"playing", winner:null,
    lastMove:null, check:null, specialMode:null, specialData:null,
    wishDiceResult:null, turnMovesLeft:1, pendingAxeSquare:null, spellMessage:null,
    lastMoveQuality:null, justEliminated:null,
  };
}

// ─── MOVE GENERATION ─────────────────────────────────────────────────────────
const ALL8: [number,number][] = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
const ST4:  [number,number][] = [[-1,0],[1,0],[0,-1],[0,1]];
const KJ:   [number,number][] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

function slide(b:Board12,r:number,c:number,dirs:[number,number][],color:PlayerColor):Square12[]{
  const m:Square12[]=[];
  for(const[dr,dc]of dirs){let rr=r+dr,cc=c+dc;while(inB(rr,cc)){const t=b[rr][cc];if(!t){m.push({row:rr,col:cc});}else{if(t.color!==color)m.push({row:rr,col:cc});break;}rr+=dr;cc+=dc;}}
  return m;
}
function lj(b:Board12,r:number,c:number,color:PlayerColor):Square12[]{
  return KJ.map(([dr,dc])=>({row:r+dr,col:c+dc})).filter(s=>inB(s.row,s.col)&&b[s.row][s.col]?.color!==color);
}
function os(b:Board12,r:number,c:number,color:PlayerColor):Square12[]{
  return ALL8.map(([dr,dc])=>({row:r+dr,col:c+dc})).filter(s=>inB(s.row,s.col)&&b[s.row][s.col]?.color!==color);
}
function dd(m:Square12[]):Square12[]{const s=new Set<string>();return m.filter(q=>{const k=`${q.row},${q.col}`;if(s.has(k))return false;s.add(k);return true;});}

export function getRawMoves12(b:Board12,r:number,c:number):Square12[]{
  const p=b[r][c]; if(!p||p.sleepRoundsLeft>0) return [];
  const {type,color}=p; let m:Square12[]=[];
  switch(type){
    case"mystic-king":  m=[...lj(b,r,c,color),...os(b,r,c,color)]; break;
    case"super-queen":  m=slide(b,r,c,ALL8,color); break;
    case"dragon":
    case"gargoyle":     m=[...slide(b,r,c,ALL8,color),...lj(b,r,c,color).filter(s=>b[s.row][s.col]&&b[s.row][s.col]!.color!==color)]; break;
    case"wizard":
      for(const[dr,dc]of ALL8){let rr=r+dr,cc=c+dc;while(inB(rr,cc)){const t=b[rr][cc];if(!t){m.push({row:rr,col:cc});}else{if(t.color!==color&&(t.type==="wizard"||t.type==="sorceress"))m.push({row:rr,col:cc});break;}rr+=dr;cc+=dc;}}
      break;
    case"sorceress":    m=slide(b,r,c,ALL8,color); break;
    case"super-knight": m=lj(b,r,c,color); break;
    case"assassin":     m=[...slide(b,r,c,ALL8,color),...lj(b,r,c,color),...os(b,r,c,color)]; break;
    case"executioner":  m=slide(b,r,c,ST4,color); break;
    case"cavalier":     m=[...lj(b,r,c,color),...os(b,r,c,color)]; break;
    case"mage":         m=slide(b,r,c,ALL8,color); break;
    case"elvin-archer": m=[...slide(b,r,c,ALL8,color),...lj(b,r,c,color),...os(b,r,c,color)]; break;
    case"paladin":
      m=[...os(b,r,c,color)];
      if(!p.paladanSuperUsed) for(const[dr,dc]of ALL8) for(const d of[2,3]){const rr=r+dr*d,cc=c+dc*d;if(inB(rr,cc)&&b[rr][cc]?.color!==color)m.push({row:rr,col:cc});}
      break;
  }
  return dd(m);
}

export function findKing12(b:Board12,color:PlayerColor):Square12|null{
  for(let r=0;r<12;r++)for(let c=0;c<12;c++)if(b[r][c]?.type==="mystic-king"&&b[r][c]?.color===color)return{row:r,col:c};
  return null;
}

export function isKingInCheck12(b:Board12,color:PlayerColor,active:PlayerColor[]):boolean{
  const k=findKing12(b,color); if(!k) return false;
  for(let r=0;r<12;r++)for(let c=0;c<12;c++){const p=b[r][c];if(p&&p.color!==color&&active.includes(p.color))if(getRawMoves12(b,r,c).some(m=>sq12Eq(m,k)))return true;}
  return false;
}

export function getLegalMoves12(b:Board12,row:number,col:number,active:PlayerColor[]):Square12[]{
  const p=b[row][col]; if(!p) return [];
  return getRawMoves12(b,row,col).filter(to=>{const t=cloneBoard12(b);t[to.row][to.col]=t[row][col];t[row][col]=null;return!isKingInCheck12(t,p.color,active);});
}

// ─── MOVE QUALITY EVALUATOR ──────────────────────────────────────────────────
function evaluateMoveQuality(
  board: Board12, from: Square12, to: Square12,
  piece: Piece12, captured: Piece12 | null, newBoard: Board12,
  active: PlayerColor[]
): "great" | "risky" | "normal" {
  let score = 0;
  const pieceValues: Record<PieceType12, number> = {
    "mystic-king":10,"super-queen":9,"dragon":8,"gargoyle":7,"sorceress":7,
    "wizard":6,"assassin":6,"elvin-archer":5,"super-knight":5,"executioner":5,
    "cavalier":4,"mage":4,"paladin":2,
  };

  // Captured a high-value piece = great
  if (captured) score += pieceValues[captured.type] * 2;

  // Moved to check enemy king = great
  for (const enemy of active) {
    if (enemy !== piece.color && isKingInCheck12(newBoard, enemy, active)) score += 5;
  }

  // Own king now in check = risky
  if (isKingInCheck12(newBoard, piece.color, active)) score -= 8;

  // Moving king into danger = risky
  if (piece.type === "mystic-king") {
    const enemies = active.filter(c => c !== piece.color);
    let threatened = 0;
    for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) {
      const ep = newBoard[r][c];
      if (ep && enemies.includes(ep.color)) {
        if (getRawMoves12(newBoard, r, c).some(m => sq12Eq(m, to))) threatened++;
      }
    }
    if (threatened > 1) score -= 6;
  }

  // Moving valuable piece to threatened square = risky
  if (pieceValues[piece.type] >= 6) {
    const enemies = active.filter(c => c !== piece.color);
    for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) {
      const ep = newBoard[r][c];
      if (ep && enemies.includes(ep.color)) {
        if (getRawMoves12(newBoard, r, c).some(m => sq12Eq(m, to))) { score -= 3; break; }
      }
    }
  }

  if (score >= 4) return "great";
  if (score <= -4) return "risky";
  return "normal";
}

// ─── FIND PIECES ─────────────────────────────────────────────────────────────
export function findSorceress(b:Board12,c:PlayerColor):Square12|null{for(let r=0;r<12;r++)for(let cc=0;cc<12;cc++)if(b[r][cc]?.type==="sorceress"&&b[r][cc]?.color===c)return{row:r,col:cc};return null;}
export function findWizard(b:Board12,c:PlayerColor):Square12|null{for(let r=0;r<12;r++)for(let cc=0;cc<12;cc++)if(b[r][cc]?.type==="wizard"&&b[r][cc]?.color===c)return{row:r,col:cc};return null;}

// ─── SPELLS ──────────────────────────────────────────────────────────────────
export function applySleepSpell(b:Board12,tSq:Square12,sSq:Square12):Board12{
  const nb=cloneBoard12(b);const t=nb[tSq.row][tSq.col],s=nb[sSq.row][sSq.col];if(!t||!s)return nb;
  nb[tSq.row][tSq.col]={...t,sleepRoundsLeft:3};
  const ns=s.sorceressSpellsLeft-1;if(ns<=0)nb[sSq.row][sSq.col]=null;else nb[sSq.row][sSq.col]={...s,sorceressSpellsLeft:ns};return nb;
}
export function applyTeleportSpell(b:Board12,pSq:Square12,dSq:Square12,sSq:Square12):Board12{
  const nb=cloneBoard12(b);const p=nb[pSq.row][pSq.col],s=nb[sSq.row][sSq.col];if(!p||!s)return nb;
  nb[dSq.row][dSq.col]=p;nb[pSq.row][pSq.col]=null;
  const ns=s.sorceressSpellsLeft-1;if(ns<=0)nb[sSq.row][sSq.col]=null;else nb[sSq.row][sSq.col]={...s,sorceressSpellsLeft:ns};return nb;
}
export function rollWishDice():number{return Math.floor(Math.random()*10)+1;}
export function applyWizardTeleport(b:Board12,pSq:Square12,dSq:Square12):Board12{
  const nb=cloneBoard12(b);const p=nb[pSq.row][pSq.col];if(!p)return nb;nb[dSq.row][dSq.col]=p;nb[pSq.row][pSq.col]=null;return nb;
}
export function getAxeSwingSquares(b:Board12,r:number,c:number,color:PlayerColor):Square12[]{
  return [{row:r,col:c-1},{row:r,col:c+1},{row:r-1,col:c},{row:r+1,col:c}].filter(s=>inB(s.row,s.col)&&b[s.row][s.col]!==null&&b[s.row][s.col]!.color!==color);
}
export function applyMageSacrifice(b:Board12,mSq:Square12,qSq:Square12):Board12{
  const nb=cloneBoard12(b);const q=nb[qSq.row][qSq.col];if(!q||q.type!=="super-queen")return nb;
  nb[mSq.row][mSq.col]=null;nb[qSq.row][qSq.col]={...q,superQueenDoubleJumpDone:false};return nb;
}

export function tickSleep(b:Board12,color:PlayerColor):Board12{
  const nb=cloneBoard12(b);
  for(let r=0;r<12;r++)for(let c=0;c<12;c++){const p=nb[r][c];if(p&&p.color===color&&p.sleepRoundsLeft>0)nb[r][c]={...p,sleepRoundsLeft:p.sleepRoundsLeft-1};}
  return nb;
}

// ─── WIN CHECK — THE CRITICAL FUNCTION ───────────────────────────────────────
// A player is eliminated when their Mystic King is captured.
// Winner = last player remaining in turnOrder.
function checkWinner(turnOrder: PlayerColor[]): PlayerColor | null {
  if (turnOrder.length === 1) return turnOrder[0];
  if (turnOrder.length === 0) return null; // draw / error
  return null;
}

// ─── ADVANCE TURN ────────────────────────────────────────────────────────────
export function advanceTurn(state: GameState12): GameState12 {
  const ns = cloneState12(state);
  ns.specialMode=null; ns.specialData=null; ns.spellMessage=null;
  ns.pendingAxeSquare=null; ns.selectedSquare=null; ns.validMoves=[];
  ns.justEliminated=null; // clear elimination popup after processing

  // Check winner
  const w = checkWinner(ns.turnOrder);
  if (w) { ns.status="finished"; ns.winner=w; ns.currentTurn=w; return ns; }

  // Advance to next living player
  const idx = ns.turnOrder.indexOf(ns.currentTurn);
  const nextIdx = (idx + 1) % ns.turnOrder.length;
  ns.currentTurn = ns.turnOrder[nextIdx];
  ns.turnMovesLeft = 1;

  // Tick sleep for next player
  ns.board = tickSleep(ns.board, ns.currentTurn);

  // Super queen double move if sorceress alive
  const hasSorc = findSorceress(ns.board, ns.currentTurn) !== null;
  if (hasSorc) ns.turnMovesLeft = 2;

  // Check detection — check all living players
  ns.check = null;
  for (const player of ns.turnOrder) {
    if (isKingInCheck12(ns.board, player, ns.turnOrder)) {
      ns.check = player; break;
    }
  }

  return ns;
}

// ─── EXECUTE MOVE ────────────────────────────────────────────────────────────
export function executeMove12(state: GameState12, from: Square12, to: Square12): GameState12 {
  const ns = cloneState12(state);
  const board = ns.board;
  const piece = board[from.row][from.col]!;
  const target = board[to.row][to.col];
  ns.justEliminated = null;

  // Capture logic
  if (target) {
    ns.capturedBy[piece.color].push(target);

    // ── MYSTIC KING CAPTURED = ELIMINATION ──
    if (target.type === "mystic-king") {
      ns.eliminatedPlayers.push(target.color);
      ns.justEliminated = target.color; // trigger elimination popup

      // Remove eliminated player from turn order
      ns.turnOrder = ns.turnOrder.filter(p => p !== target.color);

      // Remove ALL pieces of eliminated player from board
      for (let r = 0; r < 12; r++)
        for (let c = 0; c < 12; c++)
          if (board[r][c]?.color === target.color) board[r][c] = null;
    }

    // Sorceress killed = super queen loses double jump
    if (target.type === "sorceress") {
      for (let r = 0; r < 12; r++)
        for (let c = 0; c < 12; c++) {
          const p = board[r][c];
          if (p && p.type === "super-queen" && p.color === target.color)
            board[r][c] = { ...p, sorceressDead: true };
        }
    }
  }

  // Evaluate move quality BEFORE moving
  const newBoardPreview = cloneBoard12(board);
  newBoardPreview[to.row][to.col] = piece;
  newBoardPreview[from.row][from.col] = null;
  const quality = evaluateMoveQuality(board, from, to, piece, target, newBoardPreview, ns.turnOrder);
  ns.lastMoveQuality = quality;

  // Paladin super used check
  const isPS = piece.type==="paladin" && !piece.paladanSuperUsed && (Math.abs(to.row-from.row)>1||Math.abs(to.col-from.col)>1);

  // Move piece
  board[to.row][to.col] = { ...piece, hasMoved:true, paladanSuperUsed:isPS?true:piece.paladanSuperUsed, executionerAxeUsed:false };
  board[from.row][from.col] = null;
  ns.lastMove = { from, to };
  ns.selectedSquare=null; ns.validMoves=[];
  ns.specialMode=null; ns.specialData=null; ns.spellMessage=null; ns.wishDiceResult=null;

  // ── CHECK WINNER RIGHT AFTER ELIMINATION ──
  const w = checkWinner(ns.turnOrder);
  if (w) {
    ns.status = "finished";
    ns.winner = w;
    ns.currentTurn = w;
    return ns;
  }

  // Executioner axe swing
  if (piece.type === "executioner") {
    const ax = getAxeSwingSquares(board, to.row, to.col, piece.color);
    if (ax.length > 0) {
      ns.pendingAxeSquare = to;
      ns.specialMode = "executioner-axe-swing";
      ns.spellMessage = "Executioner: Click adjacent enemy to swing axe, or elsewhere to skip.";
      return ns;
    }
  }

  // Super queen double move
  if (piece.type === "super-queen" && !piece.sorceressDead && ns.turnMovesLeft > 1) {
    ns.turnMovesLeft = ns.turnMovesLeft - 1;
    ns.specialMode = "super-queen-second-move";
    ns.spellMessage = "Super Queen can move again!";
    ns.selectedSquare = to;
    ns.validMoves = getLegalMoves12(board, to.row, to.col, ns.turnOrder);
    return ns;
  }

  return advanceTurn(ns);
}

export function applyAxeSwing(state: GameState12, tSq: Square12): GameState12 {
  const ns = cloneState12(state);
  const board = ns.board;
  const t = board[tSq.row][tSq.col];
  if (!t) return advanceTurn(ns);
  ns.capturedBy[ns.currentTurn].push(t);
  if (t.type === "mystic-king") {
    ns.eliminatedPlayers.push(t.color);
    ns.justEliminated = t.color;
    ns.turnOrder = ns.turnOrder.filter(p => p !== t.color);
    for (let r = 0; r < 12; r++)
      for (let c = 0; c < 12; c++)
        if (board[r][c]?.color === t.color) board[r][c] = null;
    const w = checkWinner(ns.turnOrder);
    if (w) { ns.status="finished"; ns.winner=w; ns.currentTurn=w; return ns; }
  } else {
    board[tSq.row][tSq.col] = null;
  }
  return advanceTurn(ns);
}