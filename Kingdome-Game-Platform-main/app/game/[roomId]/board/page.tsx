"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Room } from "@/lib/lobby/types";
import { getModeFromRoomId } from "@/lib/lobby/id-generator";
import { connectSocket } from "@/lib/lobby/socket-client";
import type { Color } from "@/lib/game/rules-8x8";
import type { PlayerColor } from "@/lib/game/rules-12x12";
import Board8x8 from "@/components/game/board-8x8";
import { default as Board12x12 } from "@/components/game/board-12x12";
import { default as Board16x16 } from "@/components/game/board-16x16";
import type { PlayerColor16 } from "@/lib/game/rules-16x16";
import TriBoard8x8 from "@/components/game/tri/tri-board8x8";
import TriBoard12x12 from "@/components/game/tri/tri-board12x12";
import TriBoard16x16 from "@/components/game/tri/tri-board16x16";
import { Footer } from "@/components/footer";
type TriPlayerColor8 = "white" | "black" | "grey";

// const Board16x16 = dynamic(() => import("@/components/game/board-16x16"), { ssr: false });          

export default function BoardPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const [myColor, setMyColor] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const resolvedRef = useRef(false);
  const mode = getModeFromRoomId(roomId);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const resolveRoom = (data: Room) => {
      if (data.id !== roomId) return;
      if (resolvedRef.current) return;

      // Build playerNames map for 12x12
      const names: Record<string, string> = {};
      data.players.forEach(p => { names[p.color] = p.name; });
      setPlayerNames(names);

      const me = data.players.find(p => p.id === socket.id);
      if (!me) {
        const savedName = sessionStorage.getItem("playerName") || "";
        const byName = data.players.find(p => p.name === savedName);
        if (byName) {
          const opp = data.players.find(p => p.id !== byName.id);
          setMyColor(byName.color);
          setPlayerName(byName.name);
          if (opp) setOpponentName(opp.name);
          resolvedRef.current = true;
          setLoading(false);
        } else {
          const savedName2 = sessionStorage.getItem("playerName") || "Player";
          socket.emit("room:join", { roomId, playerName: savedName2 });
        }
        return;
      }

      const opp = data.players.find(p => p.id !== socket.id);
      setMyColor(me.color);
      setPlayerName(me.name);
      if (opp) setOpponentName(opp.name);
      resolvedRef.current = true;
      setLoading(false);
    };

    socket.on("room:updated", resolveRoom);
    socket.on("room:joined", resolveRoom);
    socket.on("room:error", ({ message }: { message: string }) => {
      setErrorMsg(message);
      setLoading(false);
    });

    const fetchRoom = () => {
      socket.emit("room:get", { roomId });
    };

    if (socket.connected) {
      fetchRoom();
    } else {
      socket.once("connect", fetchRoom);
    }

    const timeout = setTimeout(() => {
      if (!resolvedRef.current) {
        setErrorMsg("Could not load room. Please go back and try again.");
        setLoading(false);
      }
    }, 5000);

    return () => {
      socket.off("room:updated", resolveRoom);
      socket.off("room:joined", resolveRoom);
      socket.off("room:error");
      clearTimeout(timeout);
    };
  }, [roomId]);

  // ─── Resolve page content for the current state / mode ───────────────────
  let content: React.ReactNode;

  if (loading) {
    // ─── Loading ─────────────────────────────────────────────────────────
    content = (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 0%, #2d1506 0%, #0e0804 50%, #050301 100%)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 20, animation: "spin 2s linear infinite" }}>⚔️</div>
          <p style={{ color: "rgba(212,168,67,0.8)", fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700 }}>
            Preparing the battlefield...
          </p>
          <p style={{ color: "rgba(180,120,50,0.4)", fontSize: 13, marginTop: 8 }}>
            Connecting players...
          </p>
          <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </div>
      </div>
    );
  } else if (errorMsg || !myColor) {
    // ─── Error ───────────────────────────────────────────────────────────
    content = (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 16,
        background: "#050301"
      }}>
        <p style={{ color: "#ff8080", fontFamily: "Georgia, serif", fontSize: 16, textAlign: "center" }}>
          {errorMsg || "Could not load. Please go back and rejoin."}
        </p>
        <button
          onClick={() => router.push("/lobby")}
          style={{
            padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(212,168,67,0.3)",
            background: "rgba(212,168,67,0.1)", color: "#d4a843",
            cursor: "pointer", fontWeight: 700, fontSize: 13,
          }}
        >
          ← Back to Lobby
        </button>
      </div>
    );
  } else if (mode === "8x8") {
    // ─── 8x8 Board ───────────────────────────────────────────────────────
    content = (
      <Board8x8
        myColor={myColor as Color}
        roomId={roomId}
        playerName={playerName}
        opponentName={opponentName}
        socket={socketRef.current!}
        onGameEnd={(winner) => console.log(`${winner} wins!`)}
      />
    );
  } else if (mode === "12x12") {
    // ─── 12x12 Board ─────────────────────────────────────────────────────
    content = (
      <Board12x12
        myColor={myColor as PlayerColor}
        roomId={roomId}
        playerNames={playerNames as Record<PlayerColor, string>}
        socket={socketRef.current!}
        onGameEnd={(winner) => console.log(`${winner} wins!`)}
      />
    );
  } else if (mode === "16x16") {
    // ─── 16x16 Board ─────────────────────────────────────────────────────
    content = (
      <Board16x16
        myColor={myColor as PlayerColor16}
        roomId={roomId}
        playerNames={playerNames as Record<PlayerColor16, string>}
        socket={socketRef.current!}
        onGameEnd={(winner) => console.log(`${winner} wins!`)}
      />
    );
  } else if (mode === "tri-8x8") {
    // ─── Tri 8x8 Board ───────────────────────────────────────────────────
    content = (
      <TriBoard8x8
        myColor={myColor as TriPlayerColor8}
        roomId={roomId}
        playerNames={playerNames as Record<TriPlayerColor8, string>}
        socket={socketRef.current!}
        onGameEnd={(winner) => console.log(`${winner} wins!`)}
      />
    );
  } else if (mode === "tri-12x12") {
    // ─── Tri 12x12 Board ─────────────────────────────────────────────────
    content = (
      <TriBoard12x12
        myColor={myColor as TriPlayerColor8}
        roomId={roomId}
        playerNames={playerNames as Record<TriPlayerColor8, string>}
        socket={socketRef.current!}
        onGameEnd={(winner) => console.log(`${winner} wins!`)}
      />
    );
  } else if (mode === "tri-16x16") {
    // ─── Tri 16x16 Board ─────────────────────────────────────────────────
    content = (
      <TriBoard16x16
        myColor={myColor as TriPlayerColor8}
        roomId={roomId}
        playerNames={playerNames as Record<TriPlayerColor8, string>}
        socket={socketRef.current!}
        onGameEnd={(winner) => console.log(`${winner} wins!`)}
      />
    );
  } else {
    // ─── Fallback ────────────────────────────────────────────────────────
    content = (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#050301"
      }}>
        <p style={{ color: "#ff8080", fontFamily: "Georgia, serif" }}>
          Unknown mode: {mode}
        </p>
      </div>
    );
  }

  return (
    <>
      {content}
      <Footer />
    </>
  );
}