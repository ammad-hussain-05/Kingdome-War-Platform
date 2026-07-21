"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getActiveSocket, setActiveSocket } from "@/lib/lobby/room-store";
import { createSocket } from "@/lib/lobby/socket-client";
import { Room } from "@/lib/lobby/types";
import { getModeFromRoomId } from "@/lib/lobby/id-generator";
import { Footer } from "@/components/footer";
import { DisclaimerFeedback } from "@/components/disclaimer-feedback";

const MODES = [
  {
    id: "8x8",
    label: "Basic War",
    board: "8 × 8",
    players: "2 Players",
    description: "The classic duel. Two kingdoms clash on a compact battlefield.",
    icon: "/icons/basic.png",
  },
  {
    id: "12x12",
    label: "Kingdom War",
    board: "12 × 12",
    players: "2 Players",
    description: "Two kingdoms clash on a larger battlefield.",
    icon: "/icons/kingdome.png",
  },
  {
    id: "16x16",
    label: "Empire",
    board: "16 × 16",
    players: "2 Players",
    description: "A grand two-player empire war on a massive board.",
    icon: "/icons/empire.png",
  },
  {
    id: "tri-8x8",
    label: "Basic Tri War",
    board: "Tri 8 × 8",
    players: "3 Players",
    description: "Three kingdoms enter a connected triangular battlefield.",
    icon: "/icons/basic.png",
  },
  {
    id: "tri-12x12",
    label: "Kingdom Tri War",
    board: "Tri 12 × 12",
    players: "3 Players",
    description: "A three-player triangular kingdom war with larger tactical space.",
    icon: "/icons/kingdome.png",
  },
  {
    id: "tri-16x16",
    label: "Empire Tri War",
    board: "Tri 16 × 16",
    players: "3 Players",
    description: "Three empires fight through a connected tri-board battlefield.",
    icon: "/icons/empire.png",
  },
  {
    id: "x-8x8",
    label: "Basic X War",
    board: "X 8 × 8",
    players: "4 Players",
    description: "Four kingdoms connect through an X-board battlefield.",
    icon: "/icons/basic.png",
  },
  {
    id: "x-12x12",
    label: "Kingdom X War",
    board: "X 12 × 12",
    players: "4 Players",
    description: "Four kingdoms clash across connected square board zones.",
    icon: "/icons/kingdome.png",
  },
  {
    id: "x-16x16",
    label: "Empire X War",
    board: "X 16 × 16",
    players: "4 Players",
    description: "A massive four-player empire battlefield with X-board connection.",
    icon: "/icons/empire.png",
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
          from { opacity:0; transform:translateY(26px); }
          to { opacity:1; transform:translateY(0); }
        }

        @keyframes goldPulse {
          0%,100% {
            box-shadow:
              0 0 0 1px rgba(212,168,67,.55),
              0 0 34px rgba(212,168,67,.38),
              0 0 90px rgba(212,168,67,.14);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(245,211,111,.9),
              0 0 48px rgba(212,168,67,.55),
              0 0 130px rgba(212,168,67,.25);
          }
        }

        @keyframes goldLineMove {
          0% { transform:translateX(-120%); opacity:.2; }
          35% { opacity:1; }
          100% { transform:translateX(240%); opacity:.2; }
        }

        @keyframes iconFloat {
          0%,100% { transform:translateY(0) scale(1); }
          50% { transform:translateY(-7px) scale(1.05); }
        }

        @keyframes shimmer {
          0% { background-position:-220% center; }
          100% { background-position:220% center; }
        }

        .board-grid {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:26px;
        }

        .battle-card {
          position:relative;
          min-height:390px;
          border-radius:26px;
          padding:34px;
          overflow:hidden;
          background:
            radial-gradient(circle at 50% 0%,rgba(255,210,110,.08),transparent 36%),
            linear-gradient(180deg,rgba(18,18,17,.96),rgba(7,7,7,.98));
          border:1px solid rgba(212,168,67,.26);
          transition:transform .35s ease, opacity .35s ease, filter .35s ease;
          animation:fadeUp .65s cubic-bezier(.23,1,.32,1) both;
        }

        .battle-card.allowed {
          animation:fadeUp .65s cubic-bezier(.23,1,.32,1) both, goldPulse 3.6s ease-in-out infinite;
        }

        .battle-card.allowed:hover {
          transform:translateY(-8px) scale(1.018);
        }

        .battle-card.allowed:hover .battle-icon {
          animation:iconFloat 2s ease-in-out infinite;
        }

        .battle-card.locked {
          opacity:.42;
          filter:grayscale(.45);
        }

        .battle-card::before {
          content:"";
          position:absolute;
          inset:1px;
          border-radius:25px;
          background:
            linear-gradient(135deg,rgba(255,255,255,.06),transparent 36%),
            radial-gradient(circle at 50% 100%,rgba(212,168,67,.10),transparent 36%);
          pointer-events:none;
          z-index:1;
        }

        .battle-card::after {
          content:"";
          position:absolute;
          left:28px;
          right:28px;
          bottom:0;
          height:2px;
          background:linear-gradient(90deg,transparent,#8a4f10,#f0c75e,#d4a843,transparent);
          filter:blur(.6px);
          opacity:.8;
          z-index:3;
        }

        .gold-runner {
          position:absolute;
          left:0;
          bottom:0;
          width:42%;
          height:2px;
          background:linear-gradient(90deg,transparent,#fff0a8,#d4a843,transparent);
          filter:blur(.7px);
          animation:goldLineMove 3.8s linear infinite;
          z-index:4;
        }

        .enter-btn {
          position:relative;
          overflow:hidden;
          transition:all .25s ease;
        }

        .enter-btn::after {
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.24) 50%,transparent 60%);
          background-size:220% 100%;
          animation:shimmer 3s infinite;
          pointer-events:none;
        }

        .enter-btn:not(:disabled):hover {
          transform:translateY(-2px);
          filter:brightness(1.1);
        }

        @media (max-width:1100px) {
          .board-grid {
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width:760px) {
          .board-grid {
            grid-template-columns:1fr;
          }

          .battle-card {
            min-height:340px;
            padding:26px;
          }

          .back-btn {
            position:relative !important;
            top:auto !important;
            left:auto !important;
            margin-bottom:24px !important;
          }
        }
      `}</style>

      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <source src="/video/background-game.mp4" type="video/mp4" />
      </video>

      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle at center,rgba(40,24,8,.35),rgba(0,0,0,.86) 58%,#000 100%)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 3, minHeight: "100vh", padding: "125px 24px 90px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative" }}>
          <button
            className="back-btn"
            onClick={() => router.push("/lobby")}
            style={{
              position: "absolute",
              top: 8,
              left: 0,
              background: "rgba(0,0,0,.35)",
              border: "1px solid rgba(212,168,67,.25)",
              color: "rgba(240,210,138,.72)",
              borderRadius: 999,
              padding: "9px 14px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            ← Back
          </button>

          <div style={{ textAlign: "center", marginBottom: 42 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(40px,6vw,76px)",
                fontFamily: "Georgia,serif",
                color: "#fff",
                fontWeight: 900,
                lineHeight: 1,
                textShadow: "0 5px 30px rgba(0,0,0,.9)",
              }}
            >
              Select Your Board
            </h1>

            <p style={{ margin: "18px 0 0", color: "rgba(240,210,138,.72)", fontWeight: 800 }}>
              Room ID:{" "}
              <span style={{ color: "#f0c75e", fontFamily: "monospace", letterSpacing: ".08em" }}>
                {roomId}
              </span>
            </p>

            {roomMode && (
              <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.62)", fontWeight: 700 }}>
                This room supports:{" "}
                <span style={{ color: "#d4a843", fontWeight: 900 }}>{roomMode} mode only</span>
              </p>
            )}
          </div>

          {error && (
            <div
              style={{
                maxWidth: 760,
                margin: "0 auto 28px",
                padding: "14px 18px",
                borderRadius: 14,
                background: "rgba(80,20,10,.42)",
                border: "1px solid rgba(212,168,67,.38)",
                color: "#f0c75e",
                textAlign: "center",
                fontWeight: 800,
              }}
            >
              {error}
            </div>
          )}

          <div className="board-grid">
            {MODES.map((mode, idx) => {
              const isAllowed = mode.id === roomMode;
              const isHovered = hoveredId === mode.id;

              return (
                <div
                  key={mode.id}
                  className={`battle-card ${isAllowed ? "allowed" : "locked"}`}
                  onClick={() => handleModeSelect(mode.id)}
                  onMouseEnter={() => isAllowed && setHoveredId(mode.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    animationDelay: `${idx * 0.05}s`,
                    cursor: isAllowed ? "pointer" : "not-allowed",
                    transform: isHovered ? "translateY(-8px) scale(1.018)" : undefined,
                  }}
                >
                  <div className="gold-runner" />

                  <div
                    style={{
                      position: "absolute",
                      top: 20,
                      right: 20,
                      zIndex: 5,
                      padding: "7px 14px",
                      borderRadius: 999,
                      background: isAllowed ? "rgba(212,168,67,.18)" : "rgba(255,255,255,.045)",
                      border: isAllowed
                        ? "1px solid rgba(212,168,67,.48)"
                        : "1px solid rgba(255,255,255,.11)",
                      color: isAllowed ? "#f5d36f" : "rgba(255,255,255,.45)",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {isAllowed ? "✓ Your Mode" : "🔒 Locked"}
                  </div>

                  <div style={{ position: "relative", zIndex: 5 }}>
                    <div
                      className="battle-icon"
                      style={{
                        width: 120,
                        height: 92,
                        marginBottom: 22,
                        opacity: isAllowed ? 1 : 0.38,
                      }}
                    >
                      <img
                        src={mode.icon}
                        alt={mode.label}
                        style={{
                          width: 132,
                          height: 92,
                          objectFit: "contain",
                          filter: isAllowed
                            ? "drop-shadow(0 12px 20px rgba(0,0,0,.75)) brightness(1.25)"
                            : "grayscale(1) brightness(.6)",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                      <span
                        style={{
                          padding: "6px 13px",
                          borderRadius: 10,
                          background: "rgba(212,168,67,.16)",
                          color: "#d4a843",
                          border: "1px solid rgba(212,168,67,.28)",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {mode.board}
                      </span>
                      <span
                        style={{
                          padding: "6px 13px",
                          borderRadius: 10,
                          background: "rgba(255,255,255,.07)",
                          color: "rgba(255,255,255,.74)",
                          border: "1px solid rgba(255,255,255,.12)",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {mode.players}
                      </span>
                    </div>

                    <h2
                      style={{
                        margin: "0 0 14px",
                        fontSize: "clamp(28px,3vw,44px)",
                        color: isAllowed ? "#fff" : "rgba(255,255,255,.48)",
                        fontFamily: "Georgia,serif",
                        fontWeight: 900,
                        lineHeight: 1.05,
                        textShadow: "0 2px 18px rgba(0,0,0,.8)",
                      }}
                    >
                      {mode.label}
                    </h2>

                    <p
                      style={{
                        margin: "0 0 28px",
                        color: isAllowed ? "rgba(245,226,190,.82)" : "rgba(255,255,255,.45)",
                        fontSize: 17,
                        lineHeight: 1.55,
                        fontWeight: 650,
                        maxWidth: 390,
                      }}
                    >
                      {mode.description}
                    </p>

                    <button
                      className="enter-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModeSelect(mode.id);
                      }}
                      disabled={!isAllowed}
                      style={{
                        width: "100%",
                        height: 64,
                        borderRadius: 15,
                        border: isAllowed
                          ? "1px solid rgba(255,230,150,.5)"
                          : "1px solid rgba(255,255,255,.08)",
                        background: isAllowed
                          ? "linear-gradient(180deg,#f6ce63,#d4a843 55%,#9a6618)"
                          : "rgba(255,255,255,.045)",
                        color: isAllowed ? "#120800" : "rgba(255,255,255,.26)",
                        fontSize: 14,
                        fontWeight: 900,
                        letterSpacing: ".18em",
                        textTransform: "uppercase",
                        cursor: isAllowed ? "pointer" : "not-allowed",
                        boxShadow: isAllowed ? "0 0 32px rgba(212,168,67,.30)" : "none",
                      }}
                    >
                      {isAllowed ? "Enter Battle →" : "Not Available"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DisclaimerFeedback />
      <Footer />
    </>
  );
}