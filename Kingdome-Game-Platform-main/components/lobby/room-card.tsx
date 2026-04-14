"use client";

import { useRouter } from "next/navigation";
import { Room, COLOR_STYLES } from "@/lib/lobby/types";

const MODE_COLORS: Record<string, string> = {
  "8x8": "#6b9fd4",
  "12x12": "#7dbd6e",
  "16x16": "#d4a843",
};

const MODE_LABELS: Record<string, string> = {
  "8x8": "Basic War",
  "12x12": "Kingdom War",
  "16x16": "Empire",
};

const MODE_ICONS: Record<string, string> = {
  "8x8": "⚔️",
  "12x12": "🏰",
  "16x16": "👑",
};

export default function RoomCard({ room }: { room: Room }) {
  const router = useRouter();
  const color = MODE_COLORS[room.mode];
  const isFull = room.players.length >= room.maxPlayers;

  return (
    <div
      onClick={() => !isFull && router.push(`/room/${room.id}`)}
      style={{
        borderRadius: 16,
        padding: "18px 20px",
        cursor: isFull ? "not-allowed" : "pointer",
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${color}25`,
        backdropFilter: "blur(8px)",
        transition: "all 0.3s cubic-bezier(0.23,1,0.32,1)",
        opacity: isFull ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        if (!isFull) {
          (e.currentTarget as HTMLDivElement).style.borderColor = `${color}55`;
          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.3), 0 0 30px ${color}15`;
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${color}25`;
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: `${color}15`,
            border: `1px solid ${color}25`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
          }}>
            {MODE_ICONS[room.mode]}
          </div>
          <div>
            <div style={{ fontSize: 15, fontFamily: "Georgia, serif", color: "#e8d8b0", fontWeight: 600 }}>
              {room.name}
            </div>
            <div style={{ fontSize: 11, color: "rgba(180,120,50,0.5)", marginTop: 2, fontFamily: "monospace", letterSpacing: "0.05em" }}>
              {room.id}
            </div>
          </div>
        </div>

        {/* Right badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, padding: "4px 8px", borderRadius: 6,
            background: `${color}15`, color, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            {MODE_LABELS[room.mode]}
          </span>
          <span style={{
            fontSize: 10, padding: "4px 8px", borderRadius: 6,
            background: isFull ? "rgba(220,60,60,0.1)" : "rgba(125,189,110,0.1)",
            color: isFull ? "#ff8080" : "#7dbd6e",
            fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            {isFull ? "Full" : "Open"}
          </span>
        </div>
      </div>

      {/* Players row */}
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Array.from({ length: room.maxPlayers }).map((_, i) => {
            const player = room.players[i];
            const colorStyle = player ? COLOR_STYLES[player.color] : null;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20,
                background: player ? `${color}12` : "rgba(255,255,255,0.02)",
                border: `1px solid ${player ? color + "30" : "rgba(255,255,255,0.05)"}`,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: colorStyle ? colorStyle.css : "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }} />
                <span style={{
                  fontSize: 11,
                  color: player ? "rgba(232,216,176,0.8)" : "rgba(255,255,255,0.15)",
                }}>
                  {player ? player.name : "Empty"}
                </span>
              </div>
            );
          })}
        </div>

        <span style={{ fontSize: 11, color: `${color}80` }}>
          {room.players.length}/{room.maxPlayers} players
        </span>
      </div>
    </div>
  );
}