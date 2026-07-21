"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { GameStateX, SquareX, PlayerColorX, PieceTypeX, PieceX } from "@/lib/game/rules-x8x8";
import {
  createInitialGameStateX, getLegalMovesX, getLegalSuperMovesX, getCastleMovesX,
  executeMoveX, executeCastleX, passTurnX, retrieveCapturedPieceX, skipRetrieveX,
  quitPlayerX, squareEqualsX, myLostPiecesPool, pieceImagePathX,
  SIZE, inPlayAreaX,
} from "@/lib/game/rules-x8x8";

// ─── SOUND — same tiny WebAudio beeps used across every other board ─────────
function snd(type: string) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const S: any = {
      select: { freq: [520], dur: .07, wave: "sine" },
      move: { freq: [280, 380], dur: .1, wave: "triangle" },
      capture: { freq: [220, 160, 100], dur: .25, wave: "sawtooth" },
      win: { freq: [400, 500, 640, 880], dur: .9, wave: "sine" },
      eliminate: { freq: [150, 100, 80], dur: .6, wave: "sawtooth" },
      super: { freq: [350, 700, 1050], dur: .35, wave: "sawtooth" },
      pass: { freq: [280, 240], dur: .18, wave: "sine" },
      click: { freq: [600], dur: .05, wave: "sine" },
    };
    const s = S[type] || S.move;
    o.type = s.wave; const t = ctx.currentTime;
    s.freq.forEach((f: number, i: number) => o.frequency.setValueAtTime(f, t + i * s.dur / s.freq.length));
    g.gain.setValueAtTime(.25, t);
    g.gain.exponentialRampToValueAtTime(.001, t + s.dur);
    o.start(t); o.stop(t + s.dur);
  } catch {}
}

const AC: Record<PlayerColorX, string> = { white: "#e8dfc0", black: "#c8a96e", golden: "#d4a843", grey: "#b8c0cc" };
const SIDE_LABEL: Record<PlayerColorX, string> = { white: "Top", grey: "Right", black: "Bottom", golden: "Left" };

// ─── PLAYER MINI CARD ────────────────────────────────────────────────────────
function PlayerMiniCard({ color, name, isMe, isActive, isElim, captured }: {
  color: PlayerColorX; name: string; isMe: boolean; isActive: boolean; isElim: boolean; captured: PieceX[];
}) {
  const ac = AC[color];
  return (
    <div style={{
      borderRadius: 14, padding: "10px 12px",
      background: isElim ? "linear-gradient(135deg,rgba(70,0,0,.5),rgba(20,0,0,.7))" : "linear-gradient(135deg,rgba(20,16,8,.9),rgba(10,8,4,.9))",
      border: `1px solid ${isElim ? "rgba(255,70,70,.35)" : ac + "45"}`,
      opacity: isElim ? .5 : 1, transition: "all .3s",
      boxShadow: isActive && !isElim ? `0 0 18px ${ac}55, 0 8px 20px rgba(0,0,0,.4)` : "0 6px 16px rgba(0,0,0,.3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: captured.length > 0 ? 6 : 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: ac, border: "2px solid rgba(255,255,255,.25)", boxShadow: isActive && !isElim ? `0 0 10px ${ac}` : "none" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#e8dfc0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}{isMe ? " (You)" : ""}</p>
          <p style={{ margin: "1px 0 0", fontSize: 9, color: "rgba(220,200,165,.5)", textTransform: "uppercase", letterSpacing: ".1em" }}>{isElim ? "Eliminated" : `${SIDE_LABEL[color]} · ${color}`}</p>
        </div>
        {isActive && !isElim && <span style={{ width: 7, height: 7, borderRadius: "50%", background: ac, boxShadow: `0 0 8px ${ac}`, animation: "x8Pulse 1.5s infinite", flexShrink: 0 }} />}
      </div>
      {captured.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxHeight: 26, overflow: "hidden" }}>
          {captured.slice(0, 8).map((p, i) => (
            <img key={i} src={pieceImagePathX(p)} alt={p.type} style={{ width: 16, height: 16, objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.8))" }} />
          ))}
          {captured.length > 8 && <span style={{ fontSize: 9, color: "rgba(220,200,165,.5)" }}>+{captured.length - 8}</span>}
        </div>
      )}
    </div>
  );
}

