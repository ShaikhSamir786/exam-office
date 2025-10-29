// src/graphql/server.ts
import { ApolloServer } from "@apollo/server";
import { makeExecutableSchema } from "@graphql-tools/schema";
import type { GraphQLSchema } from "graphql";
import type { IResolvers } from "@graphql-tools/utils";
import { typeDefs, resolvers } from "./index.ts";

export const buildSchema = (): GraphQLSchema => {
  return makeExecutableSchema({
    typeDefs,
    resolvers: resolvers as IResolvers, // optional cast for safety
  });
};

export const createApolloServer = (): ApolloServer => {
  const schema = buildSchema();

  return new ApolloServer({
    schema,
    formatError: (error) => {
      console.error("GraphQL Error:", error);
      return {
        message: error.message,
        code: error.extensions?.code || "INTERNAL_ERROR",
      };
    },
  });
};
