import winston, { createLogger, format, transports, Logger } from "winston";

const { combine, timestamp, label, printf, colorize, json } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const configLogger = (): Logger => {
  return createLogger({
    level: "debug",
    format: combine(
      colorize(),
      json(),
      label({ label: "winston logger" }),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      myFormat
    ),
    transports: [
      // Console output with colors
      new transports.Console({
        format: combine(colorize(), myFormat),
      }),

      // Error logs only
      new transports.File({
        filename: "logs/error.log",
        level: "error",
      }),

      // Info logs only (info, warn)
      new transports.File({
        filename: "logs/info.log",
        level: "info",
      }),

      // All logs (debug, info, warn, error)
      new transports.File({
        filename: "logs/combined.log",
      }),
    ],
  });
};

export default configLogger;
