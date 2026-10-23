const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");

const config = require("./config");
const logger = require("./utils/logger");
const AppError = require("./utils/AppError");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const v1Routes = require("./routes/v1");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./docs/openapi");
const {
  client,
  httpRequestCounter,
  httpRequestDuration,
} = require("./config/metrics");

const app = express();

app.set("trust proxy", 1); // one hop: nginx

// --- Request logging: runs FIRST so even rejected requests get logged ------
app.use(
  pinoHttp({
    logger,
    // Never log passwords or tokens, even by accident.
    redact: ["req.body.password", "req.headers.authorization"],
  }),
);
app.get("/api/docs.json", (req, res) => res.json(openapiSpec));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// --- Security hardening ------------------------------------------------------
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(cookieParser());

// --- Metrics: runs on every request -------------------------------------------
app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationInSeconds = Number(process.hrtime.bigint() - start) / 1e9;

    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    };

    httpRequestCounter.inc(labels);
    httpRequestDuration.observe(labels, durationInSeconds);
  });

  next();
});

// --- Infrastructure endpoints (unversioned on purpose) -----------------------
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// --- Rate limiting on auth routes (brute-force protection) --------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  // Goes through our standard error handler so the shape matches every other error
  handler: (req, res, next) =>
    next(
      new AppError(
        "Too many requests, please try again later",
        429,
        "RATE_LIMITED",
      ),
    ),
});
app.use("/api/v1/auth", authLimiter);

app.use(express.json());

// --- Versioned API ------------------------------------------------------------
app.use("/api/v1", v1Routes);

app.get("/", (req, res) => {
  res.json({
    message: "BookMyVenue API working",
    currentVersion: "v1",
    base: "/api/v1",
  });
});

// Must be LAST: notFound first, then the error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
