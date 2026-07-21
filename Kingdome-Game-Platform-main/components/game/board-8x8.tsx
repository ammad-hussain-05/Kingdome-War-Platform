"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { GameState, Square, Color } from "@/lib/game/rules-8x8";
import {
  createInitialGameState, getLegalMoves, getLegalSuperMoves,
  executeMove, passTurn, squareEquals,
} from "@/lib/game/rules-8x8";
import Fireworks from "@/components/game/fireworks";

// ─── PIECE IMAGES ─────────────────────────────────────────────────────────────
const PIECE_IMAGES: Record<string,string> = {
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

const PIECE_NAMES: Record<string,string> = {
  king:"King", queen:"Queen", rook:"Rook", bishop:"Bishop", knight:"Knight", paladin:"Paladin"
};

// ─── SOUND ────────────────────────────────────────────────────────────────────
function snd(type: string) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const S: any = {
      select:  {freq:[520],           dur:.07, wave:"sine"},
      move:    {freq:[280,380],        dur:.1,  wave:"triangle"},
      great:   {freq:[440,550,660],    dur:.3,  wave:"sine"},
      risky:   {freq:[200,180],        dur:.2,  wave:"sawtooth"},
      capture: {freq:[220,160,100],    dur:.25, wave:"sawtooth"},
      check:   {freq:[520,640,520],    dur:.4,  wave:"square"},
      win:     {freq:[400,500,640,880],dur:.9,  wave:"sine"},
      super:   {freq:[350,700,1050],   dur:.35, wave:"sawtooth"},
      pass:    {freq:[280,240],        dur:.18, wave:"sine"},
      click:   {freq:[600],            dur:.05, wave:"sine"},
    };
    const s = S[type] || S.move;
    o.type = s.wave;
    const t = ctx.currentTime;
    s.freq.forEach((f: number, i: number) => o.frequency.setValueAtTime(f, t + i * s.dur / s.freq.length));
    g.gain.setValueAtTime(.25, t);
    g.gain.exponentialRampToValueAtTime(.001, t + s.dur);
    o.start(t); o.stop(t + s.dur);
  } catch {}
}


// ─── MOVE TOAST ───────────────────────────────────────────────────────────────
const GREAT_MSGS = ["🔥 Great Move!", "💡 Smart Strategy!", "⚡ Brilliant!", "🎯 Perfect!"];
const RISKY_MSGS = ["⚠️ Risky Move", "❌ Weak Position", "🚨 Careful!", "💀 Dangerous!"];



// STRATEGY SUGGESTIONS FUNCTION
function MoveToast({ quality, onDone }: { quality:"great"|"risky"|"normal"|null; onDone:()=>void }) {
  useEffect(() => {
    if (quality) {
      const t = setTimeout(onDone, 2200);
      return () => clearTimeout(t);
    }
  }, [quality, onDone]);

  if (!quality) return null;

  const config = {
    great: {
      text: GREAT_MSGS[Math.floor(Math.random() * GREAT_MSGS.length)],
      icon: "🔥",
      color: "#FFD700",
      bg: "rgba(255,215,0,.10)",
      border: "rgba(255,215,0,.30)",
      shadow: "0 0 18px rgba(255,215,0,.18), 0 8px 20px rgba(0,0,0,.45)",
    },
    risky: {
      text: RISKY_MSGS[Math.floor(Math.random() * RISKY_MSGS.length)],
      icon: "⚠️",
      color: "#ff8080",
      bg: "rgba(255,60,60,.10)",
      border: "rgba(255,80,80,.30)",
      shadow: "0 0 18px rgba(255,80,80,.18), 0 8px 20px rgba(0,0,0,.45)",
    },
    normal: {
      text: "✅ Safe Move",
      icon: "✅",
      color: "#7dbd6e",
      bg: "rgba(125,189,110,.10)",
      border: "rgba(125,189,110,.30)",
      shadow: "0 0 18px rgba(125,189,110,.16), 0 8px 20px rgba(0,0,0,.45)",
    },
  }[quality];

  return (
    <div
      style={{
        width: "100%",
        minHeight: 56,
        borderRadius: 16,
        padding: "11px 13px",
        background: config.bg,
        border: `1px solid ${config.border}`,
        boxShadow: config.shadow,
        display: "flex",
        alignItems: "center",
        gap: 11,
        animation: "fadeInUp .25s cubic-bezier(.22,1,.36,1) both",
        backdropFilter: "blur(12px)",
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 11,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,.28)",
          border: `1px solid ${config.border}`,
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {config.icon}
      </span>

      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 800,
            color: config.color,
            letterSpacing: ".09em",
            textTransform: "uppercase",
            fontFamily: "'Cinzel',Georgia,serif",
          }}
        >
          {config.text}
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 10, color: "rgba(230,210,170,.38)" }}>
          Strategy feedback
        </p>
      </div>
    </div>
  );
}
// ─── CHAT ─────────────────────────────────────────────────────────────────────
interface ChatMsg { sender:string; text:string; time:string }

function ChatPanel({ myColor, messages, onSend }: { myColor:Color; messages:ChatMsg[]; onSend:(t:string)=>void }) {
  const [input, setInput] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);
  const send = () => { if (!input.trim()) return; onSend(input.trim()); setInput(""); };
  const ac = myColor === "white" ? "#e8dfc0" : "#c8a96e";
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"rgba(6,4,2,.92)", borderRadius:18, border:`1px solid ${ac}18`, backdropFilter:"blur(20px)", overflow:"hidden", boxShadow:`0 8px 32px rgba(0,0,0,.6),inset 0 1px 0 ${ac}10` }}>
      <div style={{ padding:"13px 16px", borderBottom:`1px solid ${ac}12`, background:`${ac}06`, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ width:7, height:7, borderRadius:"50%", background:ac, boxShadow:`0 0 8px ${ac}80`, display:"inline-block" }} />
        <span style={{ fontSize:11, color:`${ac}cc`, fontWeight:700, letterSpacing:".18em", textTransform:"uppercase", fontFamily:"'Cinzel',Georgia,serif" }}>Battle Chat</span>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"10px 12px", display:"flex", flexDirection:"column", gap:6 }}>
        {messages.length === 0 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:6 }}>
            <span style={{ fontSize:22, opacity:.12 }}>💬</span>
            <p style={{ fontSize:11, color:"rgba(255,255,255,.1)", textAlign:"center", fontStyle:"italic", margin:0 }}>No messages yet...</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender === myColor;
          const mac = msg.sender === "white" ? "#e8dfc0" : "#c8a96e";
          return (
            <div key={i} style={{ padding:"8px 12px", borderRadius:isMe?"12px 12px 3px 12px":"12px 12px 12px 3px", background:isMe?`${mac}15`:"rgba(255,255,255,.04)", border:`1px solid ${isMe?mac+"22":"rgba(255,255,255,.05)"}`, alignSelf:isMe?"flex-end":"flex-start", maxWidth:"92%" }}>
              <p style={{ fontSize:9, color:`${mac}75`, margin:"0 0 2px", textTransform:"uppercase", letterSpacing:".08em" }}>{msg.sender} · {msg.time}</p>
              <p style={{ fontSize:12, color:"#e8d8b0", margin:0, lineHeight:1.4 }}>{msg.text}</p>
            </div>
          );
        })}
        <div ref={ref} />
      </div>
      <div style={{ padding:"8px 10px", borderTop:`1px solid ${ac}12`, display:"flex", gap:6 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a message..."
          style={{ flex:1, padding:"8px 12px", borderRadius:9, background:"rgba(0,0,0,.5)", border:`1px solid ${ac}20`, color:"#e8d8b0", fontSize:12, outline:"none" }} />
        <button onClick={send} style={{ width:34, height:34, borderRadius:9, background:`${ac}22`, border:`1px solid ${ac}38`, color:ac, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>→</button>
      </div>
    </div>
  );
}

// ─── PLAYER CARD ──────────────────────────────────────────────────────────────
function PlayerCard({ name, color, isMe, isActive, isCheck, captured }: {
  name: string;
  color: "white" | "black";
  isMe: boolean;
  isActive: boolean;
  isCheck: boolean;
  captured: { color: "white" | "black"; type: string }[];
}) {
  const ac = color === "white" ? "#e8dfc0" : "#4a2e1a"; // Pure white or black
  const gl = color === "white" ? "#f0f0f0" : "#3a1d12"; // Light gray or deep brown for shadow

  return (
    <div
      style={{
        borderRadius: 16,
        padding: "16px 18px",
        background: isMe ? `${ac}90` : color, // Full white or black
        border: `1px solid ${isMe ? ac : color === "white" ? "#e8dfc0" : "#4a2e1a"}`,
        backdropFilter: "blur(12px)",
        boxShadow: isActive && !isCheck ? `0 0 20px ${gl}` : "none",
        transition: "all .3s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: captured.length > 0 ? 12 : 0 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: color === "white" ? "#ffffff" : "#000000", // Pure white or black
            border: `2px solid ${color === "white" ? "#c8bfa0" : "#3a1d12"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            boxShadow: isActive ? `0 0 12px ${gl}` : "none",
            transition: "all .3s",
          }}
        >
          {color === "white" ? "♔" : "♚"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 15, // Larger font size
              fontWeight: 700,
              color: isMe ? ac : color === "white" ? "#c8bfa0" : "#e8dfc0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name} {isMe && "(You)"}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: isCheck ? "#ff8080" : color === "white" ? "#c8bfa0" : "#e8dfc0",
              textTransform: "uppercase",
              letterSpacing: ".1em",
            }}
          >
            {isCheck ? "CHECK" : color}
          </p>
        </div>
        {isCheck && (
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 7,
              background: "rgba(255,80,80,.15)",
              border: "1px solid rgba(255,80,80,.35)",
              fontSize: 12,
              color: "#ff8080",
              fontWeight: 700,
              animation: "checkFlash 1s infinite",
              flexShrink: 0,
            }}
          >
            CHECK
          </div>
        )}
      </div>
      {captured.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {captured.slice(0, 10).map((p, i) => (
            <img
              key={i}
              src={PIECE_IMAGES[`${p.color}-${p.type}`]}
              alt={p.type}
              style={{ width: 20, height: 20, objectFit: "contain", filter: "drop-shadow(0 1px 3px rgba(0,0,0,.8))" }}
            />
          ))}
          {captured.length > 10 && (
            <span style={{ fontSize: 12, color: `${ac}80` }}>+{captured.length - 10}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ACTION PANEL ─────────────────────────────────────────────────────────────
function ActionPanel({ isMyTurn, check, myColor, selectedIsPaladin, paladanSuperUsed, superMoveMode, passUsed, onSuperAttack, onPass, turnTimer, onTimerExpire }: {
  
  isMyTurn:boolean; check:Color|null; myColor:Color;
  selectedIsPaladin:boolean; paladanSuperUsed:boolean; superMoveMode:boolean;
  passUsed:boolean; onSuperAttack:()=>void; onPass:()=>void;
   turnTimer: number;  // Type for turnTimer
   onTimerExpire: () => void;  // Type for onTimerExpire
  
}) {
  console.log("isMyTurn:", isMyTurn);
  const inCheck = check === myColor;
  const ac = myColor === "white" ? "#e8dfc0" : "#c8a96e";

   // Timer handling within the component for visual display
  const [timer, setTimer] = useState(turnTimer);

// 🔥 NEW: reset timer when turn changes
useEffect(() => {
  if (!isMyTurn) return;

  const interval = setInterval(() => {
    setTimer((prev) => {
      if (prev <= 1) {
        clearInterval(interval);
        onTimerExpire(); // 🔥 turn pass
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(interval);
}, [isMyTurn]);
  
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {/* Turn status */}
      <div style={{ borderRadius:12, padding:"11px 14px", display:"flex", alignItems:"center", gap:10, transition:"all .3s",
        background: inCheck ? "rgba(255,60,60,.1)" : isMyTurn ? "rgba(125,189,110,.09)" : "rgba(0,0,0,.35)",
        border: `1px solid ${inCheck ? "rgba(255,80,80,.3)" : isMyTurn ? "rgba(125,189,110,.28)" : "rgba(255,255,255,.06)"}`,
        boxShadow: isMyTurn && !inCheck ? "0 0 20px rgba(125,189,110,.12)" : "none",
        animation: inCheck ? "checkFlash 1s infinite" : "none",
      }}>
        <span style={{ fontSize:18 }}>{inCheck ? "⚠️" : isMyTurn ? "⚔️" : "⏳"}</span>
        <div>
          <p style={{ margin:0, fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color: inCheck ? "#ff8080" : isMyTurn ? "#7dbd6e" : "rgba(180,140,60,.4)" }}>
            {inCheck ? "King in Check!" : isMyTurn ? "Your Move" : "Opponent's Turn"}
          </p>
          <p style={{ margin:"2px 0 0", fontSize:10, color:"rgba(180,140,60,.22)" }}>
            {inCheck ? "Defend your king" : isMyTurn ? "Select a piece" : "Waiting..."}
          </p>
        </div>
      </div>

         {/* Timer display */}
      {isMyTurn && (
  <div
    style={{
      marginTop: 10,
      fontSize: 18,
      fontWeight: 700,
      color: timer <= 5 ? "red" : "#ffdb4d"
    }}
  >
    Time Remaining: {timer}s
  </div>
)}

      {/* Super Attack */}
     {/* Paladin Super Attack */}
{isMyTurn && selectedIsPaladin && (
  <button
    onClick={() => {
      if (paladanSuperUsed) return;
      onSuperAttack();
    }}
    style={{
      width: "100%",
      minHeight: 58,
      padding: "12px 14px",
      borderRadius: 16,
      cursor: paladanSuperUsed ? "default" : "pointer",
     background: paladanSuperUsed
  ? "linear-gradient(135deg, rgba(42,32,18,0.9), rgba(120,15,8,0.95))"
  : superMoveMode
  ? "linear-gradient(135deg, rgba(255,140,0,0.75), rgba(90,45,0,0.85))"
  : "linear-gradient(135deg, rgba(255,160,35,0.65), rgba(80,42,8,0.75))",
      border: `1px solid ${
        paladanSuperUsed
          ? "rgba(120,90,45,.20)"
          : superMoveMode
          ? "rgba(255,160,40,.75)"
          : "rgba(255,170,60,.42)"
      }`,
     
      display: "flex",
      alignItems: "center",
      gap: 12,
      transition: "all .2s",
      opacity: paladanSuperUsed ? .62 : 1,
      position: "relative",
      overflow: "hidden",
    }}
  >
    <span
      style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        background: paladanSuperUsed
          ? "rgba(255,255,255,.05)"
          : "rgba(255,160,35,.16)",
        border: "1px solid rgba(255,200,120,.14)",
        flexShrink: 0,
      }}
    >
      ⚡
    </span>

    <div style={{ textAlign: "left", minWidth: 0 }}>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: paladanSuperUsed
            ? "rgba(170,130,70,.42)"
            : superMoveMode
            ? "#ffb347"
            : "#ffc46b",
        }}
      >
        {paladanSuperUsed ? "Super Used" : superMoveMode ? "Super Active" : "Super Attack"}
      </p>

      <p
        style={{
          margin: "3px 0 0",
          fontSize: 10,
          color: paladanSuperUsed
            ? "rgba(170,130,70,.28)"
            : "rgba(255,195,110,.50)",
        }}
      >
        {paladanSuperUsed
          ? "One-time power spent"
          : "Paladin 2-square strike"}
      </p>
    </div>
  </button>
)}

      {/* Pass Turn button css */}
    
<button
  onClick={() => {
    if (!isMyTurn || passUsed) return;
    onPass(); // This function should handle passing the turn
  }}
  style={{
    width: "100%",
    minHeight: 58,
    padding: "12px 14px",
    borderRadius: 16,
    cursor: isMyTurn && !passUsed ? "pointer" : "default",
    background: passUsed
  ? "#000000"   // pure black
  : "#1f1f1f",  // dark grey
    border: "1px solid #7f4e7b", // Border matches button color
    boxShadow: "none",  // No shadow effect
    display: "flex",
    alignItems: "center",
    gap: 12,
    transition: "all .2s",
    opacity: passUsed ? 0.72 : 1,
    position: "relative",
    overflow: "hidden",
  }}
>
  <span
    style={{
      width: 34,
      height: 34,
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 18,
      background: passUsed
  ? "#000000"  // black when pass is used
  : "#000000", // black when it's my turn
      border: "1px solid #7f4e7b", // Border matches button color
      flexShrink: 0,
    }}
  >
    🤝
  </span>

  <div style={{ textAlign: "left", minWidth: 0 }}>
    <p
      style={{
        margin: 0,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: ".12em",
        textTransform: "uppercase",
        color: passUsed ? "#ddd" : "#fff", // White text when active, gray when pass used
      }}
    >
      {passUsed ? "Pass Used" : "Pass Turn"}
    </p>
    <p
      style={{
        margin: "3px 0 0",
        fontSize: 10,
        color: passUsed ? "#aaa" : "#ccc", // Lighter text for secondary info
      }}
    >
      {passUsed
        ? "Mexican Standoff spent"
        : isMyTurn
        ? "Skip once this match"
        : "Available on your turn"}
    </p>
  </div>
</button>

    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
interface Props {
  myColor:Color; roomId:string; playerName:string; opponentName:string;
  onGameEnd?:(winner:Color)=>void; socket?:any;
}

export default function Board8x8({ myColor, roomId, playerName, opponentName, onGameEnd, socket }: Props) {
  const [gs, setGs] = useState<GameState>(createInitialGameState());
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [animSq, setAnimSq] = useState<Square | null>(null);
  const [showWin, setShowWin] = useState<Color | null>(null);
  const [boardPx, setBoardPx] = useState(520);
  const [toast, setToast] = useState<"great"|"risky"|"normal"|null>(null);
  const [greatSq, setGreatSq] = useState<Square | null>(null);
  const [riskySq, setRiskySq] = useState<Square | null>(null);
  const gsRef = useRef(gs);
  const [isMobile, setIsMobile] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  useEffect(() => { gsRef.current = gs; }, [gs]);



  const isMyTurn = gs.currentTurn === myColor;
  const opponentColor: Color = myColor === "white" ? "black" : "white";
  const selSq = gs.selectedSquare;
  const selPiece = selSq ? gs.board[selSq.row][selSq.col] : null;
  const selectedIsPaladin = selPiece?.type === "paladin" && selPiece.color === myColor;
  const paladanSuperUsed = selPiece?.paladanSuperUsed ?? false;
  const passUsed = gs.passUsed[myColor];

 useEffect(() => {
  const calc = () => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);

    // Subtracted amounts account for the actual layout chrome around the
    // board (container padding + side panels + gaps + wood frame) so the
    // board never computes wider than the space actually available to it.
    const s = mobile
      ? Math.min(window.innerWidth - 96, window.innerHeight - 240, 380)
      : Math.min(window.innerWidth - 640, window.innerHeight - 80, 580);

    setBoardPx(Math.max(s, 300));
  };

  calc();
  window.addEventListener("resize", calc);
  return () => window.removeEventListener("resize", calc);
}, []);

  const sqPx = boardPx / 8;
  const FRAME = 28;

  // Show move quality feedback
  const showFeedback = (ns: GameState, to: Square) => {
    const q = ns.lastMoveQuality;
    if (q === "great") { setGreatSq(to); snd("great"); setTimeout(() => setGreatSq(null), 1600); }
    else if (q === "risky") { setRiskySq(to); snd("risky"); setTimeout(() => setRiskySq(null), 1600); }
    setToast(q);
  };

  // ─── SOCKET ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.on("game:move", ({ newState }: any) => {
      if (newState.lastMove) { setAnimSq(newState.lastMove.to); setTimeout(() => setAnimSq(null), 420); }
      const prev = gsRef.current;
      const prevCap = prev.capturedByWhite.length + prev.capturedByBlack.length;
      const newCap = newState.capturedByWhite.length + newState.capturedByBlack.length;
      snd(newCap > prevCap ? "capture" : "move"); 
      setGs(newState);
      if (newState.status === "white_wins" || newState.status === "black_wins") {
        const winner = newState.status === "white_wins" ? "white" : "black";
        setTimeout(() => { setShowWin(winner); snd("win"); }, 300);
      }
    });
    socket.on("game:state", (ns: GameState) => setGs(ns));
    socket.on("game:chat", (msg: ChatMsg) => setChat(p => [...p, msg]));
    socket.on("game:quit", ({ winner, newState }: any) => {
  setGs(newState);
  setShowQuitConfirm(false);
  setTimeout(() => {
    setShowWin(winner);
    snd("win");
  }, 250);
});
    return () => {
  socket.off("game:move");
  socket.off("game:state");
  socket.off("game:chat");
  socket.off("game:quit");
};
  }, [socket]);


  // ─── SUPER ATTACK ────────────────────────────────────────────────────────
  const handleSuperAttack = useCallback(() => {
    const state = gsRef.current;
    if (!state.selectedSquare) return;
    const { row, col } = state.selectedSquare;
    const piece = state.board[row][col];
    if (!piece || piece.type !== "paladin" || piece.paladanSuperUsed) return;
    const superMoves = getLegalSuperMoves(state.board, row, col);
    snd("select");
    setGs(prev => ({ ...prev, superMoves, superMoveMode:true, validMoves:[] }));
  }, []);

  // ─── PASS TURN TO OPPONENT────────────────────────────────────────────────────────────
  const handlePass = useCallback(() => {
  const state = gsRef.current;

  if (state.currentTurn !== myColor || state.passUsed[myColor]) return;

  snd("pass");

  const ns = passTurn(state);

  setGs(ns);

  socket?.emit("game:move", {
    roomId,
    from: null,
    to: null,
    newState: ns,
    action: "pass",
  });
}, [myColor, roomId, socket]);

  const handleQuit = useCallback(() => {
  const winner: Color = myColor === "white" ? "black" : "white";

  const ns: GameState = {
    ...gsRef.current,
    status: winner === "white" ? "white_wins" : "black_wins",
    check: null,
    selectedSquare: null,
    validMoves: [],
    superMoves: [],
    superMoveMode: false,
  };

  setShowQuitConfirm(false);
  setGs(ns);
  setShowWin(winner);
  snd("win");

  socket?.emit("game:quit", {
    roomId,
    quitter: myColor,
    winner,
    newState: ns,
  });

  onGameEnd?.(winner);
}, [myColor, roomId, socket, onGameEnd]);

  // ─── CLICK ────────────────────────────────────────────────────────────────
  const handleClick = useCallback((row: number, col: number) => {
    const state = gsRef.current;
    if (state.currentTurn !== myColor || state.status === "white_wins" || state.status === "black_wins") return;
    const { board, selectedSquare, validMoves, superMoves, superMoveMode } = state;
    const cp = board[row][col];
    const clickedSq: Square = { row, col };
    snd("click");

    // Super move
    if (superMoveMode && superMoves.some(m => squareEquals(m, clickedSq))) {
      const ns = executeMove(state, selectedSquare!, clickedSq, true);
      setAnimSq(clickedSq); setTimeout(() => setAnimSq(null), 450);
      snd("super");
      setGs(ns);
      socket?.emit("game:move", { roomId, from:selectedSquare, to:clickedSq, newState:ns });
      if (ns.status === "white_wins" || ns.status === "black_wins") {
        const winner = ns.status === "white_wins" ? "white" : "black";
        setTimeout(() => { setShowWin(winner); snd("win"); }, 300);
        onGameEnd?.(winner);
      }
      return;
    }

    // Normal move
    if (selectedSquare && validMoves.some(m => squareEquals(m, clickedSq))) {
      const ns = executeMove(state, selectedSquare, clickedSq, false);
      setAnimSq(clickedSq); setTimeout(() => setAnimSq(null), 420);
      const prevCap = state.capturedByWhite.length + state.capturedByBlack.length;
      const newCap = ns.capturedByWhite.length + ns.capturedByBlack.length;
      snd(newCap > prevCap ? "capture" : "move");
      showFeedback(ns, clickedSq);
      setGs(ns);
      socket?.emit("game:move", { roomId, from:selectedSquare, to:clickedSq, newState:ns });
      if (ns.status === "white_wins" || ns.status === "black_wins") {
        const winner = ns.status === "white_wins" ? "white" : "black";
        setTimeout(() => { setShowWin(winner); snd("win"); }, 300);
        onGameEnd?.(winner);
      }
      return;
    }

    // Select own piece
    if (cp?.color === myColor) {
      snd("select");
      setGs(prev => ({
        ...prev,
        selectedSquare: clickedSq,
        validMoves: getLegalMoves(board, row, col),
        superMoves: [], superMoveMode: false,
      }));
      return;
    }

    // Deselect
    setGs(prev => ({ ...prev, selectedSquare:null, validMoves:[], superMoves:[], superMoveMode:false }));
  }, [myColor, roomId, socket, onGameEnd]);

  const sendChat = (text: string) => {
    const msg: ChatMsg = { sender:myColor, text, time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) };
    setChat(p => [...p, msg]);
    socket?.emit("game:chat", { roomId, msg });
  };

  const boardRows = myColor === "white" ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const boardCols = myColor === "white" ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];

  // Square colors — dark elegant theme
  const lightSq = "#c9a96e";  // warm gold
  const darkSq  = "#4a2e1a";  // deep walnut

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        *{box-sizing:border-box;}
        @keyframes pulseDot   {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
        @keyframes checkFlash {0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes dotPop     {0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}80%{transform:translate(-50%,-50%) scale(1.2)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes superDotPop{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}80%{transform:translate(-50%,-50%) scale(1.3)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
     @keyframes pieceIn {
  0% {
    opacity: .3;
    transform: translate(-50%, -50%) scale(.65) translateY(-10px);
  }
  65% {
    transform: translate(-50%, -50%) scale(1.08) translateY(1px);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) translateY(0);
  }
}

@keyframes superIn {
  0% {
    opacity: .2;
    transform: translate(-50%, -50%) scale(.5) translateY(-16px) rotate(-5deg);
  }
  60% {
    transform: translate(-50%, -50%) scale(1.12) translateY(2px) rotate(1deg);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) translateY(0) rotate(0);
  }
}
        @keyframes winPulse   {0%,100%{transform:scale(1)}50%{transform:scale(1.022)}}
        @keyframes fadeInUp   {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn     {from{opacity:0}to{opacity:1}}
        @keyframes toastIn    {from{opacity:0;transform:translateX(-50%) translateY(-18px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes superGlow  {0%,100%{box-shadow:0 0 10px rgba(255,140,0,.5)}50%{box-shadow:0 0 25px rgba(255,140,0,.9)}}
        @keyframes greatPulse {0%,100%{box-shadow:inset 0 0 0 2px rgba(255,215,0,.5)}50%{box-shadow:inset 0 0 0 2px rgba(255,215,0,1),0 0 20px rgba(255,215,0,.4)}}
        @keyframes riskyPulse {0%,100%{box-shadow:inset 0 0 0 2px rgba(255,60,60,.5)}50%{box-shadow:inset 0 0 0 2px rgba(255,60,60,1),0 0 20px rgba(255,60,60,.4)}}
        .csq{position:relative;overflow:hidden;cursor:pointer;transition:filter .1s;}
        .csq:hover{filter:brightness(1.2);}
        .csq:hover .cpi{transform:translate(-50%,-50%) scale(1.07) translateY(-2px);filter:drop-shadow(0 8px 18px rgba(0,0,0,.95)) drop-shadow(0 2px 8px rgba(212,168,67,.5));}
        .cpi{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:78%;height:78%;object-fit:contain;pointer-events:none;z-index:3;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,.9)) drop-shadow(0 1px 3px rgba(0,0,0,.7));transition:transform .15s,filter .15s;}
        .sup-badge{position:absolute;bottom:3px;right:3px;width:13px;height:13px;border-radius:50%;background:rgba(180,50,50,.85);border:1px solid rgba(255,100,100,.5);display:flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:700;z-index:5;pointer-events:none;}
      `}</style>

      <video autoPlay loop muted playsInline
          style={{
            position: "fixed", top: 0, left: 0,
            width: "100vw", height: "100vh",
            objectFit: "cover", zIndex: 0, pointerEvents: "none",
          }}
        >
          <source src="https://www.pexels.com/download/video/10586247/" type="video/mp4" />
        </video>


  <div
  style={{
    minHeight: "100vh",
    background: "radial-gradient(ellipse at 50% -5%,#1c0f04 0%,#080503 50%,#020101 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: isMobile ? "115px 16px 24px" : "20px 24px",
    marginTop: 0,
    gap: 24,
    flexWrap: "wrap",
    fontFamily: "'Cinzel',Georgia,serif",
  }}
>

        {/* ── LEFT PANEL ── */}
 <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: 215,
    minWidth: 215,
    flexShrink: 0,
    animation: "fadeInUp .4s ease",
  }}
>
          <PlayerCard name={opponentName} color={opponentColor} isMe={false} isActive={!isMyTurn} isCheck={gs.check===opponentColor} captured={myColor==="white"?gs.capturedByBlack:gs.capturedByWhite}/>
          <ActionPanel isMyTurn={isMyTurn} check={gs.check} myColor={myColor} selectedIsPaladin={selectedIsPaladin} paladanSuperUsed={paladanSuperUsed} superMoveMode={gs.superMoveMode} passUsed={passUsed} onSuperAttack={handleSuperAttack} onPass={handlePass}  turnTimer={30} onTimerExpire={handlePass} />
           <MoveToast quality={toast} onDone={() => setToast(null)} />
          <PlayerCard name={playerName} color={myColor} isMe={true} isActive={isMyTurn} isCheck={gs.check===myColor} captured={myColor==="white"?gs.capturedByWhite:gs.capturedByBlack}/>
           <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
    marginTop: 8,
    zIndex: 20,
    position: "relative",
  }}
>
  <button
    onClick={() => setShowRules(true)}
    style={{
      width: "100%",
      height: 50,
      background: "#080a08",
      color: "#4ade80",
      border: "1px solid rgba(74,222,128,.35)",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      display: "block",
      letterSpacing: ".1em",
      textTransform: "uppercase",
      fontFamily: "'Cinzel',Georgia,serif",
      boxShadow: "0 0 18px rgba(74,222,128,.25), 0 4px 16px rgba(0,0,0,.7), inset 0 1px 0 rgba(74,222,128,.15)",
      transition: "all .2s",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = "rgba(74,222,128,.08)";
      e.currentTarget.style.boxShadow = "0 0 28px rgba(74,222,128,.4), 0 4px 20px rgba(0,0,0,.8), inset 0 1px 0 rgba(74,222,128,.2)";
      e.currentTarget.style.borderColor = "rgba(74,222,128,.6)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = "#080a08";
      e.currentTarget.style.boxShadow = "0 0 18px rgba(74,222,128,.25), 0 4px 16px rgba(0,0,0,.7), inset 0 1px 0 rgba(74,222,128,.15)";
      e.currentTarget.style.borderColor = "rgba(74,222,128,.35)";
    }}
  >
     Game Rules
  </button>

  <button
    onClick={() => setShowQuitConfirm(true)}
    style={{
      width: "100%",
      height: 50,
      background: "#080808",
      color: "#f87171",
      border: "1px solid rgba(248,113,113,.3)",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      display: "block",
      letterSpacing: ".1em",
      textTransform: "uppercase",
      fontFamily: "'Cinzel',Georgia,serif",
      boxShadow: "0 0 18px rgba(248,113,113,.2), 0 4px 16px rgba(0,0,0,.7), inset 0 1px 0 rgba(248,113,113,.1)",
      transition: "all .2s",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = "rgba(248,113,113,.07)";
      e.currentTarget.style.boxShadow = "0 0 28px rgba(248,113,113,.35), 0 4px 20px rgba(0,0,0,.8), inset 0 1px 0 rgba(248,113,113,.15)";
      e.currentTarget.style.borderColor = "rgba(248,113,113,.55)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = "#080808";
      e.currentTarget.style.boxShadow = "0 0 18px rgba(248,113,113,.2), 0 4px 16px rgba(0,0,0,.7), inset 0 1px 0 rgba(248,113,113,.1)";
      e.currentTarget.style.borderColor = "rgba(248,113,113,.3)";
    }}
  >
    Quit Game
  </button>
</div>
        </div>

        {/* ── BOARD ── */}
        <div style={{ flexShrink:0, animation:"fadeInUp .5s ease" }}>
          {/* Outer frame */}
          <div style={{
            position:"relative",
            width: boardPx + FRAME * 2,
            height: boardPx + FRAME * 2,
            borderRadius: 16,
            // Deep mahogany wood frame with gold inlay
            background: "linear-gradient(145deg,#3d1f08,#1e0e04,#0e0702,#1e0e04,#3d1f08)",
            boxShadow: [
              "0 0 0 1px rgba(60,35,5,.95)",
              "0 0 0 3px rgba(212,168,67,.45)",
              "0 0 0 5px rgba(40,20,3,.98)",
              "0 0 0 6px rgba(212,168,67,.15)",
              "0 0 70px rgba(212,168,67,.12)",
              "0 30px 90px rgba(0,0,0,.98)",
              "inset 0 1px 0 rgba(212,168,67,.25)",
              "inset 0 -1px 0 rgba(0,0,0,.8)",
            ].join(","),
          }}>
            {/* Gold inner border lines */}
            <div style={{ position:"absolute", top:FRAME-3, left:FRAME-3, right:FRAME-3, bottom:FRAME-3, borderRadius:6, border:"1px solid rgba(212,168,67,.3)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", top:FRAME-1, left:FRAME-1, right:FRAME-1, bottom:FRAME-1, borderRadius:5, border:"1px solid rgba(212,168,67,.12)", pointerEvents:"none" }} />

            {/* Corner ornaments */}
            {[{top:7,left:7},{top:7,right:7},{bottom:7,left:7},{bottom:7,right:7}].map((pos,i) => (
              <div key={i} style={{ position:"absolute", ...pos as any, width:14, height:14, background:"rgba(212,168,67,.18)", border:"2px solid rgba(212,168,67,.6)", borderRadius:2, transform:"rotate(45deg)", boxShadow:"0 0 8px rgba(212,168,67,.3)" }} />
            ))}
            {/* Side ornament lines */}
            <div style={{ position:"absolute", top:"50%", left:4, transform:"translateY(-50%)", width:12, height:40, borderRadius:6, background:"linear-gradient(to bottom,transparent,rgba(212,168,67,.3),transparent)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", top:"50%", right:4, transform:"translateY(-50%)", width:12, height:40, borderRadius:6, background:"linear-gradient(to bottom,transparent,rgba(212,168,67,.3),transparent)", pointerEvents:"none" }} />

            {/* Row numbers */}
            {boardRows.map((row, i) => (
              <div key={i} style={{ position:"absolute", left:0, width:FRAME, top:FRAME+i*sqPx, height:sqPx, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"rgba(212,168,67,.55)", fontFamily:"'Cinzel',Georgia,serif", fontWeight:600 }}>
                {8 - row}
              </div>
            ))}
            {/* Col labels */}
            {boardCols.map((col, i) => (
              <div key={i} style={{ position:"absolute", bottom:0, height:FRAME, left:FRAME+i*sqPx, width:sqPx, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"rgba(212,168,67,.55)", fontFamily:"'Cinzel',Georgia,serif", fontWeight:600 }}>
                {String.fromCharCode(65 + col)}
              </div>
            ))}

            {/* ── GRID ── */}
            <div style={{ position:"absolute", top:FRAME, left:FRAME, width:boardPx, height:boardPx, display:"grid", gridTemplateColumns:`repeat(8,${sqPx}px)`, gridTemplateRows:`repeat(8,${sqPx}px)`, borderRadius:4, overflow:"hidden", border:"1px solid rgba(0,0,0,.9)", boxShadow:"inset 0 0 40px rgba(0,0,0,.5)" }}>
              {boardRows.map(row => boardCols.map(col => {
                const piece = gs.board[row][col];
                const sq = { row, col };
                const isLight = (row + col) % 2 === 0;

                const isSel   = !!gs.selectedSquare && squareEquals(gs.selectedSquare, sq);
                const isValid = gs.validMoves.some(m => squareEquals(m, sq));
                const isSuper = gs.superMoves.some(m => squareEquals(m, sq));
                const isLF    = !!gs.lastMove && squareEquals(gs.lastMove.from, sq);
                const isLT    = !!gs.lastMove && squareEquals(gs.lastMove.to, sq);
                const isChk   = piece?.type === "king" && piece.color === gs.check;
                const isAnim  = !!animSq && squareEquals(animSq, sq);
                const isGreat = !!greatSq && squareEquals(greatSq, sq);
                const isRisky = !!riskySq && squareEquals(riskySq, sq);

                const baseBg = isLight ? lightSq : darkSq;
                let ov = "";
                if (isSel)            ov = "rgba(212,168,67,.55)";
                else if (isChk)       ov = "rgba(220,40,40,.6)";
                else if (isGreat)     ov = "rgba(255,215,0,.22)";
                else if (isRisky)     ov = "rgba(255,60,60,.22)";
                else if (isLF || isLT) ov = "rgba(212,168,67,.25)";
                if (gs.superMoveMode && !isSel && !isSuper) ov = ov || "rgba(0,0,0,.08)";

                return (
               <div
  key={`${row}-${col}`}
  className="csq"
  onClick={() => handleClick(row, col)}
  style={{
    width: sqPx,
    height: sqPx,
    background: baseBg,
    position: "relative",   // 🔥 MUST
    overflow: "hidden",     // 🔥 MUST
  }}
>
                    {/* Texture overlay */}
                    <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", background: isLight ? "linear-gradient(135deg,rgba(255,255,255,.12) 0%,transparent 50%)" : "linear-gradient(135deg,rgba(255,255,255,.05) 0%,rgba(0,0,0,.2) 100%)" }} />

                    {ov && <div style={{ position:"absolute", inset:0, zIndex:1, background:ov, pointerEvents:"none" }} />}

                    {/* Super mode selected glow */}
                    {isSel && gs.superMoveMode && <div style={{ position:"absolute", inset:0, zIndex:2, border:"3px solid rgba(255,140,0,.9)", borderRadius:2, animation:"superGlow 1s infinite", pointerEvents:"none" }} />}

                    {/* Great/risky pulse */}
                    {isGreat && <div style={{ position:"absolute", inset:0, zIndex:2, borderRadius:2, animation:"greatPulse 1s infinite", pointerEvents:"none" }} />}
                    {isRisky && <div style={{ position:"absolute", inset:0, zIndex:2, borderRadius:2, animation:"riskyPulse 1s infinite", pointerEvents:"none" }} />}

                    {/* Valid dot */}
                    {isValid && !piece && <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:sqPx*.3, height:sqPx*.3, borderRadius:"50%", background:"rgba(212,168,67,.75)", boxShadow:"0 0 16px rgba(212,168,67,.6)", animation:"dotPop .15s ease both", pointerEvents:"none", zIndex:4 }} />}
                    {isValid && piece && (
  <div
    style={{
      position: "absolute",
      top: 4,
      left: 4,
      right: 4,
      bottom: 4,
      zIndex: 4,
      borderRadius: 6,
      boxSizing: "border-box",   // 🔥 IMPORTANT
      border: "3px solid rgba(212,168,67,.9)",
      pointerEvents: "none",
    }}
  />
)}

                    {/* Super dot */}
                    {isSuper && !piece && <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:sqPx*.35, height:sqPx*.35, borderRadius:"50%", background:"rgba(255,140,0,.82)", boxShadow:"0 0 20px rgba(255,140,0,.7)", animation:"superDotPop .15s ease both", pointerEvents:"none", zIndex:4 }} />}
              {isSuper && piece && (
  <div
    style={{
      position: "absolute",
      top: 4,
      left: 4,
      right: 4,
      bottom: 4,
      zIndex: 4,
      borderRadius: 6,
      boxSizing: "border-box",
      border: "3px solid rgba(255,140,0,.95)",
      pointerEvents: "none",
    }}
  />
)}

                    {/* Piece */}
                    {piece && (
                      <>
                        <img src={PIECE_IMAGES[`${piece.color}-${piece.type}`]} alt={`${piece.color} ${piece.type}`} className="cpi"
                          style={{ animation: isAnim ? (gs.superMoveMode ? "superIn .4s cubic-bezier(.18,1,.32,1) both" : "pieceIn .32s cubic-bezier(.22,1,.36,1) both") : "none" }} />
                        {piece.type === "paladin" && piece.paladanSuperUsed && <div className="sup-badge">✗</div>}
                      </>
                    )}
                  </div>
                );
              }))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
  style={{
    width: isMobile ? boardPx + FRAME * 2 : 260,
    maxWidth: isMobile ? "100%" : 260,
    height: isMobile ? 260 : 560,
    flexShrink: 0,
    animation: "fadeInUp .4s ease",
  }}
