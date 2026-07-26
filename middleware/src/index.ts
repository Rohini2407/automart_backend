import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";

import appAuthMiddleware from "./middlewares/appAuth.middleware";
import userAuthMiddleware from "./middlewares/userAuth.middleware";
import errorHandler from "./middlewares/errorHandler.middleware";

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-app-key"],
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    status: "429",
    message: "Too many requests, please try again later.",
  },
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "middleware",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// ─── Public Routes (appAuth only) ────────────────────────────────────────────
const publicRoutes = [
  "/api/login",
  "/api/user/registration",
  "/api/forgotpassword",
  "/api/setpassword",
];

app.use(
  publicRoutes,
  appAuthMiddleware,
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    on: {
      error: (_err, _req, res) => {
        (res as express.Response)
          .status(502)
          .json({ status: "502", message: "Backend service unavailable" });
      },
    },
  }),
);

// ─── Protected Routes (appAuth + userAuth) ───────────────────────────────────
app.use(
  "/api",
  appAuthMiddleware,
  userAuthMiddleware,
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    on: {
      error: (_err, _req, res) => {
        (res as express.Response)
          .status(502)
          .json({ status: "502", message: "Backend service unavailable" });
      },
    },
  }),
);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅  Middleware running on http://localhost:${PORT}`);
  console.log(`🔀  Proxying to Backend at ${BACKEND_URL}`);
});

export default app;
