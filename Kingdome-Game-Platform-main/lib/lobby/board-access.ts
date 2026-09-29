import { GameMode } from "./types";

// ─── BOARD ACCESS INFO — display only, no real access restriction ─────────
export type BoardAccessTier = "free" | "premium";

export interface BoardAccessInfo {
  tier: BoardAccessTier;
  // Create Room screen
  label: string;
  duration: string;
  // Board / game mode selection screen
  selectionLabel: string;
  selectionDetail?: string;
}

const FREE_TRIAL_3_DAYS: BoardAccessInfo = {
  tier: "free",
  label: "FREE TRIAL",
  duration: "First 3 Days Free",
  selectionLabel: "FREE TRIAL",
  selectionDetail: "3 Days Access",
};

const TRIAL_10_DAYS: BoardAccessInfo = {
  tier: "premium",
  label: "TRIAL ACCESS",
  duration: "First 10 Days Free",
  selectionLabel: "10 DAYS TRIAL",
};

export const BOARD_ACCESS_INFO: Record<GameMode, BoardAccessInfo> = {
  // Classic
  "8x8": FREE_TRIAL_3_DAYS,
  "12x12": TRIAL_10_DAYS,
  "16x16": TRIAL_10_DAYS,

  // Tri
  "tri-8x8": FREE_TRIAL_3_DAYS,
  "tri-12x12": TRIAL_10_DAYS,
  "tri-16x16": TRIAL_10_DAYS,

  // X
  "x-8x8": FREE_TRIAL_3_DAYS,
  "x-12x12": TRIAL_10_DAYS,
  "x-16x16": TRIAL_10_DAYS,
};
