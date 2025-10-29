import eventMutation from "./event-mutation.ts";
import eventQuery from "./events-query.ts";
import eventResolvers from "./events-resolver.ts";
import eventSchema from "./event-type.ts";

const eventTypedefMap = [eventSchema, eventMutation, eventQuery];
const eventResolverMap = eventResolvers;

export { eventTypedefMap, eventResolverMap };
