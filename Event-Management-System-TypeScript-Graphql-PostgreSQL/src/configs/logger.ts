// logger.ts
import configLogger from "./winston-logger.ts";
import { Logger } from "winston";

const logger: Logger = configLogger(); // always create

if (process.env.NODE_ENV === "production") {
  // remove console transport in prod, only use files
  logger.clear();
}

export default logger;
