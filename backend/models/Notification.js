// const mongoose = require("mongoose");

// const notificationSchema = new mongoose.Schema({
//   userId: { type: String, required: true }, // uid
//   title: { type: String, required: true },
//   message: { type: String, required: true },
//   listId: { type: mongoose.Schema.Types.ObjectId, ref: "List" },
//   type: {
//     type: String,
//     enum: ["invite", "welcome", "update"],
//     default: "update",
//   },
//   isRead: { type: Boolean, default: false },
//   createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model("Notification", notificationSchema);

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // uid of the user receiving the notification
  title: { type: String, required: true },
  message: { type: String, required: true },
  listId: { type: mongoose.Schema.Types.ObjectId, ref: "List" },
  type: {
    type: String,
    enum: [
      "invite",
      "welcome",
      "update",
      "task_created",
      "task_updated",
      "task_completed",
      "task_deleted",
      "task_assigned",
      "list_updated",
      "member_added",
      "member_removed",
      "invitation_accepted",
      "invitation_declined",
    ],
    default: "update",
  },
  isRead: { type: Boolean, default: false },
  read: { type: Boolean, default: false }, // Keep both for compatibility
  createdAt: { type: Date, default: Date.now },
  // Additional metadata for different notification types
  metadata: {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    taskTitle: { type: String },
    actorUserId: { type: String }, // who performed the action
    actorName: { type: String }, // name of who performed the action
    priority: { type: String },
    oldStatus: { type: String },
    newStatus: { type: String },
    assignedTo: { type: String },
    assignedToName: { type: String },
  },
});

// Index for faster queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
