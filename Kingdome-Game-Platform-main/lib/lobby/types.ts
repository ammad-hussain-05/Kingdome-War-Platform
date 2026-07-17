export type GameMode =
  | "8x8"
  | "12x12"
  | "16x16"
  | "tri-8x8"
  | "tri-12x12"
  | "tri-16x16"
  | "x-8x8"
  | "x-12x12"
  | "x-16x16";
export interface Player {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
}

export interface Room {
  id: string;
  name: string;
  mode: GameMode;
  maxPlayers: number;
  players: Player[];
  createdAt: number;
  status: "waiting" | "full" | "in-progress";
  hostId: string;
}

export const MODE_CONFIG: Record<GameMode, {
  maxPlayers: number;
  label: string;
  description: string;
  prefix: string;
  colors: string[];
}> = {

  // ───── CLASSIC (2 PLAYERS) ─────

  "8x8": {
    maxPlayers: 2,
    label: "Basic War",
    description: "2 Players — White vs Black",
    prefix: "KG-8",
    colors: ["White", "Black"],
  },

  "12x12": {
    maxPlayers: 2,
    label: "Kingdom War",
    description: "2 Players — White vs Black",
    prefix: "KG-12",
    colors: ["White", "Black"],
  },

  "16x16": {
    maxPlayers: 2,
    label: "Empire",
    description: "2 Players — White vs Black",
    prefix: "KG-16",
    colors: ["White", "Black"],
  },

  // ───── TRI BOARD (3 PLAYERS) ─────

  "tri-8x8": {
    maxPlayers: 3,
    label: "Basic Tri War",
    description: "3 Players — White vs Black vs Grey",
    prefix: "TRI-8",
    colors: ["White", "Black", "Grey"],
  },

  "tri-12x12": {
    maxPlayers: 3,
    label: "Kingdom Tri War",
    description: "3 Players — White vs Black vs Grey",
    prefix: "TRI-12",
    colors: ["White", "Black", "Grey"],
  },

  "tri-16x16": {
    maxPlayers: 3,
    label: "Empire Tri War",
    description: "3 Players — White vs Black vs Grey",
    prefix: "TRI-16",
    colors: ["White", "Black", "Grey"],
  },

  // ───── X BOARD (4 PLAYERS) ─────

  "x-8x8": {
    maxPlayers: 4,
    label: "Basic X War",
    description: "4 Players — White vs Black vs Grey vs Golden",
    prefix: "X-8",
    colors: ["White", "Black", "Grey", "Golden"],
  },

  "x-12x12": {
    maxPlayers: 4,
    label: "Kingdom X War",
    description: "4 Players — White vs Black vs Grey vs Golden",
    prefix: "X-12",
    colors: ["White", "Black", "Grey", "Golden"],
  },

  "x-16x16": {
    maxPlayers: 4,
    label: "Empire X War",
    description: "4 Players — White vs Black vs Grey vs Golden",
    prefix: "X-16",
    colors: ["White", "Black", "Grey", "Golden"],
  },
};

export const COLOR_STYLES: Record<string, { label: string; emoji: string; css: string }> = {
  White:  { label: "White",  emoji: "⬜", css: "#f0f0f0" },
  Black:  { label: "Black",  emoji: "⬛", css: "#2a2a2a" },
  // Phase 2 ke liye ready rakhte hain:
  Grey:   { label: "Grey",   emoji: "🩶", css: "#808080" },
  Gold:   { label: "Gold",   emoji: "🥇", css: "#d4a843" },
  Silver: { label: "Silver", emoji: "🥈", css: "#a8a8b8" },
  Golden: {
  label: "Golden",
  emoji: "🟨",
  css: "#d4a843"
},
};