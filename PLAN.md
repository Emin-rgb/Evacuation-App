# PLAN

## Case

- **Problem:** In an earthquake, flood, industrial accident or mass event, citizens can't see which gathering point is full or which road is closed. Dispatchers drown in SOS signals and can't route rescue teams to the most critical spots.
- **Users:** (1) citizens on their phones, (2) emergency dispatchers on desktop.
- **Our solution in one sentence:** One Next.js app with a `/citizen` view and a `/dispatcher` view sharing a city engine: a seeded Baku road graph, Dijkstra routing that avoids closed roads and full shelters, and a crisis detector that raises one-click Red Alerts.
- **Key entities (data model):**
  - `zones`: Baku districts (Yasamal, Nəsimi, Nərimanov, Səbail, Binəqədi, Xətai)
  - `road_nodes`: intersections (lat/lng)
  - `road_edges`: road segments between 2 nodes, `lengthM`, status `open|closed`, **`isAccessible` (drop 1)**
  - `shelters`: gathering points, type `shelter|park|stadium`, zone, nearest node, capacity, occupancy, `isActive`, `isReserve`, **`isAccessible` (drop 1)**
  - `citizens`: anonymous uuid (kept in localStorage), zone, lat/lng, status `unknown|safe|sos`, **`role` `standard|priority` (drop 1)**
  - `sos_signals`: citizen, type `fire|collapse|flood|medical`, lat/lng, zone, status `new|assigned|resolved`, **`priority` 0|1 (drop 1)**, createdAt
  - `rescue_teams`: name, status `available|en_route|on_scene`, zone, alertId
  - `alerts`: kind `sos_cluster|shelter_overload`, zone, shelter?, sosCount, message, status `open|approved|dismissed`

## Demo script (what the judges will see, in order; two windows side by side)

1. Citizen view → choose **Yasamal** → 3 nearest shelters with occupancy bars → route to the nearest shelter is drawn on the map.
2. Dispatcher → Simulator → **close a road** on that route → within 3 s the citizen sees "Yol bağlandı → alternativ marşrut" and a new route.
3. Simulator → set the target shelter to **92%** → citizen is rerouted to the next shelter ("Məntəqə 90% dolub").
4. Citizen taps **SOS → Tibbi yardım** → it appears in the dispatcher SOS feed and on the map.
5. Simulator → **send 3 more SOS nearby** → a **Red Alert** card appears: "Əlavə Xilasetmə Briqadası Göndər və Yeni Toplanış Nöqtəsi Aç".
6. Dispatcher clicks **Approve** → nearest team switches to `en_route`, the reserve shelter opens and appears on the citizen map.
7. Simulator → push a shelter to **96%** → second alert type (shelter overload).
8. Citizen taps **"Təhlükəsizəm"** → "safe citizens" KPI goes up.

## Architecture (for the pitch)

- `app/**/page.tsx` + `components/`: UI, calls `lib/api.ts`
- `app/api/**/route.ts`: Zod validation → service → JSON
- `server/services/*.service.ts`: zone, shelter, routing, citizen, sos, alert, team, dashboard, simulator
- `server/engine/`: **pure, DB-free** logic: `geo.ts`, `routing.ts` (Dijkstra), `crisis.ts` (alert rules). Unit-tested.
- `server/providers/traffic.provider.ts`: `TrafficProvider` interface; `SimulatedTrafficProvider` = the case's "external routing API" (swappable, ready for fallback)
- `server/db/`: Drizzle schema, client, seed
- `lib/`: `schemas.ts` (Zod), `types.ts`, `api.ts`, `i18n.ts` (all UI strings, AZ)
- Live updates: 3 s polling (no WebSockets)

## Data to collect (user, from the internet; optional, approximate is fine)

- [ ] Lat/lng + rough capacity of ~10 real Baku gathering points (stadiums, parks, large open squares) across the 6 districts
- [ ] Lat/lng of ~20 major intersections connecting them (main avenues)
- If this isn't collected, Claude seeds plausible approximate coordinates (fine for a schematic map).

## Tasks

Each task ends with a **✅ Browser check**. Do them in order; tick them off when the check passes.

- [x] **1. App shell + navigation (mock data)**
  - [x] 1.1 `lib/i18n.ts`: AZ dictionary for all UI strings
  - [x] 1.2 Header with app name + links Vətəndaş / Dispetçer
  - [x] 1.3 `/` landing: two large cards → `/citizen`, `/dispatcher`
  - [x] 1.4 `/citizen` and `/dispatcher` placeholder pages with skeleton blocks in the final layout
  - ✅ Open `/`, click both cards, both pages render the layout skeletons

- [x] **2. Database schema + seed**
  - [x] 2.1 Enums + 8 tables in `server/db/schema.ts` (with FKs, index on `sos_signals.createdAt` and `zoneId`)
  - [x] 2.2 `npm run db:push`
  - [x] 2.3 `server/db/seed.ts`: 6 zones, ~20 nodes, ~30 edges, 10 shelters (2 reserve/inactive, one at 85%), 6 teams, 40 citizens, 12 older SOS signals
  - [x] 2.4 Seed is re-runnable (clears tables first)
  - [x] 2.5 First vertical slice: `zone.service.ts` + `GET /api/zones`
  - ✅ `/api/zones` in the browser returns 6 zones; `db:studio` shows seeded rows

- [x] **3. City map (SVG)**
  - [x] 3.1 `GET /api/map` → nodes, edges (with status), active shelters
  - [x] 3.2 `components/city-map.tsx`: projects lat/lng into a viewBox, draws roads, closed roads in red, shelters coloured by occupancy (green <70, amber <90, red ≥90)
  - [x] 3.3 Props for overlays: `route?`, `sos?`, `highlightShelterId?`
  - [x] 3.4 Render on `/citizen` with skeleton + error state
  - ✅ `/citizen` shows the Baku road schematic with coloured shelter markers

- [x] **4. Nearest shelters (citizen)**
  - [x] 4.1 `server/engine/geo.ts`: haversine, nearest node
  - [x] 4.2 `GET /api/shelters/nearest?lat&lng` (Zod) → active shelters sorted by distance, with `occupancyPct`
  - [x] 4.3 District `Select` (uses zone center) + "Mənim yerim" button (browser geolocation, falls back to the district)
  - [x] 4.4 Shelter cards: name, type badge, distance, occupancy bar; empty state
  - ✅ Changing district re-sorts the 3 nearest shelters

- [x] **5. Evacuation route**
  - [x] 5.1 `server/engine/routing.ts`: Dijkstra over open edges only
  - [x] 5.2 `server/providers/traffic.provider.ts`: `TrafficProvider` + `SimulatedTrafficProvider` (reads `road_edges`); `GET /api/traffic`
  - [x] 5.3 `routing.service.ts` + `GET /api/route?lat&lng` → `{ shelter, path, distanceM, rerouted, reason }`; picks the nearest reachable shelter <90%
  - [x] 5.4 Draw the route on the map + route card (target shelter, distance, ETA on foot)
  - ✅ The route line is highlighted from the citizen location to the recommended shelter

- [x] **6. Dispatcher dashboard (read-only, live)**
  - [x] 6.1 `dashboard.service.ts` + `GET /api/dashboard` → stats, shelters, teams, SOS in the last 60 min, open alerts, closed edges
  - [x] 6.2 KPI row: active SOS, safe citizens, critical shelters (≥90%), available teams
  - [x] 6.3 CityMap with SOS dots (colour by type)
  - [x] 6.4 Tabs: SOS feed table / Shelters table (occupancy bar) / Teams list (status badge)
  - [x] 6.5 Poll every 3 s; skeleton, empty and error states
  - ✅ `/dispatcher` shows seeded SOS, shelters and teams; editing a row in `db:studio` shows up within 3 s

- [x] **7. Deploy (by ~1:30)**
  - [x] 7.1 Vercel project + `DATABASE_URL` env
  - [x] 7.2 `npm run build` passes locally, deploy
  - ✅ Steps 1–6 work on the production URL

