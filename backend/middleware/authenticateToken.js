// middleware/authenticateToken.js
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

// Only initialize Google client if the ID is available
let googleClient = null;
if (process.env.GOOGLE_CLIENT_ID) {
  googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
}

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      console.log("❌ No token provided in request");
      return res.status(401).json({
        error: "Access token required",
        code: "NO_TOKEN",
      });
    }

    console.log("🔍 Authenticating token, length:", token.length);

    // Validate JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET not configured");
      return res.status(500).json({
        error: "Authentication service configuration error",
        code: "AUTH_CONFIG_ERROR",
      });
    }

    // Try JWT verification first (this is your primary auth method)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        // Add verification options for better security
        issuer: "collab-todo-api",
        audience: "collab-todo-client",
      });

      // Validate required fields
      if (!decoded.uid || !decoded.email) {
        throw new Error("Invalid token payload - missing required fields");
      }

      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.displayName,
        provider: decoded.provider || "google",
      };
      console.log("✅ JWT verification successful for user:", decoded.uid);
      return next();
    } catch (jwtError) {
      console.log("⚠️ JWT verification failed:", jwtError.message);

      // Only try Google token verification if the token looks like a Google JWT
      // Google JWTs typically have specific characteristics
      if (
        googleClient &&
        token.includes(".") &&
        token.split(".").length === 3
      ) {
        try {
          console.log("🔍 Attempting Google token verification as fallback");
          const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();

          if (!payload || !payload.sub || !payload.email) {
            throw new Error("Invalid Google token payload");
          }

          req.user = {
            uid: payload.sub,
            email: payload.email,
            displayName: payload.name || payload.email,
            photoURL: payload.picture || null,
            provider: "google",
          };
          console.log(
            "✅ Google token verification successful for:",
            payload.email
          );
          return next();
        } catch (googleError) {
          console.error(
            "❌ Google token verification failed:",
            googleError.message
          );
        }
      }

      // Both methods failed - determine the error type
      let errorMessage = "Invalid or expired token";
      let errorCode = "INVALID_TOKEN";

      if (jwtError.name === "TokenExpiredError") {
        errorMessage = "Token has expired";
        errorCode = "TOKEN_EXPIRED";
      } else if (jwtError.name === "JsonWebTokenError") {
        if (jwtError.message.includes("invalid signature")) {
          errorMessage = "Invalid token signature";
          errorCode = "INVALID_SIGNATURE";
        } else if (jwtError.message.includes("malformed")) {
          errorMessage = "Malformed token";
          errorCode = "MALFORMED_TOKEN";
        }
      }

      console.error("❌ All token verification methods failed:", errorMessage);
      return res.status(403).json({
        error: errorMessage,
        code: errorCode,
        details:
          process.env.NODE_ENV === "development" ? jwtError.message : undefined,
      });
    }
  } catch (error) {
    console.error("❌ Authentication middleware error:", error);
    return res.status(500).json({
      error: "Authentication service error",
      code: "AUTH_SERVICE_ERROR",
    });
  }
};

module.exports = authenticateToken;
