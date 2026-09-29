"use client";

import type { CSSProperties } from "react";
import { Crown, ShieldCheck } from "lucide-react";
import { GameMode } from "@/lib/lobby/types";
import { BOARD_ACCESS_INFO } from "@/lib/lobby/board-access";

const TIER_STYLES = {
  free: {
    color: "#8fd67e",
    background: "linear-gradient(135deg,rgba(125,189,110,.22),rgba(0,0,0,.35))",
    border: "rgba(125,189,110,.5)",
    glow: "0 0 14px rgba(125,189,110,.22)",
    detail: "rgba(160,215,145,.8)",
    Icon: ShieldCheck,
  },
  premium: {
    color: "#f5d36f",
    background: "linear-gradient(135deg,rgba(212,168,67,.26),rgba(0,0,0,.35))",
    border: "rgba(212,168,67,.55)",
    glow: "0 0 14px rgba(212,168,67,.22)",
    detail: "rgba(232,201,106,.8)",
    Icon: Crown,
  },
};

// "lobby"     → FREE TRIAL / TRIAL ACCESS + "First N Days Free"
// "selection" → FREE TRIAL + "3 Days Access" / "10 DAYS TRIAL"
export default function BoardAccessBadge({
  mode,
  variant = "lobby",
  style,
}: {
  mode: GameMode;
  variant?: "lobby" | "selection";
  style?: CSSProperties;
}) {
  const info = BOARD_ACCESS_INFO[mode];
  if (!info) return null;

  const tier = TIER_STYLES[info.tier];
  const { Icon } = tier;
  const label = variant === "lobby" ? info.label : info.selectionLabel;
  const detail = variant === "lobby" ? info.duration : info.selectionDetail;

  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, ...style }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 9, fontWeight: 900, letterSpacing: "0.14em",
        padding: "4px 9px", borderRadius: 999,
        color: tier.color, background: tier.background,
        border: `1px solid ${tier.border}`, boxShadow: tier.glow,
        textTransform: "uppercase", whiteSpace: "nowrap",
      }}>
        <Icon size={12} strokeWidth={2.5} />
        {label}
      </span>
      {detail && (
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
          color: tier.detail, whiteSpace: "nowrap",
        }}>
          {detail}
        </span>
      )}
    </div>
  );
}
