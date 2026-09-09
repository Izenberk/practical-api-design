# Practical API Design
This project is part of **Practical API Design** course from BorntoDev.
---

## Quick start

```bash
git clone https://github.com/Izenberk/practical-api-design.git
cd practical-api-design
npm install

cp .env.example .env
# set JWT_SECRET to any non-empty value, e.g.
#   JWT_SECRET=dev-local-not-a-real-secret

npm run dev
```

| Where | What |
|---|---|
| `http://localhost:3000/docs` | Swagger UI — try every endpoint from the browser |
| `http://localhost:3000/docs/openapi.json` | Raw OpenAPI 3.1 spec |
| `http://localhost:3000/health` | Liveness check |
| `http://localhost:3000/api/v1` | API root |

Requires **Node 22+**.

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Watch mode via `tsx` |
| `npm test` | Jest — 15 suites, 130+ tests |
| `npm run typecheck` | `tsc --noEmit`; the test transform does **not** type-check |
| `npm run build` | Compile to `dist/` and copy the OpenAPI spec |
| `npm start` | Run the compiled output |

### Environment

| Variable | Required | Default | Notes |
|---|---|---|---|
| `JWT_SECRET` | **yes** | — | Any non-empty string in dev |
| `PORT` | no | `3000` | |
| `NODE_ENV` | no | `development` | `development` / `production` / `test` |
| `LOG_LEVEL` | no | `info` | `silent` in tests |
| `JWT_EXPIRES_SECONDS` | no | `900` | Access token lifetime |
| `ADMIN_EMAIL` | no | — | Seeds an admin at boot when both are set |
| `ADMIN_PASSWORD` | no | — | |

Configuration is parsed and validated at boot. A missing or malformed value
aborts startup with every problem listed at once, rather than surfacing as an
`undefined` three hours later.

---

## Try it

```bash
# register (returns a token)
curl -X POST localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"hunter2hunter2"}'

TOKEN=<paste accessToken>

# browse the catalogue (public)
curl localhost:3000/api/v1/products

# place an order — Idempotency-Key is required
curl -X POST localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"items":[{"productId":"<uuid>","quantity":1}]}'

# pay for it
curl -X POST localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"orderId":"<uuid>"}'
```

Repeat any write with the same `Idempotency-Key` and the original response is
replayed, marked with an `Idempotent-Replay: true` header. Nothing runs twice.

---

## Architecture

Feature-first modules over a shared kernel. Dependencies point one way:

```
routes → controller → service → repository → storage
                         ↓
                    ports (gateway, cache, idempotency store)
```

```
src/
├── config/        # env parsing, validated at boot
├── core/          # framework-agnostic kernel
│   ├── errors/    # error taxonomy + HTTP mapping
│   ├── cache/     # port + in-memory adapter
│   ├── idempotency/
│   ├── container.ts   # composition root
│   └── logger.ts
├── middleware/    # authenticate, authorize, validate, idempotency,
│                  # rate-limit, request-logger, error-handler
├── modules/       # auth, users, products, orders, payments
├── docs/          # openapi.yaml
├── routes/        # /health, /docs, /api/v1
├── app.ts         # express() + middleware chain
└── server.ts      # listen()
```

Four rules hold everywhere:

- **Services never import Express.** A service takes `userId: string`, not `req`.
  That is what makes them unit-testable without HTTP.
- **Controllers never import repositories.** They translate HTTP to service calls.
- **Services depend on interfaces.** `PaymentService` takes a `PaymentGateway`,
  not a `FakePaymentGateway`.
- **Status codes live in one file.** Domain code throws `NotFoundError`; only
  `http-mapper.ts` knows that means 404.

Storage is in-memory behind repository interfaces. `container.ts` is the only
file that knows which implementation is in use — swapping in Postgres means new
adapter files and one edit there, with no service changes.

---

## Error handling

