"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { connectSocket } from "@/lib/lobby/socket-client";

interface Props { onClose: () => void; }

export default function JoinRoomModal({ onClose }: Props) {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = () => {
    if (!roomId.trim() || !playerName.trim()) return;
    setLoading(true);
    setError("");

    const socket = connectSocket();

    const doJoin = () => {
      socket.emit("room:join", {
        roomId: roomId.trim().toUpperCase(),
        playerName: playerName.trim(),
      });
    };

    socket.once("room:joined", (room) => {
      const me = room.players.find((p: any) => p.id === socket.id);
      sessionStorage.setItem("playerName", playerName.trim());
      sessionStorage.setItem("playerColor", me?.color || "black");
      setLoading(false);
      onClose();
      router.push(`/room/${room.id}`);
    });

    socket.once("room:error", ({ message }) => {
      setLoading(false);
      setError(message);
    });

    if (socket.connected) {
      doJoin();
    } else {
      socket.once("connect", doJoin);
    }
  };

  const canJoin = roomId.trim().length > 4 && playerName.trim().length > 0;

  return (
    <>
      <style>{`
        @keyframes modalIn2 { from { opacity: 0; transform: scale(0.92) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .join-input { width: 100%; padding: 12px 16px; border-radius: 10px; background: rgba(0,0,0,0.4); border: 1px solid rgba(212,168,67,0.15); color: #e8d8b0; outline: none; font-family: Georgia, serif; font-size: 14px; transition: border-color 0.2s, box-shadow 0.2s; caret-color: #d4a843; box-sizing: border-box; }
        .join-input::placeholder { color: rgba(180,130,60,0.4); }
        .join-input:focus { border-color: rgba(212,168,67,0.5); box-shadow: 0 0 0 3px rgba(212,168,67,0.08); }
        .join-input.id-input { font-family: monospace; font-size: 16px; letter-spacing: 0.15em; text-transform: uppercase; }
      `}</style>

      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} />

      <div style={{ position: "fixed", inset: 0, zIndex: 51, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, pointerEvents: "none" }}>
        <div style={{ width: "100%", maxWidth: 440, background: "linear-gradient(145deg, #1c1005, #2a1608, #1a0e04)", border: "1px solid rgba(107,159,212,0.2)", borderRadius: 20, padding: "clamp(24px, 5vw, 40px)", boxShadow: "0 40px 100px rgba(0,0,0,0.8)", animation: "modalIn2 0.35s cubic-bezier(0.23,1,0.32,1) both", pointerEvents: "all", position: "relative" }}>
          
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(107,159,212,0.15)", color: "rgba(107,159,212,0.6)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>

          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(107,159,212,0.5)", marginBottom: 6 }}>Enter Battle</p>
            <h2 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontFamily: "Georgia, serif", color: "#6b9fd4", margin: 0 }}>Join Room</h2>
          </div>

          {error && <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(220,60,60,0.1)", border: "1px solid rgba(220,60,60,0.2)", color: "#ff8080", fontSize: 13 }}>⚠ {error}</div>}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(107,159,212,0.5)", marginBottom: 8 }}>Room ID</label>
            <input className="join-input id-input" type="text" value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())} placeholder="KG-8-XXXXXX" maxLength={14} />
            <p style={{ fontSize: 11, color: "rgba(107,159,212,0.3)", marginTop: 6 }}>Ask your friend for their room ID</p>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(107,159,212,0.5)", marginBottom: 8 }}>Your Name</label>
            <input className="join-input" type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Enter your name..." maxLength={20} onKeyDown={e => e.key === "Enter" && canJoin && handleJoin()} />
          </div>

          <button onClick={handleJoin} disabled={!canJoin || loading} style={{ width: "100%", padding: "14px", borderRadius: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", fontSize: 12, border: "none", cursor: canJoin && !loading ? "pointer" : "not-allowed", background: canJoin && !loading ? "linear-gradient(135deg, #6b9fd4, #4a7fb5)" : "rgba(255,255,255,0.04)", color: canJoin && !loading ? "#05101a" : "rgba(107,159,212,0.3)", transition: "all 0.3s cubic-bezier(0.23,1,0.32,1)" }}>
            {loading ? "Joining..." : "Join Room →"}
          </button>
        </div>
      </div>
    </>
  );
}