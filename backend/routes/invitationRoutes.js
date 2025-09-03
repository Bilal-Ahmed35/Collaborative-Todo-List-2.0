const express = require("express");
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
