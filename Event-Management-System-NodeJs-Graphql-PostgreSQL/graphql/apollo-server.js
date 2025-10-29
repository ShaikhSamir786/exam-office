const { ApolloServer } = require("@apollo/server");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { typeDefs, resolvers } = require("./index");

const buildSchema = () => {
  return makeExecutableSchema({
    typeDefs,
    resolvers,
  });
};

const createApolloServer = () => {
  // Remove parameter
  const schema = buildSchema(); // Build schema here
  return new ApolloServer({
    schema,
    // Add these for better error handling
    formatError: (error) => {
      console.error("GraphQL Error:", error);
      return {
        message: error.message,
        code: error.extensions?.code || "INTERNAL_ERROR",
      };
    },
  });
};

module.exports = {
  buildSchema,
  createApolloServer,
};
