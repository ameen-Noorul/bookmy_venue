const client = require("prom-client");

// Automatically tracks built-in Node.js health stats: memory usage,
// event loop lag, CPU time. You get this for free, no extra code.
client.collectDefaultMetrics();

// A Counter is a number that ONLY ever increases. Perfect for "how many
// requests have happened" — that number can never legitimately go down.
const httpRequestCounter = new client.Counter({
  name: "http_requests_total", // the label this metric appears under
  help: "Total number of HTTP requests", // human-readable description
  labelNames: ["method", "route", "status_code"], // lets you slice the data later
});

// A Histogram tracks a DISTRIBUTION of values — not just one number, but
// how values are spread out. Perfect for response time: you don't just
// want "the average" (which can hide problems), you want to know things
// like "95% of my requests finish under 200ms."
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5], // the "buckets" response times get sorted into
});

module.exports = { client, httpRequestCounter, httpRequestDuration };
