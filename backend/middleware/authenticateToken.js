const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  try {
    if (token.startsWith("google_")) {
      const googleToken = token.replace("google_", "");
      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      req.user = {
        uid: payload.sub,
        email: payload.email,
        displayName: payload.name,
        photoURL: payload.picture,
      };
    } else {
      req.user = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    }
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.sendStatus(403);
  }
};

module.exports = authenticateToken;
