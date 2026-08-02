const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  verify2FA,
  resend2FA,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");

// Validation rules
const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];
const verifyOTPValidation = [
  body("passcode").notEmpty().withMessage("Passcode is required"),
  body("user_id").notEmpty().withMessage("User ID is required"),
];
const resendOTPValidation = [
  body("user_id").notEmpty().withMessage("User ID is required"),
];

// Public routes
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.post("/verify-otp", verifyOTPValidation, verify2FA);
router.post("/resend-otp", resendOTPValidation, resend2FA);

// Private routes (require authentication)
router.get("/me", protect, getMe);
router.put("/updatedetails", protect, updateDetails);
router.put("/updatepassword", protect, updatePassword);

// Admin only route example
router.get("/admin", protect, authorize("admin"), (req, res) => {
  res.json({
    success: true,
    message: "Admin access granted",
    user: req.user,
  });
});

module.exports = router;
