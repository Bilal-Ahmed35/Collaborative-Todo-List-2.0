const express = require("express");
const Notification = require("../models/Notification");

const router = express.Router();

// Get all notifications
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create notification
router.post("/", async (req, res) => {
  try {
    const newNotification = new Notification(req.body);
    await newNotification.save();
    res.status(201).json(newNotification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mark notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
