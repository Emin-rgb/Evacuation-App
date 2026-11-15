---
name: backend-architecture
description: How to build backend parts in this project — database schema, seed data, services, API route handlers, error handling. Use whenever a task touches the API, data model or database.
---

# Backend architecture

Goal: an architecture the team can explain in one slide, built fast. Clean layers, no over-engineering.

## Layers
```
UI (pages/components) → lib/api.ts (fetch wrappers)
  → app/api/<resource>/route.ts      thin HTTP layer
    → server/services/<domain>.service.ts   business logic
      → server/db (schema + client)          data access
```
- Route handlers: parse params/body, validate with Zod, call ONE service function, map result to JSON + correct status (200/201/400/404/500).
- Services: all business rules and calculations. Plain async functions, typed inputs/outputs. No `Request`/`Response` objects here.
- DB access only inside services. UI never imports from `server/`.

## Data model first
1. Before writing endpoints, write the schema in `server/db/schema.ts` (tables, relations, enums, timestamps).
2. Keep it to the entities the demo needs (usually 3-6 tables). Use proper foreign keys and enums — judges look at this.
3. Write `server/db/seed.ts` with realistic data (local names, places, plausible numbers). Run it so every screen has data.
4. Push the schema to the DB (migrations/push command of the chosen ORM).

## API design
- REST, plural resources: `GET /api/orders`, `GET /api/orders/[id]`, `POST /api/orders`, `PATCH /api/orders/[id]`.
- One consistent response shape: success → the data; error → `{ error: string }` + status code.
- Shared Zod schemas in `lib/schemas.ts`, reused by API validation and frontend forms; types via `z.infer`.
- Filtering/sorting via query params, done in the DB query, not in JS.

## Error handling
- Wrap each route handler body in try/catch: Zod error → 400 with message; not found → 404; other → 500 + `console.error`.
- Frontend shows a toast for errors and keeps the screen usable.

## Pitch support
- Keep a short `docs/architecture.md`: layer diagram (Mermaid), table list with relations, endpoint list. Update it when the schema or endpoints change. It becomes the architecture slide.

## Drizzle + Neon reference (verified: drizzle-orm 0.45, drizzle-kit 0.31, @neondatabase/serverless 1.2)

`server/db/index.ts`
```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
export const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
```

`server/db/schema.ts` pattern
```ts
import { pgTable, uuid, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
export const statusEnum = pgEnum("status", ["active", "inactive"]);
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: integer("amount").notNull().default(0),
  status: statusEnum("status").notNull().default("active"),
});
export const usersRelations = relations(users, ({ many }) => ({ items: many(items) }));
export const itemsRelations = relations(items, ({ one }) => ({
  user: one(users, { fields: [items.userId], references: [users.id] }),
}));
```
Define `relations` so `db.query.<table>.findMany({ with: { ... } })` works.

`drizzle.config.ts`
```ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
config({ path: ".env.local" });
export default defineConfig({
  schema: "./server/db/schema.ts", out: "./drizzle", dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

Seed script gotcha: load env BEFORE importing the db (static imports run first), so use dynamic imports:
```ts
import { config } from "dotenv";
config({ path: ".env.local" });
async function main() {
  const { db } = await import("./index");
  const { users } = await import("./schema");
  // delete children first, then parents; insert parents, use .returning() ids for children
}
main();
```

package.json scripts: `"db:push": "drizzle-kit push"`, `"db:seed": "tsx server/db/seed.ts"`, `"db:studio": "drizzle-kit studio"`.
Use `drizzle-kit push` (no migration files) during the contest — fastest.
Service queries: `db.select().from(t).where(eq(t.id, id))`, `db.insert(t).values(v).returning()`, `db.update(t).set(v).where(...)`, `db.query.t.findMany({ with, orderBy: desc(t.createdAt) })`.
