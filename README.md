# Book My Venue

A full-stack venue booking platform with three roles (User, Owner, Admin), built to practice
real backend engineering problems — concurrency, scaling, and infrastructure — not just CRUD.

**Live repo:** https://github.com/ameen-Noorul/bookmy_venue

## Tech Stack

- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL (with PgBouncer connection pooling)
- **Cache / shared state:** Redis
- **Frontend:** React (Vite)
- **Infra:** Docker, Docker Compose, GitHub Actions CI
- **Payments:** Razorpay (integration in progress)

## Engineering decisions worth reading

Most of the effort on this project went into finding and fixing real backend problems, not
just adding features. A few worth calling out:

**1. Fixed a booking race condition with a database-level constraint, not application code.**
Two users could previously book overlapping dates for the same venue if their requests landed
close enough together. Instead of application-level locking, this was fixed with a Postgres
`EXCLUDE` constraint on a `daterange` — pushing the guarantee down to the database itself,
where it can't be bypassed by a bug in the app layer.

**2. Made idempotency actually safe under concurrency.**
The original idempotency-key check lived in a plain in-memory object — which works for one
server process, but silently breaks the moment you run more than one. Moved it to Redis using
an atomic `SET NX`, so duplicate booking requests are correctly rejected regardless of timing
or how many app instances are running.

**3. Profiled and fixed a real query bottleneck — with numbers, not guesses.**
Seeded the database with ~130,000 realistic booking rows and used `EXPLAIN ANALYZE` to find
that user-booking lookups were doing a full sequential scan (~95ms, checking every row). Added
a targeted index and confirmed the fix directly: **95ms → 17ms**, verified via a before/after
`EXPLAIN ANALYZE` comparison, not assumption.

**4. Added connection pooling before it was needed — deliberately.**
Set up PgBouncer in transaction-pooling mode so the app doesn't exhaust Postgres's connection
limit once traffic grows, rather than waiting to hit that wall in production first.

**5. Shipped with CI and containerization from early on.**
Docker Compose runs the full stack (API, Postgres, Redis) reproducibly. GitHub Actions runs
the test suite on every push, so regressions get caught before merge, not after deploy.

## What I evaluated but deliberately did NOT build (yet)

Read replicas and sharding were researched and understood, but intentionally not implemented —
the current data volume and read/write ratio don't justify the added operational complexity.
The trigger points I'd watch for:
- **Read replicas** once a single Postgres instance's CPU is consistently saturated by read
  traffic despite indexing and pooling.
- **Sharding** only if data volume or write throughput outgrows what a single well-indexed
  primary (plus replicas) can handle — a rare threshold most apps never actually reach.

Over-building either of these now would add real complexity for a problem the project doesn't
have — so they're documented as understood, not implemented prematurely.

## Roadmap

- [x] Phase 1 — Fix known concurrency/reliability debts (booking overlap, Redis idempotency)
- [x] Phase 2 — Infra & deployment (Docker, CI/CD, secrets hygiene)
- [x] Phase 3 — Database at scale (indexing, connection pooling, replica/sharding evaluation)
- [ ] Phase 4 — Distributed systems (shared state at scale, background job queues, horizontal scaling)
- [ ] Phase 5 — Observability (metrics, distributed tracing)
- [ ] Phase 6 — Deeper security (refresh token rotation, fine-grained RBAC, secrets rotation)
- [ ] Phase 7 — API maturity (versioning, OpenAPI/Swagger docs)
- [ ] Phase 8 — Real-time features (WebSockets for live owner notifications)

## Getting Started

```bash
# Clone and install
git clone https://github.com/ameen-Noorul/bookmy_venue.git
cd bookmy_venue/server
npm install

# Set up environment
cp .env.example .env
# fill in DATABASE_URL, REDIS_URL, JWT secrets, etc.

# Run with Docker Compose (recommended)
docker compose up -d

# Or run natively
npx prisma migrate dev
npm run dev
```

## License

MIT