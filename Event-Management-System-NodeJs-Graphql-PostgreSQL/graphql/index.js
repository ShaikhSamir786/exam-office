const { userTypedefMap, userResolverMap } = require("./user/index");
const { eventTypedefMap, eventResolverMap } = require("./events/index");

// Flatten typedef arrays
const typeDefs = [...userTypedefMap, ...eventTypedefMap];

// FIXED: Properly merge resolver maps to avoid overwriting Query/Mutation
const resolvers = {
  Query: {
    ...(userResolverMap.Query || {}),
    ...(eventResolverMap.Query || {}),
  },
  Mutation: {
    ...(userResolverMap.Mutation || {}),
    ...(eventResolverMap.Mutation || {}),
  },
  // Include scalar resolvers
  // DateTime: userResolverMap.DateTime,
};

module.exports = { typeDefs, resolvers };
