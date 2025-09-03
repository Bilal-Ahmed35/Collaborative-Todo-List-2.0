const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // uid
  title: { type: String, required: true },
  message: { type: String, required: true },
  listId: { type: mongoose.Schema.Types.ObjectId, ref: "List" },
  type: {
    type: String,
    enum: ["invite", "welcome", "update"],
    default: "update",
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notification", notificationSchema);
