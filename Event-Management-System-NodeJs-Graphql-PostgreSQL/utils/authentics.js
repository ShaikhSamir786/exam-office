const { GraphQLError } = require("graphql");

const getAuthenticatedUser = (context) => {
  if (!context.user) {
    throw new GraphQLError("Authentication required", {
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  }
  return context.user;
};

module.exports = getAuthenticatedUser;
