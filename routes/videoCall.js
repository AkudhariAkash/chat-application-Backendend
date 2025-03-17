const express = require("express");
const { Server } = require("socket.io");

const router = express.Router();

module.exports = (io) => {
  const users = {}; // Maps userId -> socketId
  const rooms = {}; // Maps roomId -> Set of participants

  io.on("connection", (socket) => {
    console.log(`🔵 User connected: ${socket.id}`);

    // ✅ Register user
    socket.on("register-user", (userId) => {
      users[userId] = socket.id;
      console.log(`✅ User ${userId} registered with socket ID ${socket.id}`);
    });

    // ✅ Initiate call (One-to-One or Group)
    socket.on("call-users", ({ from, toUsers, roomId }) => {
      if (!rooms[roomId]) {
        rooms[roomId] = new Set();
      }

      rooms[roomId].add(from);
      toUsers.forEach((to) => {
        const toSocket = users[to];
        if (toSocket) {
          rooms[roomId].add(to);
          io.to(toSocket).emit("incoming-call", { from, roomId });
          console.log(`📞 Call request sent from ${from} to ${to} in room ${roomId}`);
        } else {
          console.log(`⚠️ User ${to} is offline or not registered.`);
        }
      });
    });

    // ✅ Accept call
    socket.on("accept-call", ({ userId, roomId }) => {
      if (rooms[roomId]) {
        rooms[roomId].forEach((participant) => {
          if (participant !== userId && users[participant]) {
            io.to(users[participant]).emit("user-joined", { userId });
          }
        });
        console.log(`✅ ${userId} accepted call in room ${roomId}`);
      }
    });

    // ✅ Reject call
    socket.on("reject-call", ({ userId, roomId }) => {
      if (rooms[roomId]) {
        rooms[roomId].delete(userId);
        rooms[roomId].forEach((participant) => {
          io.to(users[participant]).emit("call-rejected", { userId });
        });
        console.log(`❌ ${userId} rejected the call in room ${roomId}`);
      }
    });

    // ✅ ICE Candidate Exchange (WebRTC)
    socket.on("ice-candidate", ({ to, candidate }) => {
      const toSocket = users[to];
      if (toSocket) {
        io.to(toSocket).emit("ice-candidate", candidate);
      }
    });

    // ✅ Handle Screen Sharing
    socket.on("share-screen", ({ userId, roomId }) => {
      if (rooms[roomId]) {
        rooms[roomId].forEach((participant) => {
          if (participant !== userId && users[participant]) {
            io.to(users[participant]).emit("screen-shared", { userId });
          }
        });
        console.log(`📺 ${userId} started screen sharing in room ${roomId}`);
      }
    });

    // ✅ Stop Screen Sharing
    socket.on("stop-screen-share", ({ userId, roomId }) => {
      if (rooms[roomId]) {
        rooms[roomId].forEach((participant) => {
          if (participant !== userId && users[participant]) {
            io.to(users[participant]).emit("screen-share-stopped", { userId });
          }
        });
        console.log(`🚫 ${userId} stopped screen sharing in room ${roomId}`);
      }
    });

    // ✅ End Call
    socket.on("end-call", ({ roomId }) => {
      if (rooms[roomId]) {
        rooms[roomId].forEach((participant) => {
          if (users[participant]) {
            io.to(users[participant]).emit("call-ended", { roomId });
          }
        });
        delete rooms[roomId];
        console.log(`🔴 Call in room ${roomId} ended`);
      }
    });

    // ✅ Handle user disconnect
    socket.on("disconnect", () => {
      for (const userId in users) {
        if (users[userId] === socket.id) {
          delete users[userId];
          console.log(`🔴 User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  return router;
};
