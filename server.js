const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auths");
const messageRoutes = require("./routes/messages");
const notificationRoutes = require("./routes/notification");
const { router: logoutRouter, authenticateToken } = require("./routes/logout");
const videoCallRoutes = require("./routes/videoCall"); // ✅ Import video call routes
const socket = require("socket.io");
require("dotenv").config();
const http = require("http");

const app = express();
const server = http.createServer(app);

// ✅ Allow the correct frontend domain
const allowedOrigins = [
  "https://chat-app-front-end-idnz.vercel.app",
  "https://chat-app-delta-lemon.vercel.app",
  "http://localhost:3000"," https://chat-application-frontend-eta.vercel.app", "https://chat-application-backendend.onrender.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' wss://chat-app-backend-2ph1.onrender.com https://chat-app-backend-2ph1.onrender.com;"
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// ✅ Initialize Socket.io
const io = socket(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ DB Connection Successful"))
  .catch((err) => console.error("❌ Error connecting to DB:", err.message));

// ✅ API Routes
app.use("/api/auths", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notification", notificationRoutes(io));
app.use("/api/logout", logoutRouter);
app.use("/api/videoCall", videoCallRoutes);

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

// ✅ Global Variables & Active Users Map
global.onlineUsers = new Map();
const users = {};

// ✅ Socket.io Events
io.on("connection", (socket) => {
  console.log("🔗 User connected:", socket.id);

  socket.on("add-user", (email) => {
    global.onlineUsers.set(email, socket.id);
    console.log(`✅ User ${email} added to online users.`);
  });

  socket.on("send-notification", ({ email, message }) => {
    const userSocketId = global.onlineUsers.get(email);
    if (userSocketId) {
      io.to(userSocketId).emit("new-notification", { email, message });
    }
  });

  socket.on("join", (userId) => {
    users[userId] = socket.id;
    console.log(`👤 User ${userId} is online with socket ID ${socket.id}`);
    io.emit("active-users", Object.keys(users));
  });

  socket.on("send-msg", ({ to, msg, from }) => {
    console.log(`📩 Message from ${from} to ${to}:`, msg);
    if (users[to]) {
      console.log(`📤 Sending message to ${to}, Socket ID: ${users[to]}`);
      io.to(users[to]).emit("msg-receive", { msg, from });
    } else {
      console.log("⚠️ Recipient is offline or not connected.");
    }
  });

  socket.on("send-voice-msg", ({ to, audioUrl, from }) => {
    console.log(`🎙️ Voice message from ${from} to ${to}:`, audioUrl);
    if (users[to]) {
      io.to(users[to]).emit("receive-voice-msg", { audioUrl, from });
    } else {
      console.log("⚠️ Recipient is offline or not connected.");
    }
  });

  socket.on("disconnect", () => {
    Object.keys(users).forEach((key) => {
      if (users[key] === socket.id) {
        console.log(`❌ User ${key} disconnected`);
        delete users[key];
      }
    });
  });
});
