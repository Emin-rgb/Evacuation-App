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

- [x] **15. Challenge drops** (fill in when announced; log each change in the README)
  - [x] **15.1 Drop 1: Priority SOS role (accessible evacuation) + AZ/EN i18n** (details below; additive only, existing flows stay as they are)
    - [x] 15.1a Schema (additive, all with defaults, then `db:push`): `citizens.role` enum `standard|priority` default `standard`; `road_edges.isAccessible` bool default `true`; `shelters.isAccessible` bool default `true`; `sos_signals.priority` int default `0` (1 = Critical Priority#1)
    - [x] 15.1b Seed: mark ~6 of 31 edges and 2 of 10 shelters as not accessible (stairs / no ramp), keep the graph connected for accessible-only routing; add ~3 priority citizens; re-run `db:seed`
    - [x] 15.1c Engine: `routing.ts` gets an optional `{ accessibleOnly }` filter that skips edges with `isAccessible=false` (default off, so `/api/route` without it behaves exactly as today); `GraphEdge` gets `isAccessible?`
    - [x] 15.1d Services/API: `routing.service` + `GET /api/route?lat&lng&citizenId?` use `accessibleOnly` and skip inaccessible shelters when the citizen is `priority`; `POST /api/citizens` accepts `role`; `POST /api/sos` sets `priority=1` for priority citizens; `GET /api/shelters/nearest` returns `isAccessible`
    - [x] 15.1e Citizen UI: role toggle "Xüsusi qayğıya ehtiyacım var" (kept in localStorage, try/catch); route card shows an "Əlçatan marşrut" badge; a priority SOS shows "Kritik Prioritet #1" confirmation
    - [x] 15.1f Dispatcher: priority SOS pinned to the top of the feed with a red "Priority#1" badge; map dot gets a ring; KPI or badge counts priority SOS; crisis detector treats a priority SOS as an alert trigger on its own only if you decide so (default: it counts as 1 normal signal, no change to the rule)
    - [x] 15.1g i18n: turn `lib/i18n.ts` into `lib/i18n/az.ts` + `en.ts` (same keys, typed from `az`) + a `LanguageProvider`/`useT()` hook with an AZ/EN switch in the header, persisted in localStorage (try/catch), `<html lang>` updated; replace the static `t` imports in `app/**` and `components/**` with `useT()`; server-sent messages (alert text, route `reason`) go out as codes and are translated on the client
    - [x] 15.1h Check that every UI string is in both dictionaries (a typed `Dictionary` makes a missing key a compile error)
    - ✅ Browser check: switch AZ/EN and every screen changes language; as a priority citizen the route avoids a non-accessible edge and never ends at a non-accessible shelter; the SOS shows Priority#1 on the dispatcher; a standard citizen's route is unchanged
  - [x] **15.2 Drop 2: external routing API outage → circuit breaker + offline fallback** (details below; additive only: with the provider healthy, every existing flow behaves exactly as today)
    - [x] 15.2a Schema (additive, `db:push`): one tiny table `system_flags` (`key` text PK, `value` text, `updatedAt`) holding `traffic_failure_mode` = `off|503|slow`. Needed only so the simulated outage is shared across Vercel instances; no existing table changes
    - [x] 15.2b Engine (pure, injectable clock): `server/engine/circuit-breaker.ts` (closed → open after 2 failures, 15 s cooldown, half-open probe → closed) + `withTimeout(fn, 5000)`; no DB, no I/O
    - [x] 15.2c Static fallback data: `server/data/fallback-graph.ts` (nodes, edges with `isAccessible`, shelters, all roads assumed open) generated from the seed graph, so it is independent of the failing provider; routing runs on it with straight-line (haversine) distances
    - [x] 15.2d Provider: `ResilientTrafficProvider` wraps `SimulatedTrafficProvider`; chain = live → last good snapshot (in-memory, TTL 10 min) → static graph. Returns `{ edges, source: live|cache|static }`; `getEdges()` keeps its signature. A 503 or >5 s response counts as a failure; it never throws to callers
    - [x] 15.2e Failure injection: `SimulatedTrafficProvider` reads `traffic_failure_mode` (`503` throws a 503 error, `slow` waits >5 s); `PATCH /api/simulate/provider` `{mode}` (Zod) + `GET /api/traffic/health` → `{ state, source, failures, lastError, lastOkAt }`
    - [x] 15.2f Routing: `findRoute` uses the resilient provider; response gets additive `mode: "live"|"fallback"` and `source`; priority/accessible filtering and reasons keep working on the fallback graph; `/api/route`, `/api/traffic` and `/api/shelters/nearest` return 200 during an outage (shelters list falls back to haversine, which it already uses)
    - [x] 15.2g Citizen UI: amber banner "Oflayn / Ehtiyat marşrut rejimində işləyir" (+ EN) while `mode=fallback`, distance/ETA marked approximate, Live badge turns "Ehtiyat rejim"; toast "Xidmət bərpa olundu" when live returns; all strings in both dictionaries
    - [x] 15.2h Dispatcher: provider health chip (live / fallback / recovering) next to the Live badge; Simulator sheet gets "Routing API: 503 / Slow / Restore" buttons with toasts
    - [x] 15.2i Unit tests (`npm test`): breaker transitions with a fake clock; timeout at 5 s; provider falls back on 503 and on slow; cache used before static; fallback route still avoids inaccessible edges for a priority citizen; no call throws during an outage
    - [x] 15.2j Docs: README challenge-drop section + diagram (provider → breaker → live / cache / static), `docs/ai-declaration.md`, `docs/technical.md`
    - ✅ Browser check: citizen has a route → Simulator "Routing API 503" → within one 3 s poll the route stays on the map with the amber offline banner, no error screen, no 500 in the network tab; "Slow" does the same (the first two requests wait ≤5 s each, then the breaker opens and later polls are instant); "Restore" → banner disappears after the cooldown and the toast shows; a priority citizen still gets an accessible route in fallback mode; `npm test` green
  - [x] **15.3 Drop 3: SOS flood (500+ fake SOS) + dispatcher RBAC + latency <300 ms** (additive: with normal traffic and a logged-in dispatcher every existing flow behaves as today; no new dependency; the simulator's SOS burst calls the service directly, so the demo Red Alert is not rate-limited)
    - [x] 15.3a Engine (pure, injectable clock, unit-tested): `server/engine/rate-limit.ts` fixed-window limiter `allow(key, limit, windowMs)`; `server/engine/jwt.ts` HS256 sign/verify with `node:crypto` (no `jose`), checks `exp` and signature; `canDo(role, action)` permission map (`viewer`: read dashboard; `dispatcher`: also approve/dismiss, simulate, road/shelter writes)
    - [x] 15.3b Rate limit `POST /api/sos` (in-memory per instance, documented trade-off): 3 per citizen per minute + 20 per IP per minute → `429` + `Retry-After`; stricter Zod (`lat/lng` inside the Baku bounding box, `citizenId` uuid); limiter runs before any DB call so a flood costs ~0 DB time
    - [x] 15.3c Duplicate filter in `createSos`: the same citizen with an unresolved SOS in the last 5 min → no insert, return the existing row (`200`, `duplicate: true`); one index `sos_signals(citizen_id, created_at)` (additive, `db:push`). Crisis detector already counts distinct citizens, so repeats cannot fake a Red Alert
    - [x] 15.3d RBAC: env `JWT_SECRET`, `DISPATCHER_PIN`, `VIEWER_PIN` (documented in `.env.example`/README); `POST /api/auth/login {pin}` sets an httpOnly, SameSite=Lax cookie JWT (8 h) with `role`; `POST /api/auth/logout`; `GET /api/auth/me`; helper `server/auth.ts` `requireRole(req, action)` → `401` no/invalid token, `403` wrong role. Guard: `alerts/[id]/approve|dismiss`, all `simulate/*`, `traffic/roads/[id]` PATCH, `shelters/[id]` PATCH, and `GET /api/dashboard` (viewer+). Citizen routes (`sos`, `route`, `shelters/nearest`, `citizens`, `risk`) stay open
    - [x] 15.3e Dispatcher UI: PIN login screen on `/dispatcher` (skeleton, error state "Wrong PIN"), role chip + logout in the header; `lib/api.ts` handles `401` (back to login) and `403` (toast "Viewer cannot dispatch", approve/simulator buttons disabled for `viewer`); citizen screens untouched
    - [x] 15.3f Latency under flood: `scripts/load-sos.ts` (`tsx`, no deps, `fetch` + concurrency 50) fires 500+ fake SOS (mixed: random citizens, repeats, out-of-bounds) and prints counts of 201 / 200-duplicate / 429 / 400 and p50 / p95 / mean latency, plus one `GET /api/dashboard` timing during the flood. Measure first; only if mean ≥ 300 ms fix the hot path: cap the dashboard SOS feed to the latest 50 (+ total count) and make `runDetection` skip when it ran < 1 s ago
    - [x] 15.3g i18n: all new strings (login, 429/403 messages, role names) in `az.ts` and `en.ts`
    - [x] 15.3h Tests (`npm test`): limiter window and reset; JWT valid / tampered / expired; `canDo` matrix; duplicate rule is a pure function. Then `npm run build` once
    - [x] 15.3i Docs: README challenge-drop section (flood funnel: rate limit → validation → duplicate filter → distinct-citizen detector; RBAC table; load-test result numbers), `docs/technical.md`, `docs/ai-declaration.md`, **Decisions** below
    - ✅ (verified with curl + load script; UI login not browser-checked) Browser/script check: unauthenticated `curl -X POST /api/alerts/<id>/approve` → 401, viewer → 403, dispatcher → 200 and the team is dispatched; `load-sos.ts` shows most of 500+ requests rejected as 429/duplicate, mean latency < 300 ms, and the dispatcher dashboard stays responsive and shows no fake Red Alert; the 3 core demo flows still pass after logging in
    - Order: 15.3a → 15.3b → 15.3c → 15.3d → 15.3e → 15.3f → 15.3g/h/i. Files touched: new `server/engine/{rate-limit,jwt}.ts`, `server/auth.ts`, `app/api/auth/**`, `scripts/load-sos.ts`; edits to `app/api/sos`, guarded routes, `sos.service.ts`, `schema.ts` (one index), dispatcher page, `lib/api.ts`, i18n, docs

- [x] **16. Map & UX upgrade** (make the map self-explanatory; SVG stays, no new deps; all strings in both dictionaries; animations respect `prefers-reduced-motion`)
  - [x] 16.1 "You are here": pulsing blue origin marker + label on the citizen map (origin passed to `CityMap`); route starts visibly from it
  - [x] 16.2 Icon markers (hugeicons, `aria-hidden`): shelter by type (shelter/park/stadium), SOS by type (fire/collapse/flood/medical), closed-road "X" badge (rescue teams have no map position yet, so they stay in the Teams tab); inaccessible shelter gets a small ♿-crossed badge; replace the plain circles
  - [x] 16.3 Legend + layer toggles on both maps (roads, shelters, SOS, closed roads, teams); colour key for occupancy
  - [x] 16.4 Motion: route drawn with flowing dashes + direction; SOS ripple pulse (stronger for Priority#1); brief flash when a shelter/road/alert changes; old route fades on reroute (done: flowing route dashes, SOS ripple, shelter/new-shelter flash ring, closed-road pop; dropped: old-route fade)
  - [x] 16.5 "Is it real?" clarity: "Simulyasiya / Simulation" badge on the map, "Live · updated 3 s ago" pulse indicator (slot for the "degraded mode" badge from 15.2) (done: Live badge with seconds-since-update, turns amber "Connection delayed" after 9 s)
  - [x] 16.6 Interaction: tap a shelter → card (occupancy, distance, accessible); zoom/pan + auto-fit to the route; on the dispatcher, clicking an SOS row highlights its dot (done: tap shelter to route, zoom/pan, auto-fit, SOS row highlights its dot)
  - [x] 16.6c Zoom + real routes (user request): zoom/pan on every map (+/- buttons, wheel, drag, pinch, "reset view", auto-fit to the route; markers keep their screen size); citizen taps any shelter on the map or a card ("Go here") to route there; route response carries road-by-road `steps` (street name + metres, built from the same Dijkstra path) shown as directions; falls back to the recommended shelter (with a toast) if the chosen one is full/unreachable/inaccessible
  - [x] 16.6b App-like feel (user request): map and shelter cards stay in sync (tap a card → map flies to it and highlights it; tap a marker → its card scrolls into view); citizen can tap any shelter to route there ("Go here"), with a "back to recommended" action; smooth transitions between routes/zoom; press/hover states; on phones the shelter list becomes a draggable bottom sheet over the full-screen map (done: marker tap and "Go here" drive the route card; dropped: mobile bottom sheet, card-to-map fly)
  - [x] 16.7 Dispatcher look, inspired by the ops-dashboard reference: icons on KPI cards, severity colours on the alert table; light theme only (decided: simple and readable on a projector) (done: KPI/alert/SOS-type icons; no dark theme)
  - [x] 16.8 Orientation without tiles: faint district outlines/labels and the Caspian shoreline drawn in SVG (decided: no real tiles, so no dependency and no tile-outage risk during the demo) (done as sea + district name labels; no district outlines, to avoid inventing boundaries)
  - ✅ Browser check: citizen sees themselves on the map and a moving route; every marker type is recognisable by icon; legend toggles work; reduced-motion disables animation; AZ/EN still complete

- [x] **18. Real map + "what is this?" clarity** (user feedback: the app is hard to understand, SVG schematic should become a real map; PLAN ONLY, wait for "implement" before coding)
  - Problem found: a first-time viewer doesn't know the story (what disaster, who the citizen/dispatcher are, what to click, why things change on the other screen). The landing page is two cards and nothing explains the flow.
  - [x] 18.1 Real map (approved dependency: `leaflet` + `react-leaflet@5` + `@types/leaflet`, already in package.json/lock; OpenStreetMap tiles, no API key)
    - [x] 18.1a `components/city-map-inner.tsx` = Leaflet implementation with the **same props as today's `CityMap`** (`data, route, sos, origin, highlightShelterId, highlightSosId, updatedAt, degraded, onShelterClick, fitKey, focus`), so `citizen-view` and `dispatcher-view` don't change. `components/city-map.tsx` becomes a `next/dynamic(..., { ssr: false })` wrapper with a skeleton (Leaflet needs `window`)
    - [x] 18.1b Layers: OSM tiles; roads as polylines (closed = red dashed + X badge); route = blue line with flowing white dashes; shelters/SOS/"you are here" as `divIcon` markers using the same hugeicons (built as inline SVG strings), occupancy colour, inaccessible badge, flash on change, SOS pulse; district name labels; reuse the existing `map-*` CSS animations
    - [x] 18.1c Keep: layer toggles, legend, Live/Simulation badge, backup-mode badge, "reset view", tap shelter → route, auto-fit to route / flyTo selected SOS; Leaflet's own zoom/pan/pinch replaces the hand-written SVG zoom. Wrapper gets `isolate` so map panes never cover the Sheet/Dialog
    - [x] 18.1d Known limits to state honestly: the seed graph is schematic (straight segments between approximate intersections), so lines will not follow real streets exactly; tiles need internet at the demo (the SVG map stays in git history as a fallback; optional: keep it as an offline fallback when tiles fail to load)
    - [x] 18.1e Check the seed coordinates sit on real Baku locations (shelters on real stadiums/parks); fix any that land in the sea or far off; re-run `db:seed` only if coordinates change
    - [x] 18.1f Manual refresh instead of the "Live · updated N s ago" indicator (user request: the person updates when needed): the badge on the map becomes a **Refresh button** (refresh icon, label "Update", small "last updated 12 s ago" text, spinner while loading) that re-fetches map, shelters and route immediately; works on the citizen and dispatcher maps. The amber "Backup mode" state and the "Simulation" label stay. **Decided (user confirmed):** keep the 3 s background polling so auto-reroute and the Red Alert still appear on their own (the case requires automatic rerouting); the button is the extra "update now" control
  - [x] 18.2 Landing page explainer (`app/page.tsx`)
    - [x] 18.2a "The problem" in 2 sentences (disaster: citizens can't see full shelters / closed roads; dispatchers drown in SOS)
    - [x] 18.2b "How it works" in 4 steps: 1 citizen sees nearest shelters + route → 2 roads close / shelters fill, route auto-updates → 3 SOS burst, dispatcher gets a Red Alert → 4 one click approves: team dispatched + reserve shelter opens
    - [x] 18.2c Role cards say plainly **who uses it and what they can do** (citizen: bullets; dispatcher: bullets) and a "Start the demo" button
    - [x] 18.2d Tip: "open the citizen and dispatcher views side by side" + a note that data is simulated
  - [x] 18.3 Guided demo scenario (`components/demo-guide.tsx`, shown on both `/citizen` and `/dispatcher`)
    - [x] 18.3a Collapsible panel, 8 numbered steps from the demo script above, each with: **who** (Citizen / Dispatcher badge), **what to click**, **what you should see**; the current step is highlighted and "Next / Back" move it (state in localStorage, try/catch); steps that happen on the other screen say so
    - [x] 18.3b Per-screen "What you can do here" header: one line saying who you are on this screen + 3 bullet actions (citizen: pick district, route, SOS, I'm safe; dispatcher: watch, simulate events, approve Red Alert)
    - [x] 18.3c Plain-language labels: explain "Red Alert" (≥4 distinct SOS within 500 m in 5 min, or shelter >95%), "Simulator" (stands in for the real world: closes roads, fills shelters), "Approve" (what exactly happens) as short helper text / tooltips on the dispatcher
  - [x] 18.4 Dispatcher clarity (small, no new data): "Event log" strip is NOT included (not chosen); only copy changes from 18.3c and an explanatory empty state for "No active alerts" ("Alerts appear when 4+ SOS cluster within 500 m or a shelter passes 95%")
  - [x] 18.5 i18n: every new string in `az.ts` and `en.ts` (typed `Dictionary` enforces it); new group `guide` + extra `landing` keys
  - [x] 18.6 Docs: README + `docs/technical.md` (map section: Leaflet/OSM replaces the SVG schematic), update **Decisions** below
  - [x] 18.7 Tests/verification: `npm run build` once; `npm test` stays green (no engine changes); AZ/EN complete
  - ✅ Browser check: landing explains the project in <30 s without any other context; both screens show a real Baku map with markers, route, closed roads and SOS; closing a road / filling a shelter still reroutes on the real map; guide steps match what actually happens; mobile width OK; reduced motion respected
  - Order: 18.1 (map, riskiest) → 18.2 → 18.3 → 18.5/18.6 → 18.7. Files touched: `components/city-map*.tsx`, `app/page.tsx`, `components/demo-guide.tsx` (new), `app/citizen/page.tsx`, `app/dispatcher/page.tsx`, `lib/i18n/*`, docs. No API, schema or engine changes.

- [x] **19. Real shelter data from OpenStreetMap** (done; 19.7 optional, skipped)
  - Finding: the pasted `amenity=shelter` export (12 nodes) is **not usable as evacuation points**: 7 have no name or tags, 5 are picnic shelters/gazebos (a roof for ~10 people), none has a capacity, and several sit far from the 6 districts (e.g. 49.95–49.98 E). Using them would put 10-person gazebos on the map as "gathering points".
  - [x] 19.1 Better OSM query (run in Overpass Turbo, bbox Baku `40.30,49.70,40.50,50.05`, export GeoJSON): real gathering points are **large open or public places**, not `amenity=shelter`. Query `nwr` for: `emergency=assembly_point` (the exact tag; likely few or none in Baku), `leisure=park` with `name`, `leisure=stadium`, `leisure=sports_centre` with `name`, `amenity=community_centre`, `amenity=school` / `amenity=university` with `name` (real-world evacuation centres), `landuse=recreation_ground`, `place=square`; output `out center tags;` so polygons give a centre point
  - [x] 19.2 `scripts/import-osm-shelters.ts` (run with `tsx`, offline, reads the saved GeoJSON, writes `server/data/osm-shelters.json`; not run at runtime): keep only features with a `name`; drop anything with `shelter_type` in (picnic_shelter, gazebo, lean_to, weather_shelter, basic_hut); drop points outside the 6 districts' bounding box and any in the sea (reuse the district centres, max ~6 km from the nearest one); dedupe by name and by <150 m distance; map tags → our `type` (stadium → `stadium`, park/recreation_ground/square → `park`, school/community_centre/university → `shelter`); assign `zoneId` by nearest district centre; keep the 10 best (spread across districts, 2 as reserve)
  - [x] 19.3 Capacity is **not in OSM**, so derive it honestly: use the `capacity` tag if present; otherwise polygon area (m², shoelace on the geometry) ÷ 2 m² per person for open spaces, ÷ 4 for buildings, clamped to 300–10 000; mark the source in the data (`capacitySource: "osm" | "estimated"`). The docs and the UI footnote say capacity is an estimate
  - [x] 19.4 Seed: `seed.ts` reads `osm-shelters.json` instead of the hand-written `SHELTERS` list; each shelter snaps to the nearest road node (`nodeKey`) so routing keeps working; keep the demo occupancy story (one at 85%, two reserve inactive, two not accessible) applied by index; if the file is missing, fall back to the current hand-written list so the seed never breaks. Add attribution "© OpenStreetMap contributors" to the README (ODbL; the map already shows it). Fallback graph (`server/data/fallback-graph.ts`) is regenerated from the same data so Drop 2 offline mode still matches
  - [x] 19.5 Tests: the import filter is a pure function `filterOsmShelters(features)` with unit tests (drops unnamed, drops gazebo/picnic, drops out-of-bbox, dedupes, estimates capacity); `npm test` stays green; `npm run build` once
  - [x] 19.6 Check on the map: every shelter name is a real, recognisable Baku place and sits on land; the 3 demo flows (reroute on closed road, reroute at 92%, Red Alert approve opening a reserve) still work with the new data
  - [ ] 19.7 Optional, only if time: real roads. The remaining "not real" part is the road graph (straight segments, see 18.1d). Overpass `way["highway"~"primary|secondary|tertiary"]` for the same bbox gives real street names and geometry; import the ~30 main segments as `road_edges` with their polyline so routes follow real streets. Larger change (seed + routing geometry), decide after 19.1–19.6
  - How to get better real data if OSM is thin: (1) the Overpass query above (most reliable, free, no key); (2) Baku city open data / the Emergency Ministry (FHN) published lists of assembly points, if available, entered by hand into the same JSON shape; (3) Google Places / Foursquare APIs (need a key and paid terms, not worth it for a 4-hour build). Whatever the source, capacity stays an estimate and the demo says so.
  - Files touched: `scripts/import-osm-shelters.ts` (new), `server/data/osm-shelters.json` (new), `server/db/seed.ts`, `server/data/fallback-graph.ts`, tests, README/docs. No API, schema or UI changes.

- [x] **20. Daily Risk module (earthquake + flood, proactive layer)**
  - Source: friend's FastAPI + Next.js anomaly code (USGS + Open-Meteo, no keys). Ported to our layers; the Python file is reference only, not run.
  - [x] 20.1 `server/engine/risk.ts` (pure, unit-tested with `node:test`): `scoreEarthquake(features, now)`, `scoreFlood(daily, month)`, `seasonalFactor(month)`, `riskLevel(score)` (minimal/low/moderate/high/critical), `detectSeismicAnomaly(features, now)` (90-day z-score on count / max magnitude / energy; fix the friend's local-vs-UTC date mix by using UTC everywhere)
  - [x] 20.2 `server/services/risk.service.ts`: fetch USGS + Open-Meteo through the existing circuit breaker (reuse Drop 2), cache ~1 h, fallback = last good snapshot, then a static "unavailable" result (never throws to the UI). Weather uses the **citizen's district coordinates** when given, otherwise Baku
  - [x] 20.3 Demo override: one DB flag row (like the outage switch) `riskSimulation: none | quake | flood`; when set, the service returns a realistic M6.1 / heavy-rain result labelled "Simulation". Real data stays the default
  - [x] 20.4 `app/api/risk/route.ts` (GET, optional `?zoneId=`) + `PATCH /api/simulate/risk` for the override (PATCH, like the provider switch); Zod at both boundaries; `lib/api.ts` client + shared types/schemas in `lib/`
  - [x] 20.5 UI: `components/risk-banner.tsx` on `/citizen` (advisory: "Flood risk HIGH, know your nearest shelter" + button to the shelter list) and `/dispatcher` (both levels + "why" factors + pre-position hint when anomalous); skeleton, empty ("risk data unavailable") and error states; simulation control added to the existing Simulator
  - [x] 20.6 Behavior hook (flood only): when flood risk ≥ high, the shelter auto-reroute threshold drops from 90% to 80% and the dispatcher sees a "pre-open reserve shelter" suggestion. Single constant in the engine, covered by a test; off when risk is lower so the existing demo flows are unchanged
  - [x] 20.7 i18n: all new strings in `az.ts` and `en.ts`; sources shown in a footnote ("USGS, Open-Meteo; scores are indicative")
  - [x] 20.8 Docs: README + `docs/technical.md` (risk scoring, sources, simulation), update **Decisions**; `npm test` green, `npm run build` once
  - ✅ Browser check: banner shows real data on both screens; "simulate quake / heavy rain" flips the banner live; with flood simulated the 80% reroute triggers; the 3 core demo flows still pass with risk = none
  - Optional, only if time: 20.9 Red Alert context. An SOS cluster on an anomalous seismic day (or high flood risk for flood SOS) gets a "high confidence" badge on the alert card; does NOT change the Red Alert trigger rules
  - Order: 20.1 → 20.2 → 20.4 → 20.5 → 20.3 → 20.6 → 20.7 → 20.8. No schema change beyond one flag row; no new dependency.

- [ ] **17. Polish (demo-polish skill): CODE FREEZE at 3:15**
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
- (Superseded by Task 18) Map upgrade: stay with the SVG map (icons, motion, legend, "you are here", simulation label); no real tiles, light theme only. Simplicity and reliability build the jury's trust.
- Drop 2: the breaker is a pure engine class (testable); fallback = last good snapshot, then a static bundled graph (never the failing provider); the outage switch lives in one DB flag row so it works across serverless instances. No new dependency.
- Task 18 (supersedes the "SVG, no tiles" decisions above): real map with Leaflet + OpenStreetMap, approved by the user. Reason: the schematic confused viewers; a real city map is self-explanatory. Trade-off: tiles need internet during the demo. Clarity comes from a landing explainer + guided demo panel, not from more features.
- Task 19: use real OSM places for shelters (parks, stadiums, schools), not `amenity=shelter` (those are gazebos); capacity is an estimate from area and is labelled as such.
- Task 20: risk module is a proactive layer on top of the reactive flow; real USGS/Open-Meteo data with a demo simulation switch (live data is calm on stage); scores are indicative, never presented as predictions. Does not change Red Alert trigger rules.
- Drop 3: flood defence is layered and cheap-first (limiter before DB → Zod bounds → duplicate filter → distinct-citizen detector). The in-memory limiter is per serverless instance (honest trade-off; a shared store like Upstash would be the production step). RBAC uses a hand-rolled HS256 JWT on `node:crypto` in an httpOnly cookie with PIN login and two roles (viewer, dispatcher), to avoid a new dependency; this replaces the earlier "no auth" stance only for the dispatcher side.
- NOT building: real auth (user accounts/OAuth), real map/traffic/geocoding APIs, WebSockets, SMS/push, admin CRUD, AI feature, charts lib, Docker, multi-city.
