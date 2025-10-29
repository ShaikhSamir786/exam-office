const rateLimit = require("express-rate-limit");
const httpStatus = require("http-status");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 10 requests per windowMs
  standardHeaders: true, // return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // disable the old `X-RateLimit-*` headers
  message: {
    status: httpStatus.TOO_MANY_REQUESTS, // 429
    message: httpStatus["429_MESSAGE"], // "Too Many Requests"
  },
});

module.exports = limiter;