// ─── CROSS-SHAPE CLIP PATH ────────────────────────────────────────────────────
// Traces the 12-vertex plus/cross outline in percentages of the 24x24 grid —
// arms of 8 units meeting a shared 8x8 center, exactly matching the
// reference image's silhouette.
const P1 = (8 / SIZE) * 100, P2 = (16 / SIZE) * 100;
const CROSS_CLIP = `polygon(${P1}% 0%, ${P2}% 0%, ${P2}% ${P1}%, 100% ${P1}%, 100% ${P2}%, ${P2}% ${P2}%, ${P2}% 100%, ${P1}% 100%, ${P1}% ${P2}%, 0% ${P2}%, 0% ${P1}%, ${P1}% ${P1}%)`;

interface Props {
  myColor: PlayerColorX; roomId: string;
  playerNames: Record<PlayerColorX, string>;
  onGameEnd?: (winner: PlayerColorX) => void;
  socket?: any;
}

export default function BoardX8x8({ myColor, roomId, playerNames, onGameEnd, socket }: Props) {
  const [gs, setGs] = useState<GameStateX>(createInitialGameStateX());
  const [animSq, setAnimSq] = useState<SquareX | null>(null);
  const [showWin, setShowWin] = useState<PlayerColorX | null>(null);
  const [elimPopup, setElimPopup] = useState<PlayerColorX | null>(null);
  const [sqPx, setSqPx] = useState(20);
  const [isMobile, setIsMobile] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const gsRef = useRef(gs);
  useEffect(() => { gsRef.current = gs; }, [gs]);

  const isMyTurn = gs.currentTurn === myColor && gs.status === "playing";
  const selSq = gs.selectedSquare;
  const selPiece = selSq ? gs.board[selSq.row][selSq.col] : null;
  const selectedIsPaladin = selPiece?.type === "paladin" && selPiece.color === myColor;
  const paladinSuperUsed = selPiece?.paladanSuperUsed ?? false;

  // ─── RESPONSIVE SIZE ────────────────────────────────────────────────────
  useEffect(() => {
    const calc = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      const pad = mobile ? 12 : 24;
      const chromeH = mobile ? 320 : 160; // header + player cards + controls
      const maxByWidth = window.innerWidth - pad * 2;
      const maxByHeight = window.innerHeight - chromeH;
      const s = Math.min(maxByWidth, maxByHeight) / SIZE;
      const floor = mobile ? 10 : 16;
      const ceiling = 46;
      setSqPx(Math.min(Math.max(Math.floor(s), floor), ceiling));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const boardPx = sqPx * SIZE;

  // ─── SOCKET ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.on("game:move", ({ newState }: { newState: GameStateX }) => {
      const prev = gsRef.current;
      if (newState.lastMove) { setAnimSq(newState.lastMove.to); setTimeout(() => setAnimSq(null), 420); }
      if (newState.eliminatedPlayers.length > prev.eliminatedPlayers.length) {
        snd("eliminate");
        if (newState.justEliminated) setTimeout(() => setElimPopup(newState.justEliminated), 350);
      } else {
        const prevCap = Object.values(prev.capturedBy).reduce((n, a) => n + a.length, 0);
        const newCap = Object.values(newState.capturedBy).reduce((n, a) => n + a.length, 0);
        snd(newCap > prevCap ? "capture" : "move");
      }
      setGs(newState);
      if (newState.status === "finished" && newState.winner) {
        setTimeout(() => { setShowWin(newState.winner); snd("win"); }, 300);
      }
    });
    socket.on("game:quit", ({ newState }: { newState: GameStateX }) => {
      setGs(newState); setShowQuitConfirm(false);
      if (newState.status === "finished" && newState.winner) {
        setTimeout(() => { setShowWin(newState.winner); snd("win"); }, 250);
      }
    });
    return () => { socket.off("game:move"); socket.off("game:quit"); };
  }, [socket]);

  // ─── ACTIONS ────────────────────────────────────────────────────────────
  const emit = (ns: GameStateX) => { setGs(ns); socket?.emit("game:move", { roomId, newState: ns }); };

  const handleSuperAttack = useCallback(() => {
    const state = gsRef.current;
    if (!state.selectedSquare) return;
    const { row, col } = state.selectedSquare;
    const piece = state.board[row][col];
    if (!piece || piece.type !== "paladin" || piece.paladanSuperUsed) return;
    snd("select");
    emit({ ...state, superMoves: getLegalSuperMovesX(state.board, row, col), superMoveMode: true, validMoves: [], castleMoves: [] });
  }, [roomId, socket]);

  const handlePass = useCallback(() => {
    const state = gsRef.current;
    if (state.currentTurn !== myColor || state.status !== "playing") return;
    snd("pass");
    const ns = passTurnX(state);
    emit(ns);
  }, [myColor, roomId, socket]);

  const handleQuit = useCallback(() => {
    const ns = quitPlayerX(gsRef.current, myColor);
    setShowQuitConfirm(false);
    emit(ns);
    if (ns.status === "finished" && ns.winner) { setTimeout(() => { setShowWin(ns.winner); snd("win"); }, 250); onGameEnd?.(ns.winner); }
    socket?.emit("game:quit", { roomId, quitter: myColor, newState: ns });
  }, [myColor, roomId, socket, onGameEnd]);

  const handleClick = useCallback((row: number, col: number) => {
    const state = gsRef.current;
    if (state.currentTurn !== myColor || state.status !== "playing" || state.pendingRetrieve) return;
    const { board, selectedSquare, validMoves, superMoves, castleMoves, superMoveMode } = state;
    const cp = board[row][col];
    const clickedSq: SquareX = { row, col };
    snd("click");

    if (superMoveMode && superMoves.some(m => squareEqualsX(m, clickedSq))) {
      const ns = executeMoveX(state, selectedSquare!, clickedSq, true);
      setAnimSq(clickedSq); setTimeout(() => setAnimSq(null), 450);
      snd("super");
      emit(ns);
      if (ns.status === "finished" && ns.winner) { setTimeout(() => { setShowWin(ns.winner); snd("win"); }, 300); onGameEnd?.(ns.winner); }
      return;
    }
    if (selectedSquare && castleMoves.some(m => squareEqualsX(m, clickedSq))) {
      const ns = executeCastleX(state, selectedSquare, clickedSq);
      setAnimSq(clickedSq); setTimeout(() => setAnimSq(null), 420);
      snd("move");
      emit(ns);
      return;
    }
    if (selectedSquare && validMoves.some(m => squareEqualsX(m, clickedSq))) {
      const ns = executeMoveX(state, selectedSquare, clickedSq, false);
      setAnimSq(clickedSq); setTimeout(() => setAnimSq(null), 420);
      const prevCap = Object.values(state.capturedBy).reduce((n, a) => n + a.length, 0);
      const newCap = Object.values(ns.capturedBy).reduce((n, a) => n + a.length, 0);
      snd(newCap > prevCap ? "capture" : "move");
      emit(ns);
      if (ns.status === "finished" && ns.winner) { setTimeout(() => { setShowWin(ns.winner); snd("win"); }, 300); onGameEnd?.(ns.winner); }
      return;
    }
    if (cp?.color === myColor) {
      snd("select");
      const isPal = cp.type === "paladin";
      emit({
        ...state, selectedSquare: clickedSq,
        validMoves: getLegalMovesX(board, row, col),
        castleMoves: isPal ? getCastleMovesX(board, row, col) : [],
        superMoves: [], superMoveMode: false,
      });
      return;
    }
    emit({ ...state, selectedSquare: null, validMoves: [], castleMoves: [], superMoves: [], superMoveMode: false });
  }, [myColor, roomId, socket, onGameEnd]);

  const handleRetrieve = useCallback((pieceId: string) => {
    const state = gsRef.current;
    if (!state.pendingRetrieve) return;
    emit(retrieveCapturedPieceX(state, pieceId));
  }, [roomId, socket]);
  const handleSkipRetrieve = useCallback(() => {
    const state = gsRef.current;
    if (!state.pendingRetrieve) return;
    emit(skipRetrieveX(state));
  }, [roomId, socket]);

  // ─── OVERLAY DATA ───────────────────────────────────────────────────────
  const allColors: PlayerColorX[] = ["white", "grey", "black", "golden"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        *{box-sizing:border-box;}
        @keyframes x8Pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
        @keyframes x8In{0%{opacity:.3;transform:translate(-50%,-50%) scale(.65)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes x8Dot{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}80%{transform:translate(-50%,-50%) scale(1.2)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes x8FadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .x8sq{position:relative;overflow:hidden;cursor:pointer;transition:filter .1s;}
        .x8sq:hover{filter:brightness(1.2);}
        .x8pi{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80%;height:80%;object-fit:contain;pointer-events:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.9));}
      `}</style>

      <div style={{
        minHeight: "100vh", width: "100%", maxWidth: "100vw", overflowX: "hidden", boxSizing: "border-box",
        background: "radial-gradient(ellipse at 50% -5%,#1c0f04 0%,#080503 50%,#020101 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: isMobile ? "18px 10px 24px" : "20px 24px", gap: 16, fontFamily: "'Cinzel',Georgia,serif",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 28, color: "#e8c96a", letterSpacing: ".08em", textShadow: "0 0 30px rgba(212,168,67,.4)" }}>8×8 X Board</h1>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(212,168,67,.5)", letterSpacing: ".1em", textTransform: "uppercase" }}>Four Kingdoms · One Battlefield</p>
        </div>

        {/* Player cards — top row (all 4, since arms don't have room for individually-attached panels at every viewport) */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 8, width: "100%", maxWidth: boardPx + 40 }}>
          {allColors.map(c => (
            <PlayerMiniCard key={c} color={c} name={playerNames[c] || c} isMe={c === myColor}
              isActive={gs.currentTurn === c && gs.status === "playing"}
              isElim={gs.eliminatedPlayers.includes(c)}
              captured={gs.capturedBy[c]} />
          ))}
        </div>

        {/* Turn indicator */}
        <div style={{ borderRadius: 12, padding: "9px 18px", display: "flex", alignItems: "center", gap: 8,
          background: isMyTurn ? "rgba(125,189,110,.1)" : "rgba(0,0,0,.35)",
          border: `1px solid ${isMyTurn ? "rgba(125,189,110,.3)" : "rgba(255,255,255,.08)"}` }}>
          <span style={{ fontSize: 15 }}>{isMyTurn ? "⚔️" : "⏳"}</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: isMyTurn ? "#7dbd6e" : "rgba(220,210,180,.55)" }}>
            {gs.status === "finished" ? "Battle Over" : isMyTurn ? "Your Move" : `${playerNames[gs.currentTurn] || gs.currentTurn}'s Turn`}
          </span>
        </div>

        {/* Board */}
        <div style={{ position: "relative", animation: "x8FadeUp .5s ease" }}>
          <div style={{
            position: "relative", width: boardPx, height: boardPx, padding: isMobile ? 6 : 10,
            background: "linear-gradient(145deg,#3d1f08,#1e0e04,#0e0702,#1e0e04,#3d1f08)",
            clipPath: CROSS_CLIP,
            boxShadow: "0 0 60px rgba(212,168,67,.12), 0 30px 90px rgba(0,0,0,.95)",
          }}>
            <div style={{ position: "relative", width: "100%", height: "100%", background: "#050505", clipPath: CROSS_CLIP }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${SIZE},${sqPx}px)`, gridTemplateRows: `repeat(${SIZE},${sqPx}px)` }}>
                {Array.from({ length: SIZE }).map((_, row) => Array.from({ length: SIZE }).map((__, col) => {
                  if (!inPlayAreaX(row, col)) return <div key={`${row}-${col}`} style={{ width: sqPx, height: sqPx, pointerEvents: "none" }} />;

                  const piece = gs.board[row][col];
                  const sq = { row, col };
                  const isLight = (row + col) % 2 === 0;
                  const isSel = !!gs.selectedSquare && squareEqualsX(gs.selectedSquare, sq);
                  const isValid = gs.validMoves.some(m => squareEqualsX(m, sq));
                  const isSuper = gs.superMoves.some(m => squareEqualsX(m, sq));
                  const isCastleMove = gs.castleMoves.some(m => squareEqualsX(m, sq));
                  const isLF = !!gs.lastMove && squareEqualsX(gs.lastMove.from, sq);
                  const isLT = !!gs.lastMove && squareEqualsX(gs.lastMove.to, sq);
                  const isAnim = !!animSq && squareEqualsX(animSq, sq);

                  const baseBg = isLight ? "#c9a96e" : "#4a2e1a";
                  let ov = "";
                  if (isSel) ov = "rgba(212,168,67,.55)";
                  else if (isLF || isLT) ov = "rgba(212,168,67,.25)";
                  else if (isCastleMove) ov = "rgba(80,160,255,.18)";
                  if (gs.superMoveMode && !isSel && !isSuper) ov = ov || "rgba(0,0,0,.08)";

                  return (
                    <div key={`${row}-${col}`} className="x8sq" onClick={() => handleClick(row, col)} style={{ width: sqPx, height: sqPx, background: baseBg, position: "relative" }}>
                      {ov && <div style={{ position: "absolute", inset: 0, zIndex: 1, background: ov, pointerEvents: "none" }} />}
                      {isValid && !piece && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: sqPx * .32, height: sqPx * .32, borderRadius: "50%", background: "rgba(212,168,67,.75)", boxShadow: "0 0 10px rgba(212,168,67,.6)", animation: "x8Dot .15s ease both", pointerEvents: "none", zIndex: 4 }} />}
                      {isValid && piece && <div style={{ position: "absolute", inset: Math.max(2, sqPx * .06), zIndex: 4, borderRadius: 4, border: "2px solid rgba(212,168,67,.9)", pointerEvents: "none" }} />}
                      {isSuper && !piece && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: sqPx * .36, height: sqPx * .36, borderRadius: "50%", background: "rgba(255,140,0,.82)", boxShadow: "0 0 14px rgba(255,140,0,.7)", pointerEvents: "none", zIndex: 4 }} />}
                      {isSuper && piece && <div style={{ position: "absolute", inset: Math.max(2, sqPx * .06), zIndex: 4, borderRadius: 4, border: "2px solid rgba(255,140,0,.95)", pointerEvents: "none" }} />}
                      {isCastleMove && piece && <div style={{ position: "absolute", inset: Math.max(2, sqPx * .06), zIndex: 4, borderRadius: 4, border: "2px dashed rgba(80,160,255,.9)", pointerEvents: "none" }} />}
                      {piece && (
                        <img src={pieceImagePathX(piece)} alt={piece.type} className="x8pi"
                          style={{ animation: isAnim ? "x8In .32s ease both" : "none" }} />
                      )}
                    </div>
                  );
                }))}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%", maxWidth: boardPx + 40 }}>
          {isMyTurn && selectedIsPaladin && (
            <button onClick={() => { if (!paladinSuperUsed) handleSuperAttack(); }} disabled={paladinSuperUsed}
              style={{ padding: "10px 18px", borderRadius: 12, cursor: paladinSuperUsed ? "default" : "pointer",
                background: paladinSuperUsed ? "rgba(42,32,18,.6)" : "linear-gradient(135deg,rgba(255,160,35,.65),rgba(80,42,8,.75))",
                border: `1px solid ${paladinSuperUsed ? "rgba(120,90,45,.2)" : "rgba(255,170,60,.42)"}`,
                color: paladinSuperUsed ? "rgba(170,130,70,.5)" : "#ffc46b", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "'Cinzel',Georgia,serif" }}>
              ⚡ {paladinSuperUsed ? "Super Used" : "Super Attack"}
            </button>
          )}
          <button onClick={handlePass} disabled={!isMyTurn}
            style={{ padding: "10px 18px", borderRadius: 12, cursor: isMyTurn ? "pointer" : "default",
              background: isMyTurn ? "rgba(9,95,190,.28)" : "rgba(4,10,28,.5)", border: `1px solid ${isMyTurn ? "rgba(150,150,255,.45)" : "rgba(255,255,255,.1)"}`,
              color: isMyTurn ? "#c7c9ff" : "rgba(220,220,235,.4)", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "'Cinzel',Georgia,serif" }}>
            ⏭️ Pass Turn
          </button>
          <button onClick={() => setShowRules(true)}
            style={{ padding: "10px 18px", borderRadius: 12, cursor: "pointer", background: "#080a08", color: "#4ade80", border: "1px solid rgba(74,222,128,.35)", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "'Cinzel',Georgia,serif" }}>
            Game Rules
          </button>
          {!gs.eliminatedPlayers.includes(myColor) && gs.status === "playing" && (
            <button onClick={() => setShowQuitConfirm(true)}
              style={{ padding: "10px 18px", borderRadius: 12, cursor: "pointer", background: "#080808", color: "#f87171", border: "1px solid rgba(248,113,113,.3)", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "'Cinzel',Georgia,serif" }}>
              Quit Game
            </button>
          )}
        </div>

        {/* ── PALADIN RETRIEVAL ── */}
        {gs.pendingRetrieve && gs.pendingRetrieve.color === myColor && (() => {
          const pool = myLostPiecesPool(gs, myColor);
          return (
            <div style={{ position: "fixed", inset: 0, zIndex: 112, background: "rgba(0,0,0,.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div style={{ width: "min(420px,92vw)", borderRadius: 22, padding: "26px 22px", background: "linear-gradient(160deg,#0e0902,#1a1005,#0e0902)", border: "1px solid rgba(212,168,67,.3)", boxShadow: "0 0 50px rgba(212,168,67,.12), 0 30px 70px rgba(0,0,0,.9)", fontFamily: "'Cinzel',Georgia,serif", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>♻</div>
                <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "#c9a84c" }}>Retrieve a Piece</h3>
                <p style={{ margin: "0 0 18px", fontSize: 12, color: "rgba(232,223,200,.55)" }}>Your Paladin reached an enemy's home edge. Choose a fallen piece to bring back.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 18 }}>
                  {pool.length === 0 ? <p style={{ color: "rgba(212,168,67,.4)", fontSize: 12 }}>No captured pieces available.</p> :
                    pool.map(p => (
                      <button key={p.id} onClick={() => handleRetrieve(p.id)} style={{ width: 56, height: 56, borderRadius: 10, cursor: "pointer", background: "rgba(201,168,76,.08)", border: "1px solid rgba(201,168,76,.3)", display: "flex", alignItems: "center", justifyContent: "center", padding: 6 }}>
                        <img src={pieceImagePathX(p)} alt={p.type} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      </button>
                    ))}
                </div>
                <button onClick={handleSkipRetrieve} style={{ width: "100%", padding: "10px 0", borderRadius: 10, cursor: "pointer", background: "transparent", border: "1px solid rgba(212,168,67,.2)", color: "rgba(212,168,67,.6)", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>Skip</button>
              </div>
            </div>
          );
        })()}

        {/* ── RULES MODAL ── */}
        {showRules && (
          <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,.88)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ width: "min(640px,96vw)", maxHeight: "88vh", overflowY: "auto", borderRadius: 24, padding: "28px 20px", background: "linear-gradient(155deg,#0e0902 0%,#1a1005 40%,#0e0902 100%)", border: "1px solid rgba(212,168,67,.22)", fontFamily: "'Cinzel',Georgia,serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, color: "#e8c96a" }}>⚔️ X Board Rules</h2>
                <button onClick={() => setShowRules(false)} style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
              <div style={{ display: "grid", gap: 12, fontSize: 13, color: "rgba(215,194,154,.8)", lineHeight: 1.7 }}>
                <p><span style={{ color: "#e8c96a" }}>4-Player Battlefield:</span> four 8×8 armies (Top / Right / Bottom / Left) meet in one shared cross-shaped board, with a common center all four sides can fight through.</p>
                <p><span style={{ color: "#e8c96a" }}>Pieces & abilities:</span> identical to 8×8 Classic War — King, Queen, Bishop, Rook, Knight move exactly as usual. Paladins move 1 square any direction, and each keeps its one-time 2–3 square Super Attack, Reverse Castle (swap with an adjacent ally), and Back-Rank Retrieval (reach any opponent's home edge to bring back one of your own captured pieces).</p>
                <p><span style={{ color: "#e8c96a" }}>Victory:</span> capturing a King does not end the game. A player is eliminated only once their entire army is gone, or if they quit. The last player standing wins.</p>
                <p><span style={{ color: "#e8c96a" }}>Pass Turn:</span> Mexican Standoff — you may pass on your turn anytime, unlimited times.</p>
                <p><span style={{ color: "#e8c96a" }}>Turn order:</span> Top → Right → Bottom → Left, repeating (skipping any eliminated player).</p>
              </div>
            </div>
          </div>
        )}

        {/* ── QUIT CONFIRM ── */}
        {showQuitConfirm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 115, background: "rgba(0,0,0,.88)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ width: "min(420px,92vw)", borderRadius: 24, padding: "30px 24px", background: "linear-gradient(155deg,#120606,#2a0e0e,#120606)", border: "1px solid rgba(255,100,100,.25)", textAlign: "center", fontFamily: "'Cinzel',Georgia,serif" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏳️</div>
              <h2 style={{ margin: "0 0 10px", color: "#ff9d9d", fontSize: 22 }}>Surrender?</h2>
              <p style={{ margin: "0 0 20px", color: "rgba(255,220,220,.75)", fontSize: 13, lineHeight: 1.6 }}>Your army will be removed from the board. The battle continues among the remaining players.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setShowQuitConfirm(false)} style={{ padding: "11px 22px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#ddd", cursor: "pointer", fontWeight: 700, fontSize: 11, textTransform: "uppercase", fontFamily: "'Cinzel',Georgia,serif" }}>Stay</button>
                <button onClick={handleQuit} style={{ padding: "11px 22px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#d9534f,#8f1f1f)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 11, textTransform: "uppercase", fontFamily: "'Cinzel',Georgia,serif" }}>Quit</button>
              </div>
            </div>
          </div>
        )}

        {/* ── ELIMINATION POPUP ── */}
        {elimPopup && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setElimPopup(null)}>
            <div style={{ textAlign: "center", padding: "40px 56px", borderRadius: 22, background: "linear-gradient(160deg,#1a0505,#2a0808)", border: `1px solid ${AC[elimPopup]}40` }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>💀</div>
              <h2 style={{ fontSize: 26, color: "#ff8080", margin: "0 0 6px" }}>Eliminated!</h2>
              <p style={{ fontSize: 15, color: `${AC[elimPopup]}cc`, margin: 0 }}>{playerNames[elimPopup] || elimPopup} has fallen</p>
            </div>
          </div>
        )}

        {/* ── WIN SCREEN ── */}
        {showWin && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.92)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: "44px 48px", borderRadius: 28, width: "min(440px,92vw)",
              background: showWin === myColor ? "linear-gradient(160deg,#0e0a02,#1c1204,#0c0802)" : "linear-gradient(160deg,#080404,#140606,#080303)",
              border: `1px solid ${showWin === myColor ? "rgba(212,168,67,.22)" : "rgba(255,60,60,.18)"}`, fontFamily: "'Cinzel',Georgia,serif" }}>
              <h1 style={{ fontSize: 34, margin: "0 0 8px", color: showWin === myColor ? "#d4a843" : "#ff7070" }}>{showWin === myColor ? "Victory!" : "Defeated"}</h1>
              <p style={{ fontSize: 14, color: "rgba(232,223,192,.7)", margin: "0 0 24px" }}>{playerNames[showWin] || showWin} claims the battlefield</p>
              <button onClick={() => window.location.href = "/lobby"} style={{ padding: "13px 28px", borderRadius: 14, background: "linear-gradient(135deg,#d4a843,#b87e28)", color: "#1a0d00", border: "none", cursor: "pointer", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 12, fontFamily: "'Cinzel',Georgia,serif" }}>
                ← Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
