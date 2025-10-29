import { GraphQLError } from "graphql";
import { Op } from "sequelize";
import logger from "../../configs/logger.ts";
import { Event } from "../../models/event-model.ts";
import { User } from "../../models/authmodels.ts";
import getAuthenticatedUser from "../../utils/authentics.ts";

/**
 * Type for GraphQL resolver context.
 * You can extend this as your app grows (e.g. add loaders, db, etc.)
 */
export interface GraphQLContext {
  user?: User | null;
  [key: string]: unknown;
}

interface CreateEventInput {
  title: string;
  description?: string | null;
  date: string; // ISO date string from GraphQL input
  location?: string | null;
  invitedEmails?: string[];
}

interface CreateEventResponse {
  message: string;
  success: boolean;
  event: Event | null;
}

interface UpdateEventInput {
  title?: string;
  description?: string;
  date?: string;
  location?: string;
  invitedEmails?: string[];
}

interface EventAttributes {
  id: number;
  title: string;
  description?: string;
  date: Date;
  location?: string;
  invitedEmails?: string[];
  createdBy: number;
  updatedAt: Date;
}

interface UpdateEventResponse {
  message: string;
  success: boolean;
  event: EventAttributes | null;
}

interface DeleteEventResponse {
  message: string;
  success: boolean;
  event: EventAttributes | null;
}

interface InviteParticipantsInput {
  eventId: number;
  emails: string[];
}

interface InviteParticipantsResponse {
  message: string;
  success: boolean;
  event: EventAttributes | null;
}

const eventResolvers: any = {
  Query: {
    myEvents: async (
      _: unknown,
      __: unknown,
      context: GraphQLContext
    ): Promise<Event[]> => {
      const user = getAuthenticatedUser(context);

      if (!user) {
        throw new GraphQLError("User not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      try {
        const events = await Event.findAll({
          where: { createdBy: user.id },
          include: [{ model: User, as: "creator" }],
          order: [["date", "ASC"]],
        });

        return events;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error(`Failed to fetch events: ${message}`);
        throw new GraphQLError("Failed to fetch events", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    event: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<Event> => {
      const user = getAuthenticatedUser(context);

      if (!user) {
        throw new GraphQLError("User not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      try {
        const event = await Event.findByPk(id, {
          include: [{ model: User, as: "creator" }],
        });

        if (!event) {
          throw new GraphQLError("Event not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const isCreator = event.createdBy === user.id;
        const isInvited = event.invitedEmails?.includes(user.email) ?? false;

        if (!isCreator && !isInvited) {
          throw new GraphQLError("You are not authorized to view this event", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        return event;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error(`Failed to fetch event: ${message}`);

        // Re-throw GraphQLError if it's already one
        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError("Failed to fetch event", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    invitedEvents: async (
      _: unknown,
      __: unknown,
      context: GraphQLContext
    ): Promise<Event[]> => {
      const user = getAuthenticatedUser(context);

      if (!user) {
        throw new GraphQLError("User not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error(`Failed to fetch invited events: ${message}`);
        throw new GraphQLError("Failed to fetch invited events", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },

  Mutation: {
    createEvent: async (
      _: unknown,
      { input }: { input: CreateEventInput },
      context: GraphQLContext
    ): Promise<CreateEventResponse> => {
      const user = getAuthenticatedUser(context);

      if (!user) {
        throw new GraphQLError("User not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

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

        const eventDate = new Date(date);
        if (eventDate < new Date()) {
          return {
            message: "Event date cannot be in the past",
            success: false,
            event: null,
          };
        }

        // Create the event
        const newEvent = await Event.create({
          title: title.trim(),
          description: description?.trim(),
          date: eventDate,
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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error(`Failed to create event: ${message}`);
        return {
          message: `Failed to create event: ${message}`,
          success: false,
          event: null,
        };
      }
    },

    updateEvent: async (
      _: unknown,
      args: { id: number; input: UpdateEventInput },
      context: GraphQLContext
    ): Promise<UpdateEventResponse> => {
      const user = getAuthenticatedUser(context);

      if (!user) {
        throw new GraphQLError("User not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      try {
        const event = await Event.findByPk(args.id);

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

        const { title, description, date, location, invitedEmails } =
          args.input;

        // Partial update object
        const updateData: Partial<EventAttributes> = {};

        if (title) updateData.title = title.trim();
        if (description !== undefined)
          updateData.description = description?.trim();
        if (date) {
          const eventDate = new Date(date);
          if (eventDate < new Date()) {
            return {
              message: "Event date cannot be in the past",
              success: false,
              event: null,
            };
          }
          updateData.date = eventDate;
        }
        if (location !== undefined) updateData.location = location?.trim();
        if (invitedEmails !== undefined) {
          updateData.invitedEmails = invitedEmails.map((email) =>
            email.toLowerCase()
          );
        }
        updateData.updatedAt = new Date();

        await Event.update(updateData, { where: { id: args.id } });

        // Fetch updated event with creator relation
        const updatedEvent = await Event.findByPk(args.id, {
          include: [{ model: User, as: "creator" }],
        });

        logger.info(`Event updated by user ${user.id}: ${args.id}`);

        return {
          message: "Event updated successfully",
          success: true,
          event: updatedEvent ?? null,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error(`Failed to update event: ${message}`);
        return {
          message: "Failed to update event: " + message,
          success: false,
          event: null,
        };
      }
    },

    inviteParticipants: async (
      _: unknown,
      args: { input: InviteParticipantsInput },
      context: GraphQLContext
    ): Promise<InviteParticipantsResponse> => {
      const user = getAuthenticatedUser(context);

      if (!user) {
        throw new GraphQLError("User not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      try {
        const { eventId, emails } = args.input;

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
        const currentEmails: string[] = event.invitedEmails || [];

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

        await Event.update(
          {
            invitedEmails: updatedEmails,
            updatedAt: new Date(),
          },
          { where: { id: eventId } }
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
          event: updatedEvent ?? null,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error(
          `Failed to invite participants to event ${args.input?.eventId}: ${message}`
        );
        return {
          message: "Failed to invite participants: " + message,
          success: false,
          event: null,
        };
      }
    },

    deleteEvent: async (
      _: unknown,
      args: { id: number },
      context: GraphQLContext
    ): Promise<DeleteEventResponse> => {
      const user = getAuthenticatedUser(context);

      if (!user) {
        throw new GraphQLError("User not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      try {
        const event = await Event.findByPk(args.id);

        if (!event) {
          return {
            message: "Event not found",
            success: false,
            event: null,
          };
        }

        // Authorization check: only the creator can delete
        if (event.createdBy !== user.id) {
          return {
            message: "You can only delete events you created",
            success: false,
            event: null,
          };
        }

        await Event.destroy({ where: { id: args.id } });

        logger.info(`Event deleted by user ${user.id}: ${args.id}`);

        return {
          message: "Event deleted successfully",
          success: true,
          event: event,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error(`Failed to delete event: ${message}`);
        return {
          message: "Failed to delete event: " + message,
          success: false,
          event: null,
        };
      }
    },
  },
};

export default eventResolvers;
