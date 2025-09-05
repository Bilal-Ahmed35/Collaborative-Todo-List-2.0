const express = require("express");
const List = require("../models/List");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");

const router = express.Router();

// ✅ Get all lists (filter by user membership)
router.get("/", async (req, res) => {
  try {
    const lists = await List.find({
      $or: [{ ownerId: req.user.uid }, { memberIds: { $in: [req.user.uid] } }],
    }).sort({ createdAt: -1 });
    res.json(lists);
  } catch (err) {
    console.error("Error getting lists:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create new list
router.post("/", async (req, res) => {
  try {
    const listData = {
      ...req.body,
      ownerId: req.user.uid,
      memberIds: [req.user.uid],
      roles: new Map([[req.user.uid, "owner"]]),
      createdAt: new Date(),
    };

    const newList = new List(listData);
    await newList.save();

    // Create welcome notification
    const notification = new Notification({
      userId: req.user.uid,
      title: "List Created",
      message: `You created the list "${newList.name}"`,
      listId: newList._id,
      type: "welcome",
    });
    await notification.save();

    res.status(201).json(newList);
  } catch (err) {
    console.error("Error creating list:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get list by ID
router.get("/:id", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ error: "List not found" });

    // Check if user has access
    if (!list.memberIds.includes(req.user.uid)) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(list);
  } catch (err) {
    console.error("Error getting list:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update list
router.put("/:id", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check permissions
    const userRole = list.roles.get(req.user.uid);
    if (userRole !== "owner" && userRole !== "admin") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const updatedList = await List.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    // Create activity
    const activity = new Activity({
      listId: updatedList._id,
      userId: req.user.uid,
      action: `updated list "${updatedList.name}"`,
    });
    await activity.save();

    res.json(updatedList);
  } catch (err) {
    console.error("Error updating list:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Delete list
router.delete("/:id", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check if user is owner
    if (list.ownerId !== req.user.uid) {
      return res
        .status(403)
        .json({ error: "Only the owner can delete this list" });
    }

    await List.findByIdAndDelete(req.params.id);
    res.json({ message: "List deleted successfully" });
  } catch (err) {
    console.error("Error deleting list:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add invitation endpoint to lists
router.post("/:id/invitations", async (req, res) => {
  try {
    const { email, role } = req.body;
    const listId = req.params.id;

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check permissions
    const userRole = list.roles.get(req.user.uid);
    if (userRole !== "owner" && userRole !== "admin") {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to invite members" });
    }

    const PendingInvitation = require("../models/PendingInvitation");

    // Check if invitation already exists
    const existingInvite = await PendingInvitation.findOne({
      email: email.toLowerCase(),
      listId: listId,
    });

    if (existingInvite) {
      return res
        .status(400)
        .json({ error: "Invitation already sent to this email" });
    }

    // Create pending invitation
    const invitation = new PendingInvitation({
      email: email.toLowerCase(),
      listId: listId,
      listName: list.name,
      role: role || "viewer",
    });

    await invitation.save();

    // Create activity
    const activity = new Activity({
      listId: listId,
      userId: req.user.uid,
      action: `invited ${email} to the list`,
    });
    await activity.save();

    res.status(201).json({ message: "Invitation sent successfully" });
  } catch (err) {
    console.error("Error sending invitation:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
