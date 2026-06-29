require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");

const appAuthMiddleware = require("./middlewares/appAuth.middleware");
const userAuthMiddleware = require("./middlewares/userAuth.middleware");
const errorHandler = require("./middlewares/errorHandler.middleware");

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
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { status: "429", message: "Too many requests, please try again later." },
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "middleware", port: PORT, timestamp: new Date().toISOString() });
});

// ─── Public Routes (appauth filter only) ─────────────────────────────────────
// These routes only require the app-level key, not a user JWT
const publicRoutes = ["/api/login", "/api/register", "/api/forgot-password", "/api/reset-password"];

app.use(publicRoutes, appAuthMiddleware, createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(502).json({ status: "502", message: "Backend service unavailable" });
    },
  },
}));

// ─── Protected Routes (appauth + authFilter) ──────────────────────────────────
// All other /api/* routes require both app key and valid user JWT
app.use(
  "/api",
  appAuthMiddleware,
  userAuthMiddleware,
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        res.status(502).json({ status: "502", message: "Backend service unavailable" });
      },
    },
  })
);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅  Middleware running on http://localhost:${PORT}`);
  console.log(`🔀  Proxying to Backend at ${BACKEND_URL}`);
});

module.exports = app;
