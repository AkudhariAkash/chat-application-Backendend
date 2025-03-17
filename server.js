const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auths");
const messageRoutes = require("./routes/messages");
const notificationRoutes = require("./routes/notification");
const { router: logoutRouter, authenticateToken } = require("./routes/logout");
const videoCallRoutes = require("./routes/videoCall");
const http = require("http");
const socketIo = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// ✅ Allowed Frontend Domains
const allowedOrigins = [
  "http://localhost:3000",
  "https://chat-application-frontend-eta.vercel.app",
];

// ✅ CORS Middleware for Express
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Security Headers (Content Security Policy)
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' wss://chat-application-backendend.onrender.com https://chat-application-backendend.onrender.com;"
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// ✅ Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // ✅ Explicitly enable WebSockets
});

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ DB Connection Successful"))
  .catch((err) => console.error("❌ Error connecting to DB:", err.message));

// ✅ API Routes
app.use("/api/auths", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notification", notificationRoutes(io));
app.use("/api/logout", logoutRouter);
app.use("/api/videoCall", videoCallRoutes(io)); // Pass io to videoCall routes

// ✅ Default Route for Debugging
app.get("/", (req, res) => {
  res.send("✅ Server is running...");
});

// ✅ Protected Route Example
app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

// ✅ Start the Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});

// ✅ Socket.io User Management
const users = {}; // Stores active users

io.on("connection", (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  // ✅ User Registration
  socket.on("add-user", (email) => {
    users[email] = socket.id;
    console.log(`✅ User ${email} added. Online users:`, Object.keys(users));
    io.emit("active-users", Object.keys(users));
  });

  // ✅ Send Chat Notification
  socket.on("send-notification", ({ email, message }) => {
    const userSocketId = users[email];
    if (userSocketId) {
      io.to(userSocketId).emit("new-notification", { email, message });
      console.log(`🔔 Notification sent to ${email}`);
    } else {
      console.log(`⚠️ User ${email} is offline.`);
    }
  });

  // ✅ Chat Message Handling
  socket.on("send-msg", ({ to, msg, from }) => {
    console.log(`📩 Message from ${from} to ${to}: ${msg}`);
    if (users[to]) {
      io.to(users[to]).emit("msg-receive", { msg, from });
      console.log(`📤 Sent to ${to}`);
    } else {
      console.log(`⚠️ ${to} is offline.`);
    }
  });

  // ✅ Handle Voice Messages
  socket.on("send-voice-msg", ({ to, audioUrl, from }) => {
    console.log(`🎙️ Voice message from ${from} to ${to}`);
    if (users[to]) {
      io.to(users[to]).emit("receive-voice-msg", { audioUrl, from });
    } else {
      console.log(`⚠️ ${to} is offline.`);
    }
  });

  // ✅ Handle Video Call Requests
  socket.on("call-user", ({ from, to, signal }) => {
    if (users[to]) {
      io.to(users[to]).emit("incoming-call", { from, signal });
      console.log(`📞 Call request from ${from} to ${to}`);
    } else {
      console.log(`⚠️ User ${to} is offline.`);
    }
  });

  // ✅ Handle Call Acceptance
  socket.on("accept-call", ({ to, signal }) => {
    if (users[to]) {
      io.to(users[to]).emit("call-accepted", { signal });
      console.log(`✅ Call accepted by ${to}`);
    }
  });

  // ✅ Handle ICE Candidates for WebRTC
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (users[to]) {
      io.to(users[to]).emit("ice-candidate", candidate);
    }
  });

  // ✅ Handle User Disconnection
  socket.on("disconnect", () => {
    for (let user in users) {
      if (users[user] === socket.id) {
        console.log(`❌ User ${user} disconnected`);
        delete users[user];
      }
    }
    io.emit("active-users", Object.keys(users));
  });
});
