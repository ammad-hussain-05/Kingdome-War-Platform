"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getActiveSocket } from "@/lib/lobby/room-store";
import { createSocket } from "@/lib/lobby/socket-client";
import { setActiveSocket } from "@/lib/lobby/room-store";
import { Room, MODE_CONFIG } from "@/lib/lobby/types";
import { getModeFromRoomId } from "@/lib/lobby/id-generator";
import Image from "next/image";

const MODES = [
  {
    id: "8x8",
    label: "Basic War",
    board: "8 × 8",
    players: "2 Players",
    accent: "#d4a843", // Changed from blue to golden
    description: "The classic duel. Two kingdoms clash on a compact battlefield.",
    icon: "/icons/basic.png",
    glowColor: "rgba(212,168,67,0.35)", // Changed to golden glow
  },
  {
    id: "12x12",
    label: "Kingdom War",
    board: "12 × 12",
    players: "3 Players",
    accent: "#b8932e", // Changed from green to deep brown/gold
    description: "Three rival kingdoms fight for supremacy.",
    icon: "/icons/kingdome.png",
    glowColor: "rgba(184,147,46,0.35)", // Changed to golden glow
  },
  {
    id: "16x16",
    label: "Empire",
    board: "16 × 16",
    players: "4 Players",
    accent: "#e8c96a", // Kept golden
    description: "The grand war. Four empires collide on a massive board.",
    icon: "/icons/empire.png",
    glowColor: "rgba(232,201,106,0.35)", // Added matching glow
  },
];

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const roomMode = getModeFromRoomId(roomId);

  useEffect(() => {
    let socket = getActiveSocket();

    if (!socket || !socket.connected) {
      socket = createSocket();
      setActiveSocket(socket);
      socket.connect();
    }

    const handleRoomUpdate = (data: Room) => {
      if (data.id === roomId) setRoom(data);
    };

    socket.on("room:updated", handleRoomUpdate);
    socket.on("connect", () => {
      socket!.emit("room:get", { roomId });
    });

    if (socket.connected) {
      socket.emit("room:get", { roomId });
    }

    return () => {
      socket!.off("room:updated", handleRoomUpdate);
    };
  }, [roomId]);

  const handleModeSelect = (selectedMode: string) => {
    if (selectedMode !== roomMode) {
      setError(`❌ This room is for ${roomMode} mode only! You cannot enter a different board.`);
      return;
    }
    router.push(`/game/${roomId}/board`);
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes iconFloat {
          0%,100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-8px) scale(1.04); }
        }
        @keyframes cardGlow {
          0%,100% { box-shadow: 0 8px 40px rgba(0,0,0,0.6); }
          50%      { box-shadow: 0 8px 60px rgba(0,0,0,0.8); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); opacity:.6; }
          100% { transform: scale(1.15); opacity:0; }
        }

        .mode-card {
          position: relative;
          border-radius: 20px;
          padding: 32px 28px 28px;
          display: flex;
          flex-direction: column;
          transition: transform 0.35s cubic-bezier(.23,1,.32,1), box-shadow 0.35s ease, border-color 0.3s;
          backdrop-filter: blur(20px);
          overflow: hidden;
        }
        .mode-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%);
          pointer-events: none;
          border-radius: 20px;
        }
        .mode-card.allowed:hover {
          transform: translateY(-8px) scale(1.02);
        }
        .mode-card.allowed:hover .card-icon {
          animation: iconFloat 2s ease-in-out infinite;
        }

        .enter-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(.23,1,.32,1);
          border: none;
          cursor: pointer;
        }
        .enter-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: shimmer 2.5s infinite;
        }
        .enter-btn:not(:disabled):hover {
          transform: translateY(-2px);
          filter: brightness(1.15);
        }
        .enter-btn:disabled { cursor: not-allowed; }

        @media (max-width: 768px) {
          .modes-grid { grid-template-columns: 1fr !important; }
          .mode-card  { padding: 24px 20px 20px !important; }
        }
        @media (max-width: 480px) {
          .page-title  { font-size: 2rem !important; }
          .back-btn    { top: 16px !important; left: 16px !important; }
        }
      `}</style>

      {/* ✅ Video — fixed, full page cover (UNTOUCHED) */}
      <video
        autoPlay loop muted playsInline
        style={{
          position: "fixed", top: 0, left: 0,
          width: "100vw", height: "100vh",
          objectFit: "cover", zIndex: 2, pointerEvents: "none",
        }}
      >
        <source src="https://www.pexels.com/download/video/25792126/" type="video/mp4" />
      </video>

      {/* ✅ Dark overlay (UNTOUCHED) */}
      <div style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100vh",
        background: "rgba(4,2,0,0.78)",
        zIndex: 1, pointerEvents: "none",
      }} />

      {/* Page */}
      <div className="relative min-h-screen flex flex-col items-center px-4 overflow-hidden" style={{ zIndex: 2 }}>
        <div className="relative w-full pb-16" style={{ paddingTop: "clamp(80px,12vw,120px)", maxWidth: 1100, margin: "0 auto" }}>

          {/* Back (UNTOUCHED LOGIC) */}
          <button
            className="back-btn"
            onClick={() => router.push("/lobby")}
            style={{
              position: "absolute", top: 128, left: 0,
              fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase",
              color: "rgba(220,180,100,.7)", background: "none", border: "none",
              cursor: "pointer", fontWeight: 700, transition: "color .2s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#d4a843"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(220,180,100,.7)"}
          >
            ← Back to Lobby
          </button>

          {/* Header (Colors updated to brown/gold/white) */}
          <div style={{ textAlign: "center", marginBottom: 48, animation: "fadeUp .7s cubic-bezier(.23,1,.32,1) both" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              marginBottom: 16, padding: "6px 18px", borderRadius: 999,
              background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.35)",
            }}>
              <span style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "#e8c96a", fontWeight: 800 }}>
                ⚔ Game Started
              </span>
            </div>

            <h1 className="page-title" style={{
              fontSize: "clamp(2rem,6vw,3.8rem)", fontFamily: "Georgia,serif",
              color: "#fff", fontWeight: 800, margin: "0 0 12px",
              textShadow: "0 2px 24px rgba(0,0,0,0.9)",
            }}>
              Select Your Board
            </h1>

            <p style={{ fontSize: 18, color: "rgba(220,180,100,.75)", fontWeight: 600, marginBottom: 6 }}>
              Room ID :{" "}
              <span style={{ color: "#e8c96a", fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.1em" }}>
                {roomId}
              </span>
            </p>

            {roomMode && (
              <p style={{ fontSize: 15, color: "rgba(255,255,255,.55)", fontWeight: 600 }}>
                This room supports :{" "}
                <span style={{ color: "#d4a843",fontSize: 18, fontWeight: 800 }}>{roomMode}  mode only</span>
              </p>
            )}
          </div>

          {/* Error (Colors updated to brown/gold) */}
          {error && (
            <div style={{
              maxWidth: 640, margin: "0 auto 32px",
              padding: "14px 20px", borderRadius: 12, textAlign: "center",
              background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.4)",
              color: "#e8c96a", fontSize: 14, fontWeight: 700,
            }}>
              {error}
            </div>
          )}

          {/* Mode Cards (Transparent glass bg + brown/gold colors) */}
          <div className="modes-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}>
            {MODES.map((mode, idx) => {
              const isAllowed = mode.id === roomMode;
              const isHovered = hoveredId === mode.id;

              return (
                <div
                  key={mode.id}
                  className={`mode-card ${isAllowed ? "allowed" : ""}`}
                  onClick={() => handleModeSelect(mode.id)}
                  onMouseEnter={() => isAllowed && setHoveredId(mode.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
  position: "relative",
  background: "#000", // 👈 PURE BLACK CARD
  border: `1px solid ${
    isAllowed
      ? isHovered
        ? mode.accent + "80"
        : mode.accent + "40"
      : "rgba(255,255,255,0.08)"
  }`,
  opacity: isAllowed ? 1 : 0.38,
  cursor: isAllowed ? "pointer" : "not-allowed",

  boxShadow:
    isAllowed && isHovered
      ? `0 25px 80px ${mode.glowColor}, 0 0 0 1px ${mode.accent}30`
      : "0 8px 40px rgba(0,0,0,0.8)",

  animation: `fadeUp .6s ${idx * 0.1}s cubic-bezier(.23,1,.32,1) both`,

  // 👇 3D SETUP
  transformStyle: "preserve-3d",
  transition: "transform 0.35s ease, box-shadow 0.35s ease, border 0.35s ease",
}}
                >


  <video
    autoPlay
    loop
    muted
    playsInline
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      zIndex: -3,
      opacity: 0.8,
    }}
  >
    <source src="https://www.pexels.com/download/video/35673333/" type="video/mp4" />
  </video>
                  {/* Badge */}
                  <div style={{
                    position: "absolute", top: 14, right: 14,
                    padding: "4px 10px", borderRadius: 999,
                    background: isAllowed ? "rgba(212,168,67,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isAllowed ? "rgba(212,168,67,0.4)" : "rgba(255,255,255,0.1)"}`,
                    color: isAllowed ? "#e8c96a" : "rgba(255,255,255,0.4)",
                    fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 800,
                  }}>
                    {isAllowed ? "✓ Your Mode" : "🔒 Locked"}
                  </div>

                  {/* Icon */}
                  <div className="card-icon" style={{
                    width: 110, height: 110, marginBottom: 24,
                    position: "relative",
                  }}>
                    <img
                      src={mode.icon}
                      alt={mode.label}
                      style={{
                        width: 180, height: 100,
                        objectFit: "cover",
                        position: "relative", zIndex: 1,
                        opacity: isAllowed ? 1 : 0.25,
                      }}
                    />
                  </div>

                  {/* Tags */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 6,
                      background: `${mode.accent}22`, color: mode.accent,
                      fontWeight: 800, border: `1px solid ${mode.accent}30`,
                    }}>
                      {mode.board}
                    </span>
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 6,
                      background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)",
                      fontWeight: 700, border: "1px solid rgba(255,255,255,0.1)",
                    }}>
                      {mode.players}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 style={{
                    fontSize: "clamp(18px,2.9vw,30px)",
                    fontFamily: "Georgia,serif",
                    color: isAllowed ? "#fff" : "rgba(255,255,255,0.2)",
                    marginBottom: 10, fontWeight: 800,
                    textShadow: isAllowed ? "0 2px 12px rgba(0,0,0,0.8)" : "none",
                  }}>
                    {mode.label}
                  </h2>

                  {/* Description */}
                  <p style={{
                    fontSize: 16,
                    color: isAllowed ? "rgba(220,200,160,0.85)" : "rgba(255,255,255,0.18)",
                    lineHeight: 1.65, flex: 1, marginBottom: 24, fontWeight: 600,
                  }}>
                    {mode.description}
                  </p>

                  {/* Divider */}
                  {isAllowed && (
                    <div style={{
                      height: 1, marginBottom: 20,
                      background: `linear-gradient(to right, transparent, ${mode.accent}50, transparent)`,
                    }} />
                  )}

                  {/* Button (UNTOUCHED LOGIC, only colors updated) */}
                  <button
                    className="enter-btn"
                    onClick={e => { e.stopPropagation(); handleModeSelect(mode.id); }}
                    disabled={!isAllowed}
                    style={{
                      width: "100%", padding: "14px",
                      borderRadius: 12, fontWeight: 800,
                      letterSpacing: "0.15em", textTransform: "uppercase",
                      fontSize: 12,
                      background: isAllowed
                        ? `linear-gradient(135deg, ${mode.accent}, ${mode.accent}aa)`
                        : "rgba(255,255,255,0.04)",
                      color: isAllowed ? "#1a0d00" : "rgba(255,255,255,0.12)",
                    }}
                  >
                    {isAllowed ? "Enter Battle →" : "Not Available"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}