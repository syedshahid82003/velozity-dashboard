# Velozity Global Solutions — Real-Time Project Dashboard

A full-stack web application for managing client projects, tracking task progress, and monitoring team activity in real time.

**Tech Stack:** React 19 + TypeScript · Node.js + Express · PostgreSQL + Prisma · Socket.io · node-cron

---

## Live Demo

> **App:** https://velozity-dashboard.vercel.app  
> **Repo:** https://github.com/syedshahid82003/velozity-dashboard

### Demo Accounts (password: `Password123!`)

| Role            | Email                       |
|-----------------|-----------------------------|
| Admin           | admin@velozity.dev          |
| Project Manager | sarah.pm@velozity.dev       |
| Developer       | ravi.dev@velozity.dev       |

---

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- npm

### 1. Clone the repository

```bash
git clone https://github.com/syedshahid82003/velozity-dashboard.git
cd velozity-dashboard
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/velozity"
JWT_ACCESS_SECRET=your-long-random-access-secret-at-least-32-chars
JWT_REFRESH_SECRET=your-long-random-refresh-secret-at-least-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

```bash
cp frontend/.env.example frontend/.env
```

`frontend/.env` should contain:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

### 3. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Set up the database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
npm run seed
```

### 5. Start both servers

**Terminal 1 — API server (port 4000):**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend (port 5173):**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**

---

## Docker Setup (Preferred)

```bash
# From the repo root
docker-compose up --build
```

This starts:
- PostgreSQL on port 5432
- API server on port 4000
- Frontend (nginx) on port 5173

Then seed the database:
```bash
docker-compose exec api npm run seed
```

Open **http://localhost:5173**

---

## Database Schema

