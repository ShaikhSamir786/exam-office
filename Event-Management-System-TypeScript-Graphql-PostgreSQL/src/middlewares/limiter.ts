import rateLimit from "express-rate-limit";
import httpStatus from "http-status";

// Define the rate limiter middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per 15 minutes
  standardHeaders: true, // return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // disable old `X-RateLimit-*` headers
  message: {
    status: httpStatus.TOO_MANY_REQUESTS, // 429
    message: httpStatus["429_MESSAGE"] || "Too Many Requests",
  },
});

export default limiter;
