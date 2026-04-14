"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  GameState12, Square12, PlayerColor, Piece12, Wing,
} from "@/lib/game/rules-12x12";
import {
  createInitialGameState12, getLegalMoves12, executeMove12,
  advanceTurn, applyAxeSwing, getAxeSwingSquares,
  sq12Eq, getPiece, pieceImagePath, centerRowWidth,
  findSorceress, applySleepSpell, applyTeleportSpell,
  applyWizardTeleport, rollWishDice, applyMageSacrifice,
  findWizard, cloneState12,
} from "@/lib/game/rules-12x12";

// ─── SOUND ────────────────────────────────────────────────────────────────────
function playSound(type: string) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const s: Record<string, any> = {
      select:  { freq: [520],            dur: 0.07, wave: "sine" },
      move:    { freq: [300, 420],       dur: 0.12, wave: "triangle" },
      capture: { freq: [220, 160, 100],  dur: 0.25, wave: "sawtooth" },
      check:   { freq: [520, 640, 520],  dur: 0.40, wave: "square" },
      win:     { freq: [400,500,640,880],dur: 0.90, wave: "sine" },
      spell:   { freq: [300, 600, 900],  dur: 0.35, wave: "sawtooth" },
    };
    const sound = s[type] || s.move;
    o.type = sound.wave;
    const t = ctx.currentTime;
    sound.freq.forEach((f: number, i: number) =>
      o.frequency.setValueAtTime(f, t + (i * sound.dur / sound.freq.length))
    );
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + sound.dur);
    o.start(t); o.stop(t + sound.dur);
  } catch {}
}

// ─── COLORS ───────────────────────────────────────────────────────────────────
const PLAYER_COLORS: Record<PlayerColor, { primary: string; bg: string; text: string }> = {
  white: { primary: "#d4a843", bg: "rgba(212,168,67,0.12)", text: "#d4a843" },
  black: { primary: "#8888aa", bg: "rgba(100,100,160,0.12)", text: "#aaaacc" },
  grey:  { primary: "#88aa88", bg: "rgba(100,160,100,0.12)", text: "#aaccaa" },
};

const TURN_EMOJI: Record<PlayerColor, string> = { white: "♔", black: "♚", grey: "⚔" };

// ─── PLAYER CARD ──────────────────────────────────────────────────────────────
function PlayerCard12({ name, color, isActive, isCheck, captured }: {
  name: string; color: PlayerColor; isActive: boolean; isCheck: boolean;
  captured: Piece12[];
}) {
  const pc = PLAYER_COLORS[color];
  return (
    <div style={{
      borderRadius: 14, padding: "10px 12px",
      background: isActive ? pc.bg : "rgba(0,0,0,0.4)",
      border: `1px solid ${isActive ? pc.primary + "55" : "rgba(255,255,255,0.06)"}`,
      backdropFilter: "blur(10px)", minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>{TURN_EMOJI[color]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 12, fontWeight: 700, color: pc.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{name}</p>
          <p style={{ margin: 0, fontSize: 9, color: "rgba(180,140,60,0.4)", textTransform: "uppercase" }}>{color}</p>
        </div>
        {isCheck && (
          <div style={{
            padding: "2px 6px", borderRadius: 6,
            background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.35)",
            fontSize: 9, color: "#ff8080", fontWeight: 700,
          }}>CHECK</div>
        )}
        {isActive && !isCheck && (
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#7dbd6e", boxShadow: "0 0 6px rgba(125,189,110,0.7)",
          }} />
        )}
      </div>
      <div>
        <p style={{ margin: "0 0 3px", fontSize: 9, color: "rgba(180,140,60,0.3)", textTransform: "uppercase" }}>Captured</p>
        {captured.length === 0 ? (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.1)", fontStyle: "italic" }}>—</span>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {captured.map((p, i) => (
              <img key={i} src={pieceImagePath(p)} alt={p.type}
                style={{ width: 16, height: 16, objectFit: "contain" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SINGLE WING BOARD RENDERER ───────────────────────────────────────────────
function WingBoardView({
  wing, gameState, sqPx, onSquareClick, rotation,
}: {
  wing: PlayerColor;
  gameState: GameState12;
  sqPx: number;
  onSquareClick: (sq: Square12) => void;
  rotation: number;
}) {
  const boardData = gameState.board[wing];
  const boardPx = sqPx * 12;

  return (
    <div style={{
      transform: `rotate(${rotation}deg)`,
      transformOrigin: "center center",
      width: boardPx,
      height: boardPx,
      position: "relative",
      flexShrink: 0,
    }}>
      {/* Frame */}
      <div style={{
        width: boardPx, height: boardPx,
        borderRadius: 6,
        background: "linear-gradient(145deg, #2e200a, #1a1006, #0e0906)",
        boxShadow: "0 0 0 1px rgba(80,50,10,0.8), 0 0 0 2px rgba(212,168,67,0.3), 0 8px 30px rgba(0,0,0,0.7)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Wing label */}
        <div style={{
          position: "absolute", top: 4, left: "50%", transform: `translateX(-50%) rotate(${-rotation}deg)`,
          fontSize: 9, color: PLAYER_COLORS[wing].text, opacity: 0.6,
          textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700,
          zIndex: 10, pointerEvents: "none",
        }}>{wing}</div>

        {/* Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(12, ${sqPx}px)`,
          gridTemplateRows: `repeat(12, ${sqPx}px)`,
          borderRadius: 3, overflow: "hidden",
        }}>
          {Array.from({ length: 12 }).map((_, row) =>
            Array.from({ length: 12 }).map((_, col) => {
              const sq: Square12 = { row, col, wing };
              const piece = boardData[row][col];
              const isLight = (row + col) % 2 === 0;
              const isSel = !!gameState.selectedSquare && sq12Eq(gameState.selectedSquare, sq);
              const isValid = gameState.validMoves.some(m => sq12Eq(m, sq));
              const isLast = !!gameState.lastMove && (
                sq12Eq(gameState.lastMove.from, sq) || sq12Eq(gameState.lastMove.to, sq)
              );
              const isCheck = piece?.type === "mystic-king" && piece.color === gameState.check;

              const baseBg = isLight ? "#d4b896" : "#5c3a1e";

              return (
                <div
                  key={`${wing}-${row}-${col}`}
                  onClick={() => onSquareClick(sq)}
                  style={{
                    width: sqPx, height: sqPx,
                    background: baseBg,
                    position: "relative",
                    cursor: "pointer",
                    transition: "filter 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.15)")}
                  onMouseLeave={e => (e.currentTarget.style.filter = "none")}
                >
                  {/* Selection overlay */}
                  {isSel && <div style={{ position: "absolute", inset: 0, background: "rgba(212,168,67,0.5)", zIndex: 1 }} />}
                  {isCheck && <div style={{ position: "absolute", inset: 0, background: "rgba(220,40,40,0.5)", zIndex: 1 }} />}
                  {isLast && <div style={{ position: "absolute", inset: 0, background: "rgba(212,168,67,0.2)", zIndex: 1 }} />}

                  {/* Valid move dot */}
                  {isValid && !piece && (
                    <div style={{
                      position: "absolute", top: "50%", left: "50%",
                      transform: "translate(-50%,-50%)",
                      width: sqPx * 0.3, height: sqPx * 0.3, borderRadius: "50%",
                      background: "rgba(212,168,67,0.7)",
                      boxShadow: "0 0 10px rgba(212,168,67,0.5)",
                      zIndex: 4, pointerEvents: "none",
                    }} />
                  )}
                  {isValid && piece && (
                    <div style={{
                      position: "absolute", inset: 2, zIndex: 4,
                      border: "2px solid rgba(212,168,67,0.8)", borderRadius: 2,
                      pointerEvents: "none",
                    }} />
                  )}

                  {/* Piece */}
                  {piece && (
                    <img
                      src={pieceImagePath(piece)}
                      alt={`${piece.color} ${piece.type}`}
                      style={{
                        position: "absolute", top: "6%", left: "6%",
                        width: "88%", height: "88%",
                        objectFit: "contain", pointerEvents: "none", zIndex: 3,
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
                        transform: `rotate(${-rotation}deg)`, // Counter-rotate so pieces face up
                        opacity: piece.sleepRoundsLeft > 0 ? 0.4 : 1,
                      }}
                    />
                  )}

                  {/* Sleep indicator */}
                  {piece && piece.sleepRoundsLeft > 0 && (
                    <div style={{
                      position: "absolute", top: 2, right: 2, zIndex: 5,
                      fontSize: 8, color: "#88f", fontWeight: 700,
                      background: "rgba(0,0,40,0.7)", borderRadius: 4,
                      padding: "1px 3px", pointerEvents: "none",
                    }}>💤{piece.sleepRoundsLeft}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CENTER BRIDGE RENDERER ───────────────────────────────────────────────────
function CenterBridgeView({
  gameState, sqPx, onSquareClick,
}: {
  gameState: GameState12;
  sqPx: number;
  onSquareClick: (sq: Square12) => void;
}) {
  return (
    <div style={{
      position: "absolute",
      top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 20,
    }}>
      {Array.from({ length: 6 }).map((_, row) => {
        const width = centerRowWidth(row);
        const rowPx = width * sqPx;
        return (
          <div key={`center-row-${row}`} style={{
            display: "flex", justifyContent: "center", height: sqPx,
          }}>
            {Array.from({ length: width }).map((_, col) => {
              const sq: Square12 = { row, col, wing: "center" };
              const piece = gameState.board.center[row]?.[col] ?? null;
              const isLight = (row + col) % 2 === 0;
              const isSel = !!gameState.selectedSquare && sq12Eq(gameState.selectedSquare, sq);
              const isValid = gameState.validMoves.some(m => sq12Eq(m, sq));

              return (
                <div
                  key={`center-${row}-${col}`}
                  onClick={() => onSquareClick(sq)}
                  style={{
                    width: sqPx, height: sqPx,
                    background: isLight ? "#c8b090" : "#4a2e16",
                    position: "relative", cursor: "pointer",
                    border: "1px solid rgba(0,0,0,0.3)",
                  }}
                >
                  {isSel && <div style={{ position: "absolute", inset: 0, background: "rgba(212,168,67,0.5)", zIndex: 1 }} />}
                  {isValid && !piece && (
                    <div style={{
                      position: "absolute", top: "50%", left: "50%",
                      transform: "translate(-50%,-50%)",
                      width: sqPx * 0.3, height: sqPx * 0.3, borderRadius: "50%",
                      background: "rgba(212,168,67,0.7)", zIndex: 4, pointerEvents: "none",
                    }} />
                  )}
                  {piece && (
                    <img src={pieceImagePath(piece)} alt={piece.type}
                      style={{
                        position: "absolute", top: "6%", left: "6%",
                        width: "88%", height: "88%",
                        objectFit: "contain", pointerEvents: "none", zIndex: 3,
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
interface Props {
  myColor: PlayerColor;
  roomId: string;
  playerNames: Record<PlayerColor, string>;
  onGameEnd?: (winner: PlayerColor) => void;
  socket?: any;
}

export default function Board12x12({
  myColor, roomId, playerNames, onGameEnd, socket,
}: Props) {
  const [gameState, setGameState] = useState<GameState12>(createInitialGameState12());
  const [showWin, setShowWin] = useState<PlayerColor | null>(null);
  const [boardSize, setBoardSize] = useState(280);
  const gsRef = useRef(gameState);
  gsRef.current = gameState;

  const isMyTurn = gameState.currentTurn === myColor;

  // ─── RESPONSIVE SIZING ──────────────────────────────────────────────────
  useEffect(() => {
    const calc = () => {
      const minDim = Math.min(window.innerWidth, window.innerHeight);
      // Each wing board takes roughly 1/3 of the space
      // Total layout is about 2.5x wing width
      const wingPx = Math.floor(Math.min(minDim * 0.38, 340));
      setBoardSize(Math.max(wingPx, 180));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const sqPx = Math.floor(boardSize / 12);
  const wingPx = sqPx * 13.6;

  // ─── SOCKET ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.on("game:move", ({ newState }: any) => {
      playSound(newState.check ? "check" : "move");
      setGameState(newState);
      if (newState.status === "finished" && newState.winner) {
        setTimeout(() => { setShowWin(newState.winner); playSound("win"); }, 300);
      }
    });
    socket.on("game:state", (newState: GameState12) => setGameState(newState));
    return () => { socket.off("game:move"); socket.off("game:state"); };
  }, [socket]);

  // ─── CLICK HANDLER ──────────────────────────────────────────────────────
  const handleSquareClick = useCallback((sq: Square12) => {
    const gs = gsRef.current;
    if (gs.currentTurn !== myColor || gs.status === "finished") return;

    const piece = getPiece(gs.board, sq);

    // ── Executioner axe swing ──
    if (gs.specialMode === "executioner-axe-swing" && gs.pendingAxeSquare) {
      const axeTargets = getAxeSwingSquares(gs.board, gs.pendingAxeSquare, gs.currentTurn);
      if (axeTargets.some(t => sq12Eq(t, sq))) {
        const newState = applyAxeSwing(gs, sq);
        playSound("capture");
        setGameState(newState);
        socket?.emit("game:move", { roomId, newState });
        checkWin(newState);
        return;
      }
      // Skip axe
      const newState = advanceTurn(gs);
      setGameState(newState);
      socket?.emit("game:move", { roomId, newState });
      return;
    }

    // ── Super queen second move ──
    if (gs.specialMode === "super-queen-second-move") {
      if (gs.validMoves.some(m => sq12Eq(m, sq))) {
        const newState = executeMove12(gs, gs.selectedSquare!, sq);
        playSound("move");
        setGameState(newState);
        socket?.emit("game:move", { roomId, newState });
        checkWin(newState);
        return;
      }
      // Deselect / skip
      const newState = advanceTurn(gs);
      setGameState(newState);
      socket?.emit("game:move", { roomId, newState });
      return;
    }

    // ── Normal move ──
    if (gs.selectedSquare && gs.validMoves.some(m => sq12Eq(m, sq))) {
      const target = getPiece(gs.board, sq);
      const newState = executeMove12(gs, gs.selectedSquare, sq);
      playSound(newState.check ? "check" : target ? "capture" : "move");
      setGameState(newState);
      socket?.emit("game:move", { roomId, newState });
      checkWin(newState);
      return;
    }

    // ── Select own piece ──
    if (piece?.color === myColor) {
      playSound("select");
      const legalMoves = getLegalMoves12(gs.board, sq, gs.turnOrder);
      setGameState(prev => ({
        ...prev,
        selectedSquare: sq,
        validMoves: legalMoves,
        specialMode: null,
        specialData: null,
      }));
      return;
    }

    // ── Deselect ──
    setGameState(prev => ({
      ...prev,
      selectedSquare: null,
      validMoves: [],
    }));
  }, [myColor, roomId, socket]);

  function checkWin(state: GameState12) {
    if (state.status === "finished" && state.winner) {
      setTimeout(() => { setShowWin(state.winner); playSound("win"); }, 300);
      onGameEnd?.(state.winner!);
    }
  }

  // ─── WING POSITIONS (STAR LAYOUT) ──────────────────────────────────────
  // Three wings at 120° intervals, forming a Y/star shape
  // White at bottom, Black at top-right, Grey at top-left
  const layoutRadius = wingPx * 0.58;
  const wingPositions: Record<PlayerColor, { x: number; y: number; rotation: number }> = {
    white: {
      x: 0,
      y: layoutRadius,
      rotation: 0,
    },
    black: {
      x: layoutRadius * Math.cos(Math.PI / 6),
      y: -layoutRadius * Math.sin(Math.PI / 6),
      rotation: 120,
    },
    grey: {
      x: -layoutRadius * Math.cos(Math.PI / 6),
      y: -layoutRadius * Math.sin(Math.PI / 6),
      rotation: -120,
    },
  };

  const totalSize = wingPx * 2.9;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes winPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% -5%, #2a1305 0%, #0d0804 48%, #030201 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 12, gap: 12,
        fontFamily: "'Cinzel', Georgia, serif",
        overflowX: "hidden",
        position: "relative",
      }}>
        {/* Video BG */}
        <video autoPlay loop muted playsInline
          style={{
            position: "fixed", top: 0, left: 0,
            width: "100vw", height: "100vh",
            objectFit: "cover", zIndex: 0, pointerEvents: "none",
          }}
        >
          <source src="https://www.pexels.com/download/video/10586247/" type="video/mp4" />
        </video>
        <div style={{
          position: "absolute", inset: 0, background: "rgba(5,5,8,0.55)",
          pointerEvents: "none",
        }} />

        {/* ── TURN INDICATOR ── */}
        <div style={{
          zIndex: 1, animation: "fadeIn 0.3s ease",
          padding: "99px 10px", borderRadius: 1,
          background: gameState.check
            ? "rgba(255,60,60,0.15)"
            : isMyTurn
            ? "rgba(125,189,110,0.12)"
            : "rgba(0,0,0,0.4)",
          border: `1px solid ${gameState.check === myColor ? "rgba(255,80,80,0.4)" : isMyTurn ? "rgba(125,189,110,0.3)" : "rgba(255,255,255,0.06)"}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 10 }}>
            {gameState.check ? "⚠️" : isMyTurn ? "⚔️" : "⏳"}
          </span>
          <div>
            <p style={{
              margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: gameState.check === myColor ? "#ff8080" : isMyTurn ? "#7dbd6e" : "rgba(180,140,60,0.5)",
            }}>
              {gameState.check === myColor ? "King in Check!" :
               isMyTurn ? "Your Move" :
               `${playerNames[gameState.currentTurn]}'s Turn`}
            </p>
            {gameState.spellMessage && (
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#ffaa00" }}>
                {gameState.spellMessage}
              </p>
            )}
          </div>
        </div>

        {/* ── PLAYER CARDS ── */}
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
          zIndex: 10, animation: "fadeIn 0.4s ease",
          width: "100%", maxWidth: 700,
        }}>
          {gameState.turnOrder.map(color => (
            <div key={color} style={{ flex: "1 1 140px", maxWidth: 220, minWidth: 140 }}>
              <PlayerCard12
                name={playerNames[color]}
                color={color}
                isActive={gameState.currentTurn === color}
                isCheck={gameState.check === color}
                captured={gameState.capturedBy[color]}
              />
            </div>
          ))}
        </div>

        {/* ── TRI-BOARD ── */}
        <div style={{
          position: "relative",
          width: totalSize,
          height: totalSize,
          zIndex: 5,
          animation: "fadeIn 0.5s ease",
        }}>
          {/* CENTER CONTAINER */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
          }}>
            {/* Three wing boards */}
            {(["white", "black", "grey"] as PlayerColor[]).map(wing => {
              const pos = wingPositions[wing];
              return (
                <div
                  key={wing}
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: `translate(-50%, -50%)`,
                  }}
                >
                  <WingBoardView
                    wing={wing}
                    gameState={gameState}
                    sqPx={sqPx}
                    onSquareClick={handleSquareClick}
                    rotation={pos.rotation}
                  />
                </div>
              );
            })}

            {/* Center bridge */}
            <CenterBridgeView
              gameState={gameState}
              sqPx={sqPx}
              onSquareClick={handleSquareClick}
            />
          </div>
        </div>

        {/* ── ELIMINATED PLAYERS ── */}
        {gameState.eliminatedPlayers.length > 0 && (
          <div style={{
            zIndex: 10, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center",
          }}>
            {gameState.eliminatedPlayers.map(p => (
              <div key={p} style={{
                padding: "4px 12px", borderRadius: 8,
                background: "rgba(180,50,50,0.2)", border: "1px solid rgba(255,80,80,0.3)",
                fontSize: 10, color: "#ff8080", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                💀 {p} Eliminated
              </div>
            ))}
          </div>
        )}

        {/* ── WIN OVERLAY ── */}
        {showWin && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.92)", backdropFilter: "blur(18px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}>
            <div style={{
              textAlign: "center", padding: "50px 60px", borderRadius: 28,
              background: "linear-gradient(160deg, #1e1208, #2c1a08, #1e1208)",
              border: "1px solid rgba(212,168,67,0.28)",
              boxShadow: "0 0 80px rgba(212,168,67,0.15), 0 40px 100px rgba(0,0,0,0.8)",
              animation: "winPulse 2.5s ease-in-out infinite",
              fontFamily: "'Cinzel', Georgia, serif",
              maxWidth: "90vw",
            }}>
              <div style={{ fontSize: 72, marginBottom: 18, lineHeight: 1 }}>
                {showWin === myColor ? "👑" : "💀"}
              </div>
              <h1 style={{
                fontFamily: "'Cinzel',Georgia,serif", fontSize: 40,
                color: "#d4a843", margin: "0 0 8px", fontWeight: 700,
              }}>
                {showWin === myColor ? "Victory!" : "Defeated"}
              </h1>
              <p style={{
                fontSize: 14, color: PLAYER_COLORS[showWin].text,
                margin: "0 0 30px", fontStyle: "italic",
              }}>
                {playerNames[showWin]} ({showWin}) Kingdom Prevails
              </p>
              <button
                onClick={() => window.location.href = "/lobby"}
                style={{
                  padding: "13px 40px", borderRadius: 14, fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 11,
                  background: "linear-gradient(135deg, #d4a843, #b87e28)",
                  color: "#1a0d00", border: "none", cursor: "pointer",
                  fontFamily: "'Cinzel',Georgia,serif",
                }}
              >← Return to Lobby</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}