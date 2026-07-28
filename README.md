# BookMyVenue

A full-stack venue booking platform that lets users discover, book, and pay for venues, while owners manage listings and admins oversee approvals.

## Tech Stack

**Backend**
- Node.js + Express
- PostgreSQL + Prisma ORM
- JWT authentication (access + refresh tokens, with rotation)
- Zod for request validation

**Frontend**
- React + Vite
- React Router v6
- Axios
- Tailwind CSS

## Features Completed

### Backend
- **Authentication** — JWT-based auth with access + refresh tokens, token rotation, and Zod-validated request schemas
- **Role-based access control** — USER / OWNER / ADMIN roles enforced via middleware
- **Venue lifecycle** — venues move through a DRAFT → admin-approval workflow
- **Bookings** — booking creation with overlap checks and optimistic locking to prevent double-booking
- **Payments (mock)** — Razorpay integration scaffolded with mock payment flow
- **Centralized error handling** — custom `AppError` class + `catchAsync` wrapper + centralized error-handling middleware
- **Input validation** — operation-scoped Zod schemas with strict whitelisting against mass assignment, plus cross-field validation

### Frontend (minimal — supporting UI only)
A lightweight React frontend exists to demo the API end-to-end. It is not the focus of this project — the emphasis here is backend architecture, system design, and (later) applied AI engineering.
- JWT-authenticated API calls with automatic token refresh
- Basic auth flow (Login/Register) and role-aware routing

## Roadmap

This project doubles as a structured 14-week path from backend engineer to AI-integrated backend engineer. Each phase builds directly on BookMyVenue rather than treating AI as a separate side project.

### Phase 1 (Weeks 1-3) — Backend to production-grade — *in progress*
- [x] Environment/secrets/config management
- [x] Centralized error handling and async safety
- [x] Input validation (operation-scoped Zod schemas, mass-assignment protection)
- [ ] Auth/authz depth
- [ ] Transactions and race condition handling
- [ ] Layered architecture
- [ ] Security hardening
- [ ] Logging and observability
- [ ] Automated testing

### Phase 2 (Weeks 4-6) — Applied AI engineering foundations
- [ ] LLM APIs, prompt engineering, structured outputs, function/tool calling
- [ ] Embeddings and vector search via pgvector (reusing existing Postgres)
- [ ] RAG built from scratch — chunking, retrieval, reranking, grounding

### Phase 3 (Weeks 7-9) — Agentic systems + MLOps-lite
- [ ] Multi-step agents with tool use, orchestration, guardrails, evaluation
- [ ] Model serving basics — inference deployment, latency/cost tradeoffs, caching for AI responses
- [ ] Observability for AI features (prompt/response logging, failure tracking)

### Phase 4 (Weeks 10-12) — Integration capstone
- [ ] Ship one production-grade AI feature end-to-end on BookMyVenue — e.g. an AI concierge that finds venues via RAG + agentic booking, or embeddings-based fraud/anomaly detection on booking patterns

### Phase 5 (Weeks 13-14) — Interview readiness
- [ ] System design mocks grounded in what's actually built here
- [ ] Targeted DSA review
- [ ] Resume/portfolio built around the BookMyVenue + AI feature story

## Project Status

This project is being built in phases as a hands-on learning exercise focused on backend engineering, system design, and applied AI engineering — covering authentication, authorization, transaction safety, validation, error handling, and API design with production-style patterns rather than simplified tutorial code. The frontend exists only to demonstrate the API in action; it is intentionally not a focus area.

## Getting Started

```bash
# Backend
cd server
npm install
npm run dev

# Frontend
cd client
npm install
npm run dev
```

Copy `.env.example` to `.env` in the server directory and fill in your own values (database URL, JWT secrets, etc.) before running.

## License

MIT