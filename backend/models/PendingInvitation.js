const mongoose = require("mongoose");

const pendingInvitationSchema = new mongoose.Schema({
  email: { type: String, required: true }, // invited email
  listId: { type: mongoose.Schema.Types.ObjectId, ref: "List", required: true },
  listName: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "editor", "viewer"],
    default: "viewer",
  },
  invitedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PendingInvitation", pendingInvitationSchema);
