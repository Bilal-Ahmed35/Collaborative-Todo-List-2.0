const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const List = require("../models/List");
const Notification = require("../models/Notification");
const PendingInvitation = require("../models/PendingInvitation");

const router = express.Router();

// Validate environment variables on startup
const validateEnvironment = () => {
  const requiredVars = ["JWT_SECRET"];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error(
      `❌ Missing required environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your-secret-key") {
    console.error("❌ JWT_SECRET must be set to a secure random string");
    process.exit(1);
  }
};

validateEnvironment();

// Initialize Google OAuth client only if configured
let googleClient = null;
if (process.env.GOOGLE_CLIENT_ID) {
  googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
} else {
  console.warn("⚠️ Google OAuth not configured. Demo login will be available.");
}

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: "Too many authentication attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to auth routes
router.use(authRateLimit);

// MongoDB connection checker middleware
const checkDatabaseConnection = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        code: "DATABASE_NOT_CONNECTED",
        retry: true,
      });
    }

    await mongoose.connection.db.admin().ping();
    next();
  } catch (error) {
    console.error("Database connection failed:", error);
    return res.status(503).json({
      error: "Database service unavailable",
      code: "DATABASE_UNAVAILABLE",
      retry: true,
    });
  }
};

router.use(checkDatabaseConnection);

// Google Auth route
router.post("/google", checkDatabaseConnection, async (req, res) => {
  try {
    const { token } = req.body;

    // Input validation
    if (!token || typeof token !== "string" || token.length === 0) {
      return res.status(400).json({
        error: "Authentication token is required",
        code: "INVALID_INPUT",
      });
    }

    console.log("🔐 Received auth request with token type:", typeof token);

    let userData;

    // Check if this is a demo token (base64 encoded JSON)
    try {
      const decoded = atob(token);
      const parsedData = JSON.parse(decoded);

      if (parsedData.provider === "demo") {
        console.log("🧪 Demo login detected");
        // Validate demo data structure
        if (!parsedData.uid || !parsedData.email || !parsedData.displayName) {
          throw new Error("Invalid demo token structure");
        }
        userData = parsedData;
      } else {
        // Try to parse as regular JSON (fallback for demo)
        if (!parsedData.uid || !parsedData.email) {
          throw new Error("Invalid token data structure");
        }
        userData = parsedData;
      }
    } catch (parseError) {
      // Not a demo token, try Google verification
      console.log("🔍 Attempting Google token verification");

      if (!googleClient) {
        return res.status(503).json({
          error: "Google authentication not configured",
          code: "GOOGLE_AUTH_UNAVAILABLE",
          suggestion: "Use demo login or configure Google OAuth",
        });
      }

      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.sub || !payload.email) {
          throw new Error("Invalid Google token payload");
        }

        userData = {
          uid: payload.sub,
          email: payload.email,
          displayName: payload.name || payload.email,
          photoURL: payload.picture || null,
          provider: "google",
        };
      } catch (googleError) {
        console.error("Google token verification failed:", googleError.message);
        return res.status(401).json({
          error: "Invalid Google authentication token",
          code: "GOOGLE_TOKEN_INVALID",
        });
      }
    }

    console.log("👤 Processing user:", userData.email);

    // Database operations with proper timeout and error handling
    try {
      // Find or create user with timeout
      let user = await User.findOne({ uid: userData.uid })
        .maxTimeMS(8000)
        .lean();

      if (!user) {
        console.log("🆕 Creating new user");
        user = new User({
          ...userData,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        });
        await user.save();
      } else {
        console.log("👋 Existing user login");
        await User.findByIdAndUpdate(user._id, {
          lastLoginAt: new Date(),
          displayName: userData.displayName, // Update display name
          photoURL: userData.photoURL, // Update photo URL
        }).maxTimeMS(5000);
      }

      // Handle pending invitations with timeout
      const pendingInvites = await PendingInvitation.find({
        email: userData.email.toLowerCase(),
      })
        .maxTimeMS(5000)
        .lean();

      console.log(`📬 Found ${pendingInvites.length} pending invitations`);

      // Process invitations with proper error handling
      const inviteResults = await Promise.allSettled(
        pendingInvites.map(async (invite) => {
          try {
            await List.findByIdAndUpdate(invite.listId, {
              $addToSet: { memberIds: userData.uid },
              $set: { [`roles.${userData.uid}`]: invite.role },
            }).maxTimeMS(3000);

            const notification = new Notification({
              userId: userData.uid,
              title: "List Invitation Accepted",
              message: `You've been added to "${invite.listName}" as ${invite.role}`,
              listId: invite.listId,
              type: "welcome",
            });
            await notification.save();

            await PendingInvitation.findByIdAndDelete(invite._id);
            console.log("✅ Processed invitation for list:", invite.listName);
            return { success: true, listName: invite.listName };
          } catch (inviteError) {
            console.error(
              `❌ Error processing invitation for ${invite.listName}:`,
              inviteError.message
            );
            return {
              success: false,
              listName: invite.listName,
              error: inviteError.message,
            };
          }
        })
      );

      // Log invitation processing results
      const successful = inviteResults.filter(
        (result) => result.status === "fulfilled" && result.value.success
      );
      const failed = inviteResults.filter(
        (result) => result.status === "rejected" || !result.value.success
      );

      if (failed.length > 0) {
        console.warn(
          `⚠️ ${failed.length} invitations failed to process:`,
          failed.map((f) => f.reason || "Unknown error")
        );
      }
    } catch (dbError) {
      console.error("❌ Database operation failed:", dbError.message);

      if (
        dbError.name === "MongooseError" ||
        dbError.message.includes("timeout")
      ) {
        return res.status(503).json({
          error: "Database operation timed out",
          code: "DATABASE_TIMEOUT",
          retry: true,
        });
      }

      if (dbError.code === 11000) {
        // Duplicate key error
        return res.status(409).json({
          error: "User already exists with this email",
          code: "USER_EXISTS",
        });
      }

      throw dbError; // Re-throw for generic handler
    }

    // Generate JWT token with configurable expiration
    const tokenExpiry = process.env.JWT_EXPIRY || "7d";
    const jwtToken = jwt.sign(
      {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        provider: userData.provider,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: tokenExpiry,
        issuer: "collab-todo-api",
        audience: "collab-todo-client",
      }
    );

    console.log("✅ Authentication successful for:", userData.email);

    res.json({
      user: userData,
      token: jwtToken,
      expiresIn: tokenExpiry,
    });
  } catch (error) {
    console.error("❌ Authentication error:", error.message);

    // Handle different types of errors with specific responses
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Invalid user data",
        code: "VALIDATION_ERROR",
        details: Object.keys(error.errors).map((key) => ({
          field: key,
          message: error.errors[key].message,
        })),
      });
    }

    if (error.name === "MongoNetworkError") {
      return res.status(503).json({
        error: "Database network error",
        code: "DATABASE_NETWORK_ERROR",
        retry: true,
      });
    }

    if (error.message.includes("buffering timed out")) {
      return res.status(503).json({
        error: "Database connection timeout",
        code: "DATABASE_TIMEOUT",
        retry: true,
      });
    }

    // Generic error response (don't expose internal details in production)
    const isDevelopment = process.env.NODE_ENV === "development";
    res.status(500).json({
      error: "Authentication failed",
      code: "INTERNAL_ERROR",
      ...(isDevelopment && {
        details: error.message,
        stack: error.stack,
      }),
    });
  }
});

// Health check for auth service
router.get("/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const googleConfigured = !!googleClient;

  res.json({
    status: "OK",
    database: dbStatus,
    googleAuth: googleConfigured,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
