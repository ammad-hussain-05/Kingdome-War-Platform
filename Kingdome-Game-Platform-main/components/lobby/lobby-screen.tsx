"use client";

import { useState, useEffect, useRef } from "react";
import { connectSocket } from "@/lib/lobby/socket-client";
import { Room } from "@/lib/lobby/types";
import { Socket } from "socket.io-client";
import CreateRoomModal from "./create-room-modal";
import JoinRoomModal from "./join-room-modal";
import RoomCard from "./room-card";

function FloatingOrb({ style }: { style: React.CSSProperties }) {
  return <div className="absolute rounded-full pointer-events-none" style={{ filter: "blur(80px)", animation: "orbFloat 8s ease-in-out infinite", ...style }} />;
}

export default function LobbyScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setMounted(true);
  const socket = connectSocket(); // already connected hai toh reconnect nahi karega
socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("rooms:list", (data: Room[]) => setRooms(data));

    socket.connect();

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("rooms:list");
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const px = (mousePos.x - 0.5) * 30;
  const py = (mousePos.y - 0.5) * 20;

  return (
    <>
      <style>{`
        /* ✅ Video poore page ko cover kare — html/body bhi */
        html, body { margin: 0; padding: 0; min-height: 100%; }

        @keyframes orbFloat {
          0%,100% { transform: translateY(0) scale(1); opacity:.6; }
          33% { transform: translateY(-30px) scale(1.05); opacity:.8; }
          66% { transform: translateY(15px) scale(.97); opacity:.5; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(28px); }
          to { opacity:1; transform:translateY(0); }
        }
        @keyframes crownPulse {
          0%,100% { text-shadow:0 0 40px rgba(212,168,67,.5),0 0 80px rgba(212,168,67,.2); }
          50% { text-shadow:0 0 80px rgba(212,168,67,.9),0 0 160px rgba(212,168,67,.4); }
        }
        @keyframes shimmer {
          0% { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        @keyframes pulse-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:.5; transform:scale(.8); }
        }
        .lobby-btn {
          position:relative; overflow:hidden;
          transition:all .3s cubic-bezier(.23,1,.32,1);
          border:none; cursor:pointer; font-weight:700;
          letter-spacing:.15em; text-transform:uppercase;
          font-size:11px; border-radius:12px; padding:14px 28px;
        }
        .lobby-btn::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.15) 50%,transparent 60%);
          background-size:200% 100%; animation:shimmer 3s infinite;
        }
        .lobby-btn:hover { transform:translateY(-2px) scale(1.03); }
        .lobby-btn:active { transform:scale(.98); }
        .room-card-wrap { transition:all .35s cubic-bezier(.23,1,.32,1); }
        .room-card-wrap:hover { transform:translateY(-3px); }

        /* ✅ Room cards text bold aur visible */
        .room-card-wrap * {
          text-shadow: 0 1px 4px rgba(0,0,0,0.9) !important;
        }
        .room-card-wrap [style*="color"] {
          filter: brightness(1.4) !important;
        }
      `}</style>

      {/* ✅ Video — fixed taaki header/footer sab cover ho, responsive */}
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
      {/* ✅ Dark overlay — fixed, poore page pe */}
      <div style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(4,2,0,0.68)",
        zIndex: -2,
        pointerEvents: "none",
      }} />

      <div className="relative min-h-screen overflow-hidden">

        {/* Orbs */}
      

        {/* 3D Floor */}
        {/* <div className="absolute inset-0 pointer-events-none" style={{ perspective:"1200px",perspectiveOrigin:"50% 40%", zIndex: 1 }}>
          <div style={{
            position:"absolute",bottom:0,left:"-20%",right:"-20%",height:"50%",
            transform:`rotateX(70deg) translateY(${py*.5}px)`,
            transformOrigin:"bottom center",
            backgroundImage:"linear-gradient(rgba(201,168,76,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,.06) 1px,transparent 1px)",
            backgroundSize:"80px 80px",
            transition:"transform .2s ease-out",
            maskImage:"linear-gradient(to top,black,transparent)",
          }} />
        </div> */}

        {/* Content */}
        <div className="relative" style={{ padding:"140px clamp(16px,4vw,32px) 100px", zIndex: 2 }}>

          {/* Hero */}
          <div style={{ maxWidth:720,margin:"0 auto",textAlign:"center",marginBottom:48,animation:mounted?"fadeUp .8s cubic-bezier(.23,1,.32,1) both":"none" }}>

            {/* Connection status */}
            <div style={{ display:"inline-flex",alignItems:"center",gap:8,marginBottom:20,padding:"6px 6px",borderRadius:999,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:connected?"#7dbd6e":"#ff6060",animation:"pulse-dot 2s infinite" }} />
              <span style={{ fontSize:11,letterSpacing:"0.2em",textTransform:"uppercase",color:connected?"#a8e89a":"rgba(255,96,96,0.9)", fontWeight:600 }}>
                {connected ? "Server Connected" : "Connecting..."}
              </span>
            </div>

            <div style={{ display:"inline-flex",alignItems:"center",gap:8,marginBottom:16,padding:"6px 18px",marginLeft: 8,borderRadius:999,background:"rgba(212,168,67,0.12)",border:"1px solid rgba(212,168,67,0.3)" }}>
              <span style={{ fontSize:11,letterSpacing:"0.3em",textTransform:"uppercase",color:"#e8c96a", fontWeight:700}}>⚔ Multiplayer Arena</span>
            </div>

            <h1 style={{ fontSize:"clamp(2.8rem,7vw,5rem)",fontFamily:"Georgia,serif",color:"#e8c96a",animation:"crownPulse 4s ease-in-out infinite",margin:"0 0 16px",lineHeight:1, fontWeight:700 }}>
              Game Lobby
            </h1>

            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:16 }}>
              <div style={{ height:1,width:60,background:"linear-gradient(to right,transparent,rgba(212,168,67,.6))" }} />
              <div style={{ width:6,height:6,background:"#d4a843",transform:"rotate(45deg)",opacity:.8 }} />
              <div style={{ height:1,width:60,background:"linear-gradient(to left,transparent,rgba(212,168,67,.6))" }} />
            </div>

            <p style={{ fontSize:15,fontFamily:"Georgia,serif",fontStyle:"italic",color:"rgba(220,180,100,.85)",maxWidth:400,margin:"0 auto", fontWeight:500 }}>
              Create a room, share your ID, and let the battle begin
            </p>
          </div>

          {/* Stats + Actions Bar */}
          <div style={{ maxWidth:720,margin:"0 auto 32px",animation:mounted?"fadeUp .8s .15s cubic-bezier(.23,1,.32,1) both":"none" }}>
            <div style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              flexWrap:"wrap",gap:16,
              padding:"16px 24px",borderRadius:16,
              background:"rgba(0,0,0,0.55)",
              border:"1px solid rgba(212,168,67,0.2)",
              backdropFilter:"blur(16px)",
            }}>
              <div style={{ display:"flex",alignItems:"center",gap:24 }}>
                <div>
                  <div style={{ fontSize:26,fontWeight:800,fontFamily:"Georgia,serif",color:"#e8c96a",lineHeight:1 }}>{rooms.length}</div>
                  <div style={{ fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(212,168,67,.7)",marginTop:4, fontWeight:600 }}>Active Rooms</div>
                </div>
                <div style={{ width:1,height:36,background:"rgba(212,168,67,.2)" }} />
                <div>
                  <div style={{ fontSize:26,fontWeight:800,fontFamily:"Georgia,serif",color:"#7dbd6e",lineHeight:1 }}>
                    {rooms.reduce((a,r)=>a+r.players.length,0)}
                  </div>
                  <div style={{ fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(212,168,67,.7)",marginTop:4, fontWeight:600 }}>Players Online</div>
                </div>
              </div>

              <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                <button
                  className="lobby-btn"
                  onClick={() => setShowJoin(true)}
                  style={{ background:"rgba(255, 255, 255, 0.2)",color:"#d4a843",border:"1px solid rgba(255, 255, 255, 0.2)", fontWeight:800 }}
                >
                  Join Room
                </button>
                <button
                  className="lobby-btn"
                  onClick={() => setShowCreate(true)}
                  style={{ background:"linear-gradient(135deg,#d4a843,#c4912a,#b8862e)",color:"#1a0d00", fontWeight:800 }}
                >
                  + Create Room
                </button>
              </div>
            </div>
          </div>

          {/* Rooms List */}
          <div style={{ maxWidth:720,margin:"0 auto",animation:mounted?"fadeUp .8s .3s cubic-bezier(.23,1,.32,1) both":"none" }}>
            {rooms.length === 0 ? (
              <div style={{
                textAlign:"center",padding:"80px 24px",borderRadius:24,
                border:"1px dashed rgba(212,168,67,.25)",
                background:"rgba(0,0,0,0.5)",
                backdropFilter:"blur(16px)",
                position:"relative",overflow:"hidden",
              }}>
                {[{top:16,left:16},{top:16,right:16},{bottom:16,left:16},{bottom:16,right:16}].map((pos,i)=>(
                  <div key={i} style={{
                    position:"absolute",width:16,height:16,...pos,
                    borderTop:i<2?"1px solid rgba(212,168,67,.5)":undefined,
                    borderBottom:i>=2?"1px solid rgba(212,168,67,.5)":undefined,
                    borderLeft:i%2===0?"1px solid rgba(212,168,67,.5)":undefined,
                    borderRight:i%2===1?"1px solid rgba(212,168,67,.5)":undefined,
                  }} />
                ))}
                
                <p style={{ fontSize:22,fontFamily:"Georgia,serif",color:"rgba(232,201,106,.9)",fontWeight:800,margin:"0 0 8px" }}>No Battles Yet</p>
                <p style={{ fontSize:14,color:"rgba(212,168,67,.6)",margin:"0 0 24px", fontWeight:600 }}>Be the first to raise your banner</p>
                <div style={{ display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap" }}>
                  <button className="lobby-btn" onClick={()=>setShowJoin(true)} style={{ background:"rgba(255, 255, 255, 0.2)",color:"#fff",border:"1px solid rgba(255, 255, 255, 0.2)", fontWeight:800 }}>
                    Join Room
                  </button>
                  <button className="lobby-btn" onClick={()=>setShowCreate(true)} style={{ background:"linear-gradient(135deg,#d4a843,#b8862e)",color:"#1a0d00", fontWeight:800 }}>
                    Create First Room
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {rooms.map((room,i)=>(
                  <div key={room.id} className="room-card-wrap" style={{ animation:mounted?`fadeUp .5s ${.08*i}s cubic-bezier(.23,1,.32,1) both`:"none" }}>
                    <RoomCard room={room} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinRoomModal onClose={() => setShowJoin(false)} />}
    </>
  );
}