# Urban Crisis & Crowd Evacuation Engine

> Digital Azerbaijan Challenge, final round. A working MVP built in 4 hours: frontend, backend and database, with a seeded Baku road network, live evacuation routing and a one-click crisis response workflow.

During a disaster (earthquake, flood, industrial accident, mass event) citizens cannot see which gathering point is full or which road is closed, and dispatchers drown in a flood of SOS signals. This app gives both sides one shared, live picture of the city.

**Contents:** [Features](#features) · [Quick start](#quick-start) · [Demo script](#demo-script) · [Architecture](#architecture) · [Data model](#data-model) · [Algorithms](#algorithms) · [API reference](#api-reference) · [Project structure](#project-structure) · [Testing](#testing) · [Deployment](#deployment) · [Challenge drops](#challenge-drops-changes-log) · [Further docs](#further-docs)

---

## Features

### Citizen module (`/citizen`, mobile-first)

- Choose a district, or use "My location" (browser geolocation, falls back to the district centre).
- The three nearest **gathering points** (shelter / park / stadium) with a live occupancy bar, type badge and distance.
- An **evacuation route** drawn on the city map to the nearest reachable shelter under 90% occupancy, with distance and on-foot ETA.
- **Auto-reroute:** the route is re-checked every 3 seconds. If a road on the path closes or the target shelter reaches 90%, the route changes and a banner explains why (`road closed` or `shelter full`) with the old and new shelter.
- **One-tap SOS** with four types: fire, collapse, flood, medical.
- **"I'm safe"** button with a confirmed state.
- Anonymous identity: a UUID kept in `localStorage`, no login.

### Dispatcher module (`/dispatcher`, desktop)

- Live dashboard (3 s polling): KPI row (active SOS, safe citizens, critical shelters ≥90%, available teams), city map with SOS dots coloured by type, and tabs for the SOS feed, shelters (occupancy bars) and rescue teams (status badges).
- **Red Alert** cards, pulsing at the top of the page, raised automatically when either rule fires:
  - **SOS cluster:** at least 4 distinct citizens with an SOS within 500 m of each other in the last 5 minutes.
  - **Shelter overload:** an active shelter above 95% occupancy.
- **Approve in one click:** the nearest available team goes `en_route`, a reserve shelter in the zone opens (the citizen's route can use it within 3 s; its map marker shows after the citizen map reloads), the cluster's SOS signals become `assigned` and the alert becomes `approved`. **Dismiss** closes it without action.
- **Simulator panel** (a side sheet) to run the demo: open/close any road, set shelter occupancy (+10%, 92%, 96% or a custom value) and fire a burst of SOS signals near a point.

### Cross-cutting

- Every screen has loading (skeleton), empty and error states.
- All UI text is in Azerbaijani, centralised in `lib/i18n.ts`.
- The database is seeded with realistic Baku data (real district and avenue names).

---

## Quick start

**Requirements:** Node.js 20+, npm, a PostgreSQL database. We use [Neon](https://neon.tech) (serverless Postgres), which is what the DB client is written for.

```bash
# 1. install
npm install

# 2. configure the database
cp .env.example .env.local
#    then edit .env.local:
#    DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# 3. create the tables
npm run db:push

# 4. load the demo data (safe to re-run: it clears the tables first)
npm run db:seed

# 5. run
npm run dev
```

Open <http://localhost:3000>. Use two browser windows side by side: `/citizen` (ideally at phone width) and `/dispatcher`.

### Environment variables

| Variable                | Required | Purpose                                                            |
| ----------------------- | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL`          | yes      | Postgres connection string used by the app, `drizzle-kit` and seed |
| `DATABASE_URL_UNPOOLED` | no       | Direct (non-pooled) connection, listed in `.env.example`           |
| `JWT_SECRET`            | prod     | HMAC secret for dispatcher session tokens (dev falls back to a fixed dev value) |
| `DISPATCHER_PIN`        | prod     | PIN for the `dispatcher` role (dev default `2222`)                 |
| `VIEWER_PIN`            | prod     | PIN for the read-only `viewer` role (dev default `1111`)           |
| `GEMINI_API_KEY`        | no       | Not used: the product has no AI/LLM feature                        |

### Scripts

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Start the dev server                              |
| `npm run build`     | Production build (includes type-checking)         |
| `npm start`         | Serve the production build                        |
| `npm test`          | Run the engine unit tests (`node:test` via `tsx`) |
| `npm run lint`      | ESLint                                            |
| `npm run db:push`   | Apply `server/db/schema.ts` to the database       |
| `npm run db:seed`   | Reset and seed the demo data                      |
| `npm run db:studio` | Open Drizzle Studio to browse the tables          |

### Seed data

6 zones (Yasamal, Nəsimi, Nərimanov, Səbail, Binəqədi, Xətai), 20 road nodes (real Baku intersections), 31 road segments with lengths computed by haversine, 10 gathering points, 6 rescue teams, 40 citizens and 12 older SOS signals (20-55 minutes old, spread out, so no alert is live at the start).

Of the 10 shelters, 8 are active and 2 are **reserve** and inactive (`Xətai Olimpiya Meydanı`, `Yasamal Ehtiyat Meydanı`): approving an alert opens one. `Təbriz küçəsi sığınacağı` starts at 85%, so a small bump (+10%) crosses the 90% reroute threshold.

---

## Demo script

Two windows side by side: `/citizen` and `/dispatcher` with the Simulator open.

1. **Citizen:** choose **Yasamal**. The 3 nearest shelters appear with occupancy bars and a route to the nearest one is drawn.
2. **Simulator:** close a road on that route. Within 3 s the citizen sees "road closed" and a new route.
3. **Simulator:** set the target shelter to **92%**. The citizen is rerouted to the next shelter ("shelter 90% full").
4. **Citizen:** SOS → medical. It shows up in the dispatcher SOS feed and on the map.
5. **Simulator:** "3 SOS nearby". A **Red Alert** card appears.
6. **Dispatcher:** **Approve**. The nearest team becomes `en_route` and the reserve shelter opens (reload the citizen page or switch district to see its marker; routing already considers it).
7. **Simulator:** push a shelter to **96%**. A second alert type (shelter overload) appears.
8. **Citizen:** "I'm safe". The "safe citizens" KPI goes up.

To reset between runs: `npm run db:seed`.

---

## Architecture

### Layers

Imports only go **downward**. The UI never imports from `server/`; only services touch the database; the engine does no I/O at all.

```mermaid
flowchart TD
    subgraph Browser
        C["/citizen page"]
        D["/dispatcher page"]
        API["lib/api.ts (fetch wrappers)"]
        C --> API
        D --> API
    end

    subgraph "Next.js route handlers: app/api/**"
        R["route.ts: parse + Zod validate, call ONE service, map to JSON + status code"]
    end

    subgraph "Service layer: server/services/*.service.ts"
        S["zone, shelter, routing, citizen, sos, alert, dashboard, map, simulator"]
    end

    subgraph "Pure engine: server/engine/ (no DB, no I/O, unit-tested)"
        E["geo.ts: haversine, nearest node<br/>routing.ts: Dijkstra, shelter pick<br/>crisis.ts: alert rules"]
    end

    P["server/providers/traffic.provider.ts<br/>TrafficProvider interface<br/>SimulatedTrafficProvider"]
    DB[("PostgreSQL (Neon)<br/>Drizzle ORM: server/db/")]

    API -- "HTTP, 3 s polling" --> R
    R --> S
    S --> E
    S --> P
    S --> DB
    P --> DB
```

| Layer    | Location                         | Responsibility                                                                               |
| -------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| UI       | `app/**/page.tsx`, `components/` | Rendering, polling, user actions. Talks to the backend only through `lib/api.ts`.            |
| API      | `app/api/**/route.ts`            | Thin HTTP layer: validate input with Zod, call a service, return JSON + status code.         |
| Services | `server/services/*.service.ts`   | Business logic, one file per domain. The only code that reads or writes the DB.              |
| Engine   | `server/engine/`                 | Pure functions: distance maths, Dijkstra, alert rules. Takes plain data, returns plain data. |
| Provider | `server/providers/`              | `TrafficProvider` abstraction over "where do road conditions come from".                     |
| Data     | `server/db/`                     | Drizzle schema, client, seed script.                                                         |
| Shared   | `lib/`                           | Zod schemas, TypeScript types, API client, i18n dictionary, utils.                           |

### The "external routing API" and the traffic provider

The case assumes road conditions come from an external routing/traffic API. We model that as an interface so the source is swappable:

```ts
interface TrafficProvider {
  getEdges(): Promise<GraphEdge[]>;
}
```

`SimulatedTrafficProvider` implements it by reading `road_edges`, which the Simulator panel edits. A real provider (or a wrapper with a cache and a fallback for outages) can replace it without touching the routing service or the engine.

### Request flow: a reroute

```mermaid
sequenceDiagram
    participant Sim as Dispatcher (Simulator)
    participant API as API route
    participant DB as PostgreSQL
    participant Cit as Citizen page

    Sim->>API: PATCH /api/traffic/roads/:id {status: "closed"}
    API->>DB: UPDATE road_edges
    loop every 3 s
        Cit->>API: GET /api/route?lat&lng&prev=<shelterId>
        API->>DB: read nodes, edges (via TrafficProvider), active shelters
        API-->>Cit: path, distance, ETA, rerouted, reason
    end
    Note over Cit: reason = road_closed → banner + new route drawn
```

### Request flow: SOS → Red Alert → Approve

```mermaid
sequenceDiagram
    participant Cit as Citizen
    participant API as API routes
    participant Eng as Crisis engine
    participant DB as PostgreSQL
    participant Disp as Dispatcher

    Cit->>API: POST /api/sos {citizenId, type, lat, lng}
    API->>DB: insert sos_signals, citizen.status = sos
    API->>Eng: detectAlerts(sos, shelters, openAlerts)
    Eng-->>API: alert candidates (cluster / overload)
    API->>DB: insert alerts (status open)
    Disp->>API: GET /api/dashboard (3 s poll)
    API-->>Disp: open alerts → Red Alert card
    Disp->>API: POST /api/alerts/:id/approve
    API->>DB: ONE atomic batch: alert approved, team en_route,<br/>reserve shelter active, SOS assigned
    API-->>Disp: {team, shelter, assignedSos} → toast
    Note over Cit: next route/shelters poll now includes the new shelter
```

---

## Data model

```mermaid
erDiagram
    zones ||--o{ shelters : contains
    zones ||--o{ rescue_teams : "based in"
    zones ||--o{ citizens : "located in"
    zones ||--o{ sos_signals : "occurs in"
    zones ||--o{ alerts : "raised for"
    road_nodes ||--o{ road_edges : "from_node"
    road_nodes ||--o{ road_edges : "to_node"
    road_nodes ||--o{ shelters : "nearest node"
    citizens ||--o{ sos_signals : sends
    shelters ||--o{ alerts : "overload of"
    alerts ||--o{ rescue_teams : "assigned to"
```

| Table          | Purpose                 | Key columns                                                                                                                    |
| -------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `zones`        | Baku districts          | `name` (unique), `center_lat/lng`                                                                                              |
| `road_nodes`   | Intersections           | `name`, `lat`, `lng`                                                                                                           |
| `road_edges`   | Road segments (two-way) | `from_node_id`, `to_node_id`, `length_m`, `status` `open\|closed`                                                              |
| `shelters`     | Gathering points        | `type` `shelter\|park\|stadium`, `zone_id`, `node_id`, `capacity`, `occupancy`, `is_active`, `is_reserve`                      |
| `citizens`     | Anonymous users         | `status` `unknown\|safe\|sos`, `zone_id`, `lat/lng`                                                                            |
| `sos_signals`  | SOS reports             | `citizen_id`, `type` `fire\|collapse\|flood\|medical`, `status` `new\|assigned\|resolved`, `created_at`                        |
| `rescue_teams` | Teams                   | `status` `available\|en_route\|on_scene`, `zone_id`, `alert_id`                                                                |
| `alerts`       | Red Alerts              | `kind` `sos_cluster\|shelter_overload`, `zone_id`, `shelter_id?`, `sos_count`, `message`, `status` `open\|approved\|dismissed` |

All enums are native Postgres enums. Foreign keys are enforced: `road_edges` cascade from `road_nodes`, `sos_signals` cascade from `citizens`, `rescue_teams.alert_id` is `SET NULL` when an alert is deleted. Indexes: `sos_signals(created_at)` and `sos_signals(zone_id)`, because the dashboard and the detector both filter by time and zone.

---

## Algorithms

### Routing (`server/engine/routing.ts`)

1. Snap the citizen's position to the nearest road node (`nearestNode`, haversine).
2. Run **Dijkstra** from that node over **open edges only**. Roads are treated as two-way, weights are `length_m`. A closed road simply does not exist in the graph.
3. Among **active shelters below 90%** occupancy that are reachable, pick the lowest total cost: `walk to first node + graph distance + walk from the shelter's node`. Shelters at or above 90% or unreachable are skipped.
4. Rebuild the path from the predecessor map. ETA = distance ÷ 80 m/min (walking).

**Reroute reason.** The client sends the previous target as `prev`. If the new shelter differs: the reason is `shelter_full` when the old one is now ≥90% (or no longer active), otherwise `road_closed`. If the shelter is the same but the path differs from the path on the all-open graph, the reason is `road_closed` (a detour).

### Crisis detection (`server/engine/crisis.ts`)

- **SOS cluster:** consider non-resolved SOS from the last 5 minutes. For every signal, count the **distinct citizens** within 500 m (haversine). If the best centre in a zone has ≥4 distinct citizens, raise one `sos_cluster` alert for that zone. Counting distinct citizens means one person pressing SOS repeatedly cannot trigger it.
- **Shelter overload:** an active shelter above 95% (strictly greater) raises a `shelter_overload` alert.
- **No duplicates:** a zone with an open cluster alert, or a shelter with an open overload alert, is skipped.
- Detection runs **synchronously after every write that can change the outcome** (a new SOS, an occupancy change), so there are no background jobs and the alert is visible on the next poll.

### Approval (`server/services/alert.service.ts`)

Picks an available team (same zone preferred, otherwise any) and a reserve inactive shelter (same zone preferred, otherwise any), then applies **all four updates in one `db.batch`**, which is a single atomic transaction on the Neon HTTP driver: alert → `approved`, team → `en_route` (linked to the alert), reserve shelter → active, the zone's `new` SOS → `assigned`. Either everything happens or nothing does. Approving an already-handled alert returns `409`.

---

## API reference

All endpoints return JSON. Errors have one shape: `{ "error": "message" }` with status `400` (validation), `401` (no session), `403` (wrong role), `404` (not found), `409` (alert already handled), `429` (rate limit) or `500`. Approve/dismiss, all `/api/simulate/*`, road and shelter PATCH require the `dispatcher` role. Every input is validated with Zod (`lib/schemas.ts`).

| Method | Path                      | Input                                          | Returns                                                             |
| ------ | ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/api/zones`              |                                                | Zones with centre coordinates                                       |
| GET    | `/api/map`                |                                                | Nodes, edges (with status), active shelters                         |
| GET    | `/api/shelters/nearest`   | `lat`, `lng`                                   | Active shelters sorted by distance, with `occupancyPct`             |
| GET    | `/api/route`              | `lat`, `lng`, `prev?` (shelter uuid)           | `{ shelter, path, distanceM, etaMin, rerouted, reason }` or 404     |
| GET    | `/api/traffic`            |                                                | Road edges from the traffic provider                                |
| GET    | `/api/dashboard`          |                                                | **viewer+.** KPIs, shelters, teams, latest 100 SOS (60 min), open alerts, closed roads |
| POST   | `/api/citizens`           | `{ lat?, lng? }`                               | `201 { id, status }`                                                |
| PATCH  | `/api/citizens/:id`       | `{ status: "safe" }`                           | `{ id, status }`                                                    |
| POST   | `/api/sos`                | `{ citizenId, type, lat, lng }` (Baku area)    | `201 { id, type, status }`; `200 { …, duplicate: true }` for a repeat; `429` when rate-limited |
| POST   | `/api/auth/login`         | `{ pin }`                                      | `{ role }` + httpOnly session cookie; `401` wrong PIN, `429` too many attempts |
| POST   | `/api/auth/logout`        |                                                | Clears the session cookie                                           |
| GET    | `/api/auth/me`            |                                                | `{ role: "viewer" \| "dispatcher" \| null }`                        |
| POST   | `/api/alerts/:id/approve` |                                                | `{ id, status, team, shelter, assignedSos }`                        |
| POST   | `/api/alerts/:id/dismiss` |                                                | `{ id, status: "dismissed" }`                                       |
| PATCH  | `/api/traffic/roads/:id`  | `{ status: "open" \| "closed" }`               | Updated road (simulator)                                            |
| PATCH  | `/api/shelters/:id`       | `{ occupancy }` (int ≥ 0, clamped to capacity) | Updated shelter + `occupancyPct`; runs detection                    |
| POST   | `/api/simulate/sos-burst` | `{ lat, lng, count }` (1-20)                   | `201 { created, alertsCreated }`; runs detection                    |
| GET    | `/api/risk`               | `zoneId?` (uuid)                               | Daily risk: earthquake, flood, seismic anomaly, `rerouteThresholdPct` |
| PATCH  | `/api/simulate/risk`      | `{ mode: "none" \| "quake" \| "flood" }`       | `{ mode }`; demo override for the risk module                       |

`reason` is a code (`road_closed` / `shelter_full`), never display text; the client translates it. The same holds for risk `factors` (`{ key, value? }`).

Risk data © USGS Earthquake Hazards Program and Open-Meteo (free, no API keys).

---

## Project structure

```
app/
  page.tsx                  landing: two cards → /citizen, /dispatcher
  citizen/page.tsx          citizen screen
  dispatcher/page.tsx       dispatcher screen
  api/**/route.ts           thin HTTP handlers (see API reference)
components/
  citizen-view.tsx          district select, shelters, route card, reroute banner, polling
  citizen-actions.tsx       SOS dialog + "I'm safe" bar
  dispatcher-view.tsx       KPIs, alert cards, tabs, map, polling
  simulator-panel.tsx       roads, shelter occupancy, SOS burst
  city-map.tsx              SVG map (roads, shelters, route, SOS overlays)
  site-header.tsx
  ui/                       shadcn/ui primitives
lib/
  api.ts                    typed fetch wrappers (the only way the UI calls the backend)
  schemas.ts                Zod schemas shared by routes
  types.ts                  shared types
  i18n.ts                   all UI strings (AZ)
  utils.ts                  cn()
server/
  db/                       schema.ts, index.ts (client), seed.ts
  engine/                   geo.ts, routing.ts, crisis.ts  (pure)
  providers/                traffic.provider.ts
  services/                 *.service.ts
tests/                      geo, routing, crisis unit tests
docs/                       technical.md, ai-declaration.md
```

---

## Testing

```bash
npm test
```

31 unit tests with the built-in `node:test` runner (executed through `tsx`; no extra dependencies) cover the pure engine: haversine and nearest-node, Dijkstra (avoids closed edges, two-way roads, shortest of several routes, reroute after a closure, no path), shelter selection (skips ≥90%, unreachable, lowest cost) and the crisis rules (4 distinct / 500 m / 5 min fires; 3 does not; 4 from one citizen does not; stale or distant signals ignored; boundary cases; no duplicate open alerts; overload only above 95%, inactive shelters ignored). Because the engine takes plain data, none of these tests need a database. See [`docs/technical.md`](docs/technical.md#testing-strategy).

---

## Deployment

Deployed on Vercel. Set `DATABASE_URL` in the project's environment variables, make sure `npm run build` passes locally, then deploy. Run `npm run db:push` and `npm run db:seed` against the production database once (and `db:seed` again to reset the demo state).

---

## Challenge drops: changes log

The challenge announces changes during the event. Each one is recorded here with what changed, which files were touched, and how existing flows were kept intact.

| Drop | Status          | Summary                                                                                                                                                                                                                |
| ---- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2    | implemented     | External routing API outage: circuit breaker + timeout (5 s) with a live → cached snapshot → static backup graph fallback; citizens keep getting routes with an "Offline / backup routing mode" banner. Additive: with a healthy API the flow is identical. |
| 1    | implemented     | Priority SOS role with accessible evacuation routes (Priority#1 on the dispatcher), and an AZ/EN language switch. Additive: new columns have defaults and `accessibleOnly` is off unless the citizen is `priority`, so standard routes are unchanged. |

### Drop 1: what changed

- **Schema (additive, defaults):** `citizens.role`, `road_edges.isAccessible`, `shelters.isAccessible`, `sos_signals.priority`.
- **Engine:** `shortestPaths` / `pickShelter` take an optional `{ accessibleOnly }` (tests added in `tests/routing.test.ts`).
- **API:** `GET /api/route?citizenId=` (priority citizens get accessible-only routes and shelters), `POST /api/citizens` and `PATCH /api/citizens/:id` accept `role`, `POST /api/sos` sets `priority=1` for priority citizens, shelters carry `isAccessible`, dashboard exposes `priority` and `prioritySos`.
- **UI:** role toggle and "Accessible route" badge (citizen), Priority#1 pinned rows, KPI sub-count and ringed map dots (dispatcher).
- **i18n:** `lib/i18n/{az,en}.ts` (typed `Dictionary`, a missing key is a compile error), `LanguageProvider` + `useT()`, AZ/EN switch in the header, persisted in localStorage. Place and shelter names from the DB are data and stay as seeded; route reasons are sent as codes.
- **Seed:** 6 of 31 roads and 2 of 10 shelters flagged non-accessible (graph stays connected), 3 priority citizens.
- **Crisis rule unchanged:** a priority SOS counts as one normal signal.

### Drop 2: what changed

The external "map and routing API" (our `SimulatedTrafficProvider`) can now fail (HTTP 503 or >5 s) without any unhandled exception.

```
findRoute → trafficProvider.getEdgesWithMeta()
              └─ CircuitBreaker (2 failures → open, 15 s cooldown, half-open probe) + 5 s timeout
                    ├─ live      SimulatedTrafficProvider (road_edges)         → mode "live"
                    ├─ cache     last good snapshot, TTL 10 min (keeps closures) → mode "fallback"
                    └─ static    server/data/fallback-graph.ts (roads assumed open) → mode "fallback"
```

- **Engine (pure, tested in `tests/resilience.test.ts`):** `server/engine/circuit-breaker.ts`, `server/engine/resilient-edges.ts`.
- **Static backup data:** `server/data/fallback-graph.ts` is also the seed's source of truth, so the backup graph cannot drift from the seeded one; its node keys are mapped to DB node ids by name at routing time.
- **Schema (additive):** table `system_flags` (key `traffic_failure_mode` = `off|503|slow`) so the simulated outage is shared between serverless instances.
- **API:** `GET /api/route` gains `mode` (`live|fallback`) and `source`; `GET /api/traffic/health`; `PATCH /api/simulate/provider {mode}`.
- **UI:** amber offline banner and approximate distance/ETA (citizen), "Backup mode" map badge, provider chip and Routing-API buttons in the Simulator (dispatcher), "Service restored" toast. Strings in both AZ and EN.

### Drop 3: what changed

Scenario: 500+ fake SOS (panic or bot attack) must not block the dispatcher panel, critical actions must be protected, and latency must stay under 300 ms.

```
POST /api/sos ─▶ per-IP limit (20/min) ─▶ Zod (Baku bounds) ─▶ per-citizen limit (3/min)
              ─▶ duplicate filter (same citizen, unresolved SOS < 5 min → 200 duplicate)
              ─▶ insert ─▶ response ─▶ after(): coalesced Red Alert detection
```

- **Rate limit + duplicate filter:** `server/engine/rate-limit.ts`, `server/engine/sos-guard.ts` (pure, tested). Rejected requests never reach the DB. The detector counts *distinct citizens*, so repeats cannot fake a Red Alert. Limiter is in memory per serverless instance (trade-off; a shared store such as Upstash is the production step).
- **RBAC:** PIN login → HS256 JWT (`server/engine/jwt.ts`, `node:crypto`, no new dependency) in an httpOnly, SameSite=Lax cookie (8 h). Roles: `viewer` (read dashboard) and `dispatcher` (also approve/dismiss, simulator, road/shelter writes). Login attempts are limited to 5/min per IP. Citizen endpoints stay open.

| Action                              | No session | viewer | dispatcher |
| ----------------------------------- | ---------- | ------ | ---------- |
| Citizen: shelters, route, SOS, safe | yes        | yes    | yes        |
| `GET /api/dashboard`                | 401        | yes    | yes        |
| Approve / dismiss alert, simulator, road/shelter PATCH | 401 | 403 | yes |

- **Latency:** the SOS write is 2 DB round trips (citizen + recent SOS + zone in parallel, then insert + citizen update in parallel); detection reads only the last 5 min and runs after the response, single-flight. Dashboard SOS feed is capped at 100 (KPI counts stay exact via `count()`). Index `sos_signals(citizen_id, created_at)`.
- **Load test:** `[SPREAD=1] npx tsx scripts/load-sos.ts <baseUrl> 600 50` (SPREAD rotates client IPs to simulate a botnet). Result on a dev machine against remote Neon: 600 requests → ~450 × 429, ~40-55 × 200 duplicate, ~35-55 × 201, 60 × 400 (out of bounds); mean latency 99-140 ms (single IP: ~100 ms); citizen read during the flood ~90 ms; no fake Red Alert.

---

## Further docs

- [`docs/technical.md`](docs/technical.md): approach, technology choices, security, performance, testing strategy, limitations, future work.
- [`docs/ai-declaration.md`](docs/ai-declaration.md): AI tools used, when and how.
- [`PLAN.md`](PLAN.md): the task plan this build followed.

## Map and onboarding update

- The SVG schematic was replaced by a real map: Leaflet + OpenStreetMap tiles (`components/city-map-inner.tsx`, loaded client-only via `next/dynamic`). Same `CityMap` props as before. Road lines are straight segments between approximate intersections, and tiles need internet.
- The map has an **Update** button that refetches immediately; 3 s background polling stays so auto-reroute and Red Alert still appear on their own.
- Landing page explains the problem and the 4-step flow; `/citizen` and `/dispatcher` show a guided 8-step demo panel.

## Data attribution

Shelter locations are real places (parks, stadiums, universities) from OpenStreetMap, © OpenStreetMap contributors, ODbL. Imported offline with `scripts/import-osm-shelters.ts` into `server/data/osm-shelters.json`. OSM has no capacity data, so **capacity is an estimate** (polygon area ÷ 2 m² per person for open spaces, ÷ 4 for buildings, clamped to 300–10 000). Occupancy is simulated.
