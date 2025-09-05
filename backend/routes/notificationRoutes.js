const express = require("express");
const Notification = require("../models/Notification");

const router = express.Router();

// Get notifications for the current user
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.uid,
    }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error("Error getting notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create notification
router.post("/", async (req, res) => {
  try {
    const newNotification = new Notification({
      ...req.body,
      createdAt: new Date(),
    });
    await newNotification.save();
    res.status(201).json(newNotification);
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(400).json({ error: err.message });
  }
});

// Update notification (mark as read)
router.put("/:id", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check if notification belongs to current user
    if (notification.userId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error("Error updating notification:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check if notification belongs to current user
    if (notification.userId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check if notification belongs to current user
    if (notification.userId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
