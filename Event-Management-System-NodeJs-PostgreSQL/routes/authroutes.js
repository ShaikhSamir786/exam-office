const express = require("express");
const router = express.Router();
const validateRequest = require("../middlewares/express-val");
const { body } = require("express-validator");
const auth = require("../middlewares/auth");
const {
  registeruser,
  loginuser,
  logout,
  verifyEmail,
  changePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth-controller");

router.post(
  "/register",
  [
    body("firstName").trim().notEmpty().withMessage("firstName is required"),
    body("lastName").trim().notEmpty().withMessage("lastName is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be >= 8 chars"),
  ],
  validateRequest,
  registeruser
);

router.post(
  "/verify-email",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("6-digit OTP required"),
  ],
  validateRequest,
  verifyEmail
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  loginuser
);

router.post("/logout", auth, logout);

router.put(
  "/change-password",
  auth,
  [
    body("currentPassword").notEmpty().withMessage("Current password required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 chars"),
  ],
  validateRequest,
  changePassword
);

router.post(
  "/forgot-password",
  auth,
  [body("email").isEmail().withMessage("Valid email required")],
  validateRequest,
  forgotPassword
);

router.post(
  "/reset-password",
  auth,
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("6-digit OTP required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 chars"),
  ],
  validateRequest,
  resetPassword
);

module.exports = router;
