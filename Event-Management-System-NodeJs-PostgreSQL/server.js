const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
const router = require("./routes/authroutes");
const logger = require("./configs/logger");
const {sequelize} = require("./configs/sequelize-postgre")
const {initModels} = require("./models/index-model")
const productrouter = require("./routes/product");
const eventRouter = require("./routes/event.routes");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true, // return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // disable the old `X-RateLimit-*` headers
  message: {
    status: 429,
    message: "Too many requests, please try again later.",
  },
});

app.use(express.json());
app.use(limiter);

(async () => {
  await initModels(sequelize);
})();

app.get("/", (req, res) => {
  res.json("hello");
});

app.use("/api/auth", router);
app.use("/product", productrouter);
app.use("/event", eventRouter);

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
