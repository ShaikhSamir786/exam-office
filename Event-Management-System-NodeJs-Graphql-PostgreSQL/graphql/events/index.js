const eventMutation = require("./event-mutation");
const eventQuery = require("./events-query");
const eventResolvers = require("./events-resolver");
const eventSchema = require("./event-type");

const eventTypedefMap = [eventSchema, eventMutation, eventQuery];
const eventResolverMap = eventResolvers;

module.exports = { eventTypedefMap, eventResolverMap };
