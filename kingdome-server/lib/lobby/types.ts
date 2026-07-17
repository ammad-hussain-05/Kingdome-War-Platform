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

  "8x8": {
    maxPlayers: 2,
    label: "Basic War",
    description: "2 Players — White vs Black",
    prefix: "KG-8",
    colors: ["white","black"],
  },

  "12x12": {
    maxPlayers: 2,
    label: "Kingdom War",
    description: "2 Players — White vs Black",
    prefix: "KG-12",
    colors: ["white","black"],
  },

  "16x16": {
    maxPlayers: 2,
    label: "Empire",
    description: "2 Players — White vs Black",
    prefix: "KG-16",
    colors: ["white","black"],
  },

  "tri-8x8": {
    maxPlayers: 3,
    label: "Basic Tri War",
    description: "3 Players — White vs Black vs Grey",
    prefix: "TRI-8",
    colors: ["white","black","grey"],
  },

  "tri-12x12": {
    maxPlayers: 3,
    label: "Kingdom Tri War",
    description: "3 Players — White vs Black vs Grey",
    prefix: "TRI-12",
    colors: ["white","black","grey"],
  },

  "tri-16x16": {
    maxPlayers: 3,
    label: "Empire Tri War",
    description: "3 Players — White vs Black vs Grey",
    prefix: "TRI-16",
    colors: ["white","black","grey"],
  },

  "x-8x8": {
    maxPlayers: 4,
    label: "Basic X War",
    description: "4 Players — White vs Black vs Grey vs golden",
    prefix: "X-8",
    colors: ["white","black","grey","golden"],
  },

  "x-12x12": {
    maxPlayers: 4,
    label: "Kingdom X War",
    description: "4 Players — White vs Black vs Grey vs golden",
    prefix: "X-12",
    colors: ["white","black","grey","golden"],
  },

  "x-16x16": {
    maxPlayers: 4,
    label: "Empire X War",
    description: "4 Players — White vs Black vs Grey vs golden",
    prefix: "X-16",
    colors: ["white","black","grey","golden"],
  },
};