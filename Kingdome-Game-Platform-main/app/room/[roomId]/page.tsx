"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";
import { Room, COLOR_STYLES, MODE_CONFIG } from "@/lib/lobby/types";
import { getModeFromRoomId } from "@/lib/lobby/id-generator";
import { createSocket } from "@/lib/lobby/socket-client";
import { getActiveSocket, setActiveSocket } from "@/lib/lobby/room-store";
import { Footer } from "@/components/footer";

const MODE_COLORS: Record<string,string> = {
  "8x8": "#d4a843",
  "12x12": "#b8932e",
  "16x16": "#e8c96a",

  "tri-8x8": "#4f8cff",
  "tri-12x12": "#5a95ff",
  "tri-16x16": "#6ea4ff",

  "x-8x8": "#c084fc",
  "x-12x12": "#d39cff",
  "x-16x16": "#e0b8ff",
};

const MODE_ICONS: Record<string,string> = {
  "8x8":"⚔️",
  "12x12":"🏰",
  "16x16":"👑",

  "tri-8x8":"🔺",
  "tri-12x12":"🔺",
  "tri-16x16":"🔺",

  "x-8x8":"✦",
  "x-12x12":"✦",
  "x-16x16":"✦",
};

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  const mode = getModeFromRoomId(roomId);
  const accent = mode ? MODE_COLORS[mode] : "#d4a843";
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setMounted(true);

    let socket = getActiveSocket();

    if (!socket || !socket.connected) {
      const { createSocket } = require("@/lib/lobby/socket-client");
      socket = createSocket();
      setActiveSocket(socket);
      socket.connect();
    }

    socketRef.current = socket;

    const handleRoomUpdate = (data: Room) => {
      if (data.id === roomId) setRoom(data);
    };

    const handleGameStart = (data: Room) => {
      if (data.id === roomId) router.push(`/game/${roomId}`);
    };

    const emitRoomGet = () => {
      socket!.emit("room:get", { roomId });
    };

    socket.on("room:updated", handleRoomUpdate);
    socket.on("game:started", handleGameStart);
    socket.on("connect", emitRoomGet);

    if (socket.connected) {
      socket.emit("room:get", { roomId });
    }

    return () => {
      socket!.off("room:updated", handleRoomUpdate);
      socket!.off("game:started", handleGameStart);
      socket!.off("connect", emitRoomGet);
    };
  }, [roomId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = room?.hostId === socketRef.current?.id;
  const canStart =
  room &&
  room.players.length >= (mode ? MODE_CONFIG[mode].maxPlayers : 2);
  const maxPlayers = mode ? MODE_CONFIG[mode].maxPlayers : 2;

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
        @keyframes orbFloat { 0%,100%{transform:translateY(0) scale(1);opacity:.5} 50%{transform:translateY(-20px) scale(1.04);opacity:.7} }
        @keyframes idGlow { 0%,100%{box-shadow:0 0 20px ${accent}30} 50%{box-shadow:0 0 50px ${accent}55} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .start-btn {
          transition:all .3s cubic-bezier(.23,1,.32,1);
          position:relative; overflow:hidden;
        }
        .start-btn::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.18) 50%,transparent 60%);
          background-size:200% 100%;
          animation:shimmer 3s infinite;
        }
        .start-btn:not(:disabled):hover { transform:translateY(-3px); box-shadow:0 16px 48px ${accent}55; }
        .start-btn:disabled { cursor:not-allowed; }
      `}</style>

        {/* ✅ Video — fixed  */}
     <video
  autoPlay
  loop
  muted
  playsInline
  preload="auto"
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    objectFit: "cover",
    zIndex: 2,
    pointerEvents: "none",
  }}
>
  <source src="/video/background-game.mp4" type="video/mp4" />
</video>
      {/* ✅ Dark overlay — fixed, har jagah text readable */}
      <div style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(4,2,0,0.75)",
        zIndex: 1,
        pointerEvents: "none",
      }} />

      <div className="relative min-h-screen overflow-hidden" style={{ zIndex: 2 }}>

        {/* Orbs */}
        <div style={{ position:"absolute", width:400,height:400,top:"-10%",left:"5%",borderRadius:"50%",background:`radial-gradient(circle,${accent}20,transparent 70%)`,filter:"blur(70px)",animation:"orbFloat 7s ease-in-out infinite",pointerEvents:"none", zIndex: 2 }} />
        <div style={{ position:"absolute", width:300,height:300,bottom:"10%",right:"5%",borderRadius:"50%",background:`radial-gradient(circle,${accent}12,transparent 70%)`,filter:"blur(60px)",animation:"orbFloat 9s ease-in-out infinite reverse",pointerEvents:"none", zIndex: 2 }} />

        <div className="relative" style={{ padding:"clamp(80px,12vw,140px) clamp(16px,4vw,32px) 80px", maxWidth:600, margin:"0 auto", zIndex: 3 }}>

          {/* Back */}
          <button
            onClick={() => router.push("/lobby")}
            style={{
              display:"inline-flex", alignItems:"center", gap:6, marginBottom:40,
              fontSize:12, letterSpacing:"0.15em", textTransform:"uppercase",
              color:"rgba(220,180,100,.7)", background:"none", border:"none", cursor:"pointer",
              transition:"color .2s", padding:0, fontWeight:700,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = accent}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(220,180,100,.7)"}
          >
            ← Back to Lobby
          </button>

          {/* Mode badge + Title */}
          <div style={{ animation: mounted ? "fadeUp .2s cubic-bezier(.63,1,.32,1) both" : "none" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:14, padding:"6px 16px", borderRadius:999, background:`${accent}48`, border:`1px solid ${accent}65` }}>
               <img 
      src="/icons/lobby-page.png" 
      alt="icon" 
      style={{ width:36, height:30, objectFit:"contain" }}
    />
              <span style={{ fontSize:11, letterSpacing:"0.25em", textTransform:"uppercase", color:"#fff", fontWeight:800 }}>
                {mode ? MODE_CONFIG[mode].label : "Room"} · {mode}
              </span>
            </div>

          <h1
  style={{
    fontSize: "clamp(2.2rem, 5vw, 4.8rem)",
    fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    color: "rgba(255,255,255,0.95)",
    margin: "0 0 12px",
    lineHeight: 1.1,
    fontWeight: 800,
    textAlign: "center",
    letterSpacing: "2px",
    textTransform: "uppercase",
    textShadow:
      "0 2px 10px rgba(0,0,0,0.6), 0 0 25px rgba(255,255,255,0.15)",
    background: "linear-gradient(90deg, rgba(255,255,255,1), rgba(200,200,200,0.6))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.4))",
  }}
>
  {room?.name ?? "Waiting..."}
</h1>


           <p
  style={{
    fontSize: 18,
    color: "rgba(220,180,100,.8)",
    fontStyle: "italic",
    fontFamily: "Georgia,serif",
    margin: "0 0 40px",
    fontWeight: 600,
    textAlign: "center",
    letterSpacing: "0.5px",
    textShadow: "0 2px 10px rgba(0,0,0,0.6)",
  }}
>
  Waiting for warriors to join the battle
</p>
          </div>

          {/* Room ID Card */}
          <div style={{
            animation: mounted ? "fadeUp .6s .1s cubic-bezier(.23,1,.32,1) both" : "none",
            background: "rgba(1,1,1,0.6)",
            border: `1px solid ${accent}40`,
            borderRadius: 16, padding: 24, marginBottom: 24,
            backdropFilter: "blur(70px)",
            boxShadow: `0 0 0px ${accent}0`,
          }}>
            <p style={{ fontSize:14, letterSpacing:"0.3em", textTransform:"uppercase", color:"#d4a843", marginBottom:12, fontWeight:700 }}>
              Room ID: Share with friends
            </p>
            <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <div style={{
                flex:1, padding:"14px 20px", borderRadius:10,
                border:"1px solid rgba(255, 255, 255, 0.2)",
                fontFamily:"monospace", fontSize:"clamp(14px,3vw,22px)",
                letterSpacing:"0.15em", color:accent,
                fontWeight:800, userSelect:"all",
                textShadow:`0 0 12px ${accent}60`,
              }}>
                {roomId}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  padding:"14px 20px", borderRadius:10, border:`1px solid ${accent}40`,
                  background: copied ? `${accent}25` : "rgba(255,255,255,0.06)",
                  color: copied ? accent : "rgba(220,180,100,.8)",
                  fontSize:12, letterSpacing:"0.1em", cursor:"pointer",
                  transition:"all .2s", fontWeight:800, textTransform:"uppercase",
                  whiteSpace:"nowrap",
                }}
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Players */}
          <div style={{ animation: mounted ? "fadeUp .6s .2s cubic-bezier(.23,1,.32,1) both" : "none", marginBottom: 24 }}>
            <p style={{ fontSize:15, letterSpacing:"0.3em", textTransform:"uppercase", color:"rgba(220,180,100,.7)", marginBottom:12, fontWeight:700 }}>
              Players ({room?.players.length ?? 0}/{maxPlayers})
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {Array.from({ length: maxPlayers }).map((_, i) => {
                const player = room?.players[i];
                const colorStyle = player ? COLOR_STYLES[player.color] : null;
                const isMe = player?.id === socketRef.current?.id;
                return (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", gap:14,
                    padding:"14px 18px", borderRadius:12,
                    background: player ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)",
                    border:`1px solid ${player ? accent + "35" : "rgba(255,255,255,0.07)"}`,
                    backdropFilter:"blur(12px)",
                    transition:"all .3s",
                  }}>
                    <div style={{
                      width:36, height:36, borderRadius:8, flexShrink:0,
                      background: colorStyle ? colorStyle.css : "rgba(255,255,255,0.06)",
                      border:"1px solid rgba(255,255,255,0.15)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:18,
                    }}>
                      {player ? colorStyle?.emoji ?? "👤" : ""}
                    </div>

                    <div style={{ flex:1 }}>
                      {player ? (
                        <>
                          <div style={{ fontSize:19, color:"#ffffff", fontWeight:800, textShadow:"0 1px 8px rgba(0,0,0,0.9)" }}>
                            {player.name}{" "}
                            {isMe && <span style={{ fontSize:10, color:"#d4a843", letterSpacing:"0.1em", fontWeight:700 }}>(You)</span>}
                          </div>
                          <div style={{ fontSize:15, color:"#d4a843", marginTop:2, fontWeight:600 }}>
                            {player.color} Player
                          </div>
                        </>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background:"rgba(255,255,255,0.2)", animation:"pulse-dot 1.5s infinite" }} />
                          <span style={{ fontSize:13, color:"rgba(255,255,255,0.3)", fontStyle:"italic", fontWeight:600 }}>
                            Waiting for player...
                          </span>
                        </div>
                      )}
                    </div>

                    {isMe && (
                      <span style={{ fontSize:10, padding:"4px 10px", borderRadius:6, background:`${accent}22`, color:accent, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:800, border:`1px solid ${accent}40` }}>
                        Host
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Start Game — Host only */}
          {isHost && (
            <div style={{ animation: mounted ? "fadeUp .6s .3s cubic-bezier(.23,1,.32,1) both" : "none" }}>
              <button
                className="start-btn"
                disabled={!canStart}
                onClick={() => socketRef.current?.emit("game:start", { roomId })}
                style={{
                  width:"100%", padding:"18px", borderRadius:14,
                  fontWeight:800, letterSpacing:"0.15em", textTransform:"uppercase",
                  fontSize:14, border:"none",
                  background:"linear-gradient(135deg,#d4a843,#c4912a,#b8862e)",
                  color: canStart ? "#000" : "rgba(255,255,255,0.3)",
                }}
              >
                {canStart
                  ? "⚔ Start Battle"
                  : `Waiting for ${maxPlayers - (room?.players.length ?? 0)} more player${maxPlayers - (room?.players.length ?? 1) !== 1 ? "s" : ""}...`}
              </button>
              {!canStart && (
                <p style={{ textAlign:"center", fontSize:13, color:"rgba(220,180,100,.5)", marginTop:10, fontStyle:"italic", fontWeight:600 }}>
                  Share the Room ID with your friends to begin
                </p>
              )}
            </div>
          )}

          {/* Non-host waiting */}
          {!isHost && (
            <div style={{ textAlign:"center", padding:"18px", borderRadius:12, background:"rgba(0,0,0,0.5)", border:`1px solid ${accent}20`, backdropFilter:"blur(12px)" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:accent, animation:"pulse-dot 1.5s infinite", margin:"0 auto 10px" }} />
              <p style={{ fontSize:14, color:"rgba(220,180,100,.8)", fontStyle:"italic", fontFamily:"Georgia,serif", fontWeight:700 }}>
                Waiting for host to start the battle...
              </p>
            </div>
          )}

        </div>
      </div>

      <Footer />
    </>
  );
}