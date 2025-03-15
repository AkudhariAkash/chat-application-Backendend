const express = require("express");
// const Message = require("../models/messagesModel"); 
//const mongoose = require("mongoose"); // ✅ Correct import
// const multer = require("multer");

const { addMessage, getMessages,addCallMessage,getCallMessages,deleteMessage,updateMessage ,extractFormData ,sendVoiceMessage, getVoiceMessages,deleteVoiceMessage} = require("../controllers/messagesController");
const router = express.Router();
 
// Route to add a new message (including emojis)
router.post("/addmsg", addMessage);
 
// Route to fetch messages between two 
router.post("/getmsg", getMessages);
router.put("/:messageId",updateMessage);
router.delete("/:messageId", deleteMessage);
 
router.post("/add-call", addCallMessage);
router.post("/get-calls", getCallMessages);

// // Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/'); // Save files in "uploads" folder
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname); // Unique filename
//   }
// });
// const upload = multer({ storage: storage });

  
router.post("/addvoice", extractFormData, sendVoiceMessage);
router.get("/:from/:to", getVoiceMessages);
// DELETE route for deleting a voice message
router.delete("/deletevoice/:id", deleteVoiceMessage);
  
 
module.exports = router;
 