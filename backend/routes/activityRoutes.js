const express = require("express");
const Activity = require("../models/Activity");
const List = require("../models/List");

const router = express.Router();

// Get all activities (with optional listId filter)
router.get("/", async (req, res) => {
  try {
    const { listId } = req.query;
    let filter = {};

    if (listId) {
      // Check if user has access to this list
      const list = await List.findById(listId);
      if (!list || !list.memberIds.includes(req.user.uid)) {
        return res.status(403).json({ error: "Access denied to this list" });
      }
      filter.listId = listId;
    } else {
      // Get activities for all lists the user has access to
      const userLists = await List.find({
        $or: [
          { ownerId: req.user.uid },
          { memberIds: { $in: [req.user.uid] } },
        ],
      }).select("_id");

      const listIds = userLists.map((list) => list._id);
      filter.listId = { $in: listIds };
    }

    const activities = await Activity.find(filter)
      .populate("listId", "name")
      .populate("taskId", "title")
      .sort({ timestamp: -1 })
      .limit(100); // Limit to recent activities

    res.json(activities);
  } catch (err) {
    console.error("Error getting activities:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add activity
router.post("/", async (req, res) => {
  try {
    const activityData = {
      ...req.body,
      userId: req.user.uid,
      timestamp: new Date(),
    };

    // Validate that user has access to the list
    if (activityData.listId) {
      const list = await List.findById(activityData.listId);
      if (!list || !list.memberIds.includes(req.user.uid)) {
        return res.status(403).json({ error: "Access denied to this list" });
      }
    }

    const newActivity = new Activity(activityData);
    await newActivity.save();

    // Populate references before sending response
    await newActivity.populate("listId", "name");
    await newActivity.populate("taskId", "title");

    res.status(201).json(newActivity);
  } catch (err) {
    console.error("Error creating activity:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get activity by ID
router.get("/:id", async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate("listId", "name")
      .populate("taskId", "title");

    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    // Check if user has access to the list
    const list = await List.findById(activity.listId);
    if (!list || !list.memberIds.includes(req.user.uid)) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(activity);
  } catch (err) {
    console.error("Error getting activity:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete activity (only by activity creator or list owner)
router.delete("/:id", async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    // Check permissions
    const list = await List.findById(activity.listId);
    if (
      !list ||
      (activity.userId !== req.user.uid && list.ownerId !== req.user.uid)
    ) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    await Activity.findByIdAndDelete(req.params.id);
    res.json({ message: "Activity deleted successfully" });
  } catch (err) {
    console.error("Error deleting activity:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
