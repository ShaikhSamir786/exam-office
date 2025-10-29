const CryptoJS = require('crypto-js');
const config = require("../configs/config");

// generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

  
// hash OTP
function hashOtp(otp) {
  // optionally, you can salt with a secret
  const secret = config.otpService.otpsecret || 'some_secret';
  return CryptoJS.SHA256(otp + secret).toString(CryptoJS.enc.Hex);
}

// verify OTP
function verifyOtp(otpProvided, hashedOtp) {
  const secret = config.otpService.otpsecret || 'some_secret';
  const hashedProvided = CryptoJS.SHA256(otpProvided + secret).toString(CryptoJS.enc.Hex);
  return hashedProvided === hashedOtp; 
}


module.exports = { generateOTP, hashOtp, verifyOtp };