const logger = require("../configs/logger");
const User = require("./authmodels");
const Event = require("./event-model");

const defineAssociations = () => {
  Event.belongsTo(User, {
    foreignKey: "createdBy",
    as: "creator",
    onDelete: "CASCADE",
  });

  User.hasMany(Event, {
    foreignKey: "createdBy",
    as: "events",
    onDelete: "CASCADE",
  });
};

const initModels = async (sequelize) => {
  try {
    defineAssociations();
    await sequelize.sync({ alter: true }); // use { force: true } for full reset
    logger.info("✅ All models initialized and synced successfully.");
  } catch (error) {
    logger.error("❌ Error initializing models:", error);
  }
};

module.exports = {
  defineAssociations,
  initModels,
};
