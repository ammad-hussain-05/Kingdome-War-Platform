import { GameMode, MODE_CONFIG } from "./types";

function randomAlphaNum(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateRoomId(mode: GameMode): string {
  const prefix = MODE_CONFIG[mode].prefix;
  const unique = randomAlphaNum(6);
  return `${prefix}-${unique}`;
}

export function getModeFromRoomId(roomId: string): GameMode | null {
  if (roomId.startsWith("KG-8-")) return "8x8";
  if (roomId.startsWith("KG-12-")) return "12x12";
  if (roomId.startsWith("KG-16-")) return "16x16";

  if (roomId.startsWith("TRI-8-")) return "tri-8x8";
  if (roomId.startsWith("TRI-12-")) return "tri-12x12";
  if (roomId.startsWith("TRI-16-")) return "tri-16x16";

  if (roomId.startsWith("X-8-")) return "x-8x8";
  if (roomId.startsWith("X-12-")) return "x-12x12";
  if (roomId.startsWith("X-16-")) return "x-16x16";

  return null;
}