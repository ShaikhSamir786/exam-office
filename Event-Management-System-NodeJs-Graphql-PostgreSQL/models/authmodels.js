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
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
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
      allowNull: false,
      defaultValue: false, // changed from true to false
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
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
    timestamps: true, // automatically creates createdAt and updatedAt
    hooks: {
      beforeCreate: (user) => {
        // Optional: ensure firstName and lastName are trimmed
        if (user.firstName) user.firstName = user.firstName.trim();
        if (user.lastName) user.lastName = user.lastName.trim();
      },
    },
  }
);

module.exports = User;
