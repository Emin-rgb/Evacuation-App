# Project: [NAME] — Digital Azerbaijan Challenge final (4-hour build)

## Goal
A working MVP with a clean, explainable architecture (frontend + backend + database) and a smooth demo, built in 4 hours.
Case: [3-5 lines filled in at contest start]
Core demo flow: [screen 1 → screen 2 → result]

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui (`components/ui`)
- Backend: Next.js route handlers (`app/api/**`) + service layer (`server/services`)
- Database: PostgreSQL (Neon) + Drizzle ORM — schema `server/db/schema.ts`, client `server/db/index.ts`, seed `server/db/seed.ts`
- DB scripts: `npm run db:push` (apply schema), `npm run db:seed`, `npm run db:studio`. Env: `DATABASE_URL` in `.env.local`
- Validation: Zod at every API boundary
- Deploy: Vercel

## Architecture (layers, top → bottom; import only downward)
- `app/**/page.tsx` + `components/` — UI only, call the API via `lib/api.ts`
- `app/api/**/route.ts` — thin: parse + validate input (Zod), call a service, return JSON + status code
- `server/services/*.service.ts` — business logic, one file per domain
- `server/db/` — schema, client, seed script; only services touch the DB
- `lib/` — shared types, schemas, utils
Details: see the `backend-architecture` skill.

## Hard rules
- Working end-to-end flow first (UI → API → DB → UI), then widen.
- No new dependencies without asking. Use shadcn (`npx shadcn@latest add <name>`) for UI.
- Do NOT refactor or touch files outside the current task.
- Every screen: loading (skeleton), empty and error states. Seed the DB with realistic data.
- No tests unless asked. No auth unless the case needs it (then the simplest working version).
- Imports via `@/` alias only, never relative paths.
- Conditional classNames via `cn()` from `@/lib/utils`, never template-literal conditionals.
- Use only theme tokens that exist (check `app/globals.css`) — don't invent class names.
- Decorative icons get `aria-hidden="true"`.
- Commits: `type(scope): description`, one line, max 72 chars.
- Before finishing a task: run `npm run build` once; fix only errors you caused.
- Next.js 16 may differ from your training data: if an API fails, check `node_modules/next/dist/docs/` — only then, not by default.

## Workflow
- Tasks are in `PLAN.md`. Do one task at a time, then tick it off in PLAN.md.
- Answer briefly. Don't explain code unless asked. Don't print whole files back.

## Skills
- `backend-architecture` — API routes, services, database schema, seed data
- `ui-style` — when building or changing any screen
- `ai-feature` — only if the case needs an AI/LLM feature
- `demo-polish` — last hour, before the presentation
