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
        .join-input { width: 100%; padding: 13px 16px; border-radius: 11px; background: rgba(0,0,0,0.45); border: 1px solid rgba(212,168,67,0.18); color: #e8d8b0; outline: none; font-family: Georgia, serif; font-size: 14px; transition: border-color 0.2s, box-shadow 0.2s; caret-color: #d4a843; box-sizing: border-box; }
        .join-input::placeholder { color: rgba(180,130,60,0.38); }
        .join-input:focus { border-color: rgba(212,168,67,0.48); box-shadow: 0 0 0 3px rgba(212,168,67,0.08); }
        .join-input.id-input { font-family: monospace; font-size: 15px; letter-spacing: 0.15em; text-transform: uppercase; }
      `}</style>

      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(10px)" }} />

      <div style={{ position: "fixed", inset: 0, zIndex: 51, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, pointerEvents: "none" }}>
        <div style={{
          width: "100%", maxWidth: 440,
          background: "linear-gradient(160deg,#1c1005,#2a1608,#1a0e04)",
          border: "1px solid rgba(180,120,40,0.32)",
          borderRadius: 22,
          padding: "40px 36px 36px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,168,67,0.1)",
          animation: "modalIn2 0.35s cubic-bezier(0.23,1,0.32,1) both",
          pointerEvents: "all",
          position: "relative",
        }}>

          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 34, height: 34, borderRadius: 10, background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.18)", color: "rgba(212,168,67,0.55)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>

          {/* ── Header ── */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: "linear-gradient(145deg,rgba(212,168,67,0.18),rgba(120,70,10,0.22))", border: "1px solid rgba(212,168,67,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>⚔️</div>
            <p style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(212,168,67,0.45)", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>Enter the Battlefield</p>
            <h2 style={{ fontSize: 26, fontFamily: "Georgia, serif", color: "#d4a843", margin: 0, fontWeight: 700, letterSpacing: "0.04em" }}>Join Room</h2>
            <div style={{ width: 48, height: 2, background: "linear-gradient(90deg,transparent,rgba(212,168,67,0.5),transparent)", margin: "12px auto 0", borderRadius: 2 }} />
          </div>

          {error && <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(220,60,60,0.1)", border: "1px solid rgba(220,60,60,0.22)", color: "#ff8080", fontSize: 13, fontFamily: "Georgia, serif" }}>⚠ {error}</div>}

          {/* ── Room ID ── */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(212,168,67,0.5)", marginBottom: 8, fontFamily: "Georgia, serif" }}>Room ID</label>
            <input className="join-input id-input" type="text" value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())} placeholder="KG-8-XXXXXX" maxLength={14} />
            <p style={{ fontSize: 11, color: "rgba(212,168,67,0.3)", marginTop: 6, fontFamily: "Georgia, serif" }}>Ask your friend for their room ID</p>
          </div>

          {/* ── Player Name ── */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(212,168,67,0.5)", marginBottom: 8, fontFamily: "Georgia, serif" }}>Your Name</label>
            <input className="join-input" type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Enter your name..." maxLength={20} onKeyDown={e => e.key === "Enter" && canJoin && handleJoin()} />
          </div>

          {/* ── Join Button ── */}
          <button onClick={handleJoin} disabled={!canJoin || loading} style={{
            width: "100%", padding: "14px", borderRadius: 13, fontWeight: 700,
            letterSpacing: "0.15em", textTransform: "uppercase", fontSize: 12, border: "none",
            cursor: canJoin && !loading ? "pointer" : "not-allowed",
            background: canJoin && !loading ? "linear-gradient(135deg,#c8921a,#a06c0e)" : "rgba(255,255,255,0.04)",
            color: canJoin && !loading ? "#0a0602" : "rgba(212,168,67,0.28)",
            fontFamily: "Georgia, serif",
            boxShadow: canJoin && !loading ? "0 4px 20px rgba(180,120,20,0.3)" : "none",
            transition: "all 0.3s cubic-bezier(0.23,1,0.32,1)",
          }}>
            {loading ? "Joining..." : "Join Room →"}
          </button>

        </div>
      </div>
    </>
  );
}