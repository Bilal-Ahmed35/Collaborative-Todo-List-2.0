const express = require("express");
const Task = require("../models/Task");
const Activity = require("../models/Activity");

const router = express.Router();

// ✅ Get all tasks (with optional listId filter)
router.get("/", async (req, res) => {
  try {
    const { listId } = req.query;
    const filter = listId ? { listId } : {};
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error("Error getting tasks:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create a task
router.post("/", async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newTask = new Task(taskData);
    await newTask.save();

    // Create activity
    const activity = new Activity({
      listId: newTask.listId,
      userId: req.user.uid,
      action: `created task "${newTask.title}"`,
      taskId: newTask._id,
    });
    await activity.save();

    res.status(201).json(newTask);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get task by ID
router.get("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (err) {
    console.error("Error getting task:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update task
router.put("/:id", async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      updatedAt: new Date(),
    };

    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, taskData, {
      new: true,
    });

    // Create activity for status changes
    if (oldTask.status !== updatedTask.status) {
      const activity = new Activity({
        listId: updatedTask.listId,
        userId: req.user.uid,
        action: `changed task "${updatedTask.title}" status to ${updatedTask.status}`,
        taskId: updatedTask._id,
      });
      await activity.save();
    }

    res.json(updatedTask);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Delete task
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    await Task.findByIdAndDelete(req.params.id);

    // Create activity
    const activity = new Activity({
      listId: task.listId,
      userId: req.user.uid,
      action: `deleted task "${task.title}"`,
      taskId: task._id,
    });
    await activity.save();

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
