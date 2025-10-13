const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    location: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    invitedEmails: [{ type: String }], // store emails of invited users
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
