// logger.js
const configLogger = require("./winston-logger");

let logger = configLogger(); // always create

if (process.env.NODE_ENV === "production") {
  // remove console transport in prod, only use files
  logger.clear();
}

module.exports = logger;
