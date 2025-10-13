const User = require("../models/authmodels");
const Event = require("../models/event-model");
const logger = require("../configs/logger");

// Create a new event
const createEvent = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title, description, date, location, invitedEmails } = req.body;

    // Validate required fields
    if (!title || !date || !location) {
      return res
        .status(400)
        .json({ message: "Title, date, and location are required" });
    }

    // Normalize and validate invited emails
    let validInvites = [];
    if (Array.isArray(invitedEmails) && invitedEmails.length > 0) {
      // Validate email format
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

    const event = new Event({
      title,
      description,
      date,
      location,
      createdBy: req.user._id,
      invitedEmails: validInvites,
    });

    await event.save();

    return res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    logger.error(`Event creation failed: ${error.message}`);
    return res.status(500).json({ message: "Error in creating event" });
  }
};

const invitedEmails = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { emails } = req.body; // should be an array of emails

    // Validate input
    if (!Array.isArray(emails) || emails.length === 0) {
      return res
        .status(400)
        .json({ message: "Emails must be a non-empty array" });
    }

    // Validate email format (basic regex)
    const invalidEmails = emails.filter(
      (email) => !/^\S+@\S+\.\S+$/.test(email)
    );
    if (invalidEmails.length > 0) {
      return res
        .status(400)
        .json({ message: `Invalid email(s): ${invalidEmails.join(", ")}` });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Only creator can invite
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Normalize emails to lowercase to avoid case-sensitive duplicates
    const normalizedExisting = event.invitedEmails.map((e) => e.toLowerCase());
    const newInvites = emails
      .map((e) => e.toLowerCase())
      .filter((e) => !normalizedExisting.includes(e));

    if (newInvites.length === 0) {
      return res
        .status(200)
        .json({
          message: "No new emails to invite",
          invitedEmails: event.invitedEmails,
        });
    }

    // Use atomic update to avoid race conditions
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $addToSet: { invitedEmails: { $each: newInvites } } },
      { new: true }
    );

    return res.status(200).json({
      message: "Users invited successfully",
      invitedEmails: updatedEvent.invitedEmails,
    });
  } catch (error) {
    logger.error(`Invite email failed: ${error.message}`);
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
    const skip = (page - 1) * limit;

    // Normalize user's email for matching invitedEmails
    const userEmail = req.user.email.toLowerCase();

    // Build filter
    const filter = {
      $or: [{ createdBy: req.user._id }, { invitedEmails: userEmail }],
    };

    // Date filtering
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Search by title
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    // Sorting
    const sortOrder = order === "asc" ? 1 : -1;

    const events = await Event.find(filter)
      .populate("createdBy", "firstName lastName email")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(filter);

    return res.status(200).json({
      page,
      totalPages: Math.ceil(total / limit),
      total,
      events,
    });
  } catch (error) {
    logger.error(`Event listing failed: ${error.message}`);
    return res.status(500).json({ message: "Error in listing events" });
  }
};

const eventDetailswithInvitedUsers = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).populate(
      "createdBy",
      "firstName lastName email"
    );
    if (!event) return res.status(404).json({ message: "Event not found" });

    return res.status(200).json({ event });

  } catch (error) {
    logger.error(`Event details failed: ${error.message}`);
    res.status(500).json({ message: "Error in getting event details" });
  }
};

const updateEvent = async (req, res) => {
  try {

      const { eventId } = req.params;
    const { title, description, date, location, invitedEmails } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this event" });
    }

    event.title = title || event.title;
    event.description = description || event.description;
    event.date = date || event.date;
    event.location = location || event.location;

    if (invitedEmails) {
      const newInvites = invitedEmails.filter(email => !event.invitedEmails.includes(email));
      event.invitedEmails.push(...newInvites);
    }

    await event.save();
    return res.status(200).json({ message: "Event updated successfully", event });


  } catch (error) {
    logger.error(`Event update failed: ${error.message}`);
    res.status(500).json({ message: "Error in updating event" });
  }
};

const deleteEvent = async (req, res) => {
  try {
        const { eventId } = req.params;

    // 1️⃣ Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // 2️⃣ Check if current user is the creator
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this event" });
    }

    // 3️⃣ Delete the event
    await Event.findByIdAndDelete(eventId);

    return res.status(200).json({ message: "Event deleted successfully" });

  } catch (error) {
    logger.error(`Event deletion failed: ${error.message}`);
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
