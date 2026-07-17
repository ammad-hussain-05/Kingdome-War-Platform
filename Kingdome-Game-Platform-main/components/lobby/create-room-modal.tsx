"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { connectSocket } from "@/lib/lobby/socket-client";
import { GameMode, MODE_CONFIG } from "@/lib/lobby/types";
import { useLoader } from '@/components/global-loader-provider'

const MODE_ICONS: Record<GameMode, string> = {
  "8x8": "/icons/basic.png",
  "12x12": "/icons/kingdome.png",
  "16x16": "/icons/empire.png",

  "tri-8x8": "/icons/basic.png",
  "tri-12x12": "/icons/kingdome.png",
  "tri-16x16": "/icons/empire.png",

  "x-8x8": "/icons/basic.png",
  "x-12x12": "/icons/kingdome.png",
  "x-16x16": "/icons/empire.png",
};
export default function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { runLoader } = useLoader()

  const handleCreate = () => {
    if (!canCreate || loading) return


    const socket = connectSocket();

    const doCreate = () => {
      socket.emit("room:create", {
        name: roomName.trim(),
        mode: selectedMode,
        playerName: playerName.trim(),
      });
    };

    socket.once("room:created", (room) => {
      sessionStorage.setItem("playerName", playerName.trim());
      sessionStorage.setItem("playerColor", room.players[0]?.color || "white");
      setLoading(false);
      onClose();
      router.push(`/room/${room.id}`);
    });

    socket.once("room:error", ({ message }) => {
      setLoading(false);
      setError(message);
    });

    if (socket.connected) {
      doCreate();
    } else {
      socket.once("connect", doCreate);
    }
  };

  const canCreate = roomName.trim() && playerName.trim() && selectedMode;

  return (
    <>
    <style>{`
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.92) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shimmerGold {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes iconFloat {
    0%,100% { transform: translateY(0) rotateY(0deg) scale(1); }
    25%     { transform: translateY(-4px) rotateY(15deg) scale(1.06); }
    75%     { transform: translateY(2px) rotateY(-10deg) scale(0.97); }
  }
  @keyframes iconSpin3d {
    0%   { transform: rotateY(0deg) scale(1); }
    50%  { transform: rotateY(180deg) scale(1.1); }
    100% { transform: rotateY(360deg) scale(1); }
  }
  .modal-input {
    width: 100%; padding: 13px 16px; border-radius: 12px;
    background: rgba(0,0,0,0.55);
    border: 1px solid rgba(212,168,67,0.15);
    color: #e8d8b0; outline: none; font-family: Georgia,serif; font-size: 14px;
    transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
    caret-color: #d4a843; box-sizing: border-box;
  }
  .modal-input::placeholder { color: rgba(180,130,60,0.35); }
  .modal-input:focus {
    border-color: rgba(212,168,67,0.52);
    box-shadow: 0 0 0 3px rgba(212,168,67,0.08), 0 0 20px rgba(212,168,67,0.1);
    background: rgba(0,0,0,0.65);
  }
  .mode-btn {
    border: 1px solid rgba(212,168,67,0.12); border-radius: 14px;
    padding: 13px 15px;
    background: rgba(0,0,0,0.35);
    cursor: pointer; transition: all 0.28s cubic-bezier(0.23,1,0.32,1);
    text-align: left; width: 100%; position: relative; overflow: hidden;
    backdrop-filter: blur(4px);
  }
  .mode-btn::before {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(135deg,rgba(212,168,67,0.07),transparent 60%);
    opacity: 0; transition: opacity 0.28s;
  }
  .mode-btn:hover { background: rgba(0,0,0,0.5); border-color: rgba(212,168,67,0.32); transform: translateX(5px); box-shadow: 0 6px 24px rgba(0,0,0,0.5); }
  .mode-btn:hover::before { opacity: 1; }
  .mode-btn:hover .mode-icon { animation: iconFloat 2s ease-in-out infinite; }
  .mode-btn.selected {
    background: rgba(0,0,0,0.55);
    border-color: rgba(212,168,67,0.48);
    transform: translateX(5px);
    box-shadow: 0 0 24px rgba(212,168,67,0.12), 0 6px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,168,67,0.14);
  }
  .mode-btn.selected::before { opacity: 1; }
  .mode-btn.selected .mode-icon { animation: iconSpin3d 3s ease-in-out infinite; }
  .create-submit {
    width: 100%; padding: 15px; border-radius: 14px; font-weight: 700;
    letter-spacing: 0.15em; text-transform: uppercase; font-size: 12px;
    transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
    position: relative; overflow: hidden; border: none; cursor: pointer;
    font-family: Georgia,serif;
  }
  .create-submit::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(135deg,rgba(255,255,255,0.15) 0%,transparent 50%);
    pointer-events: none;
  }
  .create-submit:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 16px 44px rgba(212,168,67,0.4); }
  .create-submit:not(:disabled):active { transform: translateY(0); }
  .create-submit:disabled { cursor: not-allowed; }
`}</style>

{/* ── VIDEO BACKDROP ── */}
<div
  onClick={onClose}
  style={{
    position:"fixed", inset:0, zIndex:50,
    animation:"backdropIn 0.2s ease both",
    overflow:"hidden",
  }}
>
  {/* <video
    autoPlay muted loop playsInline
    onCanPlay={e => { (e.currentTarget as HTMLVideoElement).style.opacity = "1"; }}
    style={{
      position:"absolute", inset:0,
      width:"100%", height:"100%",
      objectFit:"cover",
      objectPosition:"center",
      filter:"brightness(1.18) saturate(1.2)",
      opacity:"0",                          // ← pehle hidden
      transition:"opacity 0.4s ease",   
      animation:"modalIn 0.4s cubic-bezier(0.23,1,0.32,1) 0.15s both",    // ← smooth appear
    }}
  >
    <source src="https://www.pexels.com/download/video/35062463/" type="video/mp4"/>
  </video> */}

  <div style={{
    position:"absolute", inset:0,
    background:"linear-gradient(to bottom,rgba(0,0,0,0.45) 0%,rgba(0,0,0,0.6) 100%)",
    backdropFilter:"blur(2px)",
  }}/>
</div>



{/* ── MODAL ── */}
<div style={{
  position:"fixed", inset:0, zIndex:51,
  display:"flex", alignItems:"center", justifyContent:"center",
  padding:"16px", pointerEvents:"none",
}}>
  <div style={{
width:"96vw",
maxWidth:1180,
maxHeight:"92vh",
overflowY:"hidden",
    borderRadius:26,
    padding:"clamp(24px,5vw,38px)",
    animation:"modalIn 0.35s cubic-bezier(0.23,1,0.32,1) both",
    pointerEvents:"all",
    position:"relative",
   overflowX:"hidden",
    /* glass card over video */
    background:"linear-gradient(155deg,rgba(8,5,1,0.82) 0%,rgba(16,10,2,0.88) 50%,rgba(10,6,1,0.82) 100%)",
    backdropFilter:"blur(20px)",
    WebkitBackdropFilter:"blur(20px)",
    border:"1px solid rgba(212,168,67,0.22)",
    boxShadow:[
      "0 0 0 1px rgba(212,168,67,0.06)",
      "0 0 40px rgba(212,168,67,0.1)",
      "0 40px 80px rgba(0,0,0,0.8)",
      "inset 0 1px 0 rgba(212,168,67,0.15)",
      "inset 0 -1px 0 rgba(0,0,0,0.4)",
    ].join(","),
  }}>

    {/* Top glow line */}
    <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:220,height:1,background:"linear-gradient(90deg,transparent,rgba(212,168,67,0.6),transparent)",pointerEvents:"none"}}/>
    <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:150,height:30,background:"radial-gradient(ellipse,rgba(212,168,67,0.12),transparent 70%)",pointerEvents:"none"}}/>

    {/* Corner diamonds */}
    {[{top:11,left:11},{top:11,right:11},{bottom:11,left:11},{bottom:11,right:11}].map((pos,i)=>(
      <div key={i} style={{position:"absolute",...pos as any,width:9,height:9,border:"1px solid rgba(212,168,67,0.3)",transform:"rotate(45deg)",pointerEvents:"none"}}/>
    ))}

    {/* Close */}
    <button
      onClick={onClose}
      style={{position:"absolute",top:14,right:14,width:34,height:34,borderRadius:10,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(212,168,67,0.12)",color:"rgba(212,168,67,0.55)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",backdropFilter:"blur(4px)"}}
      onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,80,80,0.15)";e.currentTarget.style.borderColor="rgba(255,80,80,0.3)";e.currentTarget.style.color="#ff8080";}}
      onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,0,0,0.4)";e.currentTarget.style.borderColor="rgba(212,168,67,0.12)";e.currentTarget.style.color="rgba(212,168,67,0.55)";}}
    >×</button>

    {/* Header */}
    <div style={{marginBottom:22}}>
      <p style={{fontSize:10,letterSpacing:"0.28em",textTransform:"uppercase",color:"rgba(212,168,67,0.45)",margin:"0 0 5px"}}>New Battle</p>
      <h2 style={{
        fontSize:"clamp(20px,4vw,25px)",fontFamily:"Georgia,serif",
        margin:0,fontWeight:700,letterSpacing:".04em",
        background:"linear-gradient(135deg,#e8c96a,#f5e09a 45%,#c8a030 85%)",
        backgroundSize:"200% auto",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        animation:"shimmerGold 3s linear infinite",
      }}>⚔️ Create Room</h2>
    </div>

    {/* Divider */}
    <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(212,168,67,0.22),transparent)",marginBottom:20}}/>

    {/* Error */}
    {error&&(
      <div style={{marginBottom:16,padding:"10px 14px",borderRadius:10,background:"rgba(220,60,60,0.12)",border:"1px solid rgba(220,60,60,0.22)",color:"#ff8080",fontSize:13,display:"flex",alignItems:"center",gap:8,backdropFilter:"blur(4px)"}}>
        <span>⚠</span>{error}
      </div>
    )}

    {/* Your Name */}
  <div style={{
  display:"grid",
  gridTemplateColumns:"repeat(2, minmax(0, 1fr))",
  gap:18,
  marginBottom:20
}}>
  <div>
    <label style={{display:"block",fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(212,168,67,0.42)",marginBottom:7}}>Your Name</label>
    <input className="modal-input" type="text" value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="Enter your name..." maxLength={20}/>
  </div>

  <div>
    <label style={{display:"block",fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(212,168,67,0.42)",marginBottom:7}}>Room Name</label>
    <input className="modal-input" type="text" value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="Enter room name..." maxLength={30}/>
  </div>
</div>

 {/* Game Mode */}
<div style={{marginBottom:0}}>
  <label style={{
    display:"block",
    fontSize:10,
    letterSpacing:"0.22em",
    textTransform:"uppercase",
    color:"rgba(212,168,67,0.42)",
    marginBottom:12
  }}>
    Game Mode
  </label>

  <div style={{
    display:"grid",
    gridTemplateColumns:"repeat(3, minmax(0, 1fr))",
    gap:18
  }}>
    {[
      {
        icon:"⚔️",
        title:"Classic Boards",
        subtitle:"2 Players",
        modes:["8x8","12x12","16x16"] as GameMode[],
      },
      {
        icon:"🔺",
        title:"Tri Boards",
        subtitle:"3 Players",
        modes:["tri-8x8","tri-12x12","tri-16x16"] as GameMode[],
      },
      {
        icon:"✦",
        title:"X Boards",
        subtitle:"4 Players",
        modes:["x-8x8","x-12x12","x-16x16"] as GameMode[],
      },
    ].map((group)=>(
      <div key={group.title} style={{
        minHeight:360,
        padding:"18px",
        borderRadius:24,
        background:"linear-gradient(145deg,rgba(0,0,0,.58),rgba(18,12,3,.52))",
        border:"1px solid rgba(212,168,67,.14)",
        boxShadow:"0 18px 45px rgba(0,0,0,.45), inset 0 1px 0 rgba(212,168,67,.12)"
      }}>
        <div style={{
          display:"flex",
          alignItems:"center",
          gap:12,
          marginBottom:16,
          paddingBottom:13,
          borderBottom:"1px solid rgba(212,168,67,.13)"
        }}>
          <div style={{
            width:42,
            height:42,
            borderRadius:14,
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            background:"linear-gradient(145deg,#211707,#050505)",
            border:"1px solid rgba(212,168,67,.2)",
            boxShadow:"inset 0 1px 0 rgba(255,255,255,.08),0 10px 22px rgba(0,0,0,.55)",
            fontSize:22
          }}>
            {group.icon}
          </div>

          <div>
            <p style={{
              margin:0,
              fontSize:13,
              fontWeight:900,
              color:"#e8c96a",
              letterSpacing:".13em",
              textTransform:"uppercase"
            }}>
              {group.title}
            </p>
            <p style={{
              margin:"4px 0 0",
              fontSize:10,
              color:"rgba(212,168,67,.48)",
              letterSpacing:".12em",
              textTransform:"uppercase"
            }}>
              {group.subtitle}
            </p>
          </div>
        </div>

        <div style={{display:"grid",gap:12}}>
          {group.modes.map((mode)=>{
            const cfg = MODE_CONFIG[mode];
            if (!cfg) return null;

            const selected = selectedMode === mode;

            return(
              <button
                key={mode}
                className={`mode-btn ${selected?"selected":""}`}
                onClick={()=>setSelectedMode(mode)}
                style={{
                  minHeight:78,
                  borderRadius:18,
                  padding:"12px 14px",
                  background:selected
                    ? "linear-gradient(145deg,rgba(212,168,67,.18),rgba(0,0,0,.55))"
                    : "linear-gradient(145deg,rgba(0,0,0,.45),rgba(255,255,255,.025))",
                  border:`1px solid ${selected?"rgba(212,168,67,.55)":"rgba(212,168,67,.14)"}`,
                  boxShadow:selected
                    ? "0 0 24px rgba(212,168,67,.18), inset 0 1px 0 rgba(255,255,255,.10)"
                    : "0 8px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04)"
                }}
              >
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <img
                    src={MODE_ICONS[mode]}
                    alt={mode}
                    className="mode-icon"
                    style={{
                      width:44,
                      height:44,
                      objectFit:"contain",
                      filter:"brightness(1.35) saturate(1.5) contrast(1.15)",
                      flexShrink:0
                    }}
                  />

                  <div style={{flex:1,minWidth:0}}>
                    <div style={{
                      fontSize:14,
                      fontFamily:"Georgia,serif",
                      color:selected?"#f5d36f":"rgba(232,201,106,.82)",
                      fontWeight:800,
                      whiteSpace:"nowrap",
                      overflow:"hidden",
                      textOverflow:"ellipsis"
                    }}>
                      {cfg.label}
                    </div>

                    <div style={{
                      fontSize:10,
                      color:"rgba(220,180,100,.58)",
                      marginTop:4,
                      lineHeight:1.35
                    }}>
                      {cfg.description}
                    </div>
                  </div>

                  <span style={{
                    fontSize:9,
                    padding:"4px 8px",
                    borderRadius:8,
                    fontWeight:800,
                    letterSpacing:"0.08em",
                    flexShrink:0,
                    background:selected?"rgba(212,168,67,0.22)":"rgba(0,0,0,0.35)",
                    color:selected?"#f5d36f":"rgba(180,120,50,0.45)",
                    border:`1px solid ${selected?"rgba(212,168,67,0.45)":"rgba(212,168,67,0.10)"}`,
                  }}>
                    {mode}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
</div>




    {/* Submit */}
    <button
      className="create-submit"
      onClick={handleCreate}
      disabled={!canCreate||loading}
      style={{
        background:canCreate&&!loading?"linear-gradient(135deg,#d4a843,#c4912a,#b8862e)":"rgba(0,0,0,0.4)",
        color:canCreate&&!loading?"#1a0d00":"rgba(180,120,50,0.3)",
        border:canCreate&&!loading?"none":"1px solid rgba(212,168,67,0.08)",
        boxShadow:canCreate&&!loading?"0 8px 28px rgba(212,168,67,0.3),inset 0 1px 0 rgba(255,255,255,0.18)":"none",
      }}
    >
      {loading?"Creating...":"Create Room ⚔️"}
    </button>

  </div>
</div>
    </>
  );
}