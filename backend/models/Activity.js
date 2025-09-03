const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  listId: { type: mongoose.Schema.Types.ObjectId, ref: "List", required: true },
  userId: { type: String, required: true }, // uid
  action: { type: String, required: true }, // e.g. "created task", "completed task"
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Activity", activitySchema);