- [x] **8. Simulator panel**
  - [x] 8.1 `simulator.service.ts`; `PATCH /api/traffic/roads/:id` `{status}`; `PATCH /api/shelters/:id` `{occupancy}`
  - [x] 8.2 `Sheet` on `/dispatcher`: road list with open/close toggle, shelter list with occupancy input + quick buttons (+10%, 92%, 96%)
  - [x] 8.3 Toast on each action
  - ✅ Closing a road turns it red on the dispatcher map; setting occupancy recolours the shelter

- [x] **9. Auto-reroute (citizen)**
  - [x] 9.1 `/citizen` re-fetches `/api/route` every 3 s
  - [x] 9.2 Service returns `reason`: `road_closed` (previous path now blocked) or `shelter_full` (≥90%)
  - [x] 9.3 Reroute banner with the reason + old vs new shelter; map updates
  - ✅ Close a road on the route → citizen banner "Yol bağlandı" + new route; set shelter to 92% → "90% dolub" + next shelter

- [x] **10. SOS + "I'm safe"**
  - [x] 10.1 `POST /api/citizens` → uuid stored in localStorage (try/catch)
  - [x] 10.2 `POST /api/sos` `{citizenId, type, lat, lng}` → saves the SOS, citizen status `sos`
  - [x] 10.3 Sticky bottom bar: big red SOS button → dialog with 4 types (Yanğın / Dağıntı / Su basması / Tibbi yardım)
  - [x] 10.4 `PATCH /api/citizens/:id` `{status:'safe'}` + "Təhlükəsizəm" button with a confirmed state
  - ✅ SOS from `/citizen` appears in the dispatcher feed + map within 3 s; "I'm safe" increments the KPI

- [x] **11. Crisis Red Alert engine**
  - [x] 11.1 `server/engine/crisis.ts`: `detectAlerts()`, with cluster = ≥4 distinct citizens within 500 m in the last 5 min, and overload = shelter >95%; skips when an open alert already exists for that zone/shelter
  - [x] 11.2 `alert.service.ts`: run detection after each SOS insert and each occupancy change
  - [x] 11.3 `POST /api/simulate/sos-burst` `{lat,lng,count}` + Simulator button "3 SOS yaxınlıqda"
  - [x] 11.4 Red Alert cards at the top of `/dispatcher` (pulsing red, zone, SOS count, time)
  - ✅ Citizen SOS + burst → Red Alert appears; shelter to 96% → overload alert appears

- [x] **12. One-click approval**
  - [x] 12.1 `POST /api/alerts/:id/approve`: nearest available team → `en_route`; reserve shelter in the zone → `isActive`; the cluster's SOS → `assigned`; alert → `approved` (in one transaction)
  - [x] 12.2 `POST /api/alerts/:id/dismiss`
  - [x] 12.3 Approve / Dismiss buttons with loading state + toast showing what happened
  - ✅ Approve → team badge `en_route`, the new shelter appears on the citizen map and becomes route-able

- [x] **13. Engine unit tests** (15% of the score; `node:test` through `tsx`, no new deps)
  - [x] 13.1 Dijkstra avoids a closed edge
  - [x] 13.2 Route skips a shelter ≥90%
  - [x] 13.3 Cluster fires with 4 distinct citizens in 500 m / 5 min; not with 3, not with 4 from the same citizen, not when >5 min old
  - [x] 13.4 Overload fires above 95%; no duplicate open alert
  - [x] 13.5 `npm test` script
  - ✅ `npm test` is green (terminal)

- [x] **14. Deliverable docs**
  - [x] 14.1 `README.md`: run steps (env, db:push, db:seed, dev), architecture diagram (frontend / API / services / engine / DB / traffic provider), challenge-drop changes section
  - [x] 14.2 `docs/ai-declaration.md`: which AI tools were used, when and how (code, tests, architecture, drops)
  - [x] 14.3 `docs/technical.md`: approach, technologies, security + performance measures, future work
  - ✅ README renders well on GitHub

