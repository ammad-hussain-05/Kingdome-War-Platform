"use client";

// TEMPORARY dev-only preview page for visually verifying the Tri Board 8x8
// redesign without spinning up the socket server / lobby flow. Safe to
// delete after verification.
import TriBoard8x8 from "@/components/game/tri/tri-board8x8";

const fakeSocket = {
  on: () => {},
  off: () => {},
  emit: () => {},
} as any;

export default function DevTriPreview() {
  return (
    <TriBoard8x8
      myColor="white"
      roomId="dev-preview"
      playerNames={{ white: "Alice", black: "Bob", grey: "Carl" }}
      socket={fakeSocket}
      onGameEnd={() => {}}
    />
  );
}
