

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
    console.log("✅ All models initialized and synced successfully.");
  } catch (error) {
    console.error("❌ Error initializing models:", error);
  }
};

module.exports = {
  User,
  Event,
  defineAssociations,
  initModels,
};
