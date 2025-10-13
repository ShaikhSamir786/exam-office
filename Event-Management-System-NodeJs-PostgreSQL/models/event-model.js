const { DataTypes } = require("sequelize");
const { sequelize } = require("../configs/sequelize-postgre"); // adjust the path to your db config
const User = require("./authmodels"); // import User model for associations

const Event = sequelize.define(
  "Event",
  {
    id: {
      type: DataTypes.UUID, // use UUIDs instead of numeric IDs
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users", // table name of User
        key: "id",
      },
      onDelete: "CASCADE",
    },
    invitedEmails: {
      type: DataTypes.ARRAY(DataTypes.STRING), // PostgreSQL supports array types 🎯
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    tableName: "events",
    timestamps: true, // adds createdAt and updatedAt
  }
);


module.exports = Event;
