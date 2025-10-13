const logger = require("../configs/logger");
const User = require("../models/authmodels");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {} = require("../configs/sequelize-postgre")
 const sendVerificationEmail = require("../mailservices/mail");
const sendResetPassword = require("../mailservices/send-reset-mail");

require("dotenv").config();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

const registeruser = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      if (!existingUser.isActive) {
        // Delete inactive account
        await existingUser.destroy();
      } else {
        return res.status(409).json({ message: "Email already registered" });
      }
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Generate OTP for verification
    const otp = generateOTP(); // e.g., 6-digit code
    const hashedOtp = await bcrypt.hash(otp, 10);

    // 4️⃣ Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      otp: hashedOtp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
      verified: false,
      isActive: true,
    });

    // 5️⃣ Send OTP email
    await sendVerificationEmail(email, otp);

    logger?.info?.(`✅ User created: ${email}`);
    res.status(201).json({
      message: "User created successfully. Please verify your email.",
    });
  } catch (error) {
    logger?.error?.(`❌ User registration failed: ${error.message}`);
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Error creating user" });
  }
};


const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // 1️⃣ Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2️⃣ Check if already verified
    if (user.verified) {
      return res.status(400).json({ message: "Already verified" });
    }

    // 3️⃣ Ensure OTP and expiry exist
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "OTP not generated" });
    }

    // 4️⃣ Check expiry
    if (new Date(user.otpExpiry).getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // 5️⃣ Compare OTP
    const match = await bcrypt.compare(otp, user.otp);
    if (!match) return res.status(400).json({ message: "Invalid OTP" });

    // 6️⃣ Update verification fields
    user.verified = true;
    user.otp = null;
    user.otpExpiry = null;

    await user.save(); // Sequelize persists changes

    res.json({ message: "✅ Email verified successfully" });
  } catch (error) {
    console.error("❌ Email verification failed:", error);
    next(error);
  }
};

const loginuser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1️⃣ Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Email not found" });
    }

    // 2️⃣ Check email verification status
    if (!user.verified) {
      return res
        .status(403)
        .json({ message: "Please verify your email first" });
    }

    // 3️⃣ Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account is inactive. Please register again.",
      });
    }

    // 4️⃣ Compare password with hash
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Wrong password" });
    }

    // 5️⃣ Generate JWT
    const token = jwt.sign(
      {
        id: user.id, // Sequelize uses "id" (UUID)
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 6️⃣ Send response
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });

    logger?.info?.(`✅ User logged in: ${email}`);
  } catch (error) {
    console.error("❌ Error logging in user:", error);
    logger?.error?.(`❌ User login failed: ${error.message}`);
    res.status(500).json({ message: "Error logging in user" });
  }
};


const logout = async (req, res) => {
  try {
    // 1️⃣ Extract user ID from the authenticated request (decoded JWT)
    const userId = req.user?.id; // Sequelize uses 'id' instead of '_id'

    if (!userId) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    console.log("🚀 ~ logout ~ userId:", userId);

    // 2️⃣ Update user status to inactive (optional: mark verified = false if you want re-verification)
    await User.update(
      { verified: false, isActive: false },
      { where: { id: userId } }
    );

    // 3️⃣ Clear authentication cookie if stored in cookies
    res.clearCookie("token");

    // 4️⃣ Return success response
    res.status(200).json({ message: "Logout successful" });

    logger?.info?.(`✅ User logged out: ${userId}`);
  } catch (error) {
    console.error("❌ User logout failed:", error);
    logger?.error?.("❌ User logout failed:", error.message);
    res.status(500).json({ message: "Error logging out user" });
  }
};


const changePassword = async (req, res) => {
  const userId = req.user?.id; // ✅ Sequelize uses 'id', not '_id'
  const { currentPassword, newPassword } = req.body;

  try {
    console.log("🚀 ~ changePassword ~ userId:", userId);

    // 1️⃣ Find user by primary key
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("🚀 ~ changePassword ~ user:", user.email);

    // 2️⃣ Compare current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect" });
    }

    // 3️⃣ Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 4️⃣ Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("❌ Error changing password:", error);
    res.status(500).json({ message: "Error changing password" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1️⃣ Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "Email not found" });

    // 2️⃣ Generate OTP
    const otpForReset = generateOTP();
    console.log("🚀 ~ forgotPassword ~ otpForReset:", otpForReset);

    // 3️⃣ Send OTP via email
    await sendResetPassword(user.email, otpForReset);

    // 4️⃣ Store OTP and expiry in DB (hashed for security)
    const hashedOtp = otpForReset; // optional: hash with bcrypt if you want
    user.otp = hashedOtp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save();

    res.status(200).json({ message: "OTP sent to email" });
    logger?.info?.(`✅ OTP sent to ${email}`);
  } catch (error) {
    console.error("❌ Failed to send OTP:", error);
    logger?.error?.("❌ Failed to send OTP:", error.message);
    res.status(500).json({ message: "Error in forgot-password" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // 1️⃣ Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    // 2️⃣ Check OTP and expiry
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "OTP not generated" });
    }

    if (user.otp !== otp || new Date(user.otpExpiry).getTime() < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // 3️⃣ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // 4️⃣ Clear OTP fields
    user.otp = null;
    user.otpExpiry = null;

    // 5️⃣ Save user
    await user.save();

    res.status(200).json({ message: "✅ Password reset successful" });
    logger?.info?.(`Password reset successful for ${email}`);
  } catch (error) {
    console.error("❌ Failed to reset password:", error);
    logger?.error?.("Failed to reset password:", error.message);
    res.status(500).json({ message: "Error in reset-password" });
  }
};

module.exports = {
  registeruser,
  loginuser,
  logout,
  verifyEmail,
  changePassword,
  forgotPassword,
  resetPassword,
};
