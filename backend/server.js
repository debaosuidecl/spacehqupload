const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const socket = require("socket.io");
const statsRoutes = require("./routes/statsRoutes");

const socketRoutes = require("./routes/socketRoutes");

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const isProduction = process.env.NODE_ENV === "production";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (zips)
app.use("/zips", express.static(path.join(__dirname, "zips")));

// ============================================
// API ROUTES - Must come BEFORE the catch-all
// ============================================
app.use("/api/stats", statsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/uploads", uploadRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// SERVE REACT FRONTEND (Production Only)
// ============================================
if (isProduction) {
  // Build path to React frontend
  const buildPath = path.join(__dirname, "..", "frontend", "build");

  // Serve static files from React build (JS, CSS, images, etc.)
  app.use(express.static(buildPath));

  // IMPORTANT: This catch-all route MUST come AFTER all API routes and static files
  // It serves index.html for any non-API request (handles React Router)
  app.get("*", (req, res) => {
    // If the request starts with /api, return 404 (should have been caught above)
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({
        success: false,
        message: "API endpoint not found",
      });
    }
    // Serve the React app
    res.sendFile(path.join(buildPath, "index.html"));
  });
} else {
  // Development - just return a message
  app.get("/", (req, res) => {
    res.json({
      message: "File Management API is running",
      environment: "development",
      endpoints: {
        auth: "/api/auth",
        uploads: "/api/uploads",
        stats: "/api/stats",
        health: "/api/health",
      },
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  if (isProduction) {
    console.log(
      `Serving React app from: ${path.join(__dirname, "..", "frontend", "build")}`,
    );
  }
});

// Socket.io setup
let io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false,
  },
});

io.on("connection", (socket) => socketRoutes(io, socket));
