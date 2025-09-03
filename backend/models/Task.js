const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ["todo", "in-progress", "done"],
    default: "todo",
  },
  dueDate: Date,
  listId: { type: mongoose.Schema.Types.ObjectId, ref: "List", required: true },
  assigneeId: String, // uid of the assigned user
  createdBy: String, // uid of creator
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

module.exports = mongoose.model("Task", taskSchema);
