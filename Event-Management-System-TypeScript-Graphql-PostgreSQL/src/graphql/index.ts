// src/graphql/index.ts
import { userTypedefMap, userResolverMap } from "./user/index.ts";
import { eventTypedefMap, eventResolverMap } from "./events/index.ts";
import type { IResolvers } from "@graphql-tools/utils";
import type { DocumentNode } from "graphql";

const typeDefs: DocumentNode[] = [...userTypedefMap, ...eventTypedefMap];

const resolvers: IResolvers = {
  Query: {
    ...(userResolverMap.Query || {}),
    ...(eventResolverMap.Query || {}),
  },
  Mutation: {
    ...(userResolverMap.Mutation || {}),
    ...(eventResolverMap.Mutation || {}),
  },
};

export { typeDefs, resolvers };