### Models

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │   Project   │       │   Client    │
│─────────────│       │─────────────│       │─────────────│
│ id (PK)     │──┐    │ id (PK)     │──┐    │ id (PK)     │
│ email       │  │    │ name        │  │    │ name        │
│ name        │  │    │ description │  │    │ email       │
│ passwordHash│  │    │ clientId(FK)│──┼───▶│ company     │
│ role        │  │    │ managerId(FK│──┘    └─────────────┘
└─────────────┘  │    └─────────────┘
                 │           │
        ┌────────┘           │
        │                   ▼
┌───────┴─────┐       ┌─────────────┐
│ RefreshToken│       │    Task     │
│─────────────│       │─────────────│
│ id (PK)     │       │ id (PK)     │
│ token       │       │ title       │
│ userId (FK) │       │ description │
│ expiresAt   │       │ projectId(FK│
│ revoked     │       │ assignedToId│
└─────────────┘       │ status      │
                      │ priority    │
                      │ dueDate     │
                      └─────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
       ┌──────┴──────┐             ┌────────┴────┐
       │ ActivityLog │             │Notification │
       │─────────────│             │─────────────│
       │ id (PK)     │             │ id (PK)     │
       │ projectId(FK│             │ recipientId │
       │ taskId (FK) │             │ taskId (FK) │
       │ userId (FK) │             │ type        │
       │ action      │             │ message     │
       │ fromStatus  │             │ read        │
       │ toStatus    │             └─────────────┘
       │ createdAt   │
       └─────────────┘
```

### Enums

| Enum            | Values                                        |
|-----------------|-----------------------------------------------|
| `Role`          | ADMIN, PROJECT_MANAGER, DEVELOPER             |
| `TaskStatus`    | TODO, IN_PROGRESS, IN_REVIEW, DONE, OVERDUE   |
| `TaskPriority`  | LOW, MEDIUM, HIGH, CRITICAL                   |
| `NotificationType` | TASK_ASSIGNED, TASK_IN_REVIEW, TASK_STATUS_CHANGED |

### Indexes & Rationale

| Table         | Index                        | Reason                                                    |
|---------------|------------------------------|-----------------------------------------------------------|
| User          | `role`                       | Role-based queries filter users by role frequently        |
| RefreshToken  | `token`, `userId`            | Every refresh does a unique token lookup; revoke-all by userId |
| Project       | `managerId`, `clientId`      | PM dashboard scopes all queries by managerId              |
| Task          | `projectId`                  | Nearly every task query is project-scoped                 |
| Task          | `assignedToId`               | Developer task lists; socket room access checks           |
| Task          | `status`                     | Overdue job queries `status NOT IN (DONE, OVERDUE)`       |
| Task          | `dueDate`                    | Overdue job runs `dueDate < now()`                        |
| ActivityLog   | `projectId`, `createdAt`     | Feed queries scope by project and order chronologically   |
| ActivityLog   | `taskId`, `userId`           | Task history and user audit trail                         |
| Notification  | `(recipientId, read)`        | Composite index: unread count hits both columns           |

---

## Architectural Decisions

### WebSocket Library: Socket.io

Chosen over native WebSocket because:
- Built-in **room management** — used extensively for `project:<id>`, `user:<id>`, and `admin:global` rooms. Scoping real-time events by role requires rooms; native WebSocket has no concept of rooms.
- **Automatic reconnection** with configurable retry strategy and exponential backoff.
- **Auth middleware** (`io.use(...)`) makes JWT verification on connection clean and centralized.
- `socket.io-client` React integration is mature and well-tested.
- Falls back to HTTP long-polling automatically if WebSocket is blocked (corporate firewalls).

### Background Jobs: node-cron

Chosen over Bull queue because:
- The overdue-flagging job is **simple, stateless, and single-process** — it runs a query every 15 minutes and updates rows. No retry semantics, no distributed workers, no job priority needed.
- Bull requires **Redis** as an additional infrastructure dependency. node-cron runs in-process with zero extra services.
- If the application scaled to require distributed job processing, migrating to BullMQ would be straightforward — the job logic is isolated in `src/jobs/overdueJob.ts`.

### Token Storage

| Token         | Storage                          | Reason                                                                 |
|---------------|----------------------------------|------------------------------------------------------------------------|
| Access token  | `localStorage` (15 min lifetime) | Short-lived; acceptable XSS risk given the expiry window               |
| Refresh token | `HttpOnly` cookie, `SameSite=Strict` | Never readable by JavaScript; immune to XSS token theft             |

Refresh tokens are also stored server-side in the `RefreshToken` table with a `revoked` flag, enabling server-side invalidation (logout-all-sessions). Every refresh call rotates the token — the old one is revoked and a new one is issued.

### Role Enforcement

Role-based access is enforced at **two layers**:

1. **Route level** — `authenticate` middleware verifies the JWT on every protected route. `authorize(...roles)` middleware rejects requests from users without the required role (returns 403).
2. **Service level** — Every service function checks ownership. A PM cannot read or modify another PM's projects even if they bypass the route-level check with a crafted token.

Frontend role-gating (`ProtectedRoute`) is a **UX convenience only** — it never replaces API enforcement.

---

## Role Access Matrix

| Feature                    | Admin | Project Manager    | Developer          |
|----------------------------|-------|--------------------|--------------------|
| View all projects          | ✅    | Own projects only  | Assigned only      |
| Create / delete projects   | ✅    | ✅ (own only)      | ❌                 |
| Create / delete tasks      | ✅    | ✅ (own projects)  | ❌                 |
| Update task (all fields)   | ✅    | ✅ (own projects)  | Status only        |
| View activity feed         | All   | Own projects       | Own tasks          |
| Manage clients             | ✅    | Read only          | ❌                 |
| Manage users               | ✅    | ❌                 | ❌                 |
| Admin dashboard            | ✅    | ❌                 | ❌                 |
| Online presence count      | ✅    | ❌                 | ❌                 |

---

## Real-Time Features

- **Live activity feed** — task updates broadcast to Socket.io project rooms; role-scoped so each user only receives events they're authorised to see
- **Missed events catchup** — on reconnect, client sends last-seen timestamp; server queries `ActivityLog` table (not memory cache) and returns up to 20 missed events
- **Live presence** — Admin dashboard shows active online users via WebSocket presence tracking
- **Notification badge** — unread count updates in real time via `notification:new` socket event, no polling

---

## Seed Data

Run `npm run seed` in the `backend` directory. Creates:

- 1 Admin, 2 Project Managers, 4 Developers
- 3 clients (Acme Corporation, Nexus Technologies, Brightwave Media)
- 3 projects with 6 tasks each (18 tasks total, various statuses)
- 2 tasks already in OVERDUE state
- 12 pre-existing activity log entries (feed is not empty on first load)
- 6 notifications (mix of read and unread)

---

## Known Limitations

- **No rate limiting** on auth endpoints — `express-rate-limit` would be added before production deployment
- **Register endpoint requires Admin auth** — new users must be created by an Admin; there is no public self-registration
- **Single-process architecture** — node-cron and Socket.io presence tracking are in-memory; horizontal scaling would require Redis adapter for Socket.io and a distributed job queue
- **No end-to-end test coverage** — unit and integration tests would be the next addition
- **Docker Compose is provided** but production deployment would need proper secret management (e.g. environment injection via Railway/Vercel rather than a committed `.env`)
