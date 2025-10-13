const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const validateRequest = require("../middlewares/express-val");
const { body, param, query } = require("express-validator");

const {
  createEvent,
  invitedEmails,
  listEvent,
  eventDetailswithInvitedUsers,
  updateEvent,
  deleteEvent,
} = require("../controllers/event-controller");

// CREATE EVENT
router.post(
  "/create",
  auth,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("date").notEmpty().withMessage("Date is required").isISO8601().withMessage("Date must be valid"),
    body("location").notEmpty().withMessage("Location is required"),
    body("invitedEmails").optional().isArray().withMessage("Invited emails must be an array"),
    body("invitedEmails.*").optional().isEmail().withMessage("Each invited email must be valid"),
    validateRequest,
  ],
  createEvent
);

// INVITE EMAILS
router.post(
  "/invited-emails/:eventId",
  auth,
  [
    param("eventId").notEmpty().withMessage("Event ID is required"),
    body("emails").isArray({ min: 1 }).withMessage("Emails must be a non-empty array"),
    body("emails.*").isEmail().withMessage("Each email must be valid"),
    validateRequest,
  ],
  invitedEmails
);

// LIST EVENTS
router.get(
  "/list",
  auth,
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1 }).withMessage("Limit must be a positive integer"),
    query("sortBy").optional().isString().withMessage("SortBy must be a string"),
    query("order").optional().isIn(["asc", "desc"]).withMessage("Order must be 'asc' or 'desc'"),
    query("startDate").optional().isISO8601().withMessage("startDate must be valid"),
    query("endDate").optional().isISO8601().withMessage("endDate must be valid"),
    query("search").optional().isString().withMessage("Search must be a string"),
    validateRequest,
  ],
  listEvent
);

// EVENT DETAILS
router.get(
  "/details/:eventId",
  auth,
  [
    param("eventId").notEmpty().withMessage("Event ID is required"),
    validateRequest,
  ],
  eventDetailswithInvitedUsers
);

// UPDATE EVENT
router.put(
  "/update/:eventId",
  auth,
  [
    param("eventId").notEmpty().withMessage("Event ID is required"),
    body("title").optional().notEmpty().withMessage("Title cannot be empty"),
    body("date").optional().isISO8601().withMessage("Date must be valid"),
    body("location").optional().notEmpty().withMessage("Location cannot be empty"),
    body("invitedEmails").optional().isArray().withMessage("Invited emails must be an array"),
    body("invitedEmails.*").optional().isEmail().withMessage("Each invited email must be valid"),
    validateRequest,
  ],
  updateEvent
);

// DELETE EVENT
router.delete(
  "/delete/:eventId",
  auth,
  [
    param("eventId").notEmpty().withMessage("Event ID is required"),
    validateRequest,
  ],
  deleteEvent
);

module.exports = router;
