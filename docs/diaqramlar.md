# Arxitektura və axın diaqramları

Bütün diaqramlar [Mermaid](https://mermaid.js.org) ilə yazılıb; GitHub və əksər Markdown baxıcılarında avtomatik çəkilir. Verilənlər bazasının ER diaqramı ayrıca [`erd.md`](erd.md) faylındadır, API spesifikasiyası isə [`public/openapi.yaml`](../public/openapi.yaml) (Swagger: `/api-docs.html`).

## 1. Ümumi sistem arxitekturası

Frontend, backend, verilənlər bazası və xarici API-lər:

```mermaid
flowchart LR
    subgraph BR["Brauzer (Frontend: Next.js 16 App Router, React, Tailwind v4, shadcn/ui, Leaflet)"]
        direction TB
        P1["/  (açılış səhifəsi)"]
        P2["/citizen  (Vətəndaş modulu)"]
        P3["/dispatcher  (Dispetçer modulu)"]
        CL["lib/api.ts  (fetch sarğıları)"]
        P1 --> CL
        P2 --> CL
        P3 --> CL
    end

    subgraph BE["Backend (Next.js Route Handlers: app/api/**, Vercel serverless)"]
        direction TB
        RH["Route Handler-lər<br/>Zod ilə doğrulama, status kodları"]
        AU["server/auth.ts<br/>JWT cookie + RBAC guard"]
        RL["Rate limit / dublikat filtri<br/>(server/engine)"]
        SV["Servis qatı<br/>server/services/*.service.ts"]
        EN["Təmiz mühərrik (I/O yoxdur)<br/>routing, crisis, geo, risk, circuit-breaker"]
        PV["server/providers/traffic.provider.ts<br/>(simulyasiya olunmuş Xarici Marşrut API-si)"]
        RH --> AU
        RH --> RL
        RH --> SV
        SV --> EN
        SV --> PV
    end

    DB[("PostgreSQL (Neon)<br/>Drizzle ORM<br/>server/db/schema.ts")]
    X1["USGS Earthquake API"]
    X2["Open-Meteo API"]
    X3["OpenStreetMap xəritə plitələri"]

    CL -- "HTTP / JSON" --> RH
    SV --> DB
    PV --> DB
    SV -- "circuit breaker + 5 s timeout" --> X1
    SV -- "circuit breaker + 5 s timeout" --> X2
    BR -- "tile sorğuları" --> X3
```

**Qat qaydası (yalnız aşağıya idxal):** `səhifə/komponent → lib/api.ts → app/api route → servis → mühərrik/provayder → DB`. UI heç vaxt `server/` qovluğundan idxal etmir; DB-yə yalnız servislər toxunur; mühərrik heç bir I/O etmir (buna görə unit-test edilə bilir).

## 2. Texnologiya yığını

| Qat | Texnologiya |
| --- | ----------- |
| Frontend | Next.js 16 (App Router), React, TypeScript, Tailwind CSS v4, shadcn/ui, Leaflet + OpenStreetMap, Hugeicons |
| Backend | Next.js Route Handlers (`app/api/**`), servis qatı, Zod |
| Verilənlər bazası | PostgreSQL (Neon, HTTP drayver), Drizzle ORM |
| Təhlükəsizlik | HS256 JWT (`node:crypto`), `scrypt` parol hash-i, rate limit, RBAC |
| Test | `node:test` + `tsx` (68 unit test) |
| Deploy | Vercel + Neon |

## 3. Əsas axın: SOS → Qırmızı Həyəcan → Təsdiq

```mermaid
sequenceDiagram
    autonumber
    actor V as Vətəndaş (4 nəfər)
    participant API as POST /api/sos
    participant S as sos.service
    participant DB as PostgreSQL
    participant K as crisis.ts (mühərrik)
    actor D as Dispetçer
    participant AP as POST /api/alerts/:id/approve

    V->>API: SOS (növ, koordinat)
    API->>API: IP limiti → Zod → vətəndaş limiti
    API->>S: createSos()
    S->>DB: dublikat yoxla + SOS yaz (paralel)
    API-->>V: 201 Created (cavab dərhal qayıdır)
    Note over API,K: after(): cavabdan SONRA, tək-uçuş (single-flight)
    API->>K: son 5 dəq-nin SOS-ları + məntəqələr
    K-->>DB: 500 m-də ≥4 FƏRQLİ vətəndaş → alert (sos_cluster)
    D->>D: canlı panel (3 san) Qırmızı Həyəcanı göstərir
    D->>AP: Təsdiq (bir klik)
    AP->>DB: atomik db.batch: alert=approved, briqada=en_route, ehtiyat məntəqə=active, SOS=assigned, handled_by
    AP-->>D: 200 {briqada, məntəqə, approvedBy}
    V->>V: vətəndaş xəritəsi 6 san-də yeni məntəqəni göstərir
```

## 4. Avtomatik alternativ marşrut

```mermaid
sequenceDiagram
    autonumber
    participant UI as Vətəndaş UI (hər 3 san)
    participant R as GET /api/route
    participant RS as routing.service
    participant PV as traffic provider
    participant E as routing.ts (Dijkstra)

    UI->>R: lat, lng, prev (əvvəlki məntəqə), citizenId
    R->>RS: findRoute()
    RS->>PV: getEdgesWithMeta()  (canlı → keş → statik)
    RS->>E: shortestPaths(yalnız AÇIQ yollar, prioritetdirsə yalnız əlçatan)
    E-->>RS: məsafələr
    RS->>E: pickShelter(doluluq ≥ 90% olanları keç)
    alt hədəf dəyişib
        RS-->>UI: rerouted=true, reason = shelter_full | road_closed
    else eyni məntəqə, amma yol fərqli
        RS-->>UI: rerouted=true, reason = road_closed (dolanma)
    else dəyişiklik yoxdur
        RS-->>UI: rerouted=false
    end
    UI->>UI: banner: "Yol bağlandı" / "Məntəqə 90% dolub" + yeni xətt
```

Server mətn yox, **kod** (`road_closed`, `shelter_full`) göndərir; tərcüməni (AZ/EN) müştəri edir.

## 5. Circuit breaker və oflayn ehtiyat rejimi (Drop 2)

```mermaid
stateDiagram-v2
    [*] --> Closed
    Closed --> Open: ardıcıl 2 xəta (HTTP 503 və ya > 5 san)
    Open --> HalfOpen: 15 san gözləmə bitdi
    HalfOpen --> Closed: yoxlama sorğusu uğurlu
    HalfOpen --> Open: yoxlama sorğusu uğursuz
    Closed: Closed — canlı API
    Open: Open — sorğu göndərilmir
    HalfOpen: Half-open — bir sınaq sorğusu
```

```mermaid
flowchart LR
    A["findRoute()"] --> B{"Circuit breaker"}
    B -- "Closed / sınaq" --> C["Canlı provayder<br/>(road_edges)"]
    C -- "uğurlu" --> OK["mode = live"]
    C -- "503 / > 5 san" --> D{"Son yaxşı snapshot var?<br/>(TTL 10 dəq)"}
    B -- "Open" --> D
    D -- "bəli" --> E["keş: bağlı yollar saxlanır<br/>mode = fallback"]
    D -- "xeyr" --> F["Statik qraf<br/>server/data/fallback-graph.ts<br/>mode = fallback"]
```

İstifadəçi çökmə görmür: "Oflayn / Ehtiyat marşrut rejimində işləyir" xəbərdarlığı çıxır, məsafə/ETA təxmini işarələnir.

## 6. Saxta SOS axınından (SOS Flood) müdafiə (Drop 3)

```mermaid
flowchart TD
    A["POST /api/sos (500+ saxta sorğu)"] --> B{"IP limiti<br/>20 / dəq"}
    B -- "aşıb" --> X1["429 + Retry-After<br/>(DB-yə toxunmur)"]
    B -- "ok" --> C{"Zod: UUID + Bakı<br/>koordinat sərhədi"}
    C -- "yanlış" --> X2["400"]
    C -- "ok" --> D{"Vətəndaş limiti<br/>3 / dəq"}
    D -- "aşıb" --> X1
    D -- "ok" --> E{"Dublikat filtri<br/>5 dəq-də həll olunmamış SOS?"}
    E -- "bəli" --> X3["200 duplicate:true<br/>(yeni sətir yazılmır)"]
    E -- "xeyr" --> F["INSERT sos_signals"]
    F --> G["cavab 201"]
    G --> H["after(): tək-uçuş aşkarlama"]
    H --> I{"FƏRQLİ vətəndaş sayı ≥ 4<br/>(500 m, 5 dəq)"}
    I -- "bəli" --> J["Qırmızı Həyəcan"]
    I -- "xeyr" --> K["həyəcan yoxdur"]
```

Yüklə test: `SPREAD=1 npx tsx scripts/load-sos.ts http://localhost:3000 600 50` (SPREAD botnet kimi müxtəlif IP simulyasiya edir). Lokal nəticə: 600 sorğunun ~450-i `429`, orta gecikmə **99–140 ms** (hədəf < 300 ms).

## 7. Autentifikasiya və RBAC

```mermaid
sequenceDiagram
    autonumber
    actor D as Dispetçer
    participant L as POST /api/auth/login
    participant U as user.service
    participant DB as users cədvəli
    participant G as guard() / canDo()
    participant A as POST /api/alerts/:id/approve

    D->>L: e-poçt + parol
    L->>L: IP və e-poçt üzrə rate limit
    L->>U: verifyLogin()
    U->>DB: istifadəçi + scrypt yoxlaması (sabit vaxtlı)
    alt 5 uğursuz cəhd
        U-->>D: 423 Locked (5 dəq)
    else uğurlu
        L-->>D: httpOnly cookie dac_session (HS256 JWT, 8 saat: sub, name, role)
    end
    D->>A: sorğu + cookie
    A->>G: JWT-ni yoxla, rolu yoxla
    alt cookie yoxdur
        G-->>D: 401
    else supervisor
        G-->>D: 403
    else dispatcher
        G-->>A: icazə
        A-->>D: 200 + approvedBy
    end
```

| Əməliyyat | Sessiyasız | supervisor | dispatcher |
| --------- | ---------- | ---------- | ---------- |
| Vətəndaş: məntəqə, marşrut, SOS, "Təhlükəsizəm" | bəli | bəli | bəli |
| `GET /api/dashboard` | 401 | bəli | bəli |
| Təsdiq / rədd, simulyator, yol və məntəqə dəyişikliyi | 401 | 403 | bəli |

## 8. Status maşınları

```mermaid
stateDiagram-v2
    direction LR
    state "Həyəcan (alert)" as A {
        [*] --> open
        open --> approved: Təsdiq (dispetçer)
        open --> dismissed: Rədd
    }
    state "SOS siqnalı" as S {
        [*] --> new
        new --> assigned: həyəcan təsdiqlənəndə
        assigned --> resolved: (hələ endpoint/UI yoxdur)
    }
    state "Briqada" as T {
        [*] --> available
        available --> en_route: təsdiqdə
        en_route --> on_scene: (hələ endpoint/UI yoxdur)
    }
    state "Vətəndaş" as C {
        [*] --> unknown
        unknown --> sos: SOS göndərdi
        unknown --> safe: Təhlükəsizəm
        sos --> safe: Təhlükəsizəm
    }
```

## 9. Yerləşdirmə (Deployment)

```mermaid
flowchart LR
    U1["Vətəndaş (telefon brauzeri)"] --> VC
    U2["Dispetçer (masaüstü brauzer)"] --> VC
    subgraph VC["Vercel"]
        FE["Statik səhifələr + JS"]
        FN["Serverless funksiyalar<br/>app/api/**"]
    end
    FN -- "Neon HTTP drayveri (@neondatabase/serverless)" --> NE[("Neon PostgreSQL")]
    FN --> US["USGS"]
    FN --> OM["Open-Meteo"]
    U1 --> OSM["OSM tile server"]
    U2 --> OSM
```

Mühit dəyişənləri: `DATABASE_URL` (məcburi), `JWT_SECRET` (istehsalda məcburi). Lokal işə salma üçün: bax [`README.md`](../README.md).

## 10. Qovluq strukturu

```
app/                 səhifələr (/, /citizen, /dispatcher) + app/api/** route handler-lər
components/          UI: citizen-view, dispatcher-view, city-map, risk-banner, simulator-panel ...
lib/                 api.ts (fetch), schemas.ts (Zod), types.ts, i18n/{az,en}.ts
server/
  auth.ts            JWT cookie, guard(), RBAC
  db/                schema.ts, index.ts, seed.ts
  engine/            routing, crisis, geo, risk, circuit-breaker, rate-limit, jwt, password, rbac, lockout ...
  services/          *.service.ts (bir fayl = bir domen)
  providers/         traffic.provider.ts (simulyasiya olunmuş xarici marşrut API-si)
  data/              OSM məntəqələri, statik ehtiyat qrafı
public/              openapi.yaml, api-docs.html (Swagger UI)
scripts/             import-osm-shelters.ts, load-sos.ts
tests/               *.test.ts (node:test)
docs/                sənədlər (bu qovluq)
```
