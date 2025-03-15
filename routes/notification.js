const express = require("express");
const Notification = require("../models/notification");

module.exports = (io) => {
  const router = express.Router();

  // ✅ Add Notification (POST)
  router.post("/add", async (req, res) => {
    const { message, email } = req.body;
    if (!message || !email) {
      return res.status(400).json({ message: "Message and email are required." });
    }

    try {
      const newNotification = new Notification({ message, email, read: false });
      await newNotification.save();

      // ✅ Emit real-time notification if user is online
      if (global.onlineUsers.has(email)) {
        io.to(global.onlineUsers.get(email)).emit("new-notification", newNotification);
      }

      res.status(201).json({ message: "Notification added successfully." });
    } catch (err) {
      console.error("Error creating notification:", err);
      res.status(500).json({ message: "Failed to create notification." });
    }
  });

  // ✅ Get Notifications (GET)
  router.get("/notifications/:email", async (req, res) => {
    const { email } = req.params;
    try {
      const notifications = await Notification.find({ email }).sort({ timestamp: -1 });
      const unreadCount = await Notification.countDocuments({ email, read: false });

      res.json({ notifications, unreadCount });
    } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({ message: "Failed to fetch notifications." });
    }
  });

  // ✅ Mark Notifications as Read (PUT)
  router.put("/notifications/read/:email", async (req, res) => {
    const { email } = req.params;
    try {
      await Notification.updateMany({ email, read: false }, { $set: { read: true } });

      res.json({ message: "Notifications marked as read." });
    } catch (err) {
      console.error("Error marking notifications as read:", err);
      res.status(500).json({ message: "Failed to mark notifications as read." });
    }
  });

  return router;
};
