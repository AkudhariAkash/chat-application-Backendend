const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    message: {
      text: { type: String, default: null }, // Optional for audio messages
      audio: { type: String, default: null }, // Store base64 encoded audio
    },
    users: Array,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Messages", messageSchema);