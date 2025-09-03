const express = require("express");
const List = require("../models/List");

const router = express.Router();

// ✅ Get all lists
router.get("/", async (req, res) => {
  try {
    const lists = await List.find();
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create new list
router.post("/", async (req, res) => {
  try {
    const newList = new List(req.body);
    await newList.save();
    res.status(201).json(newList);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get list by ID
router.get("/:id", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ message: "List not found" });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update list
router.put("/:id", async (req, res) => {
  try {
    const updatedList = await List.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updatedList);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Delete list
router.delete("/:id", async (req, res) => {
  try {
    await List.findByIdAndDelete(req.params.id);
    res.json({ message: "List deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
