const err = (description) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "BookMyVenue API",
    version: "1.0.0",
    description:
      "Venue booking platform with three roles (USER, OWNER, ADMIN). " +
      "Bookings are protected against double-booking by a Postgres exclusion constraint " +
      "and are idempotent via the Idempotency-Key header.",
  },
  servers: [{ url: "/api/v1", description: "Version 1" }],
  tags: [
    { name: "Auth", description: "Registration, login, refresh-token rotation" },
    { name: "Venues", description: "Venue listing and owner management" },
    { name: "Bookings", description: "Create and view bookings" },
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description: "Returns an access token. A refresh token is set as an httpOnly cookie scoped to /api/v1/auth.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Credentials" } } },
        },
        responses: {
          201: { description: "Registered", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          400: { $ref: "#/components/responses/ValidationError" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Credentials" } } },
        },
        responses: {
          200: { description: "Logged in", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate the refresh token and get a new access token",
        description:
          "Reads the refresh token from the httpOnly cookie. Each token is single-use: " +
          "reusing an already-rotated token revokes the entire token family.",
        responses: {
          200: { description: "New access token; new refresh cookie set" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out and revoke the refresh-token family",
        responses: { 200: { description: "Logged out" } },
      },
    },

    "/venues": {
      get: {
        tags: ["Venues"],
        summary: "List active venues (public, cached)",
        responses: {
          200: {
            description: "Venues",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Venue" } } } },
          },
        },
      },
      post: {
        tags: ["Venues"],
        summary: "Submit a venue for admin approval",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateVenue" } } },
        },
        responses: {
          201: { description: "Submitted", content: { "application/json": { schema: { $ref: "#/components/schemas/Venue" } } } },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/venues/{venueId}": {
      parameters: [{ $ref: "#/components/parameters/VenueId" }],
      get: {
        tags: ["Venues"],
        summary: "Get one venue (public)",
        responses: {
          200: { description: "Venue", content: { "application/json": { schema: { $ref: "#/components/schemas/Venue" } } } },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Venues"],
        summary: "Update your own venue (owner only)",
        description: "Strict body: unknown fields such as status or ownerId are rejected with 400.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateVenue" } } },
        },
        responses: {
          200: { description: "Updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Venue" } } } },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Venues"],
        summary: "Delete your own venue (owner only)",
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: "Deleted" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/venues/{venueId}/review": {
      parameters: [{ $ref: "#/components/parameters/VenueId" }],
      patch: {
        tags: ["Venues"],
        summary: "Approve a submitted venue (admin only)",
        description: "Approval makes the venue ACTIVE and grants the submitter the OWNER role.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Reviewed", content: { "application/json": { schema: { $ref: "#/components/schemas/Venue" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    "/bookings": {
      post: {
        tags: ["Bookings"],
        summary: "Create a booking",
        description:
          "Idempotent: repeating a request with the same Idempotency-Key returns the original result. " +
          "Overlapping dates for the same venue are rejected with 409 by a Postgres exclusion constraint.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "Unique per logical booking attempt (e.g. a UUID).",
          },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateBooking" } } },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Booking" } } } },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/bookings/{bookingId}": {
      get: {
        tags: ["Bookings"],
        summary: "Get your own booking",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Booking", content: { "application/json": { schema: { $ref: "#/components/schemas/Booking" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/bookings/venue/{venueId}": {
      parameters: [{ $ref: "#/components/parameters/VenueId" }],
      get: {
        tags: ["Bookings"],
        summary: "List all bookings on your venue (owner only)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Bookings",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Booking" } } } },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    parameters: {
      VenueId: { name: "venueId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
    },
    responses: {
      ValidationError: err("Request body failed validation"),
      Unauthorized: err("Missing, invalid or expired credentials"),
      Forbidden: err("Authenticated but not allowed (wrong role or not the owner)"),
      NotFound: err("Resource does not exist"),
      Conflict: err("Conflicts with existing data (duplicate email or overlapping booking)"),
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          message: { type: "string" },
          code: { type: "string" },
          details: {},
        },
        required: ["message"],
      },
      Credentials: {
        type: "object",
        properties: { email: { type: "string", format: "email" }, password: { type: "string", minLength: 6 } },
        required: ["email", "password"],
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["USER", "OWNER", "ADMIN"] },
        },
      },
      AuthResponse: {
        type: "object",
        properties: { user: { $ref: "#/components/schemas/User" }, accessToken: { type: "string" } },
      },
      Venue: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          status: { type: "string", enum: ["PENDING", "ACTIVE", "REJECTED"] },
          ownerId: { type: "string", format: "uuid" },
        },
      },
      CreateVenue: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
      UpdateVenue: {
        type: "object",
        additionalProperties: false,
        properties: { name: { type: "string" } },
      },
      CreateBooking: {
        type: "object",
        properties: {
          venueId: { type: "string", format: "uuid" },
          eventDate: { type: "string", format: "date" },
        },
        required: ["venueId", "eventDate"],
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          venueId: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          eventDate: { type: "string", format: "date" },
        },
      },
    },
  },
};