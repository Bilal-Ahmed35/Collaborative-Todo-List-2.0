const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const List = require("../models/List");
const Notification = require("../models/Notification");
const PendingInvitation = require("../models/PendingInvitation");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Auth route
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const userData = {
      uid: payload.sub,
      email: payload.email,
      displayName: payload.name,
      photoURL: payload.picture,
      provider: "google",
    };

    let user = await User.findOne({ uid: userData.uid });
    if (!user) {
      user = new User(userData);
      await user.save();
    } else {
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Handle pending invitations
    const pendingInvites = await PendingInvitation.find({
      email: userData.email.toLowerCase(),
    });
    for (const invite of pendingInvites) {
      await List.findByIdAndUpdate(invite.listId, {
        $addToSet: { memberIds: userData.uid },
        $set: { [`roles.${userData.uid}`]: invite.role },
      });

      const notification = new Notification({
        userId: userData.uid,
        title: "List Invitation Accepted",
        message: `You've been added to "${invite.listName}" as ${invite.role}`,
        listId: invite.listId,
        type: "welcome",
      });
      await notification.save();

      await PendingInvitation.findByIdAndDelete(invite._id);
    }

    const jwtToken = jwt.sign(
      userData,
      process.env.JWT_SECRET || "your-secret-key"
    );
    res.json({ user: userData, token: jwtToken });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(400).json({ error: "Invalid Google token" });
  }
});

module.exports = router;
