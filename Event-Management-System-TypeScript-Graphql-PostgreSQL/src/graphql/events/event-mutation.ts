import { gql } from "graphql-tag";

const eventMutation = gql`
  type Mutation {
    createEvent(input: EventInput!): EventResponse!
    updateEvent(id: ID!, input: UpdateEventInput!): EventResponse!
    deleteEvent(id: ID!): EventResponse!
    inviteParticipants(input: InviteParticipantsInput!): InviteResponse!
  }
`;

export default eventMutation;
