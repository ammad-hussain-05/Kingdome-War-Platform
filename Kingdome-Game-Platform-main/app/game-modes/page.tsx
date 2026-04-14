"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const MODES = [
  {
    id: "8x8",
    label: "Basic War",
    board: "8 × 8",
    players: "2 Players",
    colors: ["⬜ White", "⬛ Black"],
    accent: "#6b9fd4",
    description:
      "The classic duel. Two kingdoms clash on a compact battlefield. Simple rules, deep strategy.",
    icon: "⚔️",
  },
  {
    id: "12x12",
    label: "Kingdom War",
    board: "12 × 12",
    players: "3 Players",
    colors: ["⬜ White", "⬛ Black", "🩶 Grey"],
    accent: "#7dbd6e",
    description:
      "Three rival kingdoms fight for supremacy. Alliances form and break in the heat of battle.",
    icon: "🏰",
  },
  {
    id: "16x16",
    label: "Empire",
    board: "16 × 16",
    players: "4 Players",
    colors: ["⬜ White", "⬛ Black", "🥇 Gold", "🥈 Silver"],
    accent: "#d4a843",
    description:
      "The grand war. Four empires collide on a massive board. Only one crown survives.",
    icon: "👑",
  },
];

function GameModesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");

  return (
    <div className="relative min-h-screen flex flex-col items-center px-4 overflow-hidden">
      {/* VIDEO BACKGROUND */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
        src="https://www.pexels.com/download/video/12783148/"
      />

      {/* DARK OVERLAY FOR TRANSPARENCY READABILITY */}
      <div className="fixed inset-0 z-[1] bg-black/50 backdrop-blur-sm" />

      {/* CONTENT WRAPPER */}
      <div
        className="relative z-10 w-full px-4 pb-16"
        style={{ paddingTop: "120px" }}
      >
        {/* Back Button - EXACTLY AS ORIGINAL */}
        <button
          onClick={() => router.back()}
          className="absolute top-28 left-6 text-sm tracking-wider hover:text-white transition-colors"
          style={{ color: "#6b4a20" }}
        >
          ← Back
        </button>

        {/* Header - Text colors adjusted just to be visible on video */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <p
            className="text-xs tracking-[0.4em] uppercase mb-3"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Choose Your Battle
          </p>
          <h1
            className="text-5xl font-bold mb-4"
            style={{
              color: "#d4a843",
              fontFamily: "Georgia, serif",
              textShadow: "0 0 40px rgba(212,168,67,0.3)",
            }}
          >
            Game Modes
          </h1>
          <p
            className="text-sm"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Select the mode you want to play
          </p>
        </div>

        {/* Cards - Transparent background added, logic untouched */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODES.map((mode) => (
            <div
              key={mode.id}
              className="rounded-2xl p-8 flex flex-col transition-all duration-300 hover:scale-[1.03] cursor-pointer backdrop-blur-2xl"
              style={{
                background: "rgba(10, 5, 2, 0.4)", // Made transparent
                border: `1px solid ${mode.accent}33`,
                boxShadow: `0 0 30px ${mode.accent}10`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${mode.accent}88`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 50px ${mode.accent}25`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${mode.accent}33`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 30px ${mode.accent}10`;
              }}
            >
              <div className="text-5xl mb-5">{mode.icon}</div>

              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs px-2 py-0.5 rounded font-bold tracking-wider"
                  style={{ background: `${mode.accent}22`, color: mode.accent }}
                >
                  {mode.board}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded font-bold tracking-wider"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}
                >
                  {mode.players}
                </span>
              </div>

              <h2
                className="text-2xl font-bold mb-3"
                style={{ color: mode.accent, fontFamily: "Georgia, serif" }}
              >
                {mode.label}
              </h2>

              <p
                className="text-sm leading-relaxed mb-6 flex-1"
                style={{ color: "rgba(255,255,255,0.6)" }} // Adjusted for transparent bg
              >
                {mode.description}
              </p>

              <div className="flex flex-wrap gap-1 mb-6">
                {mode.colors.map((c) => (
                  <span
                    key={c}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}
                  >
                    {c}
                  </span>
                ))}
              </div>

              {/* SELECT BUTTON - EXACTLY AS ORIGINAL */}
              <button
                onClick={() => {
                  if (roomId) {
                    router.push(`/room/${roomId}`);
                  } else {
                    router.push(`/lobby?mode=${mode.id}`);
                  }
                }}
                className="w-full py-3 rounded-xl font-bold tracking-widest uppercase text-sm transition-all duration-200 hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${mode.accent}, ${mode.accent}99)`,
                  color: "#1a0d00",
                }}
              >
                Select
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GameModesPage() {
  return (
    <Suspense>
      <GameModesContent />
    </Suspense>
  );
}