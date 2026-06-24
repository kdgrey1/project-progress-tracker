# Project Progress Tracker — Design Document
**Date:** 2026-06-23  
**Status:** Approved

---

## Overview

A team project progress tracker for small teams (2–10 people). Tracks work in a
**Projects → Milestones → Tasks** hierarchy with auto-computed progress percentages.
Tasks can be added at any time; progress recalculates live on every task toggle or addition.

---

## Users & Access

- Small team, 2–10 members
- Auth: Email/password + Google OAuth (NextAuth.js v5)
- Project roles: `owner` (full control) | `member` (can add/edit/complete tasks, cannot delete project)

---

## Tech Stack

| Layer       | Choice                          | Why                                  |
|-------------|----------------------------------|--------------------------------------|
| Framework   | Next.js 14 (App Router)         | Full-stack, single deploy, free      |
| Language    | TypeScript                      | Type safety end-to-end               |
| Styling     | Tailwind CSS + shadcn/ui        | Fast, polished UI primitives         |
| ORM         | Prisma                          | Type-safe, migration-tracked         |
| Database    | Neon PostgreSQL (free tier)     | Serverless, scales to zero           |
| Auth        | NextAuth.js v5                  | Email/password + Google OAuth        |
| Data fetch  | React Query (TanStack Query v5) | Optimistic updates, background sync  |
| Icons       | Lucide React                    | Consistent icon set                  |
| Deploy      | Vercel (free hobby tier)        | Native Next.js support               |

All services are free tier. No paid dependencies.

---

## Architecture

```
Vercel
└── Next.js 14 (App Router)
    ├── React UI (Client Components)
    │   └── React Query — optimistic updates, background refetch
    ├── Server Actions / Route Handlers (API layer)
    └── NextAuth.js v5 (Email/Password + Google OAuth)
        │
        └── Prisma ORM
            │
            └── Neon PostgreSQL
```

---

## Database Schema

### User
| Field     | Type     | Notes                    |
|-----------|----------|--------------------------|
| id        | String   | cuid, PK                 |
| name      | String   |                          |
| email     | String   | unique                   |
| password  | String?  | null for OAuth users     |
| image     | String?  | avatar URL               |
| createdAt | DateTime |                          |

### Project
| Field       | Type     | Notes                              |
|-------------|----------|------------------------------------|
| id          | String   | cuid, PK                           |
| name        | String   |                                    |
| description | String?  |                                    |
| status      | Enum     | active \| completed \| archived     |
| ownerId     | String   | FK → User                          |
| createdAt   | DateTime |                                    |

> `progress` is computed: `completedTasks / totalTasks × 100`. Never stored.

### ProjectMember
| Field     | Type     | Notes                    |
|-----------|----------|--------------------------|
| projectId | String   | FK → Project             |
| userId    | String   | FK → User                |
| role      | Enum     | owner \| member           |
| joinedAt  | DateTime |                          |

### Milestone
| Field       | Type     | Notes                    |
|-------------|----------|--------------------------|
| id          | String   | cuid, PK                 |
| projectId   | String   | FK → Project             |
| name        | String   |                          |
| description | String?  |                          |
| dueDate     | DateTime?|                          |
| order       | Int      | for future drag-to-sort  |
| createdAt   | DateTime |                          |

> `progress` is computed from its tasks. Never stored.

### Task
| Field       | Type     | Notes                    |
|-------------|----------|--------------------------|
| id          | String   | cuid, PK                 |
| milestoneId | String   | FK → Milestone           |
| title       | String   |                          |
| description | String?  |                          |
| status      | Enum     | todo \| done              |
| assigneeId  | String?  | FK → User                |
| order       | Int      | for future drag-to-sort  |
| createdAt   | DateTime |                          |

---

## API Endpoints

### Auth
```
POST /api/auth/[...nextauth]     NextAuth handles all auth flows
```

### Projects
```
GET    /api/projects             List all projects for current user
POST   /api/projects             Create project
GET    /api/projects/:id         Project detail + milestones + tasks + computed progress
PATCH  /api/projects/:id         Edit name / description / status
DELETE /api/projects/:id         Owner only
```

### Milestones
```
POST   /api/projects/:id/milestones    Add milestone to project
PATCH  /api/milestones/:id             Edit milestone name / description / dueDate
DELETE /api/milestones/:id             Remove milestone (and its tasks)
```

### Tasks
```
POST   /api/milestones/:id/tasks       Add task (can be done at any time)
PATCH  /api/tasks/:id                  Edit title OR toggle status todo↔done
DELETE /api/tasks/:id                  Remove task
```

### Team
```
POST   /api/projects/:id/members            Invite member by email
DELETE /api/projects/:id/members/:userId    Remove member (owner only)
```

---

## UI Routes

```
/                          → redirect to /dashboard or /login
/login                     → Email/password + Google OAuth login
/register                  → Registration form
/dashboard                 → Project cards grid with progress bars
/projects/new              → Create project wizard
/projects/[id]             → Project detail (main workspace)
/projects/[id]/settings    → Edit project, manage team
```

---

## Key UI Behaviours

**Dashboard** — grid of project cards, each showing: name, team avatars, overall progress bar (%), status badge, last updated.

**Project Detail** — the main workspace:
- Large overall progress bar at the top
- Milestones listed vertically, each with its own progress bar
- Tasks inside each milestone: checkbox (toggles done) + inline-editable title + assignee
- "Add task" at bottom of each milestone (appears anytime, including mid-project)
- "Add milestone" at bottom of page
- Collapsible sidebar: team members + invite by email

**Progress auto-update** — React Query optimistically updates the progress bar on task toggle (instant feedback), then invalidates and refetches from server to confirm. No manual refresh needed.

---

## Progress Calculation

```
milestoneProgress = milestone.tasks.filter(done).length / milestone.tasks.length
projectProgress   = all tasks in project that are done / all tasks in project
```

Computed in the API response, never persisted. Adding a new task lowers the %, completing raises it.

---

## Out of Scope (MVP)

- Email notifications
- File attachments
- Comments on tasks
- Gantt / timeline view
- Drag-and-drop reordering (order field reserved for v2)
- Mobile app