>
  <ChatPanel myColor={myColor} messages={chat} onSend={sendChat} />
</div>

        {/* ── OVERLAYS ── */}
{showRules && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 110,
      background: "rgba(0,0,0,.88)",
      backdropFilter: "blur(16px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0px",
      animation: "rulesIn .3s cubic-bezier(.22,1,.36,1)",
    }}
  >
    <style>{`
      @keyframes rulesIn {
        from { opacity: 0; transform: scale(.94) translateY(16px); }
        to   { opacity: 1; transform: scale(1)   translateY(0); }
      }
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      @keyframes float3d {
        0%,100% { transform: translateY(0)    rotateY(0deg);   }
        50%     { transform: translateY(-4px) rotateY(12deg);  }
      }
      .piece-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 52px; height: 52px;
        border-radius: 14px;
        font-size: 28px;
        flex-shrink: 0;
        position: relative;
        animation: float3d 3s ease-in-out infinite;
        cursor: default;
        user-select: none;
      }
      .piece-icon::after {
        content: "";
        position: absolute;
        bottom: -6px; left: 50%;
        transform: translateX(-50%);
        width: 32px; height: 6px;
        border-radius: 50%;
        background: rgba(0,0,0,.35);
        filter: blur(3px);
      }
      .rule-card {
        padding: 16px 18px;
        border-radius: 18px;
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(212,168,67,.1);
        transition: border-color .2s, background .2s;
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }
      .rule-card:hover {
        background: rgba(212,168,67,.05);
        border-color: rgba(212,168,67,.22);
      }
      .rules-scroll::-webkit-scrollbar { width: 4px; }
      .rules-scroll::-webkit-scrollbar-track { background: transparent; }
      .rules-scroll::-webkit-scrollbar-thumb { background: rgba(212,168,67,.25); border-radius: 4px; }
    `}</style>

    <div
      style={{
        width: "min(740px, 96vw)",
        maxHeight: "88vh",
        overflowY: "auto",
        borderRadius: 28,
        padding: "32px 18px 28px",
        background: "linear-gradient(155deg,#0e0902 0%,#1a1005 40%,#0e0902 100%)",
        border: "1px solid rgba(212,168,67,.22)",
        boxShadow: [
          "0 0 0 1px rgba(212,168,67,.06)",
          "0 0 60px rgba(212,168,67,.1)",
          "0 40px 100px rgba(0,0,0,.9)",
          "inset 0 1px 0 rgba(212,168,67,.15)",
        ].join(","),
        fontFamily: "'Cinzel',Georgia,serif",
        position: "relative",
        overflowX: "hidden",
      }}
      className="rules-scroll"
    >
      {/* Decorative top glow */}
      <div style={{ position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:260,height:1,background:"linear-gradient(90deg,transparent,rgba(212,168,67,.6),transparent)",pointerEvents:"none" }}/>
      <div style={{ position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:180,height:40,background:"radial-gradient(ellipse,rgba(212,168,67,.1),transparent 70%)",pointerEvents:"none" }}/>

      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:26 }}>
        <div>
          <div style={{ fontSize:10,letterSpacing:".25em",textTransform:"uppercase",color:"rgba(212,168,67,.5)",marginBottom:4 }}>
            Dominion of Kingdom
          </div>
          <h2 style={{
            margin:0,fontSize:26,fontWeight:700,letterSpacing:".05em",
            background:"linear-gradient(135deg,#e8c96a 0%,#f5e09a 40%,#c8a030 100%)",
            backgroundSize:"200% auto",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            animation:"shimmer 3s linear infinite",
          }}>
            ⚔️ Game Rules
          </h2>
        </div>
        <button
          onClick={() => setShowRules(false)}
          style={{
            width:42,height:42,borderRadius:12,
            border:"1px solid rgba(255,255,255,.1)",
            background:"rgba(255,255,255,.04)",
            color:"rgba(255,255,255,.5)",
            cursor:"pointer",fontSize:16,
            transition:"all .2s",
            display:"flex",alignItems:"center",justifyContent:"center",
            flexShrink:0,
          }}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,80,80,.12)";e.currentTarget.style.borderColor="rgba(255,80,80,.3)";e.currentTarget.style.color="#ff8080";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.04)";e.currentTarget.style.borderColor="rgba(255,255,255,.1)";e.currentTarget.style.color="rgba(255,255,255,.5)";}}
        >
          ✕
        </button>
      </div>

      {/* Divider */}
      <div style={{ height:1,background:"linear-gradient(90deg,transparent,rgba(212,168,67,.3),transparent)",marginBottom:22 }}/>

      <div style={{ display:"grid",gap:12 }}>

        {/* Board Setup */}
        <div className="rule-card">
          <div className="piece-icon" style={{ background:"linear-gradient(145deg,#2a1a06,#3d2a0e)",boxShadow:"0 8px 24px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,220,100,.2)",animationDelay:"0s" }}>
            🗺️
          </div>
          <div>
            <h3 style={{ margin:"0 0 6px",color:"#e8c96a",fontSize:13,letterSpacing:".12em",textTransform:"uppercase" }}>Board Setup</h3>
            <p style={{ margin:0,color:"rgba(215,194,154,.75)",lineHeight:1.75,fontSize:13 }}>
              8×8 board. <span style={{color:"#e8c96a"}}>Back row:</span> Rook · Knight · Bishop · King · Queen · Bishop · Knight · Rook.{" "}
              <span style={{color:"#e8c96a"}}>Front row:</span> all Paladins (×8).
            </p>
          </div>
        </div>

        {/* Pieces — 2 column grid */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>

          {[
            { icon:"♔", delay:"0.05s", grad:"linear-gradient(145deg,#2d1f08,#4a3214)", shadow:"rgba(212,168,67,.3)", label:"King", color:"#f0d070", text:"1 square in any direction. Capture King to win!" },
            { icon:"♛", delay:"0.1s",  grad:"linear-gradient(145deg,#1a0d22,#2e1840)", shadow:"rgba(180,100,255,.3)", label:"Queen", color:"#c890ff", text:"Unlimited squares — straight or diagonal." },
            { icon:"♝", delay:"0.15s", grad:"linear-gradient(145deg,#0a1a2a,#163250)", shadow:"rgba(80,160,255,.3)", label:"Bishop", color:"#70b8ff", text:"Unlimited diagonal squares in any direction." },
            { icon:"♜", delay:"0.2s",  grad:"linear-gradient(145deg,#0d1a0d,#183018)", shadow:"rgba(80,200,100,.3)", label:"Rook",  color:"#70dd80", text:"Unlimited horizontal or vertical squares." },
            { icon:"♞", delay:"0.25s", grad:"linear-gradient(145deg,#1a1010,#301818)", shadow:"rgba(255,100,80,.3)", label:"Knight", color:"#ff8070", text:"L-shape: 2 forward/back + 1 side, or 2 side + 1 forward." },
            { icon:"🛡️",delay:"0.3s",  grad:"linear-gradient(145deg,#1a1408,#2e2210)", shadow:"rgba(255,180,50,.3)", label:"Paladin", color:"#ffb840", text:"1 square any dir. Super: 2 sq once. Castle swap. Back-rank retrieval." },
          ].map(({icon,delay,grad,shadow,label,color,text})=>(
            <div key={label} className="rule-card" style={{ flexDirection:"column",gap:10 }}>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div className="piece-icon" style={{ background:grad,boxShadow:`0 8px 20px rgba(0,0,0,.55),0 0 12px ${shadow},inset 0 1px 0 rgba(255,255,255,.1)`,animationDelay:delay,fontSize:24,width:46,height:46 }}>
                  {icon}
                </div>
                <h3 style={{ margin:0,color,fontSize:13,letterSpacing:".1em",textTransform:"uppercase",fontWeight:700 }}>{label}</h3>
              </div>
              <p style={{ margin:0,color:"rgba(215,194,154,.7)",lineHeight:1.7,fontSize:12 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* Paladin Special highlight */}
        <div className="rule-card" style={{ background:"rgba(255,160,0,.04)",borderColor:"rgba(255,160,0,.2)" }}>
          <div className="piece-icon" style={{ background:"linear-gradient(145deg,#1e1000,#3a2200)",boxShadow:"0 8px 20px rgba(0,0,0,.55),0 0 16px rgba(255,140,0,.4),inset 0 1px 0 rgba(255,220,100,.15)",animationDelay:".35s",fontSize:26,width:50,height:50 }}>
            ⚡
          </div>
          <div>
            <h3 style={{ margin:"0 0 6px",color:"#ffb030",fontSize:13,letterSpacing:".12em",textTransform:"uppercase" }}>Paladin Special Powers</h3>
            <div style={{ display:"grid",gap:5 }}>
              {[
                ["🗡️","Super Strike","2-square attack in any direction — usable only once per Paladin"],
                ["🔄","Reverse Castle","Swap with any allied piece using super move — for protection"],
                ["🏆","Back Rank","Reach the enemy back rank to retrieve one of your captured pieces"],
              ].map(([emoji,title,desc])=>(
                <div key={title as string} style={{ display:"flex",gap:8,alignItems:"flex-start" }}>
                  <span style={{ fontSize:13,flexShrink:0,marginTop:1 }}>{emoji}</span>
                  <p style={{ margin:0,fontSize:12,color:"rgba(215,194,154,.7)",lineHeight:1.65 }}>
                    <span style={{ color:"#ffc050",fontWeight:600 }}>{title}: </span>{desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: Victory + Mexican Standoff */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div className="rule-card" style={{ background:"rgba(255,215,0,.04)",borderColor:"rgba(255,215,0,.18)",flexDirection:"column",gap:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div className="piece-icon" style={{ background:"linear-gradient(145deg,#1a1400,#2e2400)",boxShadow:"0 8px 20px rgba(0,0,0,.55),0 0 14px rgba(255,215,0,.35),inset 0 1px 0 rgba(255,240,100,.15)",animationDelay:".4s",fontSize:24,width:46,height:46 }}>
                👑
              </div>
              <h3 style={{ margin:0,color:"#ffd700",fontSize:13,letterSpacing:".1em",textTransform:"uppercase" }}>Victory</h3>
            </div>
            <p style={{ margin:0,color:"rgba(215,194,154,.7)",lineHeight:1.7,fontSize:12 }}>
  In 8×8 mode, defeating the <span style={{color:"#ffd700"}}>King</span> does not guarantee victory.
  <br /><br />
  If any enemy pieces remain, the battle continues. The fallen King may grant a final stand,
  allowing the fight to go on until the last unit falls.
  <br /><br />
  To win, you must eliminate every enemy piece on the board — or force your opponent to surrender.
</p>
          </div>

          <div className="rule-card" style={{ background:"rgba(100,120,200,.04)",borderColor:"rgba(100,120,200,.18)",flexDirection:"column",gap:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div className="piece-icon" style={{ background:"linear-gradient(145deg,#0a0e1a,#121828)",boxShadow:"0 8px 20px rgba(0,0,0,.55),0 0 14px rgba(100,120,255,.3),inset 0 1px 0 rgba(150,170,255,.1)",animationDelay:".45s",fontSize:24,width:46,height:46 }}>
                🤝
              </div>
              <h3 style={{ margin:0,color:"#9090e8",fontSize:13,letterSpacing:".1em",textTransform:"uppercase" }}>Pass Turn</h3>
            </div>
            <p style={{ margin:0,color:"rgba(215,194,154,.7)",lineHeight:1.7,fontSize:12 }}>
              <span style={{color:"#9090e8"}}>Mexican Standoff</span> — each player may skip their turn once. Use it wisely.
            </p>
          </div>
        </div>

        {/* Bottom tip */}
        <div style={{ textAlign:"center",padding:"10px 0 2px",borderTop:"1px solid rgba(212,168,67,.1)" }}>
          <p style={{ margin:0,fontSize:11,color:"rgba(212,168,67,.35)",letterSpacing:".1em",fontStyle:"italic" }}>
            "This is a battle, not chess — simply War strategies!"
          </p>
        </div>

      </div>
    </div>
  </div>
)}


{showQuitConfirm && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 115,
      background: "rgba(0,0,0,.85)",
      backdropFilter: "blur(16px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}
  >
    <div
      style={{
        width: "min(420px, 92vw)",
        borderRadius: 28,
        padding: "36px 28px 28px",
        background: "linear-gradient(160deg,rgba(18,5,5,.97),rgba(28,8,8,.98),rgba(16,4,4,.97))",
        border: "1px solid rgba(255,80,80,.18)",
        boxShadow: "0 0 40px rgba(255,60,60,.1), 0 40px 80px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,120,120,.1)",
        textAlign: "center",
        fontFamily: "'Cinzel',Georgia,serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* top glow line */}
      <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:180,height:1,background:"linear-gradient(90deg,transparent,rgba(255,80,80,.45),transparent)",pointerEvents:"none"}}/>

      {/* corner diamonds */}
      {[{top:10,left:10},{top:10,right:10},{bottom:10,left:10},{bottom:10,right:10}].map((pos,i)=>(
        <div key={i} style={{position:"absolute",...pos as any,width:8,height:8,border:"1px solid rgba(255,80,80,.22)",transform:"rotate(45deg)"}}/>
      ))}

      {/* icon circle */}
      <div style={{
        width:76,height:76,borderRadius:"50%",
        background:"radial-gradient(circle at 35% 30%,rgba(255,80,80,.15),rgba(140,20,20,.08))",
        border:"1px solid rgba(255,80,80,.18)",
        display:"flex",alignItems:"center",justifyContent:"center",
        margin:"0 auto 18px",fontSize:34,
        boxShadow:"0 0 20px rgba(255,60,60,.15), inset 0 1px 0 rgba(255,120,120,.12)",
      }}>
        🏳️
      </div>

      <h2 style={{margin:"0 0 6px",fontSize:22,fontWeight:700,letterSpacing:".06em",color:"#ff8080",textShadow:"0 0 18px rgba(255,80,80,.35)"}}>
        Surrender?
      </h2>

      <div style={{width:36,height:1,background:"linear-gradient(90deg,transparent,rgba(255,80,80,.4),transparent)",margin:"0 auto 12px"}}/>

      <p style={{margin:"0 0 26px",color:"rgba(255,190,190,.5)",lineHeight:1.8,fontSize:12,letterSpacing:".02em"}}>
        Your opponent will be declared<br/>
        <span style={{color:"rgba(255,140,140,.7)"}}>the victor</span> if you leave now.
      </p>

      <div style={{display:"flex",gap:10}}>
        <button
          onClick={() => setShowQuitConfirm(false)}
          style={{
            flex:1,padding:"13px 0",
            borderRadius:14,
            border:"1px solid rgba(255,255,255,.09)",
            background:"rgba(255,255,255,.04)",
            color:"rgba(210,190,190,.55)",
            cursor:"pointer",fontWeight:700,
            letterSpacing:".1em",textTransform:"uppercase",
            fontSize:10,fontFamily:"'Cinzel',Georgia,serif",
            transition:"all .2s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.08)";e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="rgba(255,255,255,.18)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.04)";e.currentTarget.style.color="rgba(210,190,190,.55)";e.currentTarget.style.borderColor="rgba(255,255,255,.09)";}}
        >
          ← Stay
        </button>

        <button
          onClick={handleQuit}
          style={{
            flex:1,padding:"13px 0",
            borderRadius:14,
            border:"1px solid rgba(255,80,80,.3)",
            background:"linear-gradient(135deg,rgba(170,25,25,.92),rgba(110,12,12,.96))",
            color:"#ffaaaa",
            cursor:"pointer",fontWeight:700,
            letterSpacing:".1em",textTransform:"uppercase",
            fontSize:10,fontFamily:"'Cinzel',Georgia,serif",
            transition:"all .2s",
            boxShadow:"0 0 18px rgba(255,60,60,.22), 0 6px 18px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,120,120,.15)",
          }}
          onMouseEnter={e=>{e.currentTarget.style.background="linear-gradient(135deg,rgba(210,45,45,.95),rgba(150,18,18,1))";e.currentTarget.style.color="#fff";e.currentTarget.style.boxShadow="0 0 28px rgba(255,60,60,.4), 0 8px 22px rgba(0,0,0,.7)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="linear-gradient(135deg,rgba(170,25,25,.92),rgba(110,12,12,.96))";e.currentTarget.style.color="#ffaaaa";e.currentTarget.style.boxShadow="0 0 18px rgba(255,60,60,.22), 0 6px 18px rgba(0,0,0,.6)";}}
        >
          ⚔️ Quit
        </button>
      </div>
    </div>
  </div>
)}

        {/* ── WIN SCREEN ── */}
       {showWin && (
  <>
    <Fireworks />
    <div style={{
      position:"fixed", inset:0, zIndex:100,
      background:"rgba(0,0,0,.92)",
      backdropFilter:"blur(24px)",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <div style={{
        textAlign:"center",
        padding:"48px 52px 40px",
        borderRadius:32,
        width:"min(480px,92vw)",
        background: showWin===myColor
          ? "linear-gradient(160deg,rgba(14,10,2,.98),rgba(28,18,4,.99),rgba(12,8,2,.98))"
          : "linear-gradient(160deg,rgba(8,4,4,.98),rgba(20,6,6,.99),rgba(8,3,3,.98))",
        border: `1px solid ${showWin===myColor?"rgba(212,168,67,.22)":"rgba(255,60,60,.18)"}`,
        boxShadow: showWin===myColor
          ? "0 0 60px rgba(212,168,67,.12), 0 40px 80px rgba(0,0,0,.95), inset 0 1px 0 rgba(212,168,67,.15)"
          : "0 0 60px rgba(255,60,60,.1), 0 40px 80px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,80,80,.1)",
        fontFamily:"'Cinzel',Georgia,serif",
        position:"relative",
        overflow:"hidden",
      }}>

        {/* Top glow line */}
        <div style={{
          position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
          width:220, height:1,
          background: showWin===myColor
            ? "linear-gradient(90deg,transparent,rgba(212,168,67,.55),transparent)"
            : "linear-gradient(90deg,transparent,rgba(255,80,80,.45),transparent)",
          pointerEvents:"none",
        }}/>

        {/* Corner diamonds */}
        {[{top:12,left:12},{top:12,right:12},{bottom:12,left:12},{bottom:12,right:12}].map((pos,i)=>(
          <div key={i} style={{
            position:"absolute", ...pos as any,
            width:10, height:10,
            border:`1px solid ${showWin===myColor?"rgba(212,168,67,.3)":"rgba(255,80,80,.25)"}`,
            transform:"rotate(45deg)",
          }}/>
        ))}

        {/* Image */}
        <div style={{
          width:110, height:110,
          borderRadius:"50%",
          margin:"0 auto 22px",
          position:"relative",
          background: showWin===myColor
            ? "radial-gradient(circle at 35% 30%,rgba(212,168,67,.18),rgba(140,90,0,.08))"
            : "radial-gradient(circle at 35% 30%,rgba(255,60,60,.15),rgba(140,20,20,.08))",
          border: `1px solid ${showWin===myColor?"rgba(212,168,67,.25)":"rgba(255,80,80,.2)"}`,
          boxShadow: showWin===myColor
            ? "0 0 30px rgba(212,168,67,.2), inset 0 1px 0 rgba(255,220,100,.15)"
            : "0 0 30px rgba(255,60,60,.18), inset 0 1px 0 rgba(255,120,120,.12)",
          display:"flex", alignItems:"center", justifyContent:"center",
          overflow:"hidden",
        }}>
          <img
            src={showWin===myColor?"/game-over/victory.png":"/game-over/defeated.png"}
            alt={showWin===myColor?"Victory":"Defeated"}
            style={{width:"85%",height:"85%",objectFit:"contain",filter:showWin===myColor?"drop-shadow(0 0 12px rgba(212,168,67,.5))":"drop-shadow(0 0 12px rgba(255,80,80,.45))"}}
            onError={e=>{(e.currentTarget as HTMLImageElement).style.display="none";(e.currentTarget.nextSibling as HTMLElement).style.display="flex";}}
          />
          {/* Fallback emoji if image missing */}
          <div style={{display:"none",fontSize:52,position:"absolute",alignItems:"center",justifyContent:"center",inset:0}}>
            {showWin===myColor?"👑":"💀"}
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          margin:"0 0 6px", fontSize:38, fontWeight:700, letterSpacing:".05em",
          color: showWin===myColor?"#d4a843":"#ff7070",
          textShadow: showWin===myColor
            ? "0 0 24px rgba(212,168,67,.4)"
            : "0 0 24px rgba(255,80,80,.4)",
        }}>
          {showWin===myColor?"Victory!":"Defeated"}
        </h1>

        {/* Divider */}
        <div style={{
          width:44, height:1, margin:"0 auto 12px",
          background: showWin===myColor
            ? "linear-gradient(90deg,transparent,rgba(212,168,67,.5),transparent)"
            : "linear-gradient(90deg,transparent,rgba(255,80,80,.4),transparent)",
        }}/>

        {/* Winner name */}
        <p style={{
          fontSize:14, fontWeight:600, margin:"0 0 4px",
          color: showWin===myColor?"rgba(232,223,192,.8)":"rgba(255,180,180,.7)",
        }}>
          {showWin===myColor?playerName:opponentName}
        </p>

        <p style={{fontSize:11,color:showWin===myColor?"rgba(212,168,67,.38)":"rgba(255,120,120,.35)",margin:"0 0 18px",fontStyle:"italic",letterSpacing:".06em"}}>
          {showWin==="white"?"White":"Black"} Kingdom Prevails
        </p>

        {/* Crown badge */}
        <div style={{
          padding:"9px 20px", borderRadius:10, display:"inline-flex",
          alignItems:"center", gap:8, marginBottom:30,
          background: showWin===myColor?"rgba(212,168,67,.06)":"rgba(255,60,60,.06)",
          border: `1px solid ${showWin===myColor?"rgba(212,168,67,.14)":"rgba(255,80,80,.14)"}`,
        }}>
          <span style={{fontSize:14}}>{showWin===myColor?"🏆":"⚔️"}</span>
          <p style={{margin:0,fontSize:11,color:showWin===myColor?"rgba(212,168,67,.65)":"rgba(255,140,140,.6)",fontStyle:"italic"}}>
            {showWin===myColor?"The Crown is claimed":"The King has fallen"}
          </p>
        </div>

        {/* Buttons */}
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button
            onClick={()=>window.location.href="/lobby"}
            style={{
              flex:1, padding:"13px 0", borderRadius:14,
              fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", fontSize:11,
              background:"linear-gradient(135deg,#d4a843,#b87e28)",
              color:"#1a0d00", border:"none", cursor:"pointer",
              fontFamily:"'Cinzel',Georgia,serif",
              boxShadow:"0 6px 24px rgba(212,168,67,.28)",
              transition:"all .2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 8px 32px rgba(212,168,67,.45)";e.currentTarget.style.transform="translateY(-1px)";}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 6px 24px rgba(212,168,67,.28)";e.currentTarget.style.transform="none";}}
          >
            ← Lobby
          </button>
          <button
            onClick={()=>{setGs(createInitialGameState());setShowWin(null);setToast(null);setGreatSq(null);setRiskySq(null);}}
            style={{
              flex:1, padding:"13px 0", borderRadius:14,
              fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", fontSize:11,
              background:"rgba(255,255,255,.04)",
              color:"rgba(255,255,255,.5)",
              border:"1px solid rgba(255,255,255,.1)",
              cursor:"pointer", fontFamily:"'Cinzel',Georgia,serif",
              transition:"all .2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.08)";e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="rgba(255,255,255,.2)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.04)";e.currentTarget.style.color="rgba(255,255,255,.5)";e.currentTarget.style.borderColor="rgba(255,255,255,.1)";}}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  </>
)}

       
      </div>
    </>
  );
}