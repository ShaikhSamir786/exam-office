import { GraphQLError } from "graphql";

interface AuthContext {
  user?: {
    id: string;
    email?: string;
    [key: string]: any;
  };
}

const getAuthenticatedUser = (context: AuthContext) => {
  if (!context.user) {
    throw new GraphQLError("Authentication required", {
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  }

  return context.user;
};

export default getAuthenticatedUser;
