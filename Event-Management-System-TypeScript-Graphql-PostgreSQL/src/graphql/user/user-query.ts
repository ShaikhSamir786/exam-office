import { gql } from "graphql-tag";
const userQuery = gql`
  # Queries
  type Query {
    users: [User!]!
    user(id: ID!): User
  }
`;

export default userQuery;
