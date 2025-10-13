const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "postgres",
  logging: false,
});

const dbConnect = async () => {
  try {
    if (!DB_NAME || !DB_USER || DB_PASSWORD === undefined) {
      throw new Error(
        "Missing required DB environment variables. Make sure DB_NAME, DB_USER, and DB_PASSWORD are set."
      );
    }

    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    throw error;
  }
};

module.exports = { sequelize, dbConnect };
