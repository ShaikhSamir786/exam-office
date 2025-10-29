import { Sequelize } from "sequelize";
import logger from "../configs/logger.ts";
import { User } from "./authmodels.ts";
import { Event } from "./event-model.ts";

export const defineAssociations = (): void => {
  try {
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

    logger.info("🔗 Associations defined successfully.");
  } catch (error) {
    logger.error("❌ Error defining associations:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
};

export const initModels = async (sequelize: Sequelize): Promise<void> => {
  try {
    defineAssociations();
    await sequelize.sync({ alter: true });
    logger.info("✅ All models initialized and synced successfully.");
  } catch (error) {
    logger.error("❌ Error initializing models:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
  }
};
