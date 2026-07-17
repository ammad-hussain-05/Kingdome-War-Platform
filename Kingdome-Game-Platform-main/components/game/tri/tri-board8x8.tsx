"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import {
  createInitialTriGameState8,
  executeMoveTri8,
  eliminatePlayerTri8,
  getLegalMovesTri8,
  getLegalSuperMovesTri8,
  getNormalMoves,
  getSuperMoves,
  passTurnTri8,
  triSquareEquals,
  isConnectorCell,
  ALL_BOARD_IDS,
  ALL_COLORS,
  TRI_ROWS,
  TRI_COLS,
  TRI_COL_CENTER,
  type TriColor,
  type TriBoardId,
  type TriSquare,
  type TriGameState8,
  type Piece,
} from "@/lib/game/tri/rules-tri-8x8";
import Fireworks from "@/components/game/fireworks";

// ─── PIECE IMAGES (same art as the classic 8x8 board) ─────────────────────────
const PIECE_IMAGES: Record<string, string> = {
  "white-king":    "/pieces/white/King - White.png",
  "white-queen":   "/pieces/white/Queen - White.png",
  "white-rook":    "/pieces/white/Rook - White.png",
  "white-bishop":  "/pieces/white/Bishop - White.png",
  "white-knight":  "/pieces/white/Knight - White.png",
  "white-paladin": "/pieces/white/Paladin - White.png",
  "black-king":    "/pieces/black/King - Black.png",
  "black-queen":   "/pieces/black/Queen - Black.png",
  "black-rook":    "/pieces/black/Rook - Black.png",
  "black-bishop":  "/pieces/black/Bishop - Black.png",
  "black-knight":  "/pieces/black/Knight - Black.png",
  "black-paladin": "/pieces/black/Paladin - Black.png",
  "grey-king":     "/pieces/grey/King - Grey.png",
  "grey-queen":    "/pieces/grey/Queen - Grey.png",
  "grey-rook":     "/pieces/grey/Rook - Grey.png",
  "grey-bishop":   "/pieces/grey/Bishop - Grey.png",
  "grey-knight":   "/pieces/grey/Knight - Grey.png",
  "grey-paladin":  "/pieces/grey/Paladin - Grey.png",
};

function pieceImgSrc(p: Piece) {
  return PIECE_IMAGES[`${p.color}-${p.type}`];
}
function pieceFilter(_p: Piece): string | undefined {
  return undefined;
}

const AC: Record<TriColor, string> = {
  white: "#f0dfb0",
  black: "#c8a878",
  grey: "#b8c4d8",
};
const DOT: Record<TriColor, string> = {
  white: "#f4f0e6",
  black: "#2a2a2a",
  grey: "#b8c4d8",
};
const GOLD = "#d4a843";
const DANGER = "#ff5050";

const BOARD_COLOR: Record<TriBoardId, TriColor | null> = { A: "white", B: "black", C: "grey", T: null };

const RULES = [
  { title: "Move inside your kingdom", body: "Slide, jump and capture using the same rules as the classic 8x8 board." },
  { title: "Reach a connector", body: "Each kingdom has 3 connector cells (glowing gold) on the edge facing the Tri Gate." },
  { title: "Enter the Tri Gate", body: "From a connector, cross into the large shared battlefield at the center." },
  { title: "Fight in the battlefield", body: "The Tri Gate is one real board — White, Black and Grey all move and clash on it together. Crossing is one-way; there is no return." },
  { title: "Capture opponents", body: "Capture any enemy piece your piece can legally reach, on any board." },
  { title: "Win the war", body: "A player is eliminated only once every one of their pieces is captured. The last kingdom standing wins." },
];

function LegendSwatch({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 18, height: 18, borderRadius: 4, background: "#3a2410", border: "1px solid rgba(212,168,67,.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {children}
    </div>
  );
}

const SAFE_LEGEND = "#3ecf6e";
const SELECT_LEGEND = "#4aa8ff";

const LEGEND: { icon: React.ReactNode; label: string }[] = [
  { label: "Your Pieces", icon: <LegendSwatch><img src="/pieces/white/King - White.png" alt="" style={{ width: 15, height: 15, objectFit: "contain" }} /></LegendSwatch> },
  { label: "Opponent Pieces", icon: <LegendSwatch><img src="/pieces/black/King - Black.png" alt="" style={{ width: 15, height: 15, objectFit: "contain" }} /></LegendSwatch> },
  { label: "Selected Piece", icon: <LegendSwatch><div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${SELECT_LEGEND}`, boxShadow: `0 0 8px ${SELECT_LEGEND}99` }} /></LegendSwatch> },
  { label: "Safe / Recommended Move", icon: <LegendSwatch><div style={{ width: 10, height: 10, borderRadius: "50%", background: SAFE_LEGEND, boxShadow: `0 0 8px ${SAFE_LEGEND}99` }} /></LegendSwatch> },
  { label: "Connector / Gate Crossing", icon: <LegendSwatch><div style={{ width: 10, height: 10, background: GOLD, transform: "rotate(45deg)", boxShadow: `0 0 8px ${GOLD}99` }} /></LegendSwatch> },
  { label: "Danger Zone / Risky Move", icon: <LegendSwatch><div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${DANGER}`, boxShadow: `0 0 8px ${DANGER}99` }} /></LegendSwatch> },
];

const GAME_FLOW: { icon: React.ReactNode; lines: [string, string] }[] = [
  { icon: <span style={{ fontSize: 18 }}>♟</span>, lines: ["Move inside", "your kingdom"] },
  { icon: <div style={{ width: 12, height: 12, background: GOLD, transform: "rotate(45deg)" }} />, lines: ["Reach a", "connector cell"] },
  { icon: <span style={{ fontSize: 16, color: "#5ab4ff" }}>➤</span>, lines: ["Cross into", "the Tri Gate"] },
  { icon: <span style={{ fontSize: 17 }}>⚔</span>, lines: ["Fight and capture", "on the battlefield"] },
  { icon: <span style={{ fontSize: 17 }}>🏆</span>, lines: ["Eliminate all", "opponents to win"] },
];

// ─── THREAT ANALYSIS (read-only UI guidance — no game-rule changes) ─────────
function computeReachSet(state: TriGameState8, excludeColor: TriColor): Set<string> {
  const reach = new Set<string>();
  for (const boardId of ALL_BOARD_IDS) {
    const board = state.boards[boardId];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const piece = board[r][c];
        if (!piece || piece.color === excludeColor) continue;
        for (const m of getNormalMoves(board, r, c, boardId)) reach.add(`${boardId}|${m.row}|${m.col}`);
        for (const m of getSuperMoves(board, r, c, boardId)) reach.add(`${boardId}|${m.row}|${m.col}`);
      }
    }
  }
  return reach;
}

