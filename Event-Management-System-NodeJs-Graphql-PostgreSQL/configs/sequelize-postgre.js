const { Sequelize } = require("sequelize");
const config = require("./config");

const DB_NAME = config.database.name;
const DB_USER = config.database.user;
const DB_PASSWORD = config.database.password;
const DB_HOST = config.database.host;
const DB_PORT = config.database.port;

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
