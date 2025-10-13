const { DataTypes } = require("sequelize");
const { sequelize } = require("../configs/sequelize-postgre"); // adjust path if needed

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID, // good practice for unique user IDs
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true, // note: Sequelize doesn’t trim automatically — handle it in hooks if needed
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // prevents duplicate emails
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otpExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true, // createdAt and updatedAt
  }
);

module.exports = User;
