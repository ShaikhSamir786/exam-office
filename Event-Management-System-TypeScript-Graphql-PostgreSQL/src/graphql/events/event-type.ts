import { gql } from "graphql-tag";

const eventSchema = gql`
  scalar DateTime

  type Event {
    id: ID!
    title: String!
    description: String
    date: DateTime!
    location: String
    createdBy: User! # foreign key relationship to User
    invitedEmails: [String!] # array of invited emails
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input EventInput {
    title: String!
    description: String
    date: DateTime!
    location: String
    invitedEmails: [String!]
  }

  # Response type for event operations
  type EventResponse {
    message: String!
    success: Boolean!
    event: Event
  }

  input UpdateEventInput {
    title: String
    description: String
    date: DateTime
    location: String
    invitedEmails: [String!]
  }

  input InviteParticipantsInput {
    eventId: ID!
    emails: [String!]!
  }

  type InviteResponse {
    message: String!
    success: Boolean!
    event: Event
  }
`;

export default eventSchema;
