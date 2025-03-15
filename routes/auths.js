const express = require("express");


const {
  register,
  verifyEmail,
  login,
  getAllUsers,
//setAvatar,
searchUsers,
} = require("../controllers/UserController");

const router = express.Router();

router.post("/register", register);
router.get("/verify-email/:token", verifyEmail);
router.post("/login", login);
router.get("/getAllUsers/:id", getAllUsers);
//// Complete route for setting avatar

router.post("/search", searchUsers);



module.exports = router;
