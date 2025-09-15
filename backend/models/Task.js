const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ["Pending", "InProgress", "Completed"], // Fixed to match frontend
    default: "Pending",
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High"], // Added missing field
    default: "Medium",
  },
  deadline: Date, // Added field that frontend expects
  dueDate: Date, // Keep for backward compatibility
  listId: { type: mongoose.Schema.Types.ObjectId, ref: "List", required: true },
  assigneeId: String, // Keep original
  assignedToUid: String, // Add field that frontend expects
  createdBy: String, // uid of creator
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  done: { type: Boolean, default: false }, // Added missing field
});

module.exports = mongoose.model("Task", taskSchema);