function CapturedTray({ pieces }: { pieces: Piece[] }) {
  if (pieces.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
      {pieces.slice(0, 6).map((p, i) => (
        <img key={i} src={pieceImgSrc(p)} alt={`${p.color} ${p.type}`} style={{ width: 16, height: 16, objectFit: "contain", filter: pieceFilter(p) ?? "drop-shadow(0 1px 3px rgba(0,0,0,.8))" }} />
      ))}
      {pieces.length > 6 && <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)", alignSelf: "center" }}>+{pieces.length - 6}</span>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="tb-panel">
      <h3 className="tb-panel-title">{title}</h3>
      {children}
    </div>
  );
}

// ─── LAYOUT GEOMETRY ─────────────────────────────────────────────────────────
// Every board and wire below is placed with explicit pixel math so the three
// kingdom boards touch the triangle's three true vertices exactly — nothing
// here relies on flexbox auto-centering guessing where things line up.
//
// The gold frame around the battlefield is drawn as a single SVG polygon
// inflated by one full cell (`triMargin`) beyond the raw apex/base math.
// The stepped cell grid's outermost corners (e.g. the top corners of the
// base row) mathematically overshoot a triangle drawn tight to the true
// vertices by up to ~0.44 cells — inflating by a full cell guarantees the
// frame always encloses the whole staircase with margin to spare, so the
// border reads as one clean, unbroken, symmetric triangle on every side.
const FRAME = 14;
const TITLE_H = 26;
const WIRE_GAP = 20;
const LABEL_GUTTER = 18;
// Desktop side-panel/grid constants — kept here so the JS sizing calc and the
// CSS grid template always agree on exactly how much room the side panels
// take, which is what keeps the battlefield truly centered.
const SIDE_COL_W = 224;
const GRID_GAP = 18;
const ROOT_PAD = 24;
const CONTENT_MAX_W = 1600;
const COL_LABEL_H = 20;

function buildLayout(triSqPx: number, kingdomSqPx: number) {
  const kingdomBoardPx = kingdomSqPx * 8 + FRAME * 2;
  const triWidth = TRI_COLS * triSqPx;
  const triHeight = TRI_ROWS * triSqPx;
  const triMargin = triSqPx;
  const triFrameW = triWidth + triMargin * 2 + FRAME * 2 + LABEL_GUTTER * 2;
  const triFrameH = triHeight + triMargin + FRAME * 2 + COL_LABEL_H;

  const halfSpan = Math.max(triFrameW / 2, kingdomBoardPx + triWidth / 2, kingdomBoardPx / 2) + 8;
  const clusterWidth = halfSpan * 2;
  const apexX = halfSpan;

  const triFrameLeft = apexX - triFrameW / 2;
  const meshLeft = triFrameLeft + FRAME + LABEL_GUTTER + triMargin;
  const meshRight = meshLeft + triWidth;

  const triFrameTop = TITLE_H + kingdomBoardPx + WIRE_GAP;
  const bottomTitleTop = triFrameTop + triFrameH + WIRE_GAP;
  const bottomBoardTop = bottomTitleTop + TITLE_H;
  const clusterHeight = bottomBoardTop + kingdomBoardPx;

  return {
    kingdomBoardPx, triWidth, triHeight, triMargin, triFrameW, triFrameH,
    clusterWidth, clusterHeight, apexX, triFrameLeft, meshLeft, meshRight,
    triFrameTop, bottomTitleTop, bottomBoardTop,
    boardALeft: apexX - kingdomBoardPx / 2,
    boardBLeft: meshLeft - kingdomBoardPx,
    boardCLeft: meshRight,
  };
}

type LayoutTier = "desktop" | "tablet" | "mobile";

function tierFor(vw: number): LayoutTier {
  if (vw < 760) return "mobile";
  if (vw < 1100) return "tablet";
  return "desktop";
}

