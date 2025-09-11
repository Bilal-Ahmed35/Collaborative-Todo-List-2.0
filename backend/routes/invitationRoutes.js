const express = require("express");
const nodemailer = require("nodemailer");
const PendingInvitation = require("../models/PendingInvitation");

const router = express.Router();

// Get all invitations
router.get("/", async (req, res) => {
  try {
    const invites = await PendingInvitation.find();
    res.json(invites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send invitation
router.post("/", async (req, res) => {
  try {
    const newInvite = new PendingInvitation(req.body);
    await newInvite.save();
    res.status(201).json(newInvite);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ADD THIS: Email sending route (what your frontend is calling)
router.post("/send-email", async (req, res) => {
  try {
    const {
      email,
      list,
      invitedByName,
      role,
      listId,
      invitationLink,
      emailContent,
    } = req.body;

    // Basic validation
    if (!email || !list || !invitedByName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // For now, just return success without actually sending email
    // This prevents the error while you set up email service
    console.log("Email would be sent to:", email, "for list:", list);

    res.json({
      success: true,
      message: "Email sending simulated (not actually sent)",
      data: { email, list, role },
    });

    // TODO: Add actual email sending when ready
    /*
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });
    */
  } catch (error) {
    console.error("Email route error:", error);
    res.status(500).json({
      success: false,
      message: "Email service error",
      error:
        process.env.NODE_ENV !== "production"
          ? error.message
          : "Internal error",
    });
  }
});

// Accept invitation
router.put("/:id/accept", async (req, res) => {
  try {
    const updated = await PendingInvitation.findByIdAndUpdate(
      req.params.id,
      { status: "accepted" },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject invitation
router.put("/:id/reject", async (req, res) => {
  try {
    const updated = await PendingInvitation.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
