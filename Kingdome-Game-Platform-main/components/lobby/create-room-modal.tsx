"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { connectSocket } from "@/lib/lobby/socket-client";
import { GameMode, MODE_CONFIG } from "@/lib/lobby/types";

const MODE_ICONS: Record<GameMode, string> = {
  "8x8": "/icons/basic.png",
  "12x12": "/icons/kingdome.png",
  "16x16": "/icons/empire.png"
};
export default function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = () => {
    if (!roomName.trim() || !playerName.trim() || !selectedMode) return;
    setLoading(true);
    setError("");

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
        .modal-input {
          width: 100%; padding: 12px 16px; border-radius: 10px;
          background: rgba(0,0,0,0.4); border: 1px solid rgba(212,168,67,0.15);
          color: #e8d8b0; outline: none; font-family: Georgia, serif; font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s; caret-color: #d4a843; box-sizing: border-box;
        }
        .modal-input::placeholder { color: rgba(180,130,60,0.4); }
        .modal-input:focus { border-color: rgba(212,168,67,0.5); box-shadow: 0 0 0 3px rgba(212,168,67,0.08); }
        .mode-btn { border: 1px solid rgba(212,168,67,0.12); border-radius: 12px; padding: 14px 16px;
          background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.25s cubic-bezier(0.23,1,0.32,1);
          text-align: left; width: 100%; }
        .mode-btn:hover { background: rgba(212,168,67,0.06); border-color: rgba(212,168,67,0.3); transform: translateX(4px); }
        .mode-btn.selected { background: rgba(212,168,67,0.1); border-color: rgba(212,168,67,0.5); transform: translateX(4px); box-shadow: 0 0 20px rgba(212,168,67,0.1); }
        .create-submit { width: 100%; padding: 14px; border-radius: 12px; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase; font-size: 12px;
          transition: all 0.3s cubic-bezier(0.23,1,0.32,1); position: relative; overflow: hidden; border: none; cursor: pointer; }
        .create-submit:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(212,168,67,0.4); }
        .create-submit:disabled { cursor: not-allowed; }
      `}</style>

      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", animation: "backdropIn 0.2s ease both" }} />

      <div style={{ position: "fixed", inset: 0, zIndex: 51, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", pointerEvents: "none" }}>
        <div style={{ width: "100%", maxWidth: 480, background: "linear-gradient(145deg, #1c1005, #2a1608, #1a0e04)", border: "1px solid rgba(212,168,67,0.2)", borderRadius: 20, padding: "clamp(24px, 5vw, 40px)", boxShadow: "0 40px 100px rgba(0,0,0,0.8)", animation: "modalIn 0.35s cubic-bezier(0.23,1,0.32,1) both", pointerEvents: "all", position: "relative" }}>
          
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,168,67,0.1)", color: "rgba(212,168,67,0.6)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>

          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(212,168,67,0.5)", marginBottom: 6 }}>New Battle</p>
            <h2 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontFamily: "Georgia, serif", color: "#d4a843", margin: 0 }}>Create Room</h2>
          </div>

          {error && <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(220,60,60,0.1)", border: "1px solid rgba(220,60,60,0.2)", color: "#ff8080", fontSize: 13 }}>⚠ {error}</div>}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,168,67,0.5)", marginBottom: 8 }}>Your Name</label>
            <input className="modal-input" type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Enter your name..." maxLength={20} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,168,67,0.5)", marginBottom: 8 }}>Room Name</label>
            <input className="modal-input" type="text" value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Enter room name..." maxLength={30} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,168,67,0.5)", marginBottom: 10 }}>Game Mode</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(Object.keys(MODE_CONFIG) as GameMode[]).map((mode) => {
                const cfg = MODE_CONFIG[mode];
                const selected = selectedMode === mode;
                return (
                  <button key={mode} className={`mode-btn ${selected ? "selected" : ""}`} onClick={() => setSelectedMode(mode)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                     <img 
  src={MODE_ICONS[mode]} 
  alt={mode} 
  style={{ width: 48, height: 42, objectFit: "contain", filter: "brightness(1.3) saturate(1.6) contrast(1.2)" }}
/>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontFamily: "Georgia, serif", color: selected ? "#d4a843" : "rgba(212,168,67,0.7)", fontWeight: 600 }}>{cfg.label}</div>
                        <div style={{ fontSize: 11, color: "rgba(180,120,50,0.5)", marginTop: 2 }}>{cfg.description}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, fontWeight: 700, background: selected ? "rgba(212,168,67,0.2)" : "rgba(255,255,255,0.04)", color: selected ? "#d4a843" : "rgba(180,120,50,0.4)", letterSpacing: "0.1em" }}>{mode}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button className="create-submit" onClick={handleCreate} disabled={!canCreate || loading} style={{ background: canCreate && !loading ? "linear-gradient(135deg, #d4a843, #c4912a, #b8862e)" : "rgba(255,255,255,0.04)", color: canCreate && !loading ? "#1a0d00" : "rgba(180,120,50,0.3)", border: canCreate && !loading ? "none" : "1px solid rgba(212,168,67,0.1)" }}>
            {loading ? "Creating..." : "Create Room"}
          </button>
        </div>
      </div>
    </>
  );
}