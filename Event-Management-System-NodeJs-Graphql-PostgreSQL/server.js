const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
const logger = require("./configs/logger");
const { sequelize } = require("./configs/sequelize-postgre");
const { initModels } = require("./models/index-model");
const User = require("./models/authmodels");
const bodyParser = require("body-parser");
const { buildSchema, createApolloServer } = require("./graphql/apollo-server");
const { expressMiddleware } = require("@as-integrations/express5");
const { rateLimitDirective } = require("graphql-rate-limit-directive");
const limiter = require("./middlewares/limiter");
const jwt = require("jsonwebtoken");
app.use(express.json());
app.use(limiter);

const startServer = async () => {
  try {
    // 1
    logger.info("🟡 Syncing database models...");
    await initModels(sequelize);
    logger.info("✅ User model synced successfully.");

    // 1️⃣ FIX 2: Call rateLimitDirective() with options to get the destructurable object.
    const { rateLimitDirectiveTransformer } = rateLimitDirective({
      identifyContext: (ctx) => ctx.user?.id || ctx.ip || "anonymous",
    });

    // 2️⃣ Build schema with directive typeDefs + your existing ones
    // NOTE: rateLimitDirectiveTypeDefs is a string, not a function, so remove the ()
    let schema = buildSchema();

    // 3️⃣ Apply the rate limit transformer
    schema = rateLimitDirectiveTransformer(schema);

    logger.info("🟡 Starting Apollo Server...");
    const server = createApolloServer(schema);
    await server.start();

    // 4️⃣ Pass context so identifyContext can use req.ip or req.user
    app.use(
      "/graphql",
      bodyParser.json(),
      expressMiddleware(server, {
        context: async ({ req }) => {
          const context = {
            // Cleaned-up way to get IP address
            ip:
              req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
              req.socket.remoteAddress,
            user: null, // Initialize as null
            token: null,
          };

          try {
            // Get token from Authorization header
            const authHeader = req.headers.authorization || "";
            const token = authHeader.replace("Bearer ", "");

            if (token) {
              // Verify JWT token
              const decoded = jwt.verify(token, process.env.JWT_SECRET);

              // Find user in database
              const user = await User.findByPk(decoded.id);

              if (user) {
                context.user = {
                  id: user.id,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  verified: user.verified,
                  isActive: user.isActive,
                  // Add any other user fields you need in context
                };
                context.token = token;
              }
            }
          } catch (error) {
            // Don't throw error here - let resolvers handle authentication
            console.error("Context authentication error:", error.message);
            // Continue with null user context
          }

          return context;
        },
      })
    );
    app.listen(PORT, () => {
      logger.info(`🚀 Server is running at: http://localhost:${PORT}/graphql`);
    });
  } catch (err) {
    logger.error("❌ Error starting the server:", err);
    process.exit(1);
  }
};

startServer();
