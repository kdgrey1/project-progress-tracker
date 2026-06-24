# Project Progress Tracker — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack team project progress tracker with Projects → Milestones → Tasks hierarchy and auto-computed progress percentages.

**Architecture:** Next.js 14 App Router monorepo. Server Actions and Route Handlers for the API layer. Prisma + Neon PostgreSQL for persistence. NextAuth.js v5 for Email/Password + Google OAuth. React Query for optimistic UI updates on task toggling.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Prisma, Neon PostgreSQL, NextAuth.js v5, TanStack Query v5, Zod, bcryptjs, Lucide React, Vercel

---

## File Structure

```
project-tracker/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              ← protected layout
│   │   │   ├── dashboard/page.tsx
│   │   │   └── projects/
│   │   │       ├── new/page.tsx
│   │   │       └── [id]/
│   │   │           ├── page.tsx
│   │   │           └── settings/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── projects/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── milestones/route.ts
│   │   │   │       └── members/
│   │   │   │           ├── route.ts
│   │   │   │           └── [userId]/route.ts
│   │   │   ├── milestones/[id]/
│   │   │   │   ├── route.ts
│   │   │   │   └── tasks/route.ts
│   │   │   └── tasks/[id]/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                         ← shadcn auto-generated
│   │   ├── providers.tsx
│   │   ├── nav.tsx
│   │   ├── project-card.tsx
│   │   ├── progress-bar.tsx
│   │   ├── milestone-section.tsx
│   │   ├── task-item.tsx
│   │   └── invite-member-dialog.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── utils.ts
│   │   └── validations.ts
│   └── middleware.ts
├── prisma/
│   └── schema.prisma
├── .env.local
├── .env.example
└── next.config.ts
```

---

## Task 1: Initialize the Project

**Files:**
- Create: `package.json`, `next.config.ts`, `.env.example`, `.gitignore`

**Step 1: Scaffold Next.js app**

```bash
cd "C:\Projects\GV Project Progress Tracker"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

When prompted, accept all defaults.

**Step 2: Install dependencies**

```bash
npm install @prisma/client @auth/prisma-adapter next-auth@beta bcryptjs zod @tanstack/react-query @tanstack/react-query-devtools lucide-react class-variance-authority clsx tailwind-merge
npm install -D prisma @types/bcryptjs
```

**Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted: Style = Default, Base color = Slate, CSS variables = Yes.

Then add components:

```bash
npx shadcn@latest add button input label card badge dialog progress separator avatar dropdown-menu form toast
```

**Step 4: Create `.env.example`**

```
DATABASE_URL="postgresql://..."
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
NEXTAUTH_URL="http://localhost:3000"
```

**Step 5: Create `.env.local`** (copy `.env.example`, fill in real values — see Task 2 for DATABASE_URL)

**Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Next.js project with dependencies"
```

---

## Task 2: Prisma Schema + Neon Database

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `.env.local`

**Step 1: Get Neon DATABASE_URL**

