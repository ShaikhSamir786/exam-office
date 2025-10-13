const User = require("../models/authmodels");
const Event = require("../models/event-model");
const logger = require("../configs/logger");

// Create a new event
const createEvent = async (req, res) => {
  try {
    // 1️⃣ Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title, description, date, location, invitedEmails } = req.body;

    // 2️⃣ Validate required fields
    if (!title || !date || !location) {
      return res
        .status(400)
        .json({ message: "Title, date, and location are required" });
    }

    // 3️⃣ Normalize and validate invited emails
    let validInvites = [];
    if (Array.isArray(invitedEmails) && invitedEmails.length > 0) {
      const invalidEmails = invitedEmails.filter(
        (email) => !/^\S+@\S+\.\S+$/.test(email)
      );
      if (invalidEmails.length > 0) {
        return res
          .status(400)
          .json({ message: `Invalid email(s): ${invalidEmails.join(", ")}` });
      }

      // Normalize and remove duplicates
      validInvites = [...new Set(invitedEmails.map((e) => e.toLowerCase()))];
    }

    // 4️⃣ Create event in DB
    const event = await Event.create({
      title,
      description: description || null,
      date,
      location,
      createdBy: req.user.id, // Sequelize uses 'id'
      invitedEmails: validInvites,
    });

    // 5️⃣ Return success response
    return res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("❌ Event creation failed:", error);
    logger?.error?.(`Event creation failed: ${error.message}`);
    return res.status(500).json({ message: "Error in creating event" });
  }
};

const invitedEmails = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { emails } = req.body; // should be an array

    // 1️⃣ Validate input
    if (!Array.isArray(emails) || emails.length === 0) {
      return res
        .status(400)
        .json({ message: "Emails must be a non-empty array" });
    }

    const invalidEmails = emails.filter(
      (email) => !/^\S+@\S+\.\S+$/.test(email)
    );
    if (invalidEmails.length > 0) {
      return res
        .status(400)
        .json({ message: `Invalid email(s): ${invalidEmails.join(", ")}` });
    }

    // 2️⃣ Find event
    const event = await Event.findByPk(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // 3️⃣ Only creator can invite
    if (event.createdBy !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 4️⃣ Normalize and filter duplicates
    const existingEmails = event.invitedEmails || [];
    const normalizedExisting = existingEmails.map((e) => e.toLowerCase());
    const newInvites = emails
      .map((e) => e.toLowerCase())
      .filter((e) => !normalizedExisting.includes(e));

    if (newInvites.length === 0) {
      return res.status(200).json({
        message: "No new emails to invite",
        invitedEmails: event.invitedEmails,
      });
    }

    // 5️⃣ Update event's invitedEmails atomically
    const updatedEmails = [...normalizedExisting, ...newInvites];
    event.invitedEmails = updatedEmails;
    await event.save();

    return res.status(200).json({
      message: "Users invited successfully",
      invitedEmails: event.invitedEmails,
    });
  } catch (error) {
    console.error("❌ Invite email failed:", error);
    logger?.error?.(`Invite email failed: ${error.message}`);
    return res.status(500).json({ message: "Error in inviting emails" });
  }
};

const listEvent = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 4,
      sortBy = "date",
      order = "asc",
      startDate,
      endDate,
      search,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const userEmail = req.user.email.toLowerCase();

    // 1️⃣ Build where clause
    const whereClause = {
      [Op.or]: [
        { createdBy: req.user.id },
        { invitedEmails: { [Op.contains]: [userEmail] } }, // PostgreSQL ARRAY contains
      ],
    };

    // 2️⃣ Date filter
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = new Date(startDate);
      if (endDate) whereClause.date[Op.lte] = new Date(endDate);
    }

    // 3️⃣ Search by title
    if (search) {
      whereClause.title = { [Op.iLike]: `%${search}%` }; // case-insensitive
    }

    // 4️⃣ Sorting
    const orderClause = [[sortBy, order.toUpperCase()]];

    // 5️⃣ Query events with pagination and include creator info
    const { rows: events, count: total } = await Event.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: orderClause,
      offset,
      limit,
    });

    return res.status(200).json({
      page,
      totalPages: Math.ceil(total / limit),
      total,
      events,
    });
  } catch (error) {
    console.error("❌ Event listing failed:", error);
    logger?.error?.(`Event listing failed: ${error.message}`);
    return res.status(500).json({ message: "Error in listing events" });
  }
};

const eventDetailswithInvitedUsers = async (req, res) => {
  try {
    const { eventId } = req.params;

    // 1️⃣ Find event by primary key and include creator info
    const event = await Event.findByPk(eventId, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });

    if (!event) return res.status(404).json({ message: "Event not found" });

    return res.status(200).json({ event });
  } catch (error) {
    console.error("❌ Event details failed:", error);
    logger?.error?.(`Event details failed: ${error.message}`);
    res.status(500).json({ message: "Error in getting event details" });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, description, date, location, invitedEmails } = req.body;

    // 1️⃣ Find event
    const event = await Event.findByPk(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // 2️⃣ Only creator can update
    if (event.createdBy !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this event" });
    }

    // 3️⃣ Update fields if provided
    event.title = title || event.title;
    event.description = description || event.description;
    event.date = date || event.date;
    event.location = location || event.location;

    // 4️⃣ Update invited emails (avoid duplicates)
    if (Array.isArray(invitedEmails) && invitedEmails.length > 0) {
      const existingEmails = event.invitedEmails || [];
      const newInvites = invitedEmails
        .map((e) => e.toLowerCase())
        .filter((e) => !existingEmails.includes(e));
      event.invitedEmails = [...existingEmails, ...newInvites];
    }

    // 5️⃣ Save changes
    await event.save();

    return res.status(200).json({
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    console.error("❌ Event update failed:", error);
    logger?.error?.(`Event update failed: ${error.message}`);
    res.status(500).json({ message: "Error in updating event" });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // 1️⃣ Find the event
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // 2️⃣ Check if current user is the creator
    if (event.createdBy !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this event" });
    }

    // 3️⃣ Delete the event
    await event.destroy();

    return res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("❌ Event deletion failed:", error);
    logger?.error?.(`Event deletion failed: ${error.message}`);
    res.status(500).json({ message: "Error in deleting event" });
  }
};

module.exports = {
  createEvent,
  invitedEmails,
  listEvent,
  eventDetailswithInvitedUsers,
  updateEvent,
  deleteEvent,
};
