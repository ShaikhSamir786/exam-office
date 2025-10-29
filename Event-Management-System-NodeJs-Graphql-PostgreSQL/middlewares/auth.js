// utils/auth.js
const authenticate = (context) => {
  if (!context.user) {
    throw new Error("Authentication required");
  }
  return context.user;
};

const authorize = (context, userId) => {
  const user = authenticate(context);
  if (user.id !== userId && !user.isAdmin) {
    throw new Error("Not authorized");
  }
  return user;
};

module.exports = {
  authenticate,
  authorize,
};
