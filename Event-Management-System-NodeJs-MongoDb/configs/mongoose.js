const mongoose = require('mongoose');
const logger = require('./logger');
require('dotenv').config();




const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)

    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1); // Exit process if DB fails
  }
};


module.exports = connectDB;