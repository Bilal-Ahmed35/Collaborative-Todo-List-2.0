const mongoose = require("mongoose");

const listSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  ownerId: { type: String, required: true }, // user UID
  memberIds: [{ type: String }], // array of user UIDs
  roles: { type: Map, of: String }, // uid -> role (admin, editor, viewer)
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("List", listSchema);
