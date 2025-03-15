const Messages = require("../models/messagesModel");
const mongoose = require("mongoose");
const VoiceMessage = require('../models/VoiceMessage');
const multer = require("multer"); 
 
const callUser = (req, res) => {
  const { from, to, type } = req.body;
 
  req.io.to(to).emit("incoming-call", { from, type });
  res.status(200).json({ success: true, message: "Call initiated" });
};
 
module.exports.addMessage = async (req, res) => {
  try {
    const { from, to, message } = req.body;
 
    if (!message || message.trim() === "") {
      return res.status(400).json({ msg: "Message cannot be empty" });
    }
 
    // Store the message in the database asynchronously
    const data = await Messages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });
 
    console.log("Message stored:", data);
    return res.json({ msg: "Message added successfully." });
 
  } catch (error) {
    console.error("Error adding message:", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};
 
 
module.exports.getMessages = async (req, res) => {
  try {
    const { from, to } = req.body;
 
    const messages = await Messages.find({
      users: { $all: [from, to] },
    }).sort({ updatedAt: 1 });
 
    const formattedMessages = messages.map((msg) => ({
      _id: msg._id, // Include the message ID
      fromSelf: msg.sender.toString() === from,
      message: msg.message.text,
    }));
 
    res.json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};
 
// module.exports.addMessage = async (req, res) => {
//   try {
//     const { from, to, message } = req.body;
 
//     // Log the incoming message to ensure it's being received correctly
//     console.log("Received message:", message); // Ensure emojis are included here
 
//     // Validate the message
//     if (!message || message.trim() === "") {
//       return res.status(400).json({ msg: "Message cannot be empty" });
//     }
 
//     // Save the message in the database
//     const data = await Messages.create({
//       message: { text: message }, // Store the message text (including emojis)
//       users: [from, to], // The two users involved in the conversation
//       sender: from, // The sender of the message
//     });
 
//     // Log the result to verify it's stored correctly
//     console.log("Message stored:", data);
 
//     if (data) {
//       return res.json({ msg: "Message added successfully." });
//     } else {
//       return res.status(500).json({ msg: "Failed to add message to the database" });
//     }
//   } catch (error) {
//     console.error("Error adding message:", error);
//     res.status(500).json({ msg: "Internal Server Error" });
//   }
// };
 
// Store a call log message
module.exports.addCallMessage = async (req, res) => {
  try {
    const { from, to, type, status } = req.body;
 
    const callMessage = await Messages.create({
      message: { text: `Call ${status}: ${type}` },
      users: [from, to],
      sender: from,
      type: "call",
    });
 
    res.status(200).json({ success: true, message: callMessage });
  } catch (error) {
    console.error("Error saving call message:", error);
    res.status(500).json({ success: false, msg: "Internal Server Error" });
  }
};
 
// Retrieve call logs between two users
module.exports.getCallMessages = async (req, res) => {
  try {
    const { from, to } = req.body;
    const callLogs = await Messages.find({
      users: { $all: [from, to] },
      type: "call",
    }).sort({ createdAt: 1 });
 
    res.status(200).json(callLogs);
  } catch (error) {
    console.error("Error fetching call logs:", error);
    res.status(500).json({ success: false, msg: "Internal Server Error" });
  }
};
// Save call details
exports.addCall = async (req, res) => {
  try {
    const { from, to, callType, callStatus } = req.body;
 
    const call = new Call({ from, to, callType, callStatus });
    await call.save();
 
    res.status(201).json({ message: "Call details saved", call });
  } catch (error) {
    res.status(500).json({ error: "Error saving call details" });
  }
};
 
// Fetch call logs
exports.getCall = async (req, res) => {
  try {
    const { from, to } = req.body;
 
    const calls = await Call.find({
      $or: [
        { from, to },
        { from: to, to: from },
      ],
    }).sort({ timestamp: -1 });
 
    res.json(calls);
  } catch (error) {
    res.status(500).json({ error: "Error fetching call logs" });
  }
};
 
// // Edit a Message
// module.exports.editMessage = async (req, res) => {
//   try {
//     const { text } = req.body;
//     const updatedMessage = await Messages.findByIdAndUpdate(
//       req.params.messageId,
//       { "message.text": text },
//       { new: true }
//     );
//     if (!updatedMessage) return res.status(404).json({ error: "Message not found" });
 
//     res.json(updatedMessage);
//   } catch (err) {
//     res.status(500).json({ error: "Failed to update message" });
//   }
// };
 
module.exports.updateMessage = async (req, res) => {
  try {
    let messageId = req.params.messageId.trim(); // ✅ Trim to remove spaces/newlines
    const { text } = req.body;
 
    // ✅ Ensure messageId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: "Invalid message ID format" });
    }
 
    // ✅ Find the existing message first
    const existingMessage = await Messages.findById(messageId);
    if (!existingMessage) {
      return res.status(404).json({ error: "Message not found" });
    }
 
    console.log("Updating message:", messageId, "with text:", text); // Debugging log
 
    // ✅ Update only the `text` field inside `message` object
    const updatedMessage = await Messages.findByIdAndUpdate(
      messageId,
      { $set: { "message.text": text } }, // ✅ Properly update nested field
      { new: true, runValidators: true }
    );
 
    res.json(updatedMessage);
  } catch (err) {
    console.error("Error updating message:", err); // Log the error
    res.status(500).json({ error: "Failed to update message", details: err.message });
  }
};
 
// Delete a Message
module.exports.deleteMessage = async (req, res) => {
  try {
    let messageId = req.params.messageId.trim(); // ✅ Trim messageId
 
    // ✅ Check if messageId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: "Invalid message ID format" });
    }
 
    // ✅ Delete the message
    const deletedMessage = await Messages.findByIdAndDelete(messageId);
 
    if (!deletedMessage) {
      return res.status(404).json({ error: "Message not found" });
    }
 
    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err); // ✅ Log error for debugging
    res.status(500).json({ error: "Failed to delete message", details: err.message });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save files in "uploads" folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // Unique filename
  },
});
const upload = multer({ storage: storage });

