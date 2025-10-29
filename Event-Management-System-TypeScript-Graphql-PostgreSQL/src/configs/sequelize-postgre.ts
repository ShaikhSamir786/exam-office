import { Sequelize } from "sequelize";
import config from "./config.ts";
import logger from "./logger.ts";

const DB_NAME = config.database.name as string | undefined;
const DB_USER = config.database.user as string | undefined;
const DB_PASSWORD = config.database.password as string | undefined;
const DB_HOST = config.database.host || "localhost";
const DB_PORT = Number(config.database.port) || 5432;

// ✅ Create Sequelize instance with types
export const sequelize = new Sequelize(
  DB_NAME || "postgres",
  DB_USER || "postgres",
  DB_PASSWORD || "",
  {
    host: DB_HOST,
    port: DB_PORT,
    dialect: "postgres",
    logging: false, // set true if you want SQL logs
  }
);

// ✅ Database connection function
export const dbConnect = async (): Promise<void> => {
  try {
    if (!DB_NAME || !DB_USER || DB_PASSWORD === undefined) {
      throw new Error(
        "Missing required DB env vars. Make sure DB_NAME, DB_USER and DB_PASSWORD are set."
      );
    }
    await sequelize.authenticate();
    logger.info("✅ Database connection established successfully.");

    // Force sync all models to create tables if they don't exist
    await sequelize.sync({ alter: true });
    logger.info("✅ Database tables synchronized successfully.");
  } catch (error) {
    logger.error("❌ Unable to connect to the database:", error);
    throw error;
  }
};
