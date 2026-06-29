/**
 * appAuth Middleware
 * Validates the app-level key sent in the x-app-key header.
 * Applied on all routes (public + protected).
 */
const appAuthMiddleware = (req, res, next) => {
  const appKey = req.headers["x-app-key"];

  if (!appKey || appKey !== process.env.APP_KEY) {
    return res.status(401).json({
      status: "401",
      message: "Unauthorized: Invalid app key",
    });
  }

  next();
};

module.exports = appAuthMiddleware;
