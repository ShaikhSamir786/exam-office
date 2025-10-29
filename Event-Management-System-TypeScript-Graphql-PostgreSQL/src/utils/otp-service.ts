import CryptoJS from "crypto-js";
import config from "../configs/config.ts";

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashOtp(otp: string): string {
  const secret = config.otpService.otpsecret || "some_secret";
  return CryptoJS.SHA256(otp + secret).toString(CryptoJS.enc.Hex);
}

export function verifyOtp(otpProvided: string, hashedOtp: string): boolean {
  const secret = config.otpService.otpsecret || "some_secret";
  const hashedProvided = CryptoJS.SHA256(otpProvided + secret).toString(
    CryptoJS.enc.Hex
  );

  return hashedProvided === hashedOtp;
}
