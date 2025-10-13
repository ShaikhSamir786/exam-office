const winston = require("winston");
const { createLogger, format, transports } = winston
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const configLogger = () => {
  return createLogger({
    level: "debug",
    format: combine(
      format.colorize(),
      format.json(),
      label({ label: "winston logger" }),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      myFormat
    ),
    //defaultMeta: { service: 'user-service' },
     transports: [
      // Console output with colors
      new transports.Console({
        format: combine(
          format.colorize(),
          myFormat
        )
      }),

      // Error logs only
      new transports.File({
        filename: "logs/error.log",
        level: "error"
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

module.exports = configLogger;