- [ ] **15. Challenge drops** (fill in when announced; log each change in the README)
  - [ ] **15.1 Drop 1: Priority SOS role (accessible evacuation) + AZ/EN i18n** (details below; additive only, existing flows stay as they are)
    - [ ] 15.1a Schema (additive, all with defaults, then `db:push`): `citizens.role` enum `standard|priority` default `standard`; `road_edges.isAccessible` bool default `true`; `shelters.isAccessible` bool default `true`; `sos_signals.priority` int default `0` (1 = Critical Priority#1)
    - [ ] 15.1b Seed: mark ~6 of 31 edges and 2 of 10 shelters as not accessible (stairs / no ramp), keep the graph connected for accessible-only routing; add ~3 priority citizens; re-run `db:seed`
    - [ ] 15.1c Engine: `routing.ts` gets an optional `{ accessibleOnly }` filter that skips edges with `isAccessible=false` (default off, so `/api/route` without it behaves exactly as today); `GraphEdge` gets `isAccessible?`
    - [ ] 15.1d Services/API: `routing.service` + `GET /api/route?lat&lng&citizenId?` use `accessibleOnly` and skip inaccessible shelters when the citizen is `priority`; `POST /api/citizens` accepts `role`; `POST /api/sos` sets `priority=1` for priority citizens; `GET /api/shelters/nearest` returns `isAccessible`
    - [ ] 15.1e Citizen UI: role toggle "Xüsusi qayğıya ehtiyacım var" (kept in localStorage, try/catch); route card shows an "Əlçatan marşrut" badge; a priority SOS shows "Kritik Prioritet #1" confirmation
    - [ ] 15.1f Dispatcher: priority SOS pinned to the top of the feed with a red "Priority#1" badge; map dot gets a ring; KPI or badge counts priority SOS; crisis detector treats a priority SOS as an alert trigger on its own only if you decide so (default: it counts as 1 normal signal, no change to the rule)
    - [ ] 15.1g i18n: turn `lib/i18n.ts` into `lib/i18n/az.ts` + `en.ts` (same keys, typed from `az`) + a `LanguageProvider`/`useT()` hook with an AZ/EN switch in the header, persisted in localStorage (try/catch), `<html lang>` updated; replace the static `t` imports in `app/**` and `components/**` with `useT()`; server-sent messages (alert text, route `reason`) go out as codes and are translated on the client
    - [ ] 15.1h Check that every UI string is in both dictionaries (a typed `Dictionary` makes a missing key a compile error)
    - ✅ Browser check: switch AZ/EN and every screen changes language; as a priority citizen the route avoids a non-accessible edge and never ends at a non-accessible shelter; the SOS shows Priority#1 on the dispatcher; a standard citizen's route is unchanged
  - [ ] 15.2 13:00 drop: ____ (hooks ready: `TrafficProvider` fallback + "degraded mode" badge for an API outage)
  - [ ] 15.3 14:00 drop: ____ (hooks ready: rate limit on `POST /api/sos`, pagination, indexes for load; dispatcher PIN via `proxy.ts` for security)

- [ ] **16. Polish (demo-polish skill): CODE FREEZE at 3:15**
  - [ ] 16.1 Re-seed to the demo starting state; rehearse the 8-step demo script twice
  - [ ] 16.2 Check every screen's loading / empty / error states, mobile width for `/citizen`
  - ✅ Full demo script runs on production without a hitch

## Decisions

- SVG schematic map instead of Leaflet/Google: no new dependency, no external outage risk.
- 3 s polling instead of WebSockets: simple and robust.
- Anonymous citizens (uuid in localStorage), no auth; dispatcher PIN only if the security drop asks.
- Crisis detection runs synchronously after each write (SOS, occupancy), so no background jobs.
- Pure engine functions in `server/engine/` keep logic testable and easy to explain.
- Tests: unit tests only on the engine, using built-in `node:test` (approved exception to "no tests unless asked").
- Drop 1: accessibility is a flag on edges/shelters and a role on the citizen, so the same Dijkstra serves both users with one filter; no second graph, no new tables.
- Drop 1: i18n is a typed AZ/EN dictionary + client hook, no library; the server returns codes, never display text.
- NOT building: real auth, real map/traffic/geocoding APIs, WebSockets, SMS/push, admin CRUD, AI feature, charts lib, Docker, multi-city.
