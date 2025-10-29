// src/config/config.ts
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

interface AppConfig {
  port: number | string;
}

interface DatabaseConfig {
  name?: string;
  user?: string;
  password?: string;
  host: string;
  port: number;
}

interface SecurityConfig {
  jwtSecret: string;
  jwtExpiryIn: string;
}

interface MailServiceConfig {
  userName?: string;
  passWord?: string;
  host?: string;
  port?: string;
}

interface OtpServiceConfig {
  otpsecret?: string;
}

interface Config {
  app: AppConfig;
  database: DatabaseConfig;
  security: SecurityConfig;
  mailService: MailServiceConfig;
  otpService: OtpServiceConfig;
}

const config: Config = {
  app: {
    port: process.env.PORT || 4000,
  },
  database: {
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || "defaultsecret",
    jwtExpiryIn: process.env.JWT_EXPIRES_IN || "24h",
  },
  mailService: {
    userName: process.env.SMTP_USER,
    passWord: process.env.SMTP_PASS,
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
  },
  otpService: {
    otpsecret: process.env.OTP_SECRET,
  },
};

export default config;