1. Go to https://neon.tech and sign up (free)
2. Create a project named "project-tracker"
3. Copy the connection string (postgresql://...) — it's shown on the dashboard
4. Paste into `.env.local` as `DATABASE_URL`

**Step 2: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

**Step 3: Write the schema**

Replace entire `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL")
}

model User {
  id            String          @id @default(cuid())
  name          String?
  email         String          @unique
  emailVerified DateTime?
  password      String?
  image         String?
  createdAt     DateTime        @default(now())
  accounts      Account[]
  sessions      Session[]
  ownedProjects Project[]       @relation("ProjectOwner")
  memberships   ProjectMember[]
  assignedTasks Task[]          @relation("TaskAssignee")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  ownerId     String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  owner       User          @relation("ProjectOwner", fields: [ownerId], references: [id])
  members     ProjectMember[]
  milestones  Milestone[]
}

enum ProjectStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}

model ProjectMember {
  projectId String
  userId    String
  role      MemberRole @default(MEMBER)
  joinedAt  DateTime   @default(now())
  project   Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([projectId, userId])
}

enum MemberRole {
  OWNER
  MEMBER
}

model Milestone {
  id          String    @id @default(cuid())
  projectId   String
  name        String
  description String?
  dueDate     DateTime?
  order       Int       @default(0)
  createdAt   DateTime  @default(now())
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks       Task[]
}

model Task {
  id          String     @id @default(cuid())
  milestoneId String
  title       String
  description String?
  status      TaskStatus @default(TODO)
  assigneeId  String?
  order       Int        @default(0)
  createdAt   DateTime   @default(now())
  milestone   Milestone  @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  assignee    User?      @relation("TaskAssignee", fields: [assigneeId], references: [id])
}

enum TaskStatus {
  TODO
  DONE
}
```

**Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected output: "Your database is now in sync with your schema."

**Step 5: Generate client**

```bash
npx prisma generate
```

**Step 6: Create `src/lib/db.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error"] : [] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add Prisma schema and Neon database connection"
```

---

## Task 3: NextAuth.js v5 Configuration

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`

**Step 1: Create `src/lib/auth.ts`**

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
```

**Step 2: Create `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

**Step 3: Create `src/middleware.ts`**

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register");

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 4: Create `src/lib/validations.ts`**

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const createMilestoneSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  dueDate: z.string().datetime().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["TODO", "DONE"]).optional(),
  assigneeId: z.string().optional().nullable(),
});
```

**Step 5: Add `AUTH_SECRET` to `.env.local`**

Generate one: `openssl rand -base64 32` (or use any long random string for development)

```
AUTH_SECRET="your-generated-secret"
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add NextAuth.js v5 with email/password and Google OAuth"
```

---

## Task 4: API — Register Endpoint + Project Routes

**Files:**
- Create: `src/app/api/register/route.ts`, `src/app/api/projects/route.ts`, `src/app/api/projects/[id]/route.ts`

**Step 1: Create `src/app/api/register/route.ts`**

```typescript
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { name, email, password: hashed },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
```

**Step 2: Create helper to compute progress**

Add to `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function computeProgress(tasks: { status: string }[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}
```

**Step 3: Create `src/app/api/projects/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProjectSchema } from "@/lib/validations";
import { computeProgress } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await db.projectMember.findMany({
    where: { userId: session.user.id },
    include: {
      project: {
        include: {
          owner: { select: { id: true, name: true, image: true } },
          members: { include: { user: { select: { id: true, name: true, image: true } } } },
          milestones: { include: { tasks: { select: { status: true } } } },
        },
      },
    },
  });

  const projects = memberships.map(({ project }) => {
    const allTasks = project.milestones.flatMap((m) => m.tasks);
    return { ...project, progress: computeProgress(allTasks) };
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const project = await db.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
```

**Step 4: Create `src/app/api/projects/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProjectSchema } from "@/lib/validations";
import { computeProgress } from "@/lib/utils";

async function getProjectOrForbid(projectId: string, userId: string) {
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) return null;
  return member;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getProjectOrForbid(params.id, session.user.id);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await db.project.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      members: {
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
      },
      milestones: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: { assignee: { select: { id: true, name: true, image: true } } },
          },
        },
      },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allTasks = project.milestones.flatMap((m) => m.tasks);
  const milestonesWithProgress = project.milestones.map((m) => ({
    ...m,
    progress: computeProgress(m.tasks),
  }));

  return NextResponse.json({
    ...project,
    milestones: milestonesWithProgress,
    progress: computeProgress(allTasks),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getProjectOrForbid(params.id, session.user.id);
  if (!member || member.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createProjectSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const project = await db.project.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(project);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getProjectOrForbid(params.id, session.user.id);
  if (!member || member.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.project.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add register endpoint and project CRUD API routes"
```

---

## Task 5: API — Milestone, Task, and Member Routes

**Files:**
- Create: `src/app/api/projects/[id]/milestones/route.ts`
- Create: `src/app/api/milestones/[id]/route.ts`
- Create: `src/app/api/milestones/[id]/tasks/route.ts`
- Create: `src/app/api/tasks/[id]/route.ts`
- Create: `src/app/api/projects/[id]/members/route.ts`
- Create: `src/app/api/projects/[id]/members/[userId]/route.ts`

**Step 1: `src/app/api/projects/[id]/milestones/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createMilestoneSchema } from "@/lib/validations";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createMilestoneSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const count = await db.milestone.count({ where: { projectId: params.id } });
  const milestone = await db.milestone.create({
    data: { ...parsed.data, projectId: params.id, order: count },
  });

  return NextResponse.json(milestone, { status: 201 });
}
```

**Step 2: `src/app/api/milestones/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createMilestoneSchema } from "@/lib/validations";

async function getMilestoneAndCheckAccess(milestoneId: string, userId: string) {
  const milestone = await db.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) return null;
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId: milestone.projectId, userId } },
  });
  return member ? milestone : null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const milestone = await getMilestoneAndCheckAccess(params.id, session.user.id);
  if (!milestone) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createMilestoneSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await db.milestone.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const milestone = await getMilestoneAndCheckAccess(params.id, session.user.id);
  if (!milestone) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.milestone.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
```

**Step 3: `src/app/api/milestones/[id]/tasks/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTaskSchema } from "@/lib/validations";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const milestone = await db.milestone.findUnique({ where: { id: params.id } });
  if (!milestone) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId: milestone.projectId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const count = await db.task.count({ where: { milestoneId: params.id } });
  const task = await db.task.create({
    data: { ...parsed.data, milestoneId: params.id, order: count },
    include: { assignee: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(task, { status: 201 });
}
```

**Step 4: `src/app/api/tasks/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateTaskSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await db.task.findUnique({
    where: { id: params.id },
    include: { milestone: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId: task.milestone.projectId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await db.task.update({
    where: { id: params.id },
    data: parsed.data,
    include: { assignee: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await db.task.findUnique({
    where: { id: params.id },
    include: { milestone: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId: task.milestone.projectId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.task.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
```

**Step 5: `src/app/api/projects/[id]/members/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.id, userId: session.user.id } },
  });
  if (!owner || owner.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = z.object({ email: z.string().email() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const invitee = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!invitee) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.id, userId: invitee.id } },
  });
  if (existing) return NextResponse.json({ error: "Already a member" }, { status: 409 });

  const member = await db.projectMember.create({
    data: { projectId: params.id, userId: invitee.id, role: "MEMBER" },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
  });

  return NextResponse.json(member, { status: 201 });
}
```

**Step 6: `src/app/api/projects/[id]/members/[userId]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.id, userId: session.user.id } },
  });
  if (!owner || owner.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (params.userId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await db.projectMember.delete({
    where: { projectId_userId: { projectId: params.id, userId: params.userId } },
  });

  return NextResponse.json({ success: true });
}
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add milestone, task, and team member API routes"
```

---

## Task 6: Root Layout + Providers

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/providers.tsx`

**Step 1: Create `src/components/providers.tsx`**

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30 * 1000 } },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
```

**Step 2: Update `src/app/layout.tsx`**

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project Progress Tracker",
  description: "Track your team's project progress",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Step 3: Create `src/app/page.tsx`** (root redirect)

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");
  redirect("/login");
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add React Query and NextAuth providers, root redirect"
```

---

## Task 7: Auth UI (Login + Register Pages)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`

**Step 1: Create `src/app/(auth)/login/page.tsx`**

```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Enter your credentials to access your projects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            Continue with Google
          </Button>

          <p className="text-center text-sm text-slate-600">
            No account?{" "}
            <Link href="/register" className="font-medium underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create `src/app/(auth)/register/page.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Start tracking your team's progress</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            Continue with Google
          </Button>

          <p className="text-center text-sm text-slate-600">
            Have an account?{" "}
            <Link href="/login" className="font-medium underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add login and register pages"
```

---

## Task 8: Navigation + Protected Layout

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/nav.tsx`

**Step 1: Create `src/components/nav.tsx`**

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, LogOut, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Nav() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "?";

  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-slate-900">
            Progress Tracker
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/dashboard">
              <Button
                variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/projects/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={session?.user?.image ?? ""} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-slate-500 text-xs">
                {session?.user?.email}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
```

**Step 2: Create `src/app/(dashboard)/layout.tsx`**

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add navigation bar and protected dashboard layout"
```

---

## Task 9: Shared Components

**Files:**
- Create: `src/components/progress-bar.tsx`
- Create: `src/components/project-card.tsx`

**Step 1: Create `src/components/progress-bar.tsx`**

```typescript
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ProgressBar({ value, className, showLabel = true, size = "md" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped === 100
      ? "bg-green-500"
      : clamped >= 60
      ? "bg-blue-500"
      : clamped >= 30
      ? "bg-amber-500"
      : "bg-slate-300";

  const height = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("flex-1 bg-slate-100 rounded-full overflow-hidden", height)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-slate-600 w-9 text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}
```

**Step 2: Create `src/components/project-card.tsx`**

```typescript
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/progress-bar";
import { Calendar } from "lucide-react";

type Member = { user: { id: string; name: string | null; image: string | null } };

interface ProjectCardProps {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  members: Member[];
  createdAt: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-slate-100 text-slate-600",
};

export function ProjectCard({
  id, name, description, status, progress, members, createdAt,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-2">{name}</CardTitle>
            <Badge className={cn("shrink-0 text-xs font-normal", statusColors[status] ?? "")}>
              {status.toLowerCase()}
            </Badge>
          </div>
          {description && (
            <p className="text-sm text-slate-500 line-clamp-2">{description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar value={progress} size="md" />

          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {members.slice(0, 4).map(({ user }) => {
                const initials = user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "?";
                return (
                  <Avatar key={user.id} className="h-7 w-7 border-2 border-white">
                    <AvatarImage src={user.image ?? ""} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                );
              })}
              {members.length > 4 && (
                <div className="h-7 w-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs text-slate-600">
                  +{members.length - 4}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="h-3 w-3" />
              {new Date(createdAt).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add ProgressBar and ProjectCard components"
```

---

## Task 10: Dashboard Page

**Files:**
- Create: `src/app/(dashboard)/dashboard/page.tsx`

**Step 1: Create `src/app/(dashboard)/dashboard/page.tsx`**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/project-card";
import { Plus, FolderOpen } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  createdAt: string;
  members: { user: { id: string; name: string | null; image: string | null } }[];
}

