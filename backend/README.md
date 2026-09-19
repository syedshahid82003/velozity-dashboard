# Velozity Global Solutions — Real-Time Project Dashboard

A full-stack web application for managing client projects, tracking task progress, and monitoring team activity in real time.

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm

### 1. Clone & install

```bash
git clone <repo-url>
cd velozity-dashboard

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# backend/.env
cp backend/.env.example backend/.env
```

Fill in:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/velozity"
JWT_ACCESS_SECRET=your-long-random-secret
JWT_REFRESH_SECRET=another-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

```bash
# frontend/.env
cp frontend/.env.example frontend/.env
```

### 3. Set up database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
npm run seed
```

### 4. Run

```bash
# Terminal 1 — API server
cd backend && npm run dev

# Terminal 2 — Vite dev server
cd frontend && npm run dev
```

App is available at `http://localhost:5173`

---

## Docker (optional)

```bash
docker-compose up --build
```

`docker-compose.yml` at the repo root starts PostgreSQL, the API, and the frontend.

---

## Seed Credentials

All accounts use password: `Password123!`

| Role            | Email                        |
|-----------------|------------------------------|
| Admin           | admin@velozity.dev           |
| Project Manager | sarah.pm@velozity.dev        |
| Project Manager | james.pm@velozity.dev        |
| Developer       | ravi.dev@velozity.dev        |
| Developer       | nina.dev@velozity.dev        |
| Developer       | tom.dev@velozity.dev         |
| Developer       | priya.dev@velozity.dev       |

---

## Database Schema

Seven models with full relational integrity:

```
User
  id, email (unique), name, passwordHash, role (ADMIN|PROJECT_MANAGER|DEVELOPER)
  @@index([role])

RefreshToken
  id, token (unique), userId FK→User, expiresAt, revoked
  @@index([userId]), @@index([token])

Client
  id, name, email (unique), company

Project
  id, name, description, clientId FK→Client, managerId FK→User
  @@index([managerId]), @@index([clientId])

Task
  id, title, description, projectId FK→Project, assignedToId FK→User,
  status (TODO|IN_PROGRESS|IN_REVIEW|DONE|OVERDUE),
  priority (LOW|MEDIUM|HIGH|CRITICAL), dueDate
  @@index([projectId]), @@index([assignedToId]), @@index([status]), @@index([dueDate])

ActivityLog
  id, projectId FK→Project, taskId FK→Task, userId FK→User,
  action (string), fromStatus, toStatus, createdAt
  @@index([projectId]), @@index([taskId]), @@index([userId]), @@index([createdAt])

Notification
  id, recipientId FK→User, taskId FK→Task, type, message, read, createdAt
  @@index([recipientId, read]), @@index([recipientId])
```

### Indexing decisions

- `User.role` — role-based queries filter users by role frequently (e.g. listing all developers)
- `RefreshToken.token` — every refresh request does a unique lookup by token string
- `RefreshToken.userId` — revoking all tokens for a user (logout all sessions)
- `Project.managerId` — PM dashboard and ownership checks; this is the most common project filter
- `Project.clientId` — join with clients in project listings
- `Task.projectId` — nearly every task query is scoped to a project
- `Task.assignedToId` — developer task lists; also used for WebSocket room access checks
- `Task.status` — overdue job queries `status NOT IN (DONE, OVERDUE)`; filtered task lists
- `Task.dueDate` — overdue job runs `dueDate < now()`; date range filters
- `ActivityLog.projectId` — PM/Admin feed queries; the primary feed filter
- `ActivityLog.createdAt` — chronological ordering of feed; also for missed-events catchup (`createdAt > since`)
- `Notification.(recipientId, read)` — composite index: unread count query hits both columns

---

## Architectural Decisions

### WebSocket: Socket.io

Chosen over native WebSocket because:
- Built-in room management (used extensively for `project:<id>` and `user:<id>` rooms)
- Automatic reconnection with configurable retry strategy
- Namespace and event API significantly reduces boilerplate vs raw WebSocket
- `socket.io-client` React integration is mature and well-tested

### Background Jobs: node-cron

Chosen over Bull queue because:
- The overdue-flagging job is simple, stateless, and single-process — no retry semantics or distributed workers needed
- Bull requires Redis as a dependency; node-cron runs in-process with zero extra infrastructure
- If the scale grew to require distributed job processing, migrating to BullMQ would be straightforward

### Token Storage

- Access token: `localStorage` (short-lived, 15 min)
- Refresh token: `HttpOnly`, `SameSite=Strict` cookie — never readable by JavaScript, immune to XSS token theft
- Refresh rotation: every `/auth/refresh` call revokes the old token and issues a new one (stored in DB for server-side revocation)

### Role Enforcement

Every protected API route uses the `authenticate` + `authorize` middleware chain. Service-layer checks enforce row-level ownership (PM can only modify their own projects). Frontend role-gating is a UX convenience only — all security decisions live at the API level.

---

## Explanation (150–250 words)

The hardest problem was designing the role-filtered real-time activity feed correctly. The challenge is that three roles need different "views" of the same stream of events — Admin sees everything, PM sees only their projects' activity, and Developer sees only activity on tasks assigned to them. A naïve approach would broadcast all events to all connected clients and filter client-side, which leaks data. Instead, every client is placed in role-appropriate Socket.io rooms at connect time: Admins join `admin:global`, all users join their own `user:<id>` room, and clients explicitly join `project:<id>` rooms (with server-side RBAC validation before the join is accepted). When a task update fires, the server emits to the relevant project room and the admin room separately — no client ever receives events they shouldn't see.

The missed-events catchup (for users who reconnect after going offline) was equally important. I deliberately avoided in-memory caches: the client sends its last-seen timestamp via a `activity:catchup` socket event, and the server queries the `ActivityLog` table directly with the same role-scoped WHERE clause used by the REST feed endpoint. This guarantees consistency — if the server restarts, no events are lost because the database is always the source of truth.

One thing I'd do differently: extract the role-scoped WHERE clause into a shared helper that both the REST endpoint and the socket catchup handler consume, rather than duplicating the logic.

---

## Known Limitations

- No rate limiting on auth endpoints (would add express-rate-limit in production)
- Notifications are not pushed via WebSocket `notification:new` events yet — the bell polls on load and invalidates on socket activity events; a dedicated `notification:new` push event would make the count truly real-time
- No end-to-end test coverage
- Docker Compose file provided as a template — production deployment would need secret management (e.g. AWS Secrets Manager)
