import { GraphQLError } from "graphql";

interface AuthenticatedUser {
  id: string;
  email?: string;
  isAdmin?: boolean;
  [key: string]: any;
}

interface AuthContext {
  user?: AuthenticatedUser | null;
}

export const authenticate = (context: AuthContext): AuthenticatedUser => {
  if (!context.user) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return context.user;
};

export const authorize = (
  context: AuthContext,
  userId: string
): AuthenticatedUser => {
  const user = authenticate(context);

  if (user.id !== userId && !user.isAdmin) {
    throw new GraphQLError("Not authorized", {
      extensions: { code: "FORBIDDEN" },
    });
  }

  return user;
};
