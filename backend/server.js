const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const listRoutes = require("./routes/listRoutes");
const taskRoutes = require("./routes/taskRoutes");
const activityRoutes = require("./routes/activityRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const invitationRoutes = require("./routes/invitationRoutes");

// ✅ Middleware
const authenticateToken = require("./middleware/authenticateToken");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Database
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/collab-todo")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Routes
app.use("/api/auth", authRoutes); // ✅ Public (login/register)

// ✅ Protected Routes (global middleware)
app.use("/api/users", authenticateToken, userRoutes);
app.use("/api/lists", authenticateToken, listRoutes);
app.use("/api/tasks", authenticateToken, taskRoutes);
app.use("/api/activities", authenticateToken, activityRoutes);
app.use("/api/notifications", authenticateToken, notificationRoutes);
app.use("/api/invitations", authenticateToken, invitationRoutes);

// Server + Socket.io
const http = require("http");
const socketIo = require("socket.io");
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
