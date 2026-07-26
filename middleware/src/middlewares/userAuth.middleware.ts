import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

interface JwtPayload {
  email: string;
  type: string;
  [key: string]: unknown;
}

/**
 * userAuth Middleware (authFilter equivalent)
 * Validates the Bearer JWT token on protected routes.
 */
const userAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      status: "401",
      message: "Unauthorized: No token provided",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as JwtPayload;

    // Attach decoded payload to request headers so backend can read it
    req.headers["x-user-email"] = decoded.email;
    req.headers["x-user-type"] = decoded.type;

    next();
  } catch {
    res.status(401).json({
      status: "401",
      message: "Unauthorized: Invalid or expired token",
    });
  }
};

export default userAuthMiddleware;
