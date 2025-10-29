const gql = require("graphql-tag");

const userQuery = gql`
  # Queries
  type Query {
    users: [User!]!
    user(id: ID!): User
  }
`;

module.exports = { userQuery };
