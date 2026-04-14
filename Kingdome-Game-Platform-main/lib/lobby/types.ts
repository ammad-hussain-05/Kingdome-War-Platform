export type GameMode = "8x8" | "12x12" | "16x16";

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

export const MODE_CONFIG: Record<GameMode, { maxPlayers: number; label: string; description: string; prefix: string; colors: string[] }> = {
  "8x8": {
    maxPlayers: 2,
    label: "Basic War",
    description: "2 Players — White vs Black",
    prefix: "KG-8",
    colors: ["White", "Black"],
  },
  "12x12": {
    maxPlayers: 3,
    label: "Kingdom War",
    description: "3 Players — White, Black & Grey",
    prefix: "KG-12",
    colors: ["White", "Black", "Grey"],
  },
  "16x16": {
    maxPlayers: 4,
    label: "Empire",
    description: "4 Players — White, Black, Gold & Silver",
    prefix: "KG-16",
    colors: ["White", "Black", "Gold", "Silver"],
  },
};

export const COLOR_STYLES: Record<string, { label: string; emoji: string; css: string }> = {
  White:  { label: "White",  emoji: "⬜", css: "#f0f0f0" },
  Black:  { label: "Black",  emoji: "⬛", css: "#2a2a2a" },
  Grey:   { label: "Grey",   emoji: "🩶", css: "#808080" },
  Gold:   { label: "Gold",   emoji: "🥇", css: "#d4a843" },
  Silver: { label: "Silver", emoji: "🥈", css: "#a8a8b8" },
};