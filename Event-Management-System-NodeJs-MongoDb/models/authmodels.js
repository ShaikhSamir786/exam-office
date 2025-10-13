const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    otp: { type: String }, // hashed OTP
    otpExpiry: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
