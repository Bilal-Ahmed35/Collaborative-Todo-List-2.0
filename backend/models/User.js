const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  uid: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  displayName: String,
  photoURL: String,
  provider: { type: String, default: "google" },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
