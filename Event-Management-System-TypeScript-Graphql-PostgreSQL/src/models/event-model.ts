import { DataTypes, Model } from "sequelize";
import type { Optional } from "sequelize/types";
import { sequelize } from "../configs/sequelize-postgre.ts";

export interface EventAttributes {
  id: string;
  title: string;
  description?: string | null;
  date: Date;
  location?: string | null;
  createdBy: string;
  invitedEmails?: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EventCreationAttributes = Optional<
  EventAttributes,
  | "id"
  | "description"
  | "location"
  | "invitedEmails"
  | "createdAt"
  | "updatedAt"
>;

export class Event
  extends Model<EventAttributes, EventCreationAttributes>
  implements EventAttributes
{
  declare id: string;
  declare title: string;
  declare description?: string | null;
  declare date: Date;
  declare location?: string | null;
  declare createdBy: string;
  declare invitedEmails?: string[] | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Event.init(
  {
    id: {
      type: DataTypes.UUID,
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
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    invitedEmails: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: "events",
    timestamps: true,
  }
);

export default Event;
