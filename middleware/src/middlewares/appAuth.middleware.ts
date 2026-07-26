import { Request, Response, NextFunction } from "express";

/**
 * appAuth Middleware
 * Validates the app-level key sent in the x-app-key header.
 * Applied on all routes (public + protected).
 */
const appAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const appKey = req.headers["x-app-key"];

  if (!appKey || appKey !== process.env.APP_KEY) {
    res.status(401).json({
      status: "401",
      message: "Unauthorized: Invalid app key",
    });
    return;
  }

  next();
};

export default appAuthMiddleware;
