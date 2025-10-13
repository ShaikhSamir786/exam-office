const jwt = require("jsonwebtoken");
require("dotenv").config();

const checktoken = (req, res, next) => {
  const auth = req.header("Authorization")?.replace("Bearer ", "");

  if (!auth) {
    return res.status(403).json({ message: "not valid token" });
  }

  try {
    const decoded = jwt.verify(auth, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "not valid token" });
  }
};

module.exports = checktoken;
