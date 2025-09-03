const express = require("express");
const Activity = require("../models/Activity");

const router = express.Router();

// Get all activities
router.get("/", async (req, res) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add activity
router.post("/", async (req, res) => {
  try {
    const newActivity = new Activity(req.body);
    await newActivity.save();
    res.status(201).json(newActivity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