Four principles, one shape:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [{ "field": "priceSatang", "message": "Expected number" }],
    "requestId": "e524555e-316c-414c-be63-523dd8da2cc4"
  }
}
```

- **Error Handling** — nothing escapes; one middleware terminates every failure
- **Error Classification** — `AppError` subclasses carry meaning; anything else
  is a programmer bug and never reaches the client
- **Centralized** — `error-handler.ts` is the only place errors become HTTP
- **User-friendly** — `code` for machines, `message` for humans, `details` for
  the field that failed, `requestId` to find the log line

Known failures log at `warn`, unknown ones at `error` with a stack. The same
`requestId` appears in the response and in the log.

---

## Design decisions

**Money is stored as integer satang.** `priceSatang: 28900` is ฿289.00. Floating
point cannot represent most decimal fractions exactly, and the error compounds
across line items and totals. The unit is in the field name so the value cannot
be misread.

**Orders snapshot their line items.** An `OrderItem` copies the product name and
unit price at order time. An order is a historical record; repricing, renaming
or deleting a product must not rewrite what a customer already bought.

**Order transitions are a table, not conditionals.** `order.state.ts` declares
the legal moves and who may trigger each — `pending → cancelled` is available to
the owner, `pending → paid` only to an admin. Paying through `/payments` performs
that transition as a system action after the charge settles, which is why the
owner cannot reach it manually.

**Role and ownership are different checks.** `authorize('admin')` runs in the
middleware chain. "May this user read *this* order" needs the resource loaded, so
it lives in the service.

**Hiding beats forbidding, where the id is a secret.** Requesting another user's
order returns **404**, not 403. A 403 would confirm the order exists, turning the
endpoint into an oracle for probing ids. Products do the opposite — the catalogue
is public, so a missing product is honestly a 404.

**A declined payment is a created resource, not an error.** It returns 201 with
`status: "failed"`. The idempotency middleware releases a key on any non-2xx
response, so returning 4xx for a decline would free a key whose side effect had
already been committed — and a retry would charge twice. Cost: clients read
`data.status` rather than the status line.

**Cache invalidation is by prefix, on write.** A write cannot know which page a
product moved to, so any product write drops the whole cached page set. The 60
second TTL is a backstop, not the strategy.

**Orders are deliberately not cached.** Their lists are filtered by requester, so
a shared key would serve one user's orders to another — a data leak that looks
like a cache hit. Correct caching needs the requester id in the key, which buys
little at this size.

---

## Testing

```bash
npm test
```

15 suites, 130+ tests, under six seconds. No database, no network, no mocks of
things that matter.

- **Unit tests** colocate with their subject (`*.service.test.ts`)
- **Integration tests** live in `tests/` and drive the real app through Supertest

Services are tested against real in-memory repositories rather than mocks, so the
tests exercise actual behaviour instead of asserting which methods were called.

Security properties are pinned deliberately: a token claiming `alg: none` is
rejected, a user cannot elevate their own role, an unknown id returns the same
status as a forbidden one, and the payment gateway is proven **not** to be called
when an ownership check fails.

`npm run typecheck` is separate and matters — the swc transform strips types
without checking them, so a green test run says nothing about whether the code
compiles.

---

## Known limits

Recorded rather than hidden. Each is a deliberate stop, not an oversight.

- **In-memory storage.** State dies with the process and is per-instance.
- **Idempotency is bounded by TTL.** After 24 hours a retry creates a duplicate.
  A crash between claim and completion strands the key until it expires.
- **Concurrent payments on one order** are guarded by the idempotency key alone.
  Two requests with *different* keys can both observe `pending` and both charge.
  The fix is a conditional write, which needs a real database.
- **Cache-aside race.** A concurrent read can repopulate the cache after an
  eviction, leaving a stale page until the TTL.
- **`PUT` has PATCH semantics** — a partial body leaves other fields intact.
- **Login timing side-channel.** An unknown email returns before bcrypt runs, so
  response time still distinguishes registered addresses even though the message
  does not.
- **Server-side caching only.** No `Cache-Control` or `ETag` headers.

---

## Stack

Express 5 · TypeScript · Zod · Winston + Morgan · Helmet · CORS ·
express-rate-limit · jsonwebtoken · bcrypt · Jest + Supertest · swagger-ui-express