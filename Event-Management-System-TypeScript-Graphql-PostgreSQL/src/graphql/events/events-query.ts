import { gql } from "graphql-tag";

const eventQuery = gql`
  type Query {
    # Get all events created by current user
    myEvents: [Event!]!

    # Get event by ID (only if user is creator or invited)
    event(id: ID!): Event

    # Get events where user is invited
    invitedEvents: [Event!]!
  }
`;

export default eventQuery;
