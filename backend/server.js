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

const authenticateToken = require("./middleware/authenticateToken");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (only in development)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/collab-todo",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        connectTimeoutMS: 30000,
      }
    );
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    } else {
      console.log("⚠️ Continuing in dev mode without DB");
    }
  }
};

// MongoDB events
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});

// Health check endpoint
app.get("/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: process.env.NODE_ENV || "development",
  });
});

// Basic info endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Collab Todo API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Socket.IO setup
const http = require("http");
const socketIo = require("socket.io");
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("User connected:", socket.id);
  }

  socket.on("join-user", (userId) => {
    if (userId && typeof userId === "string") {
      socket.join(`user:${userId}`);
      if (process.env.NODE_ENV !== "production") {
        console.log(`User ${userId} joined their personal room`);
      }
    }
  });

  socket.on("join-list", (listId) => {
    if (listId && typeof listId === "string") {
      socket.join(`list:${listId}`);
      if (process.env.NODE_ENV !== "production") {
        console.log(`Socket ${socket.id} joined list: ${listId}`);
      }
    }
  });

  socket.on("leave-list", (listId) => {
    if (listId && typeof listId === "string") {
      socket.leave(`list:${listId}`);
      if (process.env.NODE_ENV !== "production") {
        console.log(`Socket ${socket.id} left list: ${listId}`);
      }
    }
  });

  socket.on("disconnect", (reason) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("User disconnected:", socket.id, "Reason:", reason);
    }
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

// Make io accessible to routes
app.set("io", io);

// Register routes BEFORE attempting DB connection
app.use("/api/auth", authRoutes);
app.use("/api/users", authenticateToken, userRoutes);
app.use("/api/lists", authenticateToken, listRoutes);
app.use("/api/tasks", authenticateToken, taskRoutes);
app.use("/api/activities", authenticateToken, activityRoutes);
app.use("/api/notifications", authenticateToken, notificationRoutes);
app.use("/api/invitations", authenticateToken, invitationRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  const isDevelopment = process.env.NODE_ENV !== "production";
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : "Internal server error",
    ...(isDevelopment && { stack: error.stack }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  server.close(() => {
    console.log("HTTP server closed.");

    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  gracefulShutdown("UNHANDLED_REJECTION");
});

const PORT = process.env.PORT || 5000;

// Connect DB first, then start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `CORS origin: ${process.env.CLIENT_URL || "http://localhost:3000"}`
    );

    if (process.env.NODE_ENV !== "production") {
      console.log(`Health check: http://localhost:${PORT}/health`);
    }
  });
});
