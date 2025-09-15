const express = require("express");
const nodemailer = require("nodemailer");
const PendingInvitation = require("../models/PendingInvitation");
const List = require("../models/List");
const Activity = require("../models/Activity");

const router = express.Router();

// Get invitation by listId and email (what your frontend calls)
router.get("/", async (req, res) => {
  try {
    const { listId, email } = req.query;

    if (listId && email) {
      // Frontend is requesting specific invitation
      const invitation = await PendingInvitation.findOne({
        listId: listId,
        email: email.toLowerCase(),
      }).populate("listId", "name");

      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      // Check if expired (7 days)
      const expiresAt = new Date(invitation.invitedAt);
      expiresAt.setDate(expiresAt.getDate() + 7);

      if (expiresAt < new Date()) {
        // Clean up expired invitation
        await PendingInvitation.findByIdAndDelete(invitation._id);
        return res.status(404).json({ error: "Invitation has expired" });
      }

      // Return invitation data in the format frontend expects
      return res.json({
        _id: invitation._id,
        listId: invitation.listId,
        list: invitation.list,
        role: invitation.role,
        email: invitation.email,
        invitedByName: invitation.invitedByName || "Someone",
        invitedAt: invitation.invitedAt,
        expiresAt: expiresAt.toISOString(),
      });
    } else {
      // Return all invitations for admin purposes
      const invites = await PendingInvitation.find();
      res.json(invites);
    }
  } catch (err) {
    console.error("Error getting invitations:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create invitation (this is what your listRoutes calls)
router.post("/", async (req, res) => {
  try {
    console.log("Creating invitation:", req.body);

    const { email, listId, role, list, invitedByName } = req.body;

    // Validation
    if (!email || !listId || !list) {
      return res.status(400).json({
        error: "Missing required fields: email, listId, and list are required",
      });
    }

    // Check if invitation already exists
    const existingInvite = await PendingInvitation.findOne({
      email: email.toLowerCase(),
      listId: listId,
    });

    if (existingInvite) {
      return res.status(400).json({
        error: "Invitation already sent to this email for this list",
      });
    }

    // Create the invitation
    const invitationData = {
      email: email.toLowerCase(),
      listId,
      list,
      role: role || "viewer",
      invitedByName: invitedByName || req.user?.displayName || "Someone",
      invitedAt: new Date(),
    };

    const newInvite = new PendingInvitation(invitationData);
    await newInvite.save();

    console.log("Invitation created:", newInvite._id);
    res.status(201).json(newInvite);
  } catch (err) {
    console.error("Error creating invitation:", err);
    res.status(400).json({ error: err.message });
  }
});

// Accept invitation - Fixed to match frontend calls
router.post("/:listId/accept", async (req, res) => {
  try {
    const { listId } = req.params;
    const { email, role } = req.body;
    const userId = req.user.uid;

    console.log("Accepting invitation:", { listId, email, role, userId });

    // Find the pending invitation
    const invitation = await PendingInvitation.findOne({
      listId: listId,
      email: email.toLowerCase(),
    });

    if (!invitation) {
      return res
        .status(404)
        .json({ error: "Invitation not found or has expired" });
    }

    // Check if invitation has expired (7 days)
    const expiresAt = new Date(invitation.invitedAt);
    expiresAt.setDate(expiresAt.getDate() + 7);

    if (expiresAt < new Date()) {
      // Clean up expired invitation
      await PendingInvitation.findByIdAndDelete(invitation._id);
      return res.status(400).json({ error: "Invitation has expired" });
    }

    // Find the list
    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check if user is already a member
    if (list.memberIds.includes(userId)) {
      // Update role if different
      if (list.roles instanceof Map) {
        list.roles.set(userId, invitation.role);
      } else {
        if (!list.roles) list.roles = {};
        list.roles[userId] = invitation.role;
      }
      await list.save();

      // Remove invitation
      await PendingInvitation.findByIdAndDelete(invitation._id);

      return res.json({
        message: "You are already a member. Role updated if needed.",
        listId: list._id,
        role: invitation.role,
      });
    }

    // Add user to the list
    list.memberIds.push(userId);

    // Set user role
    if (list.roles instanceof Map) {
      list.roles.set(userId, invitation.role);
    } else {
      if (!list.roles) list.roles = {};
      list.roles[userId] = invitation.role;
    }

    await list.save();

    // Create activity record
    try {
      const activity = new Activity({
        listId: list._id,
        userId: userId,
        action: `joined the list as ${invitation.role}`,
        timestamp: new Date(),
      });
      await activity.save();
    } catch (activityError) {
      console.error("Error creating activity:", activityError);
      // Don't fail the whole request if activity creation fails
    }

    // Remove the pending invitation
    await PendingInvitation.findByIdAndDelete(invitation._id);

    console.log("Invitation accepted successfully");
    res.json({
      message: "Invitation accepted successfully",
      listId: list._id,
      listName: list.name,
      role: invitation.role,
    });
  } catch (err) {
    console.error("Error accepting invitation:", err);
    res.status(500).json({ error: err.message });
  }
});

// Decline invitation - Fixed to match frontend calls
router.post("/:listId/decline", async (req, res) => {
  try {
    const { listId } = req.params;
    const { email } = req.body;

    console.log("Declining invitation:", { listId, email });

    // Find and remove the pending invitation
    const invitation = await PendingInvitation.findOneAndDelete({
      listId: listId,
      email: email.toLowerCase(),
    });

    if (!invitation) {
      // Still return success even if invitation not found
      // (maybe it was already processed or expired)
      return res.json({ message: "Invitation declined" });
    }

    console.log("Invitation declined successfully");
    res.json({ message: "Invitation declined successfully" });
  } catch (err) {
    console.error("Error declining invitation:", err);
    res.status(500).json({ error: err.message });
  }
});

// Legacy routes for backward compatibility (using invitation ID)
router.put("/:id/accept", async (req, res) => {
  try {
    const invitation = await PendingInvitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    // Check expiration
    const expiresAt = new Date(invitation.invitedAt);
    expiresAt.setDate(expiresAt.getDate() + 7);

    if (expiresAt < new Date()) {
      await PendingInvitation.findByIdAndDelete(invitation._id);
      return res.status(400).json({ error: "Invitation has expired" });
    }

    // Add user to the list
    const list = await List.findById(invitation.listId);
    if (list) {
      // Add user to memberIds if not already there
      if (!list.memberIds.includes(req.user.uid)) {
        list.memberIds.push(req.user.uid);
      }

      // Set user role
      if (list.roles instanceof Map) {
        list.roles.set(req.user.uid, invitation.role);
      } else {
        if (!list.roles) list.roles = {};
        list.roles[req.user.uid] = invitation.role;
      }

      await list.save();

      // Create activity
      try {
        const activity = new Activity({
          listId: list._id,
          userId: req.user.uid,
          action: `joined the list as ${invitation.role}`,
          timestamp: new Date(),
        });
        await activity.save();
      } catch (activityError) {
        console.error("Error creating activity:", activityError);
      }
    }

    // Remove the pending invitation
    await PendingInvitation.findByIdAndDelete(req.params.id);

    res.json({ message: "Invitation accepted successfully" });
  } catch (err) {
    console.error("Error accepting invitation:", err);
    res.status(500).json({ error: err.message });
  }
});

// Legacy reject route
router.put("/:id/reject", async (req, res) => {
  try {
    const invitation = await PendingInvitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    // Remove the pending invitation
    await PendingInvitation.findByIdAndDelete(req.params.id);

    res.json({ message: "Invitation rejected successfully" });
  } catch (err) {
    console.error("Error rejecting invitation:", err);
    res.status(500).json({ error: err.message });
  }
});

// Send invitation email (separate endpoint for email sending)
router.post("/send-email", async (req, res) => {
  try {
    const {
      email,
      list,
      listId,
      invitedByName,
      role,
      invitationLink,
      emailContent,
    } = req.body;

    console.log("Email send request:", { email, list, role, invitedByName });

    // Basic validation
    if (!email || !list) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: email and list are required",
      });
    }

    // For development, just log and return success
    // This prevents the 400 error while you set up actual email service
    console.log("Simulating email send:");
    console.log("  To:", email);
    console.log("  List:", list);
    console.log("  Role:", role || "viewer");
    console.log("  Invited by:", invitedByName || "Unknown");

    res.json({
      success: true,
      message: "Invitation email simulated successfully (development mode)",
      data: {
        email,
        list,
        role: role || "viewer",
        sentAt: new Date().toISOString(),
      },
    });

    /* 
    TODO: Uncomment and configure when ready for production email sending
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Email service not configured");
    }

    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const defaultSubject = `You've been invited to join "${list}"`;
    const defaultHtml = `
      <h2>You've been invited to collaborate!</h2>
      <p>${invitedByName || 'Someone'} has invited you to join the list <strong>"${list}"</strong> as a <strong>${role || 'viewer'}</strong>.</p>
      <p><a href="${invitationLink || '#'}" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
      <p>If you can't click the button, copy and paste this link: ${invitationLink || '#'}</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: emailContent?.subject || defaultSubject,
      html: emailContent?.html || defaultHtml,
      text: emailContent?.text || `You've been invited by ${invitedByName || 'someone'} to join "${list}" as a ${role || 'viewer'}. Visit: ${invitationLink || 'the application'}`
    };

    await transporter.sendMail(mailOptions);
    */
  } catch (error) {
    console.error("Email service error:", error);
    res.status(500).json({
      success: false,
      message: "Email service error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

module.exports = router;
