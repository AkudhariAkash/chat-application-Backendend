const mongoose = require('mongoose');  // Import mongoose

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    avatarImage: {
      type: Object, // Store an object with the avatar's background color and initial
      default: { initials:"", backgroundColor:"" }, // Default avatar data
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Users", userSchema);
