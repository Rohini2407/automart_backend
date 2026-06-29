const jwt = require("jsonwebtoken");

/**
 * userAuth Middleware (authFilter equivalent)
 * Validates the Bearer JWT token on protected routes.
 */
const userAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "401",
      message: "Unauthorized: No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach decoded payload to request headers so backend can read it
    req.headers["x-user-email"] = decoded.email;
    req.headers["x-user-type"] = decoded.type;
    next();
  } catch (err) {
    return res.status(401).json({
      status: "401",
      message: "Unauthorized: Invalid or expired token",
    });
  }
};

module.exports = userAuthMiddleware;
