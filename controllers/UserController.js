const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { io } = require('../server'); 
const Notification = require("../models/notification")


// Configure Nodemailer for email sending
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Gmail SMTP server
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.SMTP_USER, // Your Gmail address
    pass: process.env.SMTP_PASS, // Your App Password
  },
});

// Verify Nodemailer configuration
transporter.verify((error) => {
  if (error) {
    console.error("SMTP Verification Error:", error.message);
  } else {
    console.log("SMTP Server Ready to Send Emails");
  }
});

// Helper function to send a verification email
const sendVerificationEmail = async (email, token) => {
  const verificationLink = `https://chat-app-delta-lemon.vercel.app/verify-email/${token}`;
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Verify Your Email Address",
    html: `
      <h2>Welcome to LNRS!</h2>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationLink}">${verificationLink}</a>
      <p>This link will expire in 1 hour.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to: ${email}`);
  } catch (error) {
    console.error("Error sending verification email:", error.message);
    throw new Error("Failed to send verification email");
  }
};

module.exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if email or username already exists
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    if (await User.findOne({ username })) {
      return res.status(400).json({ message: 'Username already in use' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new unverified user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      verified: false,
    });
    await newUser.save();

    // Generate verification token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError.message);
      return res
        .status(500)
        .json({ message: 'Failed to send verification email. Please try again later.' });
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};

module.exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure that the decoded token has a userId or _id, depending on your JWT payload structure
    if (!decoded || !decoded.userId) {
      return res.status(400).json({ msg: "Invalid token." });
    }

    // Update user to set verified: true
    const user = await User.findByIdAndUpdate(
      decoded.userId, // Ensure the token has userId as the key
      { verified: true },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ msg: "User not found." });
    }

    res.json({ msg: "Email verified successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error, please try again." });
  }
};


module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid email or password." });
    }

    // Check if the user is verified
    if (!user.verified) {
      return res
        .status(400)
        .json({ msg: "Your email is not verified. Please check your inbox." });
    }

    // Verify the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid email or password." });
    }

    // Generate a JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    //notification creation
      const notification = new Notification({
        email,
        message: "You have successfully logged in.",
        read: false,
      });
  
      await notification.save();
       
      if (!global.onlineUsers) {
        console.error("global.onlineUsers is not initialized.");
        global.onlineUsers = new Map(); // Ensure it's initialized
      }
      
      // **STEP 2: SEND REAL-TIME NOTIFICATION VIA SOCKET.IO**
      const userSocketId = global.onlineUsers.get(user.email);
      if (userSocketId) {
        io.to(userSocketId).emit("new-notification", notification);
      } 

    // Respond with the user and token
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error." });
  }
};
module.exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.id } }).select([
      "email",
      "username",
      "avatarImage",
      "_id",
    ]);
    return res.json(users);
  } catch (ex) {
    next(ex);
  }
};
/*module.exports.setAvatar = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const avatarImage = req.body.image;  // Assuming the image is passed in the body
    
    // Find and update the user with the new avatar
    const userData = await User.findByIdAndUpdate(
      userId,
      { avatarImage },  // Save the avatar data (e.g., URL or base64)
      { new: true }
    );

    return res.json({
      isSet: true,
      image: userData.avatarImage, // Return the avatarImage, not 'avatar'
    });
  } catch (ex) {
    next(ex);
  }
};*/

module.exports.searchUsers = async (req, res) => {
  const { query } = req.body;
  console.log("Search Query:", query); // Log the query
  try {
    if (!query.trim()) {
      return res.status(400).json({ message: "Query is required" });
    }
    const users = await User.find({
      $or: [
        { username: query },  // Exact match for username
        { email: query }       // Exact match for email
      ]
    });
    res.json(users);
  } catch (error) {
    console.error("Error in search:", error.message);
    res.status(500).json({ message: "Failed to search users" });
  }
};

const logOut = (req, res, next) => {
  try {
    if (!req.params.id) return res.json({ msg: "User id is required " });
    onlineUsers.delete(req.params.id);
    return res.status(200).send();
  } catch (ex) {
    next(ex);
  }
};