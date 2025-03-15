const Notification = require('../models/notification'); // Your Notification model

// Middleware to log notifications
const notificationLogger = (message, email) => {
  return async (req, res, next) => {
    try {
      const notification = new Notification({
        email,
        message, // The message you pass in the middleware
        read: false, // Initially mark it as unread
      });

      await notification.save(); // Save notification to DB
      next(); // Continue to the next middleware or route handler
    } catch (err) {
      console.error("Error logging notification:", err);
      next(err); // If there's an error, still call next() to prevent blocking the request
    }
  };
};

module.exports = notificationLogger;