export default function TriBoard8x8({
  myColor,
  roomId,
  playerNames,
  socket,
  onGameEnd,
}: {
  myColor: TriColor;
  roomId: string;
  playerNames: Record<TriColor, string>;
  socket: Socket;
  onGameEnd: (winner: TriColor) => void;
}) {
  const [gs, setGs] = useState<TriGameState8>(createInitialTriGameState8());
  const [animSq, setAnimSq] = useState<TriSquare | null>(null);
  const [triSqPx, setTriSqPx] = useState(32);
  const [kingdomSqPxState, setKingdomSqPxState] = useState(27);
  const [tier, setTier] = useState<LayoutTier>("desktop");
  const gsRef = useRef(gs);

  useEffect(() => {
    gsRef.current = gs;
  }, [gs]);

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const t = tierFor(vw);
      setTier(t);

      if (t === "desktop") {
        // Wide screens: the classic vertex-touching cluster, kingdom boards
        // sized relative to the triangle so everything meets at true corners.
        // availW is computed from the ACTUAL side-column/gap/padding budget
        // (not a guessed constant) so the center column never has to claim
        // more room than the grid actually has — that mismatch was what let
        // the battlefield overflow into the rules panel on wide screens.
        const containerW = Math.min(vw, CONTENT_MAX_W) - ROOT_PAD * 2;
        const availW = containerW - SIDE_COL_W * 2 - GRID_GAP * 2;
        const availH = vh - 300;
        // clusterWidth is dominated by (kingdomBoardPx + triWidth/2), not by
        // the triangle's own frame width — kingdomBoardPx ≈ 8*(0.85s)+FRAME*2
        // and triWidth/2 = 7.5s, so clusterWidth ≈ 2*((6.8s+FRAME*2)+7.5s+8)
        // = 28.6s + 2*FRAME*2 + 16. Inverting that (rather than the smaller
        // triFrameW-based estimate previously used here) is what keeps the
        // battlefield from overflowing past its column on wide desktops. A
        // small safety buffer covers the rounding in kingdomSqPx below.
        const SAFETY = 32;
        const fromWidth = Math.floor((availW - FRAME * 4 - 16 - SAFETY) / 28.6);
        const fromHeight = Math.floor((availH - FRAME * 2 - COL_LABEL_H) / (TRI_ROWS + 1));
        const s = Math.max(16, Math.min(fromWidth, fromHeight, 40));
        setTriSqPx(s);
        setKingdomSqPxState(Math.max(16, Math.round(s * 0.85)));
      } else {
        // Tablet/mobile: kingdom boards and the tri gate are sized
        // independently against the full available width so nothing ever
        // has to exceed the viewport (no horizontal scroll).
        const pagePad = t === "mobile" ? 24 : 40;
        const availW = vw - pagePad;
        const maxTri = t === "mobile" ? 22 : 28;
        const maxKingdom = t === "mobile" ? 22 : 30;
        const triFromW = Math.floor((availW - FRAME * 2 - LABEL_GUTTER * 2 - 2 * 22) / (TRI_COLS + 2));
        const kingdomFromW = Math.floor((availW / 2 - 16 - FRAME * 2) / 8);
        setTriSqPx(Math.max(14, Math.min(triFromW, maxTri)));
        setKingdomSqPxState(Math.max(14, Math.min(kingdomFromW, maxKingdom)));
      }
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const kingdomSqPx = kingdomSqPxState;
  const isCompact = tier !== "desktop";
  const layout = buildLayout(triSqPx, kingdomSqPx);

  useEffect(() => {
    const onMove = ({ newState }: { newState: TriGameState8 }) => {
      if (newState.lastMove) {
        setAnimSq(newState.lastMove.to);
        setTimeout(() => setAnimSq(null), 420);
      }
      setGs(newState);
    };
    socket.on("game:move", onMove);
    return () => {
      socket.off("game:move", onMove);
    };
  }, [socket]);

  useEffect(() => {
    if (gs.status === "finished" && gs.winner) onGameEnd(gs.winner);
  }, [gs.status, gs.winner, onGameEnd]);

  const isMyTurn = gs.currentTurn === myColor;
  const enemyReach = useMemo(() => computeReachSet(gs, myColor), [gs, myColor]);

  const selectOrMove = (sq: TriSquare) => {
    if (gs.status !== "playing") return;
    const piece = gs.boards[sq.boardId][sq.row][sq.col];

    if (gs.selectedSquare) {
      const isValid = gs.validMoves.some((m) => triSquareEquals(m, sq));
      const isSuper = gs.superMoves.some((m) => triSquareEquals(m, sq));

      if (isValid || isSuper) {
        const next = executeMoveTri8(gs, gs.selectedSquare, sq, isSuper);
        setAnimSq(sq);
        setTimeout(() => setAnimSq(null), isSuper ? 450 : 420);
        setGs(next);
        socket.emit("game:move", { roomId, from: gs.selectedSquare, to: sq, newState: next });
        return;
      }
    }

    if (!piece || piece.color !== myColor || !isMyTurn) {
      setGs((prev) => ({ ...prev, selectedSquare: null, validMoves: [], superMoves: [], superMoveMode: false }));
      return;
    }

    setGs((prev) => ({
      ...prev,
      selectedSquare: sq,
      validMoves: getLegalMovesTri8(gs, sq),
      superMoves: getLegalSuperMovesTri8(gs, sq),
      superMoveMode: false,
    }));
  };

  const handlePass = () => {
    if (!isMyTurn) return;
    const next = passTurnTri8(gs);
    setGs(next);
    socket.emit("game:move", { roomId, from: null, to: null, newState: next });
  };

  // ── "Your Turn" toast ──────────────────────────────────────────────────
  const [turnToast, setTurnToast] = useState(false);
  const prevTurnRef = useRef(gs.currentTurn);
  useEffect(() => {
    const changed = prevTurnRef.current !== gs.currentTurn;
    prevTurnRef.current = gs.currentTurn;
    if (changed && gs.currentTurn === myColor && gs.status === "playing") {
      setTurnToast(true);
      const t = setTimeout(() => setTurnToast(false), 2200);
      return () => clearTimeout(t);
    }
  }, [gs.currentTurn, gs.status, myColor]);

  // ── Selected-piece move summary (derived, presentational only) ────────
  const moveSummary = useMemo(() => {
    if (!gs.selectedSquare) return null;
    let safe = 0, risky = 0, captures = 0, crossing = 0;
    for (const m of gs.validMoves) {
      const key = `${m.boardId}|${m.row}|${m.col}`;
      const target = gs.boards[m.boardId][m.row][m.col];
      if (target) captures++;
      if (enemyReach.has(key)) risky++; else safe++;
      if (m.boardId === "T" && gs.selectedSquare!.boardId !== "T") crossing++;
    }
    return { safe, risky, captures, crossing, superCount: gs.superMoves.length };
  }, [gs.selectedSquare, gs.validMoves, gs.superMoves, gs.boards, enemyReach]);

  // ── Leave / Surrender ───────────────────────────────────────────────────
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const handleLeave = () => {
    const next = eliminatePlayerTri8(gs, myColor);
    setGs(next);
    socket.emit("game:quit", { roomId, newState: next });
    setShowLeaveConfirm(false);
  };

  useEffect(() => {
    const onQuit = ({ newState }: { newState: TriGameState8 }) => {
      setGs(newState);
    };
    socket.on("game:quit", onQuit);
    return () => {
      socket.off("game:quit", onQuit);
    };
  }, [socket]);

  // ── Passive disconnect handling ────────────────────────────────────────
  // The server already broadcasts "room:updated" whenever a player drops out
  // of the room (kingdome-server/index.ts's disconnect handler). If a color
  // we know about is no longer present and isn't already eliminated, the
  // lexicographically-first remaining, non-eliminated color acts as the sole
  // "authority" client and force-eliminates the departed color — this keeps
  // every client's game state converging on the same result instead of
  // racing multiple duplicate broadcasts.
  useEffect(() => {
    const onRoomUpdated = (room: { players?: { color: string }[] }) => {
      const current = gsRef.current;
      if (current.status !== "playing" || !room.players) return;

      const present = new Set(room.players.map((p) => p.color));
      const departed = ALL_COLORS.find(
        (c) => playerNames[c] && !present.has(c) && !current.eliminatedPlayers.includes(c)
      );
      if (!departed) return;

      const authority = ALL_COLORS.filter(
        (c) => c !== departed && !current.eliminatedPlayers.includes(c)
      ).sort()[0];
      if (authority !== myColor) return;

      const next = eliminatePlayerTri8(current, departed);
      setGs(next);
      socket.emit("game:move", { roomId, from: null, to: null, newState: next });
    };
    socket.on("room:updated", onRoomUpdated);
    return () => {
      socket.off("room:updated", onRoomUpdated);
    };
  }, [socket, playerNames, myColor, roomId]);

  const kingdomLight = "#c9a96e";
  const kingdomDark = "#4a2e1a";
  const triLight = "linear-gradient(150deg,#e6c884,#b9863c)";
  const triDark = "linear-gradient(150deg,#75521f,#2c1b09)";

  const renderCell = (boardId: TriBoardId, r: number, c: number, size: number, variant: "kingdom" | "triangle") => {
    const board = gs.boards[boardId];
    const piece = board[r][c];
    const sq: TriSquare = { boardId, row: r, col: c };
    const isLight = (r + c) % 2 === 0;

    const isSel = !!gs.selectedSquare && triSquareEquals(gs.selectedSquare, sq);
    const isValid = gs.validMoves.some((m) => triSquareEquals(m, sq));
    const isSuper = gs.superMoves.some((m) => triSquareEquals(m, sq));
    const isLF = !!gs.lastMove && triSquareEquals(gs.lastMove.from, sq);
    const isLT = !!gs.lastMove && triSquareEquals(gs.lastMove.to, sq);
    const isAnim = !!animSq && triSquareEquals(animSq, sq);

    const boardColor = BOARD_COLOR[boardId];
    const isConnector = boardColor !== null && isConnectorCell(boardColor, boardId, { row: r, col: c });
    const isConnOrigin = isSel && isConnector;
    const isCrossing = isValid && boardId === "T" && !!gs.selectedSquare && gs.selectedSquare.boardId !== "T";

    const reachKey = `${boardId}|${r}|${c}`;
    const isDanger = !!piece && piece.color === myColor && enemyReach.has(reachKey);
    const isRiskyMove = isValid && isMyTurn && enemyReach.has(reachKey);

    // ── Guidance color semantics ──────────────────────────────────────────
    // Blue = selected piece · Green = recommended/safe move · Gold = special
    // connector/gate-crossing or super-move path · Red = danger zone / risky move.
    const SAFE = "#3ecf6e";
    const SELECT = "#4aa8ff";

    const baseBg = variant === "triangle" ? (isLight ? triLight : triDark) : isLight ? kingdomLight : kingdomDark;
    let ov = "";
    if (isSel) ov = `${SELECT}88`;
    else if (isLF || isLT) ov = "rgba(212,168,67,.25)";

    const moveColor = isCrossing ? GOLD : isRiskyMove ? DANGER : SAFE;

    return (
      <div
        key={`${boardId}-${r}-${c}`}
        className="tcsq"
        onClick={() => selectOrMove(sq)}
        style={{ width: size, height: size, background: baseBg, position: "relative", overflow: "hidden", flexShrink: 0 }}
      >
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            background: isLight ? "linear-gradient(135deg,rgba(255,255,255,.14) 0%,transparent 55%)" : "linear-gradient(135deg,rgba(255,255,255,.05) 0%,rgba(0,0,0,.25) 100%)",
            boxShadow: variant === "triangle" ? "inset 0 1px 0 rgba(255,255,255,.22), inset 0 -2px 5px rgba(0,0,0,.5)" : undefined,
          }}
        />
        {isConnector && !ov && <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(circle,rgba(212,168,67,.3),transparent 72%)" }} />}
        {isConnOrigin && <div style={{ position: "absolute", inset: 0, zIndex: 1, border: `2px solid ${SELECT}d9`, borderRadius: 2, animation: "connGlow 1.2s infinite", pointerEvents: "none" }} />}
        {isDanger && <div style={{ position: "absolute", inset: 0, zIndex: 2, border: `2px solid ${DANGER}`, background: `${DANGER}22`, borderRadius: 2, animation: "dangerPulse 1.1s infinite", pointerEvents: "none" }} />}
        {ov && <div style={{ position: "absolute", inset: 0, zIndex: 1, background: ov, pointerEvents: "none" }} />}

        {isValid && !piece && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: size * 0.3, height: size * 0.3, borderRadius: "50%", background: `${moveColor}d9`, boxShadow: `0 0 16px ${moveColor}99`, animation: "tdotPop .15s ease both", pointerEvents: "none", zIndex: 4 }} />
        )}
        {isValid && piece && (
          <div style={{ position: "absolute", inset: 0, zIndex: 3, background: `${moveColor}26`, pointerEvents: "none" }} />
        )}
        {isValid && piece && (
          <div style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, zIndex: 4, borderRadius: 5, boxSizing: "border-box", border: `3px solid ${moveColor}e6`, pointerEvents: "none" }} />
        )}
        {isRiskyMove && (
          <div style={{ position: "absolute", top: -1, right: -1, width: 0, height: 0, borderStyle: "solid", borderWidth: "0 12px 12px 0", borderColor: `transparent ${DANGER} transparent transparent`, opacity: 0.9, zIndex: 5, pointerEvents: "none" }} />
        )}
        {isSuper && !piece && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: size * 0.35, height: size * 0.35, borderRadius: "50%", background: "rgba(255,140,0,.82)", boxShadow: "0 0 20px rgba(255,140,0,.7)", animation: "tdotPop .15s ease both", pointerEvents: "none", zIndex: 4 }} />
        )}
        {isSuper && piece && (
          <div style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, zIndex: 4, borderRadius: 5, boxSizing: "border-box", border: "3px solid rgba(255,140,0,.95)", pointerEvents: "none" }} />
        )}

        {piece && (
          <>
            <img
              src={pieceImgSrc(piece)}
              alt={`${piece.color} ${piece.type}`}
              className="tcpi"
              style={{ filter: pieceFilter(piece), animation: isAnim ? (gs.superMoveMode ? "tsuperIn .4s cubic-bezier(.18,1,.32,1) both" : "tpieceIn .32s cubic-bezier(.22,1,.36,1) both") : "none" }}
            />
            {piece.type === "paladin" && piece.paladanSuperUsed && <div className="tsup-badge">✗</div>}
          </>
        )}
      </div>
    );
  };

  const renderKingdomBoard = (boardId: TriBoardId, title: string, subtitle: string, width: number) => {
    const boardPx = kingdomSqPx * 8;
    const isActiveBoard = BOARD_COLOR[boardId] === gs.currentTurn;

    return (
      <div style={{ width }}>
        <div className="tb-board-title" style={{ color: isActiveBoard ? AC[BOARD_COLOR[boardId]!] : GOLD }}>
          {title}
          <div style={{ fontSize: 9, opacity: 0.6, marginTop: 1, fontWeight: 600 }}>{subtitle}</div>
        </div>
        <div className={isActiveBoard ? "tb-kingdom-frame tb-kingdom-active" : "tb-kingdom-frame"} style={{ width: boardPx + FRAME * 2, height: boardPx + FRAME * 2 }}>
          {[{ top: -5, left: -5 }, { top: -5, right: -5 }, { bottom: -5, left: -5 }, { bottom: -5, right: -5 }].map((pos, i) => (
            <div key={i} className="tb-diamond" style={{ ...(pos as any) }} />
          ))}
          <div
            style={{
              position: "absolute", top: FRAME, left: FRAME, width: boardPx, height: boardPx,
              display: "grid", gridTemplateColumns: `repeat(8,${kingdomSqPx}px)`, gridTemplateRows: `repeat(8,${kingdomSqPx}px)`,
              borderRadius: 4, overflow: "hidden", border: "1px solid rgba(0,0,0,.9)", boxShadow: "inset 0 0 24px rgba(0,0,0,.5)",
            }}
          >
            {Array.from({ length: 8 }).map((_, r) => Array.from({ length: 8 }).map((_, c) => renderCell(boardId, r, c, kingdomSqPx, "kingdom")))}
          </div>
        </div>
      </div>
    );
  };

  const { triWidth, triHeight, triMargin, triFrameW, triFrameH } = layout;

  const renderTriGate = () => {
    // SVG box is inflated by `triMargin` (one full cell) beyond the raw
    // apex/base coordinates on every side — see the comment on buildLayout.
    // Because both slanted edges are drawn from the same polygon element,
    // the stroke is mathematically identical in thickness and glow on the
    // left and right — there is no way for this to render one-sided.
    const svgW = triWidth + triMargin * 2;
    const svgH = triHeight + triMargin;
    const apexXsvg = svgW / 2;
    const gridTop = FRAME + triMargin;
    const gridLeft = FRAME + LABEL_GUTTER + triMargin;

    return (
      <div className="tb-tri-frame" style={{ width: triFrameW, height: triFrameH }}>
        <svg width={svgW} height={svgH} style={{ position: "absolute", top: FRAME, left: FRAME + LABEL_GUTTER, overflow: "visible", pointerEvents: "none" }}>
          <defs>
            <linearGradient id="triBacking" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8a6428" />
              <stop offset="100%" stopColor="#2c1b09" />
            </linearGradient>
          </defs>
          <polygon points={`${apexXsvg},0 0,${svgH} ${svgW},${svgH}`} fill="url(#triBacking)" />
          <polygon points={`${apexXsvg},0 0,${svgH} ${svgW},${svgH}`} fill="none" stroke="rgba(15,8,2,.95)" strokeWidth={9} strokeLinejoin="round" />
          <polygon points={`${apexXsvg},0 0,${svgH} ${svgW},${svgH}`} fill="none" stroke="rgba(212,168,67,1)" strokeWidth={4} strokeLinejoin="round" className="tb-tri-outline" />
          <polygon points={`${apexXsvg},0 0,${svgH} ${svgW},${svgH}`} fill="none" stroke="rgba(255,224,150,.55)" strokeWidth={1.25} strokeLinejoin="round" />
        </svg>

        <div style={{ position: "absolute", top: gridTop, left: gridLeft, width: triWidth, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {Array.from({ length: TRI_ROWS }).map((_, r) => {
            const width = 2 * r + 1;
            const startCol = TRI_COL_CENTER - r;
            const rowNum = TRI_ROWS - r;
            return (
              <div key={r} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span className="tb-tri-label" style={{ position: "absolute", right: `calc(100% + 4px)`, width: LABEL_GUTTER - 4 }}>{rowNum}</span>
                <div style={{ display: "flex" }}>{Array.from({ length: width }).map((_, k) => renderCell("T", r, startCol + k, triSqPx, "triangle"))}</div>
                <span className="tb-tri-label" style={{ position: "absolute", left: `calc(100% + 4px)`, width: LABEL_GUTTER - 4 }}>{rowNum}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", marginTop: 6 }}>
            {Array.from({ length: TRI_COLS }).map((_, c) => (
              <span key={c} className="tb-tri-label" style={{ width: triSqPx, textAlign: "center" }}>{String.fromCharCode(65 + c)}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const winnerIsMe = gs.winner === myColor;

  return (
    <div className="tb-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        @keyframes tdotPop {0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}80%{transform:translate(-50%,-50%) scale(1.2)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes tpieceIn {0%{opacity:.3;transform:translate(-50%,-50%) scale(.65) translateY(-10px)}65%{transform:translate(-50%,-50%) scale(1.08) translateY(1px)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) translateY(0)}}
        @keyframes tsuperIn {0%{opacity:.2;transform:translate(-50%,-50%) scale(.5) translateY(-16px) rotate(-5deg)}60%{transform:translate(-50%,-50%) scale(1.12) translateY(2px) rotate(1deg)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) translateY(0) rotate(0)}}
        @keyframes connGlow {0%,100%{box-shadow:0 0 10px rgba(90,180,255,.5)}50%{box-shadow:0 0 22px rgba(90,180,255,.9)}}
        @keyframes dangerPulse {0%,100%{box-shadow:0 0 8px ${DANGER}70}50%{box-shadow:0 0 18px ${DANGER}}}
        @keyframes gateGlow {0%,100%{filter:drop-shadow(0 0 5px rgba(212,168,67,.6))}50%{filter:drop-shadow(0 0 14px rgba(212,168,67,.95))}}
        @keyframes wireFlow {0%{background-position:0 0}100%{background-position:0 -16px}}
        @keyframes turnPulse {0%,100%{box-shadow:0 0 16px var(--turn-glow,rgba(212,168,67,.4))}50%{box-shadow:0 0 30px var(--turn-glow,rgba(212,168,67,.7))}}
        @keyframes toastSlideIn {0%{opacity:0;transform:translate(-50%,-16px) scale(.94)}100%{opacity:1;transform:translate(-50%,0) scale(1)}}
        @keyframes chipPop {0%{opacity:0;transform:translateY(4px) scale(.9)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes panelFadeUp {0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes pulseDot {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.82)}}
        @keyframes titleFloat {0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes titleShimmer {0%{background-position:0% 50%}100%{background-position:200% 50%}}
        @keyframes titleGlow {0%,100%{filter:drop-shadow(0 0 14px rgba(212,168,67,.35))}50%{filter:drop-shadow(0 0 28px rgba(212,168,67,.6))}}

        .tb-title{margin:0;font-size:36px;font-family:'Cinzel',Georgia,serif;font-weight:700;letter-spacing:.02em;background:linear-gradient(100deg,#8a5a18,#f0dfb0,#d4a843,#8a5a18);background-size:220% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:titleFloat 4.5s ease-in-out infinite,titleShimmer 6s linear infinite,titleGlow 4.5s ease-in-out infinite;display:inline-block;}

        .tb-root{min-height:100vh;overflow-x:hidden;background:radial-gradient(circle at top,#211307,#050301 65%,#000);color:#fff;font-family:'Cinzel',Georgia,serif;padding:110px ${ROOT_PAD}px 40px;}
        .tb-panel{padding:12px 13px;border-radius:12px;background:rgba(18,12,6,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(212,168,67,.22);box-shadow:0 10px 30px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04);animation:panelFadeUp .4s ease both;transition:border-color .25s,box-shadow .25s,transform .25s;}
        .tb-panel:hover{border-color:rgba(212,168,67,.4);box-shadow:0 14px 36px rgba(0,0,0,.5),0 0 24px rgba(212,168,67,.08),inset 0 1px 0 rgba(255,255,255,.05);}
        .tb-panel-title{margin:0 0 9px;color:${GOLD};font-family:'Cinzel',Georgia,serif;font-size:13px;font-weight:700;letter-spacing:.04em;}
        .tb-board-title{margin-bottom:5px;text-align:center;font-family:'Cinzel',Georgia,serif;font-weight:700;font-size:11px;letter-spacing:.03em;text-transform:uppercase;transition:color .3s;}
        .tb-kingdom-frame{position:relative;border-radius:10px;background:linear-gradient(145deg,#3d1f08,#1e0e04,#0e0702,#1e0e04,#3d1f08);box-shadow:0 0 0 1px rgba(60,35,5,.95),0 0 0 2px rgba(212,168,67,.4),0 12px 32px rgba(0,0,0,.7),inset 0 1px 0 rgba(212,168,67,.2);transition:box-shadow .3s;margin:0 auto;}
        .tb-kingdom-active{box-shadow:0 0 0 1px rgba(60,35,5,.95),0 0 0 2px rgba(212,168,67,.75),0 0 34px rgba(212,168,67,.35),0 12px 32px rgba(0,0,0,.7),inset 0 1px 0 rgba(212,168,67,.3);}
        .tb-diamond{position:absolute;width:10px;height:10px;background:${GOLD};border:1px solid rgba(255,230,150,.7);border-radius:2px;transform:rotate(45deg);box-shadow:0 0 8px ${GOLD}66;z-index:6;}
        .tb-tri-frame{position:relative;border-radius:16px;background:linear-gradient(180deg,rgba(26,15,5,.75),rgba(6,3,1,.85));box-shadow:0 0 0 1px rgba(212,168,67,.45),0 0 50px rgba(212,168,67,.2),0 24px 60px rgba(0,0,0,.8);max-width:100%;}
        .tb-tri-outline{animation:gateGlow 3s ease-in-out infinite;}
        .tb-tri-label{color:rgba(255,224,150,.85);font-size:10px;font-family:'Cinzel',Georgia,serif;font-weight:700;flex-shrink:0;text-shadow:0 0 4px rgba(0,0,0,.8);}
        .tb-gate-caption{color:${GOLD};font-size:11px;font-weight:800;letter-spacing:.05em;line-height:1.4;}
        .tb-wire-v{position:absolute;width:2px;background-image:linear-gradient(${GOLD},${GOLD} 50%,transparent 50%,transparent);background-size:2px 8px;animation:wireFlow 1s linear infinite;box-shadow:0 0 6px ${GOLD}77;transform:translateX(-1px);}
        .tb-wire-dot{position:absolute;width:8px;height:8px;background:${GOLD};transform:translate(-3px,0) rotate(45deg);box-shadow:0 0 8px ${GOLD}aa;}
        .tb-wire-v-flow{width:2px;height:18px;background-image:linear-gradient(${GOLD},${GOLD} 50%,transparent 50%,transparent);background-size:2px 8px;animation:wireFlow 1s linear infinite;box-shadow:0 0 6px ${GOLD}77;}
        .tb-turn-pill{padding:12px 20px;border-radius:14px;background:rgba(0,0,0,.5);font-weight:900;letter-spacing:.08em;text-transform:uppercase;animation:turnPulse 2.2s ease-in-out infinite;}
        .tb-pass-btn{padding:13px 16px;border-radius:12px;border:1px solid rgba(212,168,67,.3);font-weight:900;font-family:'Cinzel',Georgia,serif;transition:transform .15s,box-shadow .15s;}
        .tb-pass-btn:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(212,168,67,.3);}
        .tb-pass-btn:not(:disabled):active{transform:translateY(0);}
        .tb-leave-btn{padding:11px 16px;border-radius:12px;border:1px solid rgba(220,80,80,.3);background:rgba(120,30,30,.18);color:rgba(255,160,160,.85);font-weight:700;font-family:'Cinzel',Georgia,serif;font-size:12px;cursor:pointer;transition:all .2s;}
        .tb-leave-btn:hover{background:rgba(150,35,35,.32);border-color:rgba(255,100,100,.5);color:#fff;transform:translateY(-1px);}
        .tb-turn-toast{position:fixed;top:110px;left:50%;transform:translateX(-50%);z-index:500;padding:14px 26px;border-radius:14px;background:rgba(8,5,2,.9);backdrop-filter:blur(10px);border:1px solid;display:flex;flex-direction:column;align-items:center;gap:2px;animation:toastSlideIn .3s cubic-bezier(.22,1,.36,1) both;pointer-events:none;font-family:'Cinzel',Georgia,serif;}
        .tb-turn-toast span:first-child{font-weight:900;font-size:16px;letter-spacing:.08em;text-transform:uppercase;}
        .tb-turn-toast-sub{font-size:11px;color:rgba(255,255,255,.55);}
        .tb-move-summary{position:absolute;top:-6px;left:50%;transform:translate(-50%,-100%);z-index:60;display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:90%;pointer-events:none;}
        .tb-ms-chip{padding:5px 10px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.02em;white-space:nowrap;animation:chipPop .18s ease both;border:1px solid;backdrop-filter:blur(6px);}
        .tb-ms-safe{background:rgba(62,207,110,.14);border-color:rgba(62,207,110,.45);color:#8be6a8;}
        .tb-ms-danger{background:rgba(255,80,80,.14);border-color:rgba(255,80,80,.45);color:#ff9a9a;}
        .tb-ms-gold{background:rgba(212,168,67,.14);border-color:rgba(212,168,67,.5);color:#f0dfb0;}
        .tb-layout-grid{display:grid;grid-template-columns:${SIDE_COL_W}px minmax(0,1fr) ${SIDE_COL_W}px;gap:${GRID_GAP}px;align-items:start;justify-content:center;}
        .tb-col-left,.tb-col-right{animation:panelFadeUp .4s ease both;}
        @media (max-width:1100px){
          .tb-layout-grid{grid-template-columns:1fr;}
          .tb-col-center{order:1;}
          .tb-col-left{order:2;}
          .tb-col-right{order:3;}
        }
        @media (max-width:760px){
          .tb-root{padding:96px 12px 32px;}
          .tb-turn-toast{top:88px;padding:11px 18px;}
        }
        .tcsq{position:relative;overflow:hidden;cursor:pointer;transition:filter .1s;}
        .tcsq:hover{filter:brightness(1.2);}
        .tcsq:hover .tcpi{transform:translate(-50%,-50%) scale(1.07) translateY(-2px);}
        .tcpi{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:78%;height:78%;object-fit:contain;pointer-events:none;z-index:3;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,.9)) drop-shadow(0 1px 3px rgba(0,0,0,.7));transition:transform .15s;}
        .tsup-badge{position:absolute;bottom:2px;right:2px;width:11px;height:11px;border-radius:50%;background:rgba(180,50,50,.85);border:1px solid rgba(255,100,100,.5);display:flex;align-items:center;justify-content:center;font-size:6px;color:#fff;font-weight:700;z-index:5;pointer-events:none;}
      `}</style>

      {turnToast && (
        <div className="tb-turn-toast" style={{ borderColor: `${AC[myColor]}77`, boxShadow: `0 0 40px ${AC[myColor]}44, 0 10px 30px rgba(0,0,0,.6)` }}>
          <span style={{ color: AC[myColor] }}>Your Turn</span>
          <span className="tb-turn-toast-sub">Select a piece to see your moves</span>
        </div>
      )}

      <div style={{ maxWidth: CONTENT_MAX_W, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <h1 className="tb-title">
              Basic Tri Board 8x8
            </h1>
            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.55)" }}>Room: {roomId} · You are {myColor}</p>
          </div>
          <div className="tb-turn-pill" style={{ border: `1px solid ${AC[gs.currentTurn]}66`, color: AC[gs.currentTurn], ["--turn-glow" as any]: `${AC[gs.currentTurn]}66` }}>
            {isMyTurn ? "Your Turn" : `${gs.currentTurn}'s Turn`}
          </div>
        </div>

        <div className="tb-layout-grid">
          {/* ── LEFT: PLAYERS + LEGEND ── */}
          <div className="tb-col-left" style={{ display: "grid", gap: 16 }}>
            <Panel title="Players">
              <div style={{ display: "grid", gap: 9 }}>
                {(["white", "black", "grey"] as TriColor[]).map((color, i) => {
                  const isActive = gs.currentTurn === color;
                  const isEliminated = gs.eliminatedPlayers.includes(color);
                  return (
                    <div key={color} style={{ opacity: isEliminated ? 0.4 : 1, borderLeft: isActive && !isEliminated ? `3px solid ${AC[color]}` : "3px solid transparent", boxShadow: isActive && !isEliminated ? `0 0 14px ${AC[color]}33` : "none", borderRadius: 6, padding: "3px 5px", transition: "all .3s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 11, height: 11, borderRadius: "50%", background: DOT[color], border: "1px solid rgba(255,255,255,.35)", flexShrink: 0, boxShadow: isActive && !isEliminated ? `0 0 10px ${AC[color]}aa` : undefined, animation: isActive && !isEliminated ? "pulseDot 1.5s infinite" : "none" }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: 11.5, lineHeight: 1.25 }}>{color.charAt(0).toUpperCase() + color.slice(1)} Kingdom (P{i + 1})</div>
                          <div style={{ color: GOLD, fontSize: 10, fontWeight: 600, marginTop: 1 }}>
                            {playerNames[color] || color}
                            {color === myColor && <span style={{ opacity: 0.6 }}> (You)</span>}
                            {isEliminated && <span style={{ color: "#ff8080", marginLeft: 6, fontSize: 9, letterSpacing: ".05em" }}>ELIMINATED</span>}
                          </div>
                        </div>
                      </div>
                      <CapturedTray pieces={gs.capturedBy[color]} />
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Legend">
              <div style={{ display: "grid", gap: 7 }}>
                {LEGEND.map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {item.icon}
                    <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.75)" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <button
              className="tb-pass-btn"
              onClick={handlePass}
              disabled={!isMyTurn || gs.passUsed[myColor]}
              style={{
                background: isMyTurn && !gs.passUsed[myColor] ? "linear-gradient(135deg,#d4a843,#8a5a18)" : "rgba(255,255,255,.06)",
                color: isMyTurn && !gs.passUsed[myColor] ? "#120800" : "rgba(255,255,255,.25)",
                cursor: isMyTurn && !gs.passUsed[myColor] ? "pointer" : "not-allowed",
              }}
            >
              Pass Turn
            </button>

            <button className="tb-leave-btn" onClick={() => setShowLeaveConfirm(true)}>
              Leave / Surrender
            </button>
          </div>

          {/* ── CENTER: battlefield ── */}
          <div className="tb-col-center" style={{ display: "flex", justifyContent: "center", position: "relative" }}>
            {moveSummary && (
              <div className="tb-move-summary">
                {moveSummary.captures > 0 && <span className="tb-ms-chip tb-ms-gold">⚔ {moveSummary.captures} capture{moveSummary.captures > 1 ? "s" : ""}</span>}
                {moveSummary.safe > 0 && <span className="tb-ms-chip tb-ms-safe">✓ {moveSummary.safe} safe</span>}
                {moveSummary.risky > 0 && <span className="tb-ms-chip tb-ms-danger">⚠ {moveSummary.risky} risky</span>}
                {moveSummary.crossing > 0 && <span className="tb-ms-chip tb-ms-gold">↙ {moveSummary.crossing} gate crossing</span>}
                {moveSummary.superCount > 0 && <span className="tb-ms-chip tb-ms-gold">✦ {moveSummary.superCount} special</span>}
              </div>
            )}
            {isCompact ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%" }}>
                {renderKingdomBoard("A", "White Kingdom (Player 1)", "Board A", layout.kingdomBoardPx)}
                <div className="tb-wire-v-flow" />
                {renderTriGate()}
                <div className="tb-wire-v-flow" />
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
                  {renderKingdomBoard("B", "Black Kingdom (Player 2)", "Board B", layout.kingdomBoardPx)}
                  {renderKingdomBoard("C", "Grey Kingdom (Player 3)", "Board C", layout.kingdomBoardPx)}
                </div>
              </div>
            ) : (
              <div style={{ position: "relative", width: layout.clusterWidth, height: layout.clusterHeight }}>
                <div style={{ position: "absolute", left: layout.boardALeft, top: 0 }}>
                  {renderKingdomBoard("A", "White Kingdom (Player 1)", "Board A", layout.kingdomBoardPx)}
                </div>

                <div className="tb-wire-v" style={{ left: layout.apexX, top: TITLE_H + layout.kingdomBoardPx, height: WIRE_GAP }} />
                <div className="tb-wire-dot" style={{ left: layout.apexX, top: TITLE_H + layout.kingdomBoardPx + WIRE_GAP - 4 }} />

                <div style={{ position: "absolute", left: layout.triFrameLeft, top: layout.triFrameTop, width: layout.triFrameW }}>
                  {renderTriGate()}
                </div>

                <div
                  className="tb-gate-caption"
                  style={{ position: "absolute", left: layout.triFrameLeft + layout.triFrameW + 14, top: layout.triFrameTop + layout.triFrameH * 0.36, width: 130 }}
                >
                  <span style={{ marginRight: 4 }}>↙</span>TRI GATE
                  <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.65, textTransform: "uppercase" }}>(Connector Board)</div>
                </div>

                <div className="tb-wire-v" style={{ left: layout.meshLeft, top: layout.triFrameTop + layout.triFrameH, height: WIRE_GAP }} />
                <div className="tb-wire-dot" style={{ left: layout.meshLeft, top: layout.triFrameTop + layout.triFrameH + WIRE_GAP - 4 }} />
                <div className="tb-wire-v" style={{ left: layout.meshRight, top: layout.triFrameTop + layout.triFrameH, height: WIRE_GAP }} />
                <div className="tb-wire-dot" style={{ left: layout.meshRight, top: layout.triFrameTop + layout.triFrameH + WIRE_GAP - 4 }} />

                <div style={{ position: "absolute", left: layout.boardBLeft, top: layout.bottomTitleTop }}>
                  {renderKingdomBoard("B", "Black Kingdom (Player 2)", "Board B", layout.kingdomBoardPx)}
                </div>
                <div style={{ position: "absolute", left: layout.boardCLeft, top: layout.bottomTitleTop }}>
                  {renderKingdomBoard("C", "Grey Kingdom (Player 3)", "Board C", layout.kingdomBoardPx)}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: TRI RULES ── */}
          <div className="tb-col-right">
            <Panel title="Tri Rules">
              <div style={{ display: "grid", gap: 8 }}>
                {RULES.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 7 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(212,168,67,.14)", border: "1px solid rgba(212,168,67,.4)", color: GOLD, fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ color: "#f0dfb0", fontWeight: 700, fontSize: 11.5, marginBottom: 1 }}>{r.title}</div>
                      <div style={{ color: "rgba(255,255,255,.62)", fontSize: 10.5, lineHeight: 1.4 }}>{r.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        {/* ── GAME FLOW ── */}
        <div style={{ marginTop: 30, borderRadius: 16, background: "rgba(10,7,3,.72)", border: "1px solid rgba(212,168,67,.22)", boxShadow: "0 10px 30px rgba(0,0,0,.4)", overflow: "hidden" }}>
          <div style={{ textAlign: "center", padding: "10px 0", borderBottom: "1px solid rgba(212,168,67,.18)", color: GOLD, fontWeight: 800, letterSpacing: ".12em", fontSize: 13 }}>GAME FLOW</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 14, padding: "20px 24px" }}>
            {GAME_FLOW.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 110 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,.5)", border: "1px solid rgba(212,168,67,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>{step.icon}</div>
                  <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.7)", lineHeight: 1.35 }}>
                    <div>{step.lines[0]}</div>
                    <div>{step.lines[1]}</div>
                  </div>
                </div>
                {i < GAME_FLOW.length - 1 && <span style={{ color: GOLD, fontSize: 18, opacity: 0.6 }}>→</span>}
              </div>
            ))}
          </div>
        </div>

        {showLeaveConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 998 }}>
            <div style={{ padding: 32, borderRadius: 18, background: "linear-gradient(145deg,#1b1006,#050301)", border: "1px solid rgba(220,60,60,.35)", textAlign: "center", maxWidth: 360 }}>
              <h3 style={{ color: "#ff8080", margin: "0 0 10px", fontFamily: "'Cinzel',Georgia,serif" }}>Leave the Battle?</h3>
              <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, marginBottom: 20 }}>
                Your pieces will be removed from every board and the remaining kingdoms will continue without you.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "#fff", cursor: "pointer", fontFamily: "'Cinzel',Georgia,serif" }}>
                  Stay
                </button>
                <button onClick={handleLeave} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#c83a3a,#701818)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "'Cinzel',Georgia,serif" }}>
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}

        {gs.status === "playing" && gs.eliminatedPlayers.includes(myColor) && (
          <div style={{ position: "fixed", left: 24, bottom: 24, zIndex: 900, padding: "14px 18px", borderRadius: 14, background: "linear-gradient(145deg,rgba(28,10,10,.95),rgba(10,4,4,.95))", border: "1px solid rgba(255,80,80,.3)", boxShadow: "0 10px 30px rgba(0,0,0,.6)", maxWidth: 280 }}>
            <div style={{ color: "#ff8080", fontWeight: 800, fontFamily: "'Cinzel',Georgia,serif", marginBottom: 4 }}>You Have Been Eliminated</div>
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 12 }}>All your pieces are gone, but the war continues — watch the remaining kingdoms fight for the crown.</div>
          </div>
        )}

        {gs.status === "finished" && gs.winner && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
            {winnerIsMe && <Fireworks />}
            <div style={{ position: "relative", padding: 44, borderRadius: 24, background: "linear-gradient(145deg,#1b1006,#050301)", border: `1px solid ${winnerIsMe ? "rgba(212,168,67,.45)" : "rgba(220,60,60,.35)"}`, textAlign: "center", boxShadow: `0 30px 90px rgba(0,0,0,.75), 0 0 60px ${winnerIsMe ? "rgba(212,168,67,.2)" : "rgba(220,60,60,.15)"}` }}>
              {[{ top: 12, left: 12 }, { top: 12, right: 12 }, { bottom: 12, left: 12 }, { bottom: 12, right: 12 }].map((pos, i) => (
                <div key={i} style={{ position: "absolute", ...(pos as any), width: 10, height: 10, border: "1px solid rgba(212,168,67,.4)", transform: "rotate(45deg)" }} />
              ))}
              <img
                src={winnerIsMe ? "/game-over/victory.png" : "/game-over/defeated.png"}
                alt={winnerIsMe ? "Victory" : "Defeat"}
                style={{ width: 90, height: 90, objectFit: "contain", margin: "0 auto 12px" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <h2 style={{ color: winnerIsMe ? "#e8c96a" : "#ff8080", fontSize: 40, margin: 0, fontFamily: "'Cinzel',Georgia,serif" }}>
                {winnerIsMe ? "VICTORY!" : `${gs.winner.toUpperCase()} WINS`}
              </h2>
              <p style={{ color: "rgba(255,255,255,.55)", marginTop: 10 }}>
                {winnerIsMe ? "You claim the tri-kingdom." : `${playerNames[gs.winner] || gs.winner} claims the tri-kingdom. Better luck next time.`}
              </p>
              <button onClick={() => location.reload()} style={{ marginTop: 20, padding: "12px 26px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#d4a843,#8a5a18)", color: "#120800", fontWeight: 900, fontFamily: "'Cinzel',Georgia,serif", cursor: "pointer" }}>
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
