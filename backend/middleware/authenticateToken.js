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

    // Try JWT verification first (this is your primary auth method)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

      // If JWT fails, try direct Google token verification as fallback
      if (googleClient) {
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

      // Both methods failed
      console.error("❌ All token verification methods failed");
      return res.status(403).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
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