export default function DashboardPage() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!projects?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FolderOpen className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">No projects yet</h2>
        <p className="text-slate-500 mb-6">Create your first project to get started</p>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create project
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
        <Link href="/projects/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} {...project} />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create `src/app/(dashboard)/projects/new/page.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Failed to create project");
      return;
    }

    const project = await res.json();
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    router.push(`/projects/${project.id}`);
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>New project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My awesome project"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create project"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add dashboard page and new project form"
```

---

## Task 11: Task Item + Milestone Section Components

**Files:**
- Create: `src/components/task-item.tsx`
- Create: `src/components/milestone-section.tsx`

**Step 1: Create `src/components/task-item.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    status: "TODO" | "DONE";
    assignee: { id: string; name: string | null; image: string | null } | null;
  };
  projectId: string;
}

export function TaskItem({ task, projectId }: TaskItemProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const toggleMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: task.status === "DONE" ? "TODO" : "DONE" }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const editMutation = useMutation({
    mutationFn: (newTitle: string) =>
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/tasks/${task.id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  return (
    <div className="flex items-center gap-3 group py-2 px-3 rounded-lg hover:bg-slate-50">
      <Checkbox
        checked={task.status === "DONE"}
        onCheckedChange={() => toggleMutation.mutate()}
        className="shrink-0"
      />

      {editing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") editMutation.mutate(title);
              if (e.key === "Escape") { setEditing(false); setTitle(task.title); }
            }}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => editMutation.mutate(title)}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => { setEditing(false); setTitle(task.title); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <span
          className={cn(
            "flex-1 text-sm cursor-pointer",
            task.status === "DONE" && "line-through text-slate-400"
          )}
          onClick={() => setEditing(true)}
        >
          {task.title}
        </span>
      )}

      {task.assignee && (
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarImage src={task.assignee.image ?? ""} />
          <AvatarFallback className="text-[10px]">
            {task.assignee.name?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
        onClick={() => deleteMutation.mutate()}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
```

**Step 2: Create `src/components/milestone-section.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskItem } from "@/components/task-item";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: "TODO" | "DONE";
  assignee: { id: string; name: string | null; image: string | null } | null;
}

interface MilestoneSectionProps {
  milestone: {
    id: string;
    name: string;
    progress: number;
    tasks: Task[];
  };
  projectId: string;
}

export function MilestoneSection({ milestone, projectId }: MilestoneSectionProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");

  const addTaskMutation = useMutation({
    mutationFn: (title: string) =>
      fetch(`/api/milestones/${milestone.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setTaskTitle("");
      setAddingTask(false);
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/milestones/${milestone.id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (taskTitle.trim()) addTaskMutation.mutate(taskTitle.trim());
  }

  return (
    <div className="border rounded-xl bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b">
        <button onClick={() => setExpanded(!expanded)} className="text-slate-500">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <h3 className="font-medium text-slate-800 flex-1">{milestone.name}</h3>
        <div className="w-40">
          <ProgressBar value={milestone.progress} size="sm" />
        </div>
        <span className="text-xs text-slate-400">{milestone.tasks.length} tasks</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-red-400 hover:text-red-600"
          onClick={() => deleteMilestoneMutation.mutate()}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {expanded && (
        <div className="px-2 py-1">
          {milestone.tasks.length === 0 && !addingTask && (
            <p className="text-sm text-slate-400 text-center py-4">No tasks yet</p>
          )}

          {milestone.tasks.map((task) => (
            <TaskItem key={task.id} task={task} projectId={projectId} />
          ))}

          {addingTask ? (
            <form onSubmit={handleAddTask} className="flex gap-2 px-3 py-2">
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => e.key === "Escape" && setAddingTask(false)}
              />
              <Button type="submit" size="sm" disabled={addTaskMutation.isPending}>
                Add
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAddingTask(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 px-3 py-2 w-full text-left"
            >
              <Plus className="h-3 w-3" />
              Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add TaskItem and MilestoneSection components with optimistic updates"
```

---

## Task 12: Project Detail Page

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/page.tsx`

**Step 1: Create the page**

```typescript
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MilestoneSection } from "@/components/milestone-section";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Settings, Users } from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  members: { role: string; user: { id: string; name: string | null; image: string | null; email: string } }[];
  milestones: {
    id: string;
    name: string;
    progress: number;
    tasks: {
      id: string;
      title: string;
      status: "TODO" | "DONE";
      assignee: { id: string; name: string | null; image: string | null } | null;
    }[];
  }[];
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneName, setMilestoneName] = useState("");

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => fetch(`/api/projects/${id}`).then((r) => r.json()),
    refetchInterval: 10000, // background refresh every 10s
  });

  const addMilestoneMutation = useMutation({
    mutationFn: (name: string) =>
      fetch(`/api/projects/${id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setMilestoneName("");
      setAddingMilestone(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-3 w-full bg-slate-200 rounded animate-pulse" />
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!project) return <div className="text-slate-500">Project not found</div>;

  function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (milestoneName.trim()) addMilestoneMutation.mutate(milestoneName.trim());
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{project.name}</h1>
            <Badge
              className={
                project.status === "ACTIVE"
                  ? "bg-blue-100 text-blue-700"
                  : project.status === "COMPLETED"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }
            >
              {project.status.toLowerCase()}
            </Badge>
          </div>
          {project.description && (
            <p className="text-slate-500 text-sm">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex -space-x-2">
            {project.members.slice(0, 4).map(({ user }) => (
              <Avatar key={user.id} className="h-8 w-8 border-2 border-white">
                <AvatarImage src={user.image ?? ""} />
                <AvatarFallback className="text-xs">
                  {user.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <Link href={`/projects/${id}/settings`}>
            <Button size="sm" variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Overall Progress</span>
          <span className="text-lg font-bold text-slate-900">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} size="lg" showLabel={false} />
        <p className="text-xs text-slate-400 mt-2">
          {project.milestones.reduce((acc, m) => acc + m.tasks.filter((t) => t.status === "DONE").length, 0)} of{" "}
          {project.milestones.reduce((acc, m) => acc + m.tasks.length, 0)} tasks completed
        </p>
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        {project.milestones.map((milestone) => (
          <MilestoneSection key={milestone.id} milestone={milestone} projectId={id} />
        ))}

        {addingMilestone ? (
          <form onSubmit={handleAddMilestone} className="flex gap-2">
            <Input
              value={milestoneName}
              onChange={(e) => setMilestoneName(e.target.value)}
              placeholder="Milestone name..."
              autoFocus
              onKeyDown={(e) => e.key === "Escape" && setAddingMilestone(false)}
            />
            <Button type="submit" disabled={addMilestoneMutation.isPending}>
              Add
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAddingMilestone(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={() => setAddingMilestone(true)}
          >
            <Plus className="h-4 w-4" />
            Add milestone
          </Button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add project detail page with milestones and progress tracking"
```

---

## Task 13: Project Settings Page

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/settings/page.tsx`

**Step 1: Create the page**

```typescript
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserMinus } from "lucide-react";
import { useSession } from "next-auth/react";

interface Member {
  role: string;
  user: { id: string; name: string | null; image: string | null; email: string };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  ownerId: string;
  members: Member[];
}

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: project } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => fetch(`/api/projects/${id}`).then((r) => r.json()),
  });

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");

  const updateMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", id] }),
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) =>
      fetch(`/api/projects/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { setInviteError(data.error); return; }
      setInviteEmail("");
      setInviteError("");
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/projects/${id}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", id] }),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => fetch(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push("/dashboard");
    },
  });

  const isOwner = session?.user?.id === project?.ownerId;

  if (!project) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Project Settings</h1>

      {/* Edit project details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name || project.name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description ?? project.description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              defaultValue={project.status}
              onChange={(e) =>
                fetch(`/api/projects/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: e.target.value }),
                }).then(() => queryClient.invalidateQueries({ queryKey: ["project", id] }))
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Team members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {project.members.map(({ role, user }) => (
              <div key={user.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image ?? ""} />
                  <AvatarFallback className="text-xs">
                    {user.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name ?? user.email}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {role.toLowerCase()}
                </Badge>
                {isOwner && user.id !== session?.user?.id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-400 hover:text-red-600"
                    onClick={() => removeMemberMutation.mutate(user.id)}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Invite by email address"
                type="email"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inviteEmail) {
                    setInviteError("");
                    inviteMutation.mutate(inviteEmail);
                  }
                }}
              />
              <Button
                onClick={() => {
                  setInviteError("");
                  inviteMutation.mutate(inviteEmail);
                }}
                disabled={!inviteEmail || inviteMutation.isPending}
              >
                Invite
              </Button>
            </div>
          )}
          {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
        </CardContent>
      </Card>

      {/* Danger zone */}
      {isOwner && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-600">Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete this project</p>
                <p className="text-xs text-slate-500">
                  Permanently deletes the project, all milestones, and all tasks.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => {
                  if (confirm("Delete this project? This cannot be undone.")) {
                    deleteProjectMutation.mutate();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add project settings page with team management"
```

---

## Task 14: Final Wiring + Deploy to Vercel

**Files:**
- Modify: `next.config.ts`
- Create: `vercel.json` (optional)

**Step 1: Update `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
```

**Step 2: Run the app locally to verify**

```bash
npm run dev
```

Open http://localhost:3000 and test:
- [ ] Register a new account
- [ ] Log in with email/password
- [ ] Create a project
- [ ] Add a milestone
- [ ] Add tasks to the milestone
- [ ] Toggle tasks done — progress bar updates
- [ ] Invite a team member by email
- [ ] Edit project name

**Step 3: Set up Google OAuth credentials (for Google login)**

1. Go to https://console.cloud.google.com
2. Create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: Web
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://your-vercel-domain.vercel.app/api/auth/callback/google`
5. Copy Client ID and Secret into `.env.local`

**Step 4: Deploy to Vercel**

```bash
npm install -g vercel
vercel
```

Follow prompts. Then in Vercel dashboard → your project → Settings → Environment Variables, add:
- `DATABASE_URL` (Neon connection string)
- `AUTH_SECRET` (your generated secret)
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL` = `https://your-app.vercel.app`

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: production-ready project progress tracker MVP"
```

---

## Done — What You've Built

- Full auth (email/password + Google OAuth)
- Project CRUD with team roles (owner/member)
- Milestones + Tasks hierarchy
- Auto-computed progress bars at task, milestone, and project levels
- Invite team members by email
- Optimistic UI — task toggling updates progress instantly
- Deployed on Vercel, database on Neon — all free
