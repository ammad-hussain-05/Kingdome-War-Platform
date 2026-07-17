console.log("🚀 Starting server...");
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Room, Player, GameMode, MODE_CONFIG } from "./lib/lobby/types";
import { generateRoomId } from "./lib/lobby/id-generator";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// In-memory rooms store
const rooms = new Map<string, Room>();

function getRoomsArray(): Room[] {
  return Array.from(rooms.values());
}

io.on("connection", (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  // Send current rooms list on connect
  socket.emit("rooms:list", getRoomsArray());

  // ─── CREATE ROOM ───────────────────────────────────────────
  socket.on("room:create", ({ name, mode, playerName }: { name: string; mode: GameMode; playerName: string }) => {
    console.log("ROOM CREATE PAYLOAD:", { name, mode, playerName });
console.log("MODE EXISTS:", MODE_CONFIG[mode]);
    const cfg = MODE_CONFIG[mode];

    if (!cfg) {
      socket.emit("room:error", { message: `Invalid mode: ${mode}` });
      console.error(`❌ Invalid mode received: "${mode}"`);
      return;
    }

    const roomId = generateRoomId(mode);

    const host: Player = {
      id: socket.id,
      name: playerName || "Player 1",
      color: cfg.colors[0],
      joinedAt: Date.now(),
    };

    const room: Room = {
      id: roomId,
      name,
      mode,
      maxPlayers: cfg.maxPlayers,
      players: [host],
      createdAt: Date.now(),
      status: "waiting",
      hostId: socket.id,
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit("room:created", room);
    io.emit("rooms:list", getRoomsArray());

    console.log(`🏠 Room created: ${roomId} by ${playerName}`);
  });

  // ─── JOIN ROOM ─────────────────────────────────────────────
  socket.on("room:join", ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    console.log(`🔍 Join attempt — roomId: "${roomId}", player: "${playerName}"`);
    console.log(`📦 All rooms:`, Array.from(rooms.keys()));

    const room = rooms.get(roomId);

    if (!room) {
      socket.emit("room:error", { message: "Room not found. Check your ID." });
      return;
    }

    if (room.status === "in-progress") {
      socket.emit("room:error", { message: "Game already started." });
      return;
    }

    // ✅ Rejoin by name — socket id update karo
    const alreadyByName = room.players.find((p) => p.name === playerName);
    if (alreadyByName) {
      console.log(`🔄 Rejoin: ${playerName} — updating socket id`);
      // Host id bhi update karo agar host rejoin kar raha hai
      if (room.hostId === alreadyByName.id) {
        room.hostId = socket.id;
      }
      alreadyByName.id = socket.id;
      socket.join(roomId);
      socket.emit("room:joined", room);
      io.to(roomId).emit("room:updated", room);
      return;
    }

    // ✅ Already in by socket id
    const alreadyById = room.players.find((p) => p.id === socket.id);
    if (alreadyById) {
      socket.join(roomId);
      socket.emit("room:joined", room);
      return;
    }

    // ✅ Room full check
    if (room.players.length >= room.maxPlayers) {
      socket.emit("room:error", { message: "Room is full." });
      return;
    }

    // ✅ New player join
    const cfg = MODE_CONFIG[room.mode];
    const assignedColor = cfg.colors[room.players.length];

    const newPlayer: Player = {
      id: socket.id,
      name: playerName || `Player ${room.players.length + 1}`,
      color: assignedColor,
      joinedAt: Date.now(),
    };

    room.players.push(newPlayer);

    if (room.players.length >= room.maxPlayers) {
      room.status = "full";
    }

    socket.join(roomId);
    socket.emit("room:joined", room);
    io.to(roomId).emit("room:updated", room);
    io.emit("rooms:list", getRoomsArray());

    console.log(`👤 ${playerName} joined room ${roomId}`);
  });


 // ─── GET SINGLE ROOM ───────────────────────────────────────────────────────
// Yeh sirf is ek handler ko replace karo backend index.ts mein

socket.on("room:get", ({ roomId }: { roomId: string }) => {
  const room = rooms.get(roomId);
  if (room) {
    // ✅ room:updated emit karo — board page issi ko sun raha hai
    socket.emit("room:updated", room);
  } else {
    socket.emit("room:error", { message: "Room not found." });
  }
});
  // ─── START GAME ────────────────────────────────────────────
  socket.on("game:start", ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit("room:error", { message: "Only host can start the game." });
      return;
    }
    room.status = "in-progress";
    io.to(roomId).emit("game:started", room);
    io.emit("rooms:list", getRoomsArray());
    console.log(`🎮 Game started in room ${roomId}`);
  });

  // ─── GAME MOVE ─────────────────────────────────────────────
  socket.on("game:move", ({ roomId, from, to, newState }: any) => {
    socket.to(roomId).emit("game:move", { from, to, newState });
  });

  // ─── GAME CHAT ─────────────────────────────────────────────
  socket.on("game:chat", ({ roomId, msg }: any) => {
    socket.to(roomId).emit("game:chat", msg);
  });

  // ─── GAME QUIT (surrender / leave) ──────────────────────────
  socket.on("game:quit", ({ roomId, ...payload }: any) => {
    socket.to(roomId).emit("game:quit", payload);
  });

  // ─── DISCONNECT ────────────────────────────────────────────
 // ─── Sirf yeh DISCONNECT handler replace karo backend index.ts mein ───────
// Baki sab same rehne do

socket.on("disconnect", () => {
  console.log(`❌ Disconnected: ${socket.id}`);

  rooms.forEach((room, roomId) => {
    const idx = room.players.findIndex((p) => p.id === socket.id);
    if (idx === -1) return;

    room.players.splice(idx, 1);

    // ✅ Room sirf tab delete karo jab game khatam ho ya deliberately close ho
    // Temporary disconnect pe room zinda rakho
    if (room.players.length === 0) {
      // ✅ Turant delete mat karo — 30 second wait karo reconnect ke liye
      setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (currentRoom && currentRoom.players.length === 0) {
          rooms.delete(roomId);
          console.log(`🗑️ Room deleted (empty): ${roomId}`);
          io.emit("rooms:list", getRoomsArray());
        }
      }, 30000); // 30 second grace period
    } else {
      // Host left — naya host assign karo
      if (room.hostId === socket.id) {
        room.hostId = room.players[0].id;
        console.log(`👑 New host: ${room.hostId} for room ${roomId}`);
      }
      room.status = "waiting";
      io.to(roomId).emit("room:updated", room);
    }

    io.emit("rooms:list", getRoomsArray());
  });
});
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket server running on http://localhost:${PORT}`);
});