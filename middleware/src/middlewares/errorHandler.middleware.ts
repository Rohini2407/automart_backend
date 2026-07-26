import { Request, Response, NextFunction } from "express";

interface HttpError extends Error {
  status?: number;
}

const errorHandler = (
  err: HttpError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  console.error(`[Middleware Error] ${err.message}`);
  res.status(err.status || 500).json({
    status: String(err.status || 500),
    message: err.message || "Internal Server Error",
  });
};

export default errorHandler;