module.exports.extractFormData = (req, res, next) => {
  upload.single("file")(req, res, function (err) {
    if (err) {
      return res.status(500).json({ error: "Multer error", details: err });
    }

    try {
      console.log("✅ Received FormData Fields:", req.body);

      // Trim IDs to remove spaces
      req.body.from = req.body.from.trim();
      req.body.to = req.body.to.trim();

      next();
    } catch (error) {
      console.error("❌ Error processing FormData:", error);
      return res.status(400).json({ error: "Invalid form data" });
    }
  });
};
module.exports.sendVoiceMessage = async (req, res) => {
  try {
    console.log("✅ Received FormData Fields:", req.body);
    console.log("✅ Received file:", req.file);

    let { from, to } = req.body;

    // Ensure `from` and `to` are valid ObjectIds
    if (!mongoose.Types.ObjectId.isValid(from) || !mongoose.Types.ObjectId.isValid(to)) {
      console.error("❌ Invalid sender or receiver ID");
      return res.status(400).json({ msg: "Invalid sender or receiver ID" });
    }

    // Convert to MongoDB ObjectId
    from = new mongoose.Types.ObjectId(from);
    to = new mongoose.Types.ObjectId(to);

    if (!req.file) {
      console.error("❌ No audio file received");
      return res.status(400).json({ msg: "Audio file is required" });
    }

    const audioUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const newVoiceMessage = new VoiceMessage({
      sender: from,
      receiver: to,
      audioUrl,
    });

    await newVoiceMessage.save();

    console.log("✅ Voice message saved successfully:", audioUrl);
    res.status(201).json({ audioUrl });
  } catch (error) {
    console.error("❌ Error saving voice message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports.getVoiceMessages = async (req, res) => {
  try {
    const { from, to } = req.params;

    if (!mongoose.Types.ObjectId.isValid(from) || !mongoose.Types.ObjectId.isValid(to)) {
      return res.status(400).json({ msg: "Invalid sender or receiver ID" });
    }

    const messages = await VoiceMessage.find({
      $or: [
        { sender: from, receiver: to },
        { sender: to, receiver: from },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "username")
      .populate("receiver", "username");

    res.status(200).json(messages);
  } catch (error) {
    console.error("❌ Error fetching voice messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Delete voice message
module.exports.deleteVoiceMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await VoiceMessage.findById(id);

    if (!message) {
      return res.status(404).json({ message: "Voice message not found" });
    }

    // Delete from database
    await VoiceMessage.findByIdAndDelete(id);

    res.json({ success: true, message: "Voice message deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};