const Event = require("../../models/event-model");
const User = require("../../models/authmodels");
const { GraphQLError } = require("graphql");
const { Op, sequelize } = require("sequelize");
const logger = require("../../configs/logger");
const getAuthenticatedUser = require("../../utils/authentics");

const eventResolvers = {
  Query: {
    myEvents: async (_, __, context) => {
      const user = getAuthenticatedUser(context);

      try {
        const events = await Event.findAll({
          where: { createdBy: user.id },
          include: [{ model: User, as: "creator" }],
          order: [["date", "ASC"]],
        });
        return events;
      } catch (error) {
        logger.error(`Failed to fetch events: ${error.message}`);
        throw new Error("Failed to fetch events: " + error.message);
      }
    },

    event: async (_, { id }, context) => {
      const user = getAuthenticatedUser(context);

      try {
        const event = await Event.findByPk(id, {
          include: [{ model: User, as: "creator" }],
        });

        if (!event) {
          throw new Error("Event not found");
        }

        // Check if user is creator or invited
        const isCreator = event.createdBy === user.id;
        const isInvited = event.invitedEmails.includes(user.email);

        if (!isCreator && !isInvited) {
          throw new GraphQLError("You are not authorized to view this event", {
            extensions: {
              code: "FORBIDDEN",
            },
          });
        }

        return event;
      } catch (error) {
        logger.error(`Failed to fetch event: ${error.message}`);
        throw new Error("Failed to fetch event: " + error.message);
      }
    },

    invitedEvents: async (_, __, context) => {
      const user = getAuthenticatedUser(context);

      try {
        const events = await Event.findAll({
          where: {
            invitedEmails: {
              [Op.contains]: [user.email],
            },
          },
          include: [{ model: User, as: "creator" }],
          order: [["date", "ASC"]],
        });
        return events;
      } catch (error) {
        logger.error(`Failed to fetch invited events: ${error.message}`);
        throw new Error("Failed to fetch invited events: " + error.message);
      }
    },
  },

  Mutation: {
    createEvent: async (_, { input }, context) => {
      const user = getAuthenticatedUser(context);

      try {
        const {
          title,
          description,
          date,
          location,
          invitedEmails = [],
        } = input;

        // Validation
        if (!title || !date) {
          return {
            message: "Title and date are required",
            success: false,
            event: null,
          };
        }

        if (new Date(date) < new Date()) {
          return {
            message: "Event date cannot be in the past",
            success: false,
            event: null,
          };
        }

        const newEvent = await Event.create({
          title: title.trim(),
          description: description?.trim(),
          date: new Date(date),
          location: location?.trim(),
          createdBy: user.id,
          invitedEmails: invitedEmails.map((email) => email.toLowerCase()),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        logger.info(`Event created by user ${user.id}: ${title}`);

        // Fetch the event with creator details
        const eventWithCreator = await Event.findByPk(newEvent.id, {
          include: [{ model: User, as: "creator" }],
        });

        return {
          message: "Event created successfully",
          success: true,
          event: eventWithCreator,
        };
      } catch (error) {
        logger.error(`Failed to create event: ${error.message}`);
        return {
          message: "Failed to create event: " + error.message,
          success: false,
          event: null,
        };
      }
    },

    updateEvent: async (_, { id, input }, context) => {
      const user = getAuthenticatedUser(context);

      try {
        const event = await Event.findByPk(id);

        if (!event) {
          return {
            message: "Event not found",
            success: false,
            event: null,
          };
        }

        // Check if user is the creator
        if (event.createdBy !== user.id) {
          return {
            message: "You can only update events you created",
            success: false,
            event: null,
          };
        }

        const { title, description, date, location, invitedEmails } = input;

        // Update only provided fields
        const updateData = {};
        if (title) updateData.title = title.trim();
        if (description !== undefined)
          updateData.description = description?.trim();
        if (date) {
          if (new Date(date) < new Date()) {
            return {
              message: "Event date cannot be in the past",
              success: false,
              event: null,
            };
          }
          updateData.date = new Date(date);
        }
        if (location !== undefined) updateData.location = location?.trim();
        if (invitedEmails !== undefined) {
          updateData.invitedEmails = invitedEmails.map((email) =>
            email.toLowerCase()
          );
        }
        updateData.updatedAt = new Date();

        await Event.update(updateData, { where: { id } });

        // Fetch updated event with creator
        const updatedEvent = await Event.findByPk(id, {
          include: [{ model: User, as: "creator" }],
        });

        logger.info(`Event updated by user ${user.id}: ${id}`);

        return {
          message: "Event updated successfully",
          success: true,
          event: updatedEvent,
        };
      } catch (error) {
        logger.error(`Failed to update event: ${error.message}`);
        return {
          message: "Failed to update event: " + error.message,
          success: false,
          event: null,
        };
      }
    },

    inviteParticipants: async (_, { input }, context) => {
      const user = getAuthenticatedUser(context);

      try {
        const { eventId, emails } = input;

        // Validation
        if (
          !eventId ||
          !emails ||
          !Array.isArray(emails) ||
          emails.length === 0
        ) {
          return {
            message: "Event ID and at least one email are required",
            success: false,
            event: null,
          };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = emails.filter((email) => !emailRegex.test(email));

        if (invalidEmails.length > 0) {
          return {
            message: `Invalid email format: ${invalidEmails.join(", ")}`,
            success: false,
            event: null,
          };
        }

        // Find event
        const event = await Event.findByPk(eventId, {
          include: [{ model: User, as: "creator" }],
        });

        if (!event) {
          return {
            message: "Event not found",
            success: false,
            event: null,
          };
        }

        // Authorization - only creator can invite
        if (event.createdBy !== user.id) {
          logger.warn(
            `Unauthorized invite attempt by user ${user.id} on event ${eventId}`
          );
          return {
            message: "Only the event creator can invite participants",
            success: false,
            event: null,
          };
        }

        const normalizedEmails = emails.map((email) => email.toLowerCase());
        const currentEmails = event.invitedEmails || [];

        // Filter out duplicates and already invited emails
        const newEmails = normalizedEmails.filter(
          (email) => !currentEmails.includes(email) && email !== user.email
        );

        if (newEmails.length === 0) {
          return {
            message:
              "All provided emails are already invited or belong to the event creator",
            success: false,
            event: null,
          };
        }

        // Update event with new emails
        const updatedEmails = [...currentEmails, ...newEmails];

        // Simple update without transaction
        await Event.update(
          {
            invitedEmails: updatedEmails,
            updatedAt: new Date(),
          },
          {
            where: { id: eventId },
          }
        );

        // Fetch updated event
        const updatedEvent = await Event.findByPk(eventId, {
          include: [{ model: User, as: "creator" }],
        });

        logger.info(
          `User ${user.id} invited ${newEmails.length} participants to event ${eventId}`
        );

        return {
          message: `Successfully invited ${newEmails.length} participant(s) to the event`,
          success: true,
          event: updatedEvent,
        };
      } catch (error) {
        logger.error(
          `Failed to invite participants to event ${input?.eventId}: ${error.message}`
        );
        return {
          message: "Failed to invite participants: " + error.message,
          success: false,
          event: null,
        };
      }
    },

    deleteEvent: async (_, { id }, context) => {
      const user = getAuthenticatedUser(context);

      try {
        const event = await Event.findByPk(id);

        if (!event) {
          return {
            message: "Event not found",
            success: false,
            event: null,
          };
        }

        // Check if user is the creator
        if (event.createdBy !== user.id) {
          return {
            message: "You can only delete events you created",
            success: false,
            event: null,
          };
        }

        await Event.destroy({ where: { id } });

        logger.info(`Event deleted by user ${user.id}: ${id}`);

        return {
          message: "Event deleted successfully",
          success: true,
          event: event,
        };
      } catch (error) {
        logger.error(`Failed to delete event: ${error.message}`);
        return {
          message: "Failed to delete event: " + error.message,
          success: false,
          event: null,
        };
      }
    },
  },
};

module.exports = eventResolvers;
