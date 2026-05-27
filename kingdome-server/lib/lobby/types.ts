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
    colors: ["white", "black"],
  },
  "12x12": {
    maxPlayers: 2,          // ← 3 se 2
    label: "Kingdom War",
    description: "2 Players — White vs Black",   // ← updated
    prefix: "KG-12",
    colors: ["white", "black"],   // ← grey hata diya
  },
  "16x16": {
    maxPlayers: 2,          // ← 4 se 2
    label: "Empire",
    description: "2 Players — White vs Black",   // ← updated
    prefix: "KG-16",
    colors: ["white", "black"],   // ← gold/silver hata diye
  },
};