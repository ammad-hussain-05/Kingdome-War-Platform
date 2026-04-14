"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { GameState, Square, Color } from "@/lib/game/rules-8x8";
import {
  createInitialGameState,
  getLegalMoves,
  getLegalSuperMoves,
  executeMove,
  passTurn,
  squareEquals,
} from "@/lib/game/rules-8x8";

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
};

function playSound(type: string) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const s: Record<string, any> = {
      select:  { freq: [520],                dur: 0.07, wave: "sine" },
      move:    { freq: [300, 420],           dur: 0.12, wave: "triangle" },
      capture: { freq: [220, 160, 100],      dur: 0.25, wave: "sawtooth" },
      check:   { freq: [520, 640, 520],      dur: 0.40, wave: "square" },
      win:     { freq: [400, 500, 640, 880], dur: 0.90, wave: "sine" },
      super:   { freq: [300, 600, 900],      dur: 0.35, wave: "sawtooth" },
      pass:    { freq: [280, 240],           dur: 0.18, wave: "sine" },
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

interface ChatMsg { sender: string; text: string; time: string }

function ChatPanel({ myColor, messages, onSend }: {
  myColor: Color; messages: ChatMsg[]; onSend: (t: string) => void;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const send = () => { if (!input.trim()) return; onSend(input.trim()); setInput(""); };

  return (
  <div style={{
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    minWidth: "320px",
    background: "rgba(8,5,2,0.85)",
    borderRadius: 20,
    border: "1px solid rgba(212,168,67,0.15)",
    backdropFilter: "blur(20px)",
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(212,168,67,0.08)", background: "rgba(212,168,67,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>⚔</span>
        <span style={{ fontSize: 11, color: "rgba(212,168,67,0.85)", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>Battle Chat</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
            <span style={{ fontSize: 28, opacity: 0.15 }}>💬</span>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", textAlign: "center", fontStyle: "italic", margin: 0 }}>No messages yet...</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            padding: "9px 12px",
            borderRadius: msg.sender === myColor ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
            background: msg.sender === myColor ? "rgba(212,168,67,0.12)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${msg.sender === myColor ? "rgba(212,168,67,0.2)" : "rgba(255,255,255,0.06)"}`,
            alignSelf: msg.sender === myColor ? "flex-end" : "flex-start",
            maxWidth: "90%",
          }}>
            <p style={{ fontSize: 10, color: "rgba(180,140,60,0.5)", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{msg.sender} · {msg.time}</p>
            <p style={{ fontSize: 13, color: "#e8d8b0", margin: 0, lineHeight: 1.4 }}>{msg.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(212,168,67,0.08)", display: "flex", gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: "9px 13px", borderRadius: 10, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(212,168,67,0.15)", color: "#e8d8b0", fontSize: 13, outline: "none" }}
        />
        <button onClick={send} style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "rgba(212,168,67,0.2)", border: "1px solid rgba(212,168,67,0.3)", color: "#d4a843", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
      </div>
    </div>
  );
}

function PlayerCard({ name, color, isMe, isActive, isCheck, captured }: {
  name: string; color: Color; isMe: boolean; isActive: boolean; isCheck: boolean;
  captured: { color: Color; type: string }[];
}) {
  return (
    <div style={{
      borderRadius: 16, padding: "14px 16px",
      background: isMe ? "rgba(212,168,67,0.07)" : "rgba(0,0,0,0.45)",
      border: `1px solid ${isMe ? "rgba(212,168,67,0.25)" : "rgba(255,255,255,0.07)"}`,
      backdropFilter: "blur(12px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
          background: color === "white" ? "radial-gradient(circle at 35% 35%, #fff8e8, #c8b070)" : "radial-gradient(circle at 35% 35%, #4a3d28, #1a1208)",
          border: `2px solid ${color === "white" ? "rgba(220,200,140,0.5)" : "rgba(100,75,35,0.6)"}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>
          {color === "white" ? "♔" : "♚"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isMe ? "#d4a843" : "#c8bfa0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}{isMe ? " (You)" : ""}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(180,140,60,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{color}</p>
        </div>
        {isCheck ? (
          <div style={{ padding: "3px 8px", borderRadius: 7, background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.35)", fontSize: 10, color: "#ff8080", fontWeight: 700, animation: "checkFlash 1s infinite" }}>CHECK</div>
        ) : isActive ? (
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7dbd6e", boxShadow: "0 0 8px rgba(125,189,110,0.7)", animation: "pulseDot 1.5s infinite" }} />
        ) : (
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        )}
      </div>
      <div>
        <p style={{ margin: "0 0 5px", fontSize: 10, color: "rgba(180,140,60,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Captured</p>
        {captured.length === 0 ? (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.1)", fontStyle: "italic" }}>—</span>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {captured.map((p, i) => (
              <img key={i} src={PIECE_IMAGES[`${p.color}-${p.type}`]} alt={p.type}
                style={{ width: 20, height: 20, objectFit: "contain" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionPanel({
  isMyTurn, check, myColor,
  selectedIsPaladin, paladanSuperUsed, superMoveMode,
  passUsed, onSuperAttack, onPass,
}: {
  isMyTurn: boolean; check: Color | null; myColor: Color;
  selectedIsPaladin: boolean; paladanSuperUsed: boolean; superMoveMode: boolean;
  passUsed: boolean; onSuperAttack: () => void; onPass: () => void;
}) {
  const inCheck = check === myColor;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{
        borderRadius: 12, padding: "11px 14px",
        background: inCheck ? "rgba(255,60,60,0.12)" : isMyTurn ? "rgba(125,189,110,0.09)" : "rgba(0,0,0,0.35)",
        border: `1px solid ${inCheck ? "rgba(255,80,80,0.3)" : isMyTurn ? "rgba(125,189,110,0.28)" : "rgba(255,255,255,0.06)"}`,
        display: "flex", alignItems: "center", gap: 10,
        animation: inCheck ? "checkFlash 1s infinite" : "none",
      }}>
        <span style={{ fontSize: 18 }}>{inCheck ? "⚠️" : isMyTurn ? "⚔️" : "⏳"}</span>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: inCheck ? "#ff8080" : isMyTurn ? "#7dbd6e" : "rgba(180,140,60,0.4)" }}>
            {inCheck ? "King in Check!" : isMyTurn ? "Your Move" : "Opponent's Turn"}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(180,140,60,0.22)" }}>
            {inCheck ? "Defend your king" : isMyTurn ? "Select a piece" : "Waiting..."}
          </p>
        </div>
      </div>

      {isMyTurn && selectedIsPaladin && (
        <button
          onClick={onSuperAttack}
          disabled={paladanSuperUsed}
          style={{
            padding: "11px 14px", borderRadius: 12, cursor: paladanSuperUsed ? "not-allowed" : "pointer",
            background: paladanSuperUsed
              ? "rgba(80,60,30,0.2)"
              : superMoveMode
              ? "rgba(255,140,0,0.25)"
              : "rgba(212,100,30,0.2)",
            border: `1px solid ${paladanSuperUsed ? "rgba(80,60,30,0.3)" : superMoveMode ? "rgba(255,140,0,0.6)" : "rgba(212,100,30,0.5)"}`,
            display: "flex", alignItems: "center", gap: 10,
            transition: "all 0.2s",
            boxShadow: superMoveMode ? "0 0 18px rgba(255,140,0,0.25)" : "none",
          }}
        >
          <span style={{ fontSize: 20 }}>⚡</span>
          <div style={{ textAlign: "left" }}>
            <p style={{
              margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              color: paladanSuperUsed ? "rgba(150,110,50,0.35)" : superMoveMode ? "#ffaa00" : "#e07830",
            }}>
              {paladanSuperUsed ? "Super Used ✗" : superMoveMode ? "Super Active!" : "Super Attack"}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: paladanSuperUsed ? "rgba(150,110,50,0.25)" : "rgba(200,130,60,0.5)" }}>
              {paladanSuperUsed ? "One-time power spent" : "2 squares — once only"}
            </p>
          </div>
        </button>
      )}

      {isMyTurn && (
        <button
          onClick={onPass}
          disabled={passUsed}
          style={{
            padding: "10px 14px", borderRadius: 12, cursor: passUsed ? "not-allowed" : "pointer",
            background: passUsed ? "rgba(40,40,40,0.2)" : "rgba(80,80,120,0.2)",
            border: `1px solid ${passUsed ? "rgba(60,60,60,0.2)" : "rgba(100,100,180,0.35)"}`,
            display: "flex", alignItems: "center", gap: 10,
            transition: "all 0.2s",
          }}
        >
          <span style={{ fontSize: 18 }}>🤝</span>
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: passUsed ? "rgba(120,120,140,0.3)" : "rgba(160,160,220,0.85)" }}>
              {passUsed ? "Pass Used ✗" : "Pass Turn"}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: passUsed ? "rgba(100,100,120,0.2)" : "rgba(120,120,180,0.45)" }}>
              {passUsed ? "Mexican standoff spent" : "Skip once — Mexican Standoff"}
            </p>
          </div>
        </button>
      )}
    </div>
  );
}

interface Props {
  myColor: Color; roomId: string; playerName: string; opponentName: string;
  onGameEnd?: (winner: Color) => void; socket?: any;
}

export default function Board8x8({ myColor, roomId, playerName, opponentName, onGameEnd, socket }: Props) {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [animatingSquare, setAnimatingSquare] = useState<Square | null>(null);
  const [showWin, setShowWin] = useState<Color | null>(null);
  const [boardPx, setBoardPx] = useState(560);
  const gsRef = useRef(gameState);
  gsRef.current = gameState;

  const isMyTurn = gameState.currentTurn === myColor;
  const opponentColor: Color = myColor === "white" ? "black" : "white";

  const selSq = gameState.selectedSquare;
  const selPiece = selSq ? gameState.board[selSq.row][selSq.col] : null;
  const selectedIsPaladin = selPiece?.type === "paladin" && selPiece.color === myColor;
  const paladanSuperUsed = selPiece?.paladanSuperUsed ?? false;
  const passUsed = gameState.passUsed[myColor];

  useEffect(() => {
    const calc = () => {
      const s = Math.min(window.innerWidth - 560, window.innerHeight - 80, 600);
      setBoardPx(Math.max(s, 280));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const sqPx = boardPx / 8;
  const FRAME = 32;
  const totalPx = boardPx + FRAME * 2;

  useEffect(() => {
    if (!socket) return;
    socket.on("game:move", ({ newState }: any) => {
      setAnimatingSquare(newState.lastMove?.to ?? null);
      setTimeout(() => setAnimatingSquare(null), 400);
      const prev = gsRef.current;
      const prevCap = prev.capturedByWhite.length + prev.capturedByBlack.length;
      const newCap = newState.capturedByWhite.length + newState.capturedByBlack.length;
      playSound(newState.status === "check" ? "check" : newCap > prevCap ? "capture" : "move");
      setGameState(newState);
      if (newState.status === "white_wins" || newState.status === "black_wins") {
        setTimeout(() => { setShowWin(newState.status === "white_wins" ? "white" : "black"); playSound("win"); }, 300);
      }
    });
    socket.on("game:state", (newState: GameState) => setGameState(newState));
    socket.on("game:chat", (msg: ChatMsg) => setChatMessages(prev => [...prev, msg]));
    return () => { socket.off("game:move"); socket.off("game:state"); socket.off("game:chat"); };
  }, [socket]);

  const handleSuperAttack = useCallback(() => {
    const gs = gsRef.current;
    if (!gs.selectedSquare) return;
    const sq = gs.selectedSquare;
    const piece = gs.board[sq.row][sq.col];
    if (!piece || piece.type !== "paladin" || piece.paladanSuperUsed) return;

    const superMoves = getLegalSuperMoves(gs.board, sq.row, sq.col);
    playSound("select");
    setGameState(prev => ({
      ...prev,
      superMoves,
      superMoveMode: true,
      validMoves: [],
    }));
  }, []);

  const handlePass = useCallback(() => {
    const gs = gsRef.current;
    if (gs.currentTurn !== myColor || gs.passUsed[myColor]) return;
    playSound("pass");
    const newState = passTurn(gs);
    setGameState(newState);
    socket?.emit("game:state", { roomId, newState });
  }, [myColor, roomId, socket]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    const gs = gsRef.current;
    if (gs.currentTurn !== myColor || gs.status === "white_wins" || gs.status === "black_wins") return;

    const { board, selectedSquare, validMoves, superMoves, superMoveMode } = gs;
    const clickedPiece = board[row][col];
    const clickedSq: Square = { row, col };

    if (superMoveMode && superMoves.some(m => squareEquals(m, clickedSq))) {
      const newState = executeMove(gs, selectedSquare!, clickedSq, true);
      setAnimatingSquare(clickedSq);
      setTimeout(() => setAnimatingSquare(null), 450);
      playSound("super");
      setGameState(newState);
      socket?.emit("game:move", { roomId, from: selectedSquare, to: clickedSq, newState });
      if (newState.status === "white_wins" || newState.status === "black_wins") {
        const winner = newState.status === "white_wins" ? "white" : "black";
        setTimeout(() => { setShowWin(winner); playSound("win"); }, 300);
        onGameEnd?.(winner);
      }
      return;
    }

    if (selectedSquare && validMoves.some(m => squareEquals(m, clickedSq))) {
      const newState = executeMove(gs, selectedSquare, clickedSq, false);
      setAnimatingSquare(clickedSq);
      setTimeout(() => setAnimatingSquare(null), 400);
      const prevCap = gs.capturedByWhite.length + gs.capturedByBlack.length;
      const newCap = newState.capturedByWhite.length + newState.capturedByBlack.length;
      playSound(newState.status === "check" ? "check" : newCap > prevCap ? "capture" : "move");
      setGameState(newState);
      socket?.emit("game:move", { roomId, from: selectedSquare, to: clickedSq, newState });
      if (newState.status === "white_wins" || newState.status === "black_wins") {
        const winner = newState.status === "white_wins" ? "white" : "black";
        setTimeout(() => { setShowWin(winner); playSound("win"); }, 300);
        onGameEnd?.(winner);
      }
      return;
    }

    if (clickedPiece?.color === myColor) {
      playSound("select");
      const legalMoves = getLegalMoves(board, row, col);
      setGameState(prev => ({
        ...prev,
        selectedSquare: clickedSq,
        validMoves: legalMoves,
        superMoves: [],
        superMoveMode: false,
      }));
      return;
    }

    setGameState(prev => ({ ...prev, selectedSquare: null, validMoves: [], superMoves: [], superMoveMode: false }));
  }, [myColor, roomId, socket, onGameEnd]);

  const handleChatSend = (text: string) => {
    const msg: ChatMsg = { sender: myColor, text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setChatMessages(prev => [...prev, msg]);
    socket?.emit("game:chat", { roomId, msg });
  };

  const boardRows = myColor === "white" ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const boardCols = myColor === "white" ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];

  return (
    <>
 <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
  * { box-sizing: border-box; }

  @keyframes pulseDot   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
  @keyframes checkFlash { 0%,100%{opacity:1} 50%{opacity:.55} }
  @keyframes dotPop     { 0%{opacity:0;transform:translate(-50%,-50%) scale(.2)} 75%{transform:translate(-50%,-50%) scale(1.18)} 100%{opacity:1;transform:translate(-50%,-50%) scale(1)} }
  @keyframes superDotPop { 0%{opacity:0;transform:translate(-50%,-50%) scale(.2)} 75%{transform:translate(-50%,-50%) scale(1.3)} 100%{opacity:1;transform:translate(-50%,-50%) scale(1)} }
  @keyframes pieceIn    { 0%{opacity:.3;transform:scale(.65) translateY(-10px)} 65%{transform:scale(1.08) translateY(1px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes superPieceIn { 0%{opacity:.2;transform:scale(.5) translateY(-15px) rotate(-5deg)} 60%{transform:scale(1.12) translateY(2px) rotate(1deg)} 100%{opacity:1;transform:scale(1) translateY(0) rotate(0)} }
  @keyframes winPulse   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.022)} }
  @keyframes fadeInUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes superGlow  { 0%,100%{box-shadow:0 0 12px rgba(255,140,0,0.5)} 50%{box-shadow:0 0 28px rgba(255,140,0,0.85)} }
  @keyframes goldenGlow { 0%,100%{box-shadow:inset 0 0 10px rgba(212,168,67,0.3)} 50%{box-shadow:inset 0 0 20px rgba(212,168,67,0.6)} }

.csq { 
  position:relative; 
  cursor:pointer; 
  overflow:visible;
  transition: filter 0.15s, background 0.15s;
  padding: 0;
  margin: 0;
  border: none;
  background: linear-gradient(135deg, #e8d4a0 0%, #d4c08f 50%, #c0a87d 100%);
}

.csq:nth-child(odd) {
  background: linear-gradient(135deg, #8b7355 0%, #6b5344 50%, #4a3a2f 100%);
}

.csq:hover { 
  filter: brightness(1.15) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
}

  .cpi {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 75%;
    height: 75%;
    transform: translate(-50%, -50%);
    object-fit: contain;
    pointer-events: none;
    z-index: 3;
    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.9)) drop-shadow(0 1px 3px rgba(0,0,0,0.7));
    transition: transform 0.15s, filter 0.15s;
    display: block;
  }
  .csq:hover .cpi {
    transform: translate(-50%, -50%) scale(1.07);
    filter: drop-shadow(0 8px 18px rgba(0,0,0,0.95)) drop-shadow(0 2px 8px rgba(212,168,67,0.45));
  }

  .super-used-badge {
    position:absolute; bottom:3px; right:3px;
    width:14px; height:14px; border-radius:50%;
    background:rgba(180,50,50,0.85); border:1px solid rgba(255,100,100,0.5);
    display:flex; align-items:center; justify-content:center;
    font-size:8px; color:#fff; font-weight:700; z-index:5;
    pointer-events:none; line-height:1;
  }

  .coord-lbl { font-family:'Cinzel',Georgia,serif; font-size:11px; color:rgba(212,168,67,0.7); user-select:none; line-height:1; font-weight:700; }
`}</style>

      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% -5%, #2a1305 0%, #0d0804 48%, #030201 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 24px", gap: 28, flexWrap: "wrap",
        fontFamily: "'Cinzel', Georgia, serif",
      }}>
        <video autoPlay loop muted playsInline
          style={{
            position: "fixed", top: 0, left: 0,
            width: "100vw", height: "100vh",
            objectFit: "cover", zIndex: 0, pointerEvents: "none",
          }}
        >
          <source src="https://www.pexels.com/download/video/10586247/" type="video/mp4" />
        </video>

        <div style={{ display:"flex", flexDirection:"column", gap:10, width:220, flexShrink:0, animation:"fadeInUp 0.4s ease" }}>
          <PlayerCard
            name={opponentName} color={opponentColor} isMe={false}
            isActive={!isMyTurn} isCheck={gameState.check === opponentColor}
            captured={myColor === "white" ? gameState.capturedByBlack : gameState.capturedByWhite}
          />
          <ActionPanel
            isMyTurn={isMyTurn} check={gameState.check} myColor={myColor}
            selectedIsPaladin={selectedIsPaladin} paladanSuperUsed={paladanSuperUsed}
            superMoveMode={gameState.superMoveMode} passUsed={passUsed}
            onSuperAttack={handleSuperAttack} onPass={handlePass}
          />
          <PlayerCard
            name={playerName} color={myColor} isMe={true}
            isActive={isMyTurn} isCheck={gameState.check === myColor}
            captured={myColor === "white" ? gameState.capturedByWhite : gameState.capturedByBlack}
          />
        </div>

        {/* ══ MODERN GOLDEN BOARD ══ */}
        <div style={{ flexShrink:0, animation:"fadeInUp 0.5s ease" }}>
  <div style={{
    position:"relative", 
    width: boardPx,
    height: boardPx,
    borderRadius:8,
    background: "linear-gradient(135deg, #d4a843 0%, #b89738 25%, #8b6f47 75%, #604a2f 100%)",
    boxShadow: "0 0 60px rgba(212,168,67,0.4), inset 0 0 40px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.8)",
    border: "8px solid",
    borderImage: "linear-gradient(135deg, #d4a843, #e8d4a0, #8b6f47) 1",
    padding: "12px",
  }}>

            {/* Row numbers - GOLDEN */}
            {boardRows.map((row, i) => (
              <div key={i} className="coord-lbl" style={{
                position:"absolute", left:"-28px", width:24, top:12+i*sqPx, height:sqPx,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>{8 - row}</div>
            ))}
            {/* Col labels - GOLDEN */}
            {boardCols.map((col, i) => (
              <div key={i} className="coord-lbl" style={{
                position:"absolute", bottom:"-28px", height:24, left:12+i*sqPx, width:sqPx,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>{String.fromCharCode(65 + col)}</div>
            ))}

{/* ── STYLISH GRID ── */}
  <div style={{
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gridTemplateRows: "repeat(8, 1fr)",
    gap: "0px",
    zIndex: 10,
    borderRadius: "4px",
    overflow: "hidden",
    boxShadow: "inset 0 0 20px rgba(0,0,0,0.4)",
  }}>
      {boardRows.map(row =>
        boardCols.map(col => {
          const piece = gameState.board[row][col];
          const sq: Square = { row, col };
          const index = (row * 8 + col);

          const isSel      = !!gameState.selectedSquare && squareEquals(gameState.selectedSquare, sq);
          const isValid    = gameState.validMoves.some(m => squareEquals(m, sq));
          const isSuper    = gameState.superMoves.some(m => squareEquals(m, sq));
          const isLF       = !!gameState.lastMove && squareEquals(gameState.lastMove.from, sq);
          const isLT       = !!gameState.lastMove && squareEquals(gameState.lastMove.to, sq);
          const isChk      = piece?.type === "king" && piece.color === gameState.check;
          const isAnim     = !!animatingSquare && squareEquals(animatingSquare, sq);
          const wasSuperAnim = isAnim && gameState.superMoveMode;

          // Alternating golden colors
          const isLightSquare = (row + col) % 2 === 0;
          const baseBg = isLightSquare 
            ? "linear-gradient(135deg, #e8d4a0 0%, #d4c08f 50%, #c0a87d 100%)"
            : "linear-gradient(135deg, #8b7355 0%, #6b5344 50%, #4a3a2f 100%)";

          let overlayBg = "";
          if (isSel)             overlayBg = "rgba(212,168,67,0.52)";
          else if (isChk)        overlayBg = "rgba(220,40,40,0.55)";
          else if (isLF || isLT) overlayBg = "rgba(212,168,67,0.35)";
          if (gameState.superMoveMode && !isSel && !isSuper) {
            overlayBg = overlayBg || "rgba(0,0,0,0.08)";
          }

          return (
            <div
              key={`${row}-${col}`}
              className="csq"
              onClick={() => handleSquareClick(row, col)}
              style={{ 
                background:baseBg,
                boxShadow: isLF || isLT ? "inset 0 0 15px rgba(212,168,67,0.4)" : "inset 0 0 5px rgba(0,0,0,0.1)",
              }}
            >
              {overlayBg && <div style={{ position:"absolute", inset:0, zIndex:1, background:overlayBg, pointerEvents:"none" }} />}

              {isSel && gameState.superMoveMode && (
                <div style={{ position:"absolute", inset:0, zIndex:2, border:"3px solid rgba(255,140,0,0.9)", borderRadius:2, animation:"superGlow 1s infinite", pointerEvents:"none" }} />
              )}
              
              {isValid && !piece && (
                <div style={{
                  position:"absolute", top:"50%", left:"50%",
                  transform:"translate(-50%,-50%)",
                  width:"28%", height:"28%", borderRadius:"50%",
                  background:"rgba(212,168,67,0.82)", 
                  boxShadow:"0 0 18px rgba(212,168,67,0.7), inset 0 0 8px rgba(255,255,255,0.4)",
                  animation:"dotPop 0.2s ease both", pointerEvents:"none", zIndex:4,
                }} />
              )}
              {isValid && piece && (
                <div style={{
                  position:"absolute", inset:2, zIndex:4,
                  border:"4px solid rgba(212,168,67,0.95)", borderRadius:3,
                  boxShadow:"inset 0 0 12px rgba(212,168,67,0.5), 0 0 12px rgba(212,168,67,0.4)",
                  animation:"dotPop 0.2s ease both", pointerEvents:"none",
                }} />
              )}

              {isSuper && !piece && (
                <div style={{
                  position:"absolute", top:"50%", left:"50%",
                  transform:"translate(-50%,-50%)",
                  width:"34%", height:"34%", borderRadius:"50%",
                  background:"rgba(255,140,0,0.85)", 
                  boxShadow:"0 0 22px rgba(255,140,0,0.8), inset 0 0 10px rgba(255,200,100,0.5)",
                  animation:"superDotPop 0.2s ease both", pointerEvents:"none", zIndex:4,
                }} />
              )}
              {isSuper && piece && (
                <div style={{
                  position:"absolute", inset:1, zIndex:4,
                  border:"4px solid rgba(255,140,0,0.95)", borderRadius:3,
                  boxShadow:"0 0 18px rgba(255,140,0,0.7), inset 0 0 12px rgba(255,200,100,0.3)",
                  animation:"superDotPop 0.2s ease both", pointerEvents:"none",
                }} />
              )}

              {piece && (
                <>
                  <img
                    src={PIECE_IMAGES[`${piece.color}-${piece.type}`]}
                    alt={`${piece.color} ${piece.type}`}
                    className="cpi"
                    style={{
                      animation: isAnim
                        ? wasSuperAnim
                          ? "superPieceIn 0.4s cubic-bezier(0.18,1,0.32,1) both"
                          : "pieceIn 0.32s cubic-bezier(0.22,1,0.36,1) both"
                        : "none",
                    }}
                  />
                  {piece.type === "paladin" && piece.paladanSuperUsed && (
                    <div className="super-used-badge">✗</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ══ RIGHT — CHAT ══ */}
        <div style={{ width:240, height:580, flexShrink:0, animation:"fadeInUp 0.4s ease" }}>
          <ChatPanel myColor={myColor} messages={chatMessages} onSend={handleChatSend} />
        </div>

        {/* ══ WIN OVERLAY ══ */}
        {showWin && (
          <div style={{
            position:"fixed", inset:0, zIndex:100,
            background:"rgba(0,0,0,0.92)", backdropFilter:"blur(18px)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <div style={{
              textAlign:"center", padding:"70px 90px", borderRadius:28,
              background:"linear-gradient(160deg, #1e1208, #2c1a08, #1e1208)",
              border:"1px solid rgba(212,168,67,0.28)",
              boxShadow:"0 0 80px rgba(212,168,67,0.15), 0 40px 100px rgba(0,0,0,0.8)",
              animation:"winPulse 2.5s ease-in-out infinite",
              fontFamily:"'Cinzel', Georgia, serif",
            }}>
              <div style={{ fontSize:84, marginBottom:22, lineHeight:1 }}>{showWin === myColor ? "👑" : "💀"}</div>
              <h1 style={{ fontFamily:"'Cinzel',Georgia,serif", fontSize:48, color:"#d4a843", margin:"0 0 10px", fontWeight:700 }}>
                {showWin === myColor ? "Victory!" : "Defeated"}
              </h1>
              <p style={{ fontSize:15, color:"rgba(212,168,67,0.5)", margin:"0 0 40px", fontStyle:"italic" }}>
                {showWin === "white" ? "White" : "Black"} Kingdom Prevails
              </p>
              <button
                onClick={() => window.location.href = "/lobby"}
                style={{ padding:"15px 48px", borderRadius:14, fontWeight:700, letterSpacing:"0.13em", textTransform:"uppercase", fontSize:12, background:"linear-gradient(135deg, #d4a843, #b87e28)", color:"#1a0d00", border:"none", cursor:"pointer", fontFamily:"'Cinzel',Georgia,serif" }}
              >← Return to Lobby</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}