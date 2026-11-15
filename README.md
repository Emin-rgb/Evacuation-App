# Fövqəladə Hallar və Şəhər Təhlükəsizlik Şəbəkəsi
### Vətəndaş SOS Monitorinqi və Dinamik Təxliyə Sistemi (*Urban Crisis & Crowd Evacuation Engine*)

Digital Azerbaijan Challenge finalı üçün 4 saatlıq işlək prototip. Zəlzələ, sel və ya digər fövqəladə hallarda vətəndaş ən yaxın boş toplanış məntəqəsini və təhlükəsiz təxliyə marşrutunu görür, bir kliklə SOS göndərir; dispetçer isə SOS-ları, məntəqələrin doluluğunu və briqadaları canlı paneldə izləyir, **Qırmızı Həyəcanı** bir kliklə təsdiqləyir.

> **Canlı demo:** <https://evacuation-baku.vercel.app> · **Vətəndaş:** [/citizen](https://evacuation-baku.vercel.app/citizen) · **Dispetçer:** [/dispatcher](https://evacuation-baku.vercel.app/dispatcher) · **API sənədləri (Swagger):** <https://evacuation-baku.vercel.app/api-docs.html>

---

## Mündəricat

1. [Problem və həll](#1-problem-və-həll)
2. [Funksiyalar](#2-funksiyalar)
3. [Sistem arxitekturası](#3-sistem-arxitekturası)
4. [İşə salma təlimatı](#4-işə-salma-təlimatı)
5. [Demo ssenarisi](#5-demo-ssenarisi)
6. [API və Swagger](#6-api-və-swagger)
7. [Verilənlər bazası (ERD)](#7-verilənlər-bazası-erd)
8. [Challenge Drop-lara uyğunlaşma](#8-challenge-drop-lara-uyğunlaşma)
9. [Test və keyfiyyət](#9-test-və-keyfiyyət)
10. [Yerləşdirmə (Deploy)](#10-yerləşdirmə-deploy)
11. [Məlum problemlər və qalan işlər](#11-məlum-problemlər-və-qalan-işlər)
12. [Sənədlər və mənbələr](#12-sənədlər-və-mənbələr)

---

## 1. Problem və həll

Fövqəladə hallarda vətəndaşlar hansı toplanış məntəqəsinin nə qədər dolu olduğunu və hansı yolun bağlı olduğunu görə bilmir; dispetçerlər isə çoxsaylı SOS siqnalını emal edib briqadaları ən kritik nöqtələrə yönləndirməkdə çətinlik çəkir.

**Həllimiz** iki modullu bir sistemdir: vətəndaş eyni canlı mənzərəni görür (məntəqə doluluğu, bağlı yollar, avtomatik alternativ marşrut), dispetçer isə qərarı bir kliklə icra edir. Çətin hissəni (SOS klasterini aşkarlamaq, doludan qaçmaq, yolu yenidən hesablamaq) sistem avtomatlaşdırır.

## 2. Funksiyalar

### Modul 1: Vətəndaş (`/citizen`, mobil üçün optimallaşdırılıb)

- Rayon seçimi və ya koordinat üzrə **ən yaxın toplanış məntəqələri** (Sığınacaq / Park / Stadion) və onların **cari doluluq faizi**.
- **Tövsiyə olunan təxliyə marşrutu** xəritədə (məsafə, təxmini vaxt, küçə-küçə istiqamətlər).
- **Avtomatik alternativ marşrut:** marşrutdakı yol bağlananda və ya hədəf məntəqə **90%** dolanda marşrut hər 3 saniyədə yenidən yoxlanılır və səbəb göstərilir ("Yol bağlandı" / "Məntəqə 90% dolub").
- **Bir kliklə SOS** (Yanğın / Dağıntı / Su basması / Tibbi yardım) və **"Təhlükəsizəm"** statusu.
- **Xüsusi qayğıya ehtiyacı olan vətəndaş (Prioritet SOS):** SOS avtomatik *Kritik Prioritet #1* olur, marşrut yalnız əlçatan (panduslu, maneəsiz) yollar və məntəqələr üzərində qurulur.
- **AZ / EN** dil keçidi (bütün interfeys).
- Gündəlik risk paneli (zəlzələ və sel; USGS və Open-Meteo, indikativ).

### Modul 2: Dispetçer (`/dispatcher`, e-poçt və parol ilə giriş)

- Canlı panel (3 san yenilənmə): aktiv SOS, təhlükəsiz vətəndaşlar, kritik məntəqələr, boş briqadalar, real Bakı xəritəsi.
- **Qırmızı Həyəcan** avtomatik yaranır:
  - eyni zonada / 500 m radiusda 5 dəqiqə ərzində ən azı **4 fərqli** vətəndaşdan SOS, **və ya**
  - hər hansı məntəqənin doluluğu **95%-dən çox**.
- **Bir kliklə təsdiq:** "Əlavə Xilasetmə Briqadası Göndər və Yeni Toplanış Nöqtəsi Aç". Ən yaxın briqada `en_route` olur, ehtiyat məntəqə açılır və vətəndaş xəritəsində görünür. Təsdiq edən istifadəçi qeyd olunur.
- **Simulyator** (demo üçün): yolu bağla/aç, məntəqə doluluğunu dəyiş, yaxınlıqda SOS yarat, xarici marşrut API-sini "çökdür", zəlzələ/sel riskini simulyasiya et.
- Rollar: `dispatcher` (hər şey) və `supervisor` (yalnız oxuma).

### Profillər və rollar

| Profil | Giriş | Nə edə bilər | Harada |
| ------ | ----- | ------------ | ------ |
| **Vətəndaş** (standart) | Giriş yoxdur, anonim UUID | Məntəqələrə və marşruta baxır, SOS göndərir, "Təhlükəsizəm" | `/citizen` |
| **Vətəndaş, xüsusi qayğı** | Giriş yoxdur; "Xüsusi qayğıya ehtiyacım var" açarı | Yuxarıdakılar + SOS avtomatik *Kritik Prioritet #1*, yalnız əlçatan marşrut | `/citizen` |
| **Supervisor** | `supervisor@dac.az` / `supervisor123` | Dispetçer panelini **yalnız oxuyur** (təsdiq və simulyator düymələri söndürülüb, API 403 qaytarır) | `/dispatcher` |
| **Dispetçer** (admin səviyyəli rol) | `nigar@dac.az` və ya `rauf@dac.az` / `dispatcher123` | Hər şey: Qırmızı Həyəcanı təsdiq/rədd, Simulyator, yol və məntəqə dəyişikliyi | `/dispatcher` |

Ayrıca "admin" rolu yoxdur: ən yüksək səlahiyyətli profil **dispetçerdir**. Hesab idarəetmə paneli, qeydiyyat və parol sıfırlama hələ yoxdur (bax [bölmə 11](#11-məlum-problemlər-və-qalan-işlər), #13).

## 3. Sistem arxitekturası

```mermaid
flowchart LR
    subgraph BR["Brauzer: Frontend (Next.js 16 App Router, React, Tailwind v4, shadcn/ui, Leaflet)"]
        direction TB
        P2["/citizen"]
        P3["/dispatcher"]
        CL["lib/api.ts"]
        P2 --> CL
        P3 --> CL
    end
    subgraph BE["Backend: Next.js Route Handlers (app/api/**)"]
        direction TB
        RH["Route handler-lər + Zod"]
        AU["JWT cookie + RBAC (server/auth.ts)"]
        SV["Servislər (server/services)"]
        EN["Təmiz mühərrik: routing, crisis, risk, circuit-breaker"]
        PV["Traffic provider (Xarici Marşrut API-si simulyasiyası)"]
        RH --> AU
        RH --> SV --> EN
        SV --> PV
    end
    DB[("Verilənlər bazası:<br/>PostgreSQL (Neon) + Drizzle ORM")]
    X1["USGS API"]
    X2["Open-Meteo API"]
    X3["OpenStreetMap tile"]
    CL -- "HTTP/JSON" --> RH
    SV --> DB
    PV --> DB
    SV --> X1
    SV --> X2
    BR --> X3
```

| Qat | Texnologiya | Harada |
| --- | ----------- | ------ |
| Frontend | Next.js 16, React, TypeScript, Tailwind v4, shadcn/ui, Leaflet | `app/`, `components/` |
| Backend | Next.js Route Handlers + servis qatı + Zod | `app/api/**`, `server/services/` |
| Mühərrik | Təmiz funksiyalar (I/O yoxdur, unit-test olunur) | `server/engine/` |
| Verilənlər bazası | PostgreSQL (Neon), Drizzle ORM | `server/db/` |
| Xarici API-lər | USGS, Open-Meteo, OSM; simulyasiya olunmuş marşrut/trafik API-si | `server/providers/`, `server/services/risk.service.ts` |

**Qat qaydası (yalnız aşağıya idxal):** `UI → lib/api.ts → app/api route → servis → mühərrik/provayder → DB`. Yalnız servislər verilənlər bazasına toxunur. Bu, *challenge drop* kimi dəyişikliklərə açıqdır: yeni qayda mühərrikə, yeni xarici mənbə provayderə, yeni rol `rbac.ts`-ə əlavə olunur, digər qatlar toxunulmaz qalır.

Daha çox diaqram (ardıcıllıq, circuit breaker, flood müdafiəsi, RBAC, status maşınları, deploy): [`docs/diaqramlar.md`](docs/diaqramlar.md).

## 4. İşə salma təlimatı

**Tələblər:** Node.js 20+, npm, PostgreSQL verilənlər bazası (biz [Neon](https://neon.tech) istifadə edirik; DB klienti onun HTTP drayveri üçün yazılıb). Docker tələb olunmur: layihə birbaşa Node runtime-da işləyir.

```bash
# 1. Asılılıqları quraşdırın
npm install

# 2. Mühit dəyişənlərini hazırlayın
cp .env.example .env.local
#    .env.local faylında doldurun:
#    DATABASE_URL=postgresql://istifadəçi:parol@host/dbname?sslmode=require
#    JWT_SECRET=<uzun təsadüfi mətn>     (lokalda boş qala bilər, istehsalda məcburidir)

# 3. Cədvəlləri yaradın
npm run db:push

# 4. Demo məlumatını və hesabları yükləyin
npm run db:seed

# 5. İşə salın
npm run dev
```

Brauzerdə <http://localhost:3000> açın. Ən yaxşı demo üçün iki pəncərə yan-yana: `/citizen` (telefon eni) və `/dispatcher`.

### Mühit dəyişənləri

| Dəyişən | Məcburi | Təyinat |
| ------- | ------- | ------- |
| `DATABASE_URL` | bəli | Postgres bağlantı sətri (tətbiq, `drizzle-kit` və seed istifadə edir) |
| `JWT_SECRET` | istehsalda | Dispetçer sessiya cookie-sini imzalayan gizli açar (lokalda sabit ehtiyat dəyər işləyir) |
| `DATABASE_URL_UNPOOLED` | xeyr | Birbaşa (pul olmayan) bağlantı, `.env.example`-da qeyd olunub |

### Skriptlər

| Komanda | Nə edir |
| ------- | ------- |
| `npm run dev` | İnkişaf serveri |
| `npm run build` | İstehsal build-i (tip yoxlaması daxil) |
| `npm start` | Build olunmuş tətbiqi işə salır |
| `npm test` | Mühərrik unit testləri (`node:test`, 68 test) |
| `npm run lint` | ESLint |
| `npm run db:push` | `server/db/schema.ts` sxemini DB-yə tətbiq edir |
| `npm run db:seed` | Demo məlumatını sıfırlayıb yükləyir, simulyator açarlarını söndürür, hesabları silmir |
| `npm run db:studio` | Drizzle Studio ilə cədvəllərə baxış |
| `SPREAD=1 npx tsx scripts/load-sos.ts <url> 600 50` | SOS flood yük testi (orta gecikməni ölçür) |

> **Diqqət:** lokal və canlı mühit **eyni verilənlər bazasından** istifadə edirsə, `db:seed` hər ikisinin demo vəziyyətini sıfırlayır.

### Demo hesabları (`npm run db:seed` yaradır)

| E-poçt | Parol | Ad | Rol |
| ------ | ----- | -- | --- |
| `nigar@dac.az` | `dispatcher123` | Nigar Huseynova | dispatcher |
| `rauf@dac.az` | `dispatcher123` | Rauf Aliyev | dispatcher |
| `supervisor@dac.az` | `supervisor123` | Leyla Supervisor | supervisor |

Parollar `scrypt` ilə hash-lənmiş saxlanılır. 5 yanlış cəhddən sonra hesab 5 dəqiqə bloklanır. Bunlar yalnız demo üçündür: tətbiq real istifadəyə çıxarsa dəyişdirin və ya silin.

## 5. Demo ssenarisi

İki pəncərə yan-yana: `/citizen` və `/dispatcher` (`nigar@dac.az` / `dispatcher123` ilə daxil olun, sonra Simulyatoru açın).

1. **Vətəndaş:** rayon olaraq **Nərimanov** seçir. 3 ən yaxın məntəqə doluluq zolaqları ilə görünür və ən yaxınına marşrut çəkilir.
2. **Simulyator:** **Tbilisi yolu**nu bağlayın. 3 saniyə ərzində vətəndaş "Yol bağlandı" xəbərdarlığı və yeni marşrut görür.
3. **Simulyator:** hədəf məntəqəni **92%** edin. Vətəndaş növbəti məntəqəyə yönləndirilir ("Məntəqə 90% dolub").
4. **Vətəndaş:** SOS → *Tibbi yardım*. Dispetçerin SOS siyahısında və xəritədə görünür.
5. **Simulyator:** "Yaxınlıqda 3 SOS". **Qırmızı Həyəcan** kartı çıxır.
6. **Dispetçer:** **Təsdiq**. Ən yaxın briqada `en_route` olur, ehtiyat məntəqə açılır və vətəndaş xəritəsində (6 saniyə ərzində) görünür.
7. **Simulyator:** bir məntəqəni **96%** edin. İkinci həyəcan növü (məntəqə həddən artıq dolu) çıxır.
8. **Vətəndaş:** "Təhlükəsizəm". Dispetçerdə "təhlükəsiz vətəndaşlar" sayı artır.

Sıfırlamaq üçün: `npm run db:seed`. (Yasamal və Xətai-də ən yaxın məntəqə başlanğıc düyünündə yerləşir, buna görə yol bağlamaq orada marşruta təsir etmir: demo üçün Nərimanov seçilib. Bax [bölmə 11](#11-məlum-problemlər-və-qalan-işlər).)

## 6. API və Swagger

- **Swagger UI:** canlı: <https://evacuation-baku.vercel.app/api-docs.html>, lokal: <http://localhost:3000/api-docs.html>. Swagger interfeysi CDN-dən yüklənir, ona görə internet lazımdır.
- **OpenAPI 3.0 spesifikasiyası:** [`public/openapi.yaml`](public/openapi.yaml) (21 endpoint).
- Xəta formatı həmişə `{ "error": "mesaj" }`; statuslar: `400` (yanlış giriş), `401` (sessiya yox), `403` (rol kifayət etmir), `404`, `409` (həyəcan artıq emal olunub), `423` (hesab bloklanıb), `429` (limit), `500`.

| Metod | Yol | Giriş | Təyinat |
| ----- | --- | ----- | ------- |
| GET | `/api/zones` | açıq | Rayonlar |
| GET | `/api/map` | açıq | Düyünlər, yollar, aktiv məntəqələr |
| GET | `/api/shelters/nearest` | açıq | Ən yaxın məntəqələr + doluluq % |
| GET | `/api/route` | açıq | Təxliyə marşrutu, səbəb kodu, `mode` (live/fallback) |
| POST | `/api/citizens` · PATCH `/api/citizens/:id` | açıq | Anonim vətəndaş, "Təhlükəsizəm", rol |
| POST | `/api/sos` | açıq (limitli) | SOS (201, dublikat 200, limit 429) |
| GET | `/api/risk` | açıq | Gündəlik risk |
| GET | `/api/traffic` · `/api/traffic/health` | açıq | Yol seqmentləri · circuit breaker vəziyyəti |
| POST | `/api/auth/login` · `/logout` · GET `/me` | — | Giriş / çıxış / cari istifadəçi |
| GET | `/api/dashboard` | supervisor+ | Canlı panel |
| POST | `/api/alerts/:id/approve` · `/dismiss` | dispatcher | Qırmızı Həyəcanı təsdiq / rədd |
| PATCH | `/api/traffic/roads/:id` · `/api/shelters/:id` | dispatcher | Yol / doluluq (simulyator) |
| POST/PATCH | `/api/simulate/sos-burst` · `/provider` · `/risk` | dispatcher | Simulyator |

## 7. Verilənlər bazası (ERD)

10 cədvəl: `zones`, `road_nodes`, `road_edges`, `shelters`, `citizens`, `sos_signals`, `alerts`, `rescue_teams`, `users`, `system_flags`.

```mermaid
erDiagram
    ZONES ||--o{ SHELTERS : ""
    ZONES ||--o{ CITIZENS : ""
    ZONES ||--o{ SOS_SIGNALS : ""
    ZONES ||--o{ ALERTS : ""
    ZONES ||--o{ RESCUE_TEAMS : ""
    ROAD_NODES ||--o{ SHELTERS : "yol düyünü"
    ROAD_NODES ||--o{ ROAD_EDGES : "from / to"
    CITIZENS ||--o{ SOS_SIGNALS : "göndərir"
    SHELTERS |o--o{ ALERTS : "overload"
    ALERTS |o--o{ RESCUE_TEAMS : "yönləndirilib"
    USERS |o--o{ ALERTS : "təsdiq edən"
```

Sütunlar, indekslər və izahlarla tam diaqram: [`docs/erd.md`](docs/erd.md).

## 8. Challenge Drop-lara uyğunlaşma

Sistem qatlı və modulyar yazıldığı üçün hər üç dəyişiklik mövcud axınları pozmadan, əlavə (additive) şəkildə daxil edildi.

### Drop 1: "Xüsusi qayğı" (Prioritet SOS) rolu və AZ/EN dil

- **Rol:** `citizens.role = priority`. Bu vətəndaşın SOS-u avtomatik `priority = 1` (*Kritik Prioritet #1*) alır, dispetçer panelində siyahının başında qırmızı *Priority#1* nişanı ilə sabitlənir.
- **Əlçatan marşrut:** yol seqmentləri və məntəqələr `is_accessible` bayrağı daşıyır. Dijkstra-ya əlavə `accessibleOnly` filtri verilir (ikinci qraf yoxdur), prioritet vətəndaş üçün əlçatan olmayan seqmentlər və məntəqələr atlanır. Standart vətəndaşın marşrutu dəyişmir.
- **i18n:** tipli lüğət `lib/i18n/az.ts` və `en.ts` (açar çatışmazlığı kompilyasiya xətasıdır), `useT()` hook-u, başlıqdakı AZ/EN düyməsi, seçim `localStorage`-da saxlanılır. Server mətn yox, **kod** göndərir; tərcüməni müştəri edir.

### Drop 2: Xarici xəritə/marşrut API-sinin kəsintisi (503 və ya > 5 san)

```
findRoute → trafficProvider
  └─ CircuitBreaker (2 xəta → open, 15 san gözləmə, half-open yoxlama) + 5 san timeout
        ├─ live    SimulatedTrafficProvider (road_edges)            → mode "live"
        ├─ cache   son yaxşı snapshot (TTL 10 dəq, bağlı yollar saxlanır) → mode "fallback"
        └─ static  server/data/fallback-graph.ts (lokal ehtiyat qraf) → mode "fallback"
```

- Sistem **çökmür** (unhandled exception yoxdur): breaker + timeout, sonra lokal ehtiyat məlumatla hesablama.
- İstifadəçi "Oflayn / Ehtiyat marşrut rejimində işləyir" xəbərdarlığını görür; xidmət bərpa olanda bildiriş çıxır.
- Dispetçerdə provayder sağlamlıq nişanı və Simulyatorda "Routing API: 503 / Slow / Restore" düymələri var. Kəsinti açarı DB-də (`system_flags`) saxlanılır ki, bütün serverless instansiyalarda eyni işləsin.

### Drop 3: SOS Flood (500+ saxta SOS), RBAC və gecikmə < 300 ms

- **Saxta SOS-a qarşı qatlar** (ucuzdan bahaya): IP üzrə rate limit (20/dəq) → Zod (Bakı koordinat sərhədi) → vətəndaş üzrə limit (3/dəq) → **dublikat filtri** (5 dəq ərzində həll olunmamış SOS varsa yenisi yazılmır) → Qırmızı Həyəcan yalnız **fərqli vətəndaşları** sayır, buna görə təkrarlar saxta həyəcan yarada bilmir. Rədd edilən sorğu DB-yə toxunmur.
- **JWT / RBAC:** e-poçt + parol ilə giriş → httpOnly cookie-də HS256 JWT (`node:crypto`, yeni asılılıq yoxdur). Təsdiq/rədd, simulyator və yol/məntəqə dəyişikliyi yalnız `dispatcher` üçündür (sessiya yoxdursa 401, `supervisor` üçün 403). Parollar `scrypt` ilə hash-lənir, 5 uğursuz cəhddən sonra hesab 5 dəq bloklanır, təsdiq edən istifadəçi `alerts.handled_by`-da qeyd olunur.
- **Gecikmə:** SOS yazısı 2 DB gediş-gəlişinə endirildi, Qırmızı Həyəcan aşkarlaması cavabdan **sonra** (`after()`) tək-uçuş rejimində işləyir. Lokal ölçmə (`scripts/load-sos.ts`, 600 sorğu, 50 paralel): ~450 sorğu `429`, **orta gecikmə 99–140 ms**, saxta sorğular dispetçer panelini bloklamır.

## 9. Test və keyfiyyət

- `npm test` → **68 unit test** (`node:test` + `tsx`): marşrutlaşdırma (bağlı yol, 90% eşik, əlçatanlıq), Qırmızı Həyəcan qaydaları (4 fərqli SOS / 500 m / 5 dəq, 95% həddi, təkrarlanmama), circuit breaker (saxta saat ilə keçidlər, timeout, keş → statik), risk hesablaması, OSM filtri, rate limiter, JWT (saxta/vaxtı keçmiş/`alg:none`), parol hash-i, bloklama, RBAC matrisi, dublikat filtri.
- Əsas funksionallıq və üç drop API səviyyəsində skriptlə də yoxlanılıb (nəticələr texniki sənəddə, bölmə 11).
- Arxitektura qaydaları: `@/` alias, hər API sərhəddində Zod, UI-də yükləmə/boş/xəta halları.

## 10. Yerləşdirmə (Deploy)

Canlı ünvan: <https://evacuation-baku.vercel.app>. Vercel-də yerləşdirilir. Layihənin mühit dəyişənlərində `DATABASE_URL` və `JWT_SECRET` təyin edin, `npm run build`-in lokal keçdiyini yoxlayın, sonra deploy edin. Verilənlər bazasına qarşı bir dəfə `npm run db:push` və `npm run db:seed` işlədin (demo vəziyyətini sıfırlamaq üçün `db:seed`-i təkrar edin).

## 11. Məlum problemlər və qalan işlər

Aşağıdakılar hazırkı vəziyyətin dürüst siyahısıdır. Hər birinin planı `PLAN.md`-də (Tapşırıq 22–23) var.

### Marşrut (ən vacib qalan iş)

| # | Problem | Təsir |
| - | ------- | ----- |
| 1 | Məntəqələr yol düyünlərinə **5 km-ə qədər** məsafədən "bağlanır" (Olimpiya Stadionu 4,9 km, Zığ şossesi 5,1 km, Dəmiryolçular Parkı 1,7 km, BDU 1,5 km) | Marşrutun son hissəsi uzun **düz xətt**dir, məsafəyə və vaxta daxil edilir |
| 2 | Qraf yalnız **20 düyün / 31 seqment**dir; xətlər düz seqmentlərdir (real küçə həndəsəsi yoxdur), seqment uzunluğu düyünlər arası düz məsafədir | Xətt su və ya binalardan keçə bilər, marşrut "küçələri izləmir" |
| 3 | Rayon mərkəzindən ən yaxın düyünə piyada hissə 1 km-ə çatır (Nərimanov 1024 m) | İlk seqment də düz xətdir |
| 4 | Yasamal və Xətai-də ən yaxın məntəqə başlanğıc düyünündədir | Yol bağlamaq marşruta təsir etmir (demo Nərimanov ilə aparılır) |
| 5 | ETA yalnız piyada (80 m/dəq); 5 km marşrut ~70 dəq | Nəqliyyat / təcili yardım rejimi yoxdur |
| 6 | Dijkstra O(V²) | 20 düyün üçün problem deyil, real şəhər qrafı üçün heap lazımdır |
| 7 | Əlçatanlıq (`is_accessible`) məlumatı uydurmadır (6/31 seqment, 2/10 məntəqə) | Real panduslu yollar deyil |

**Plan:** OSM Overpass-dan real yol həndəsəsi idxal etmək (məntəqələri qrafa < 300 m-ə bağlamaq, seqmentləri real polyline kimi çəkmək, uzunluğu real hesablamaq), ETA-nı rejimə görə hesablamaq.

### Digər

| # | Problem |
| - | ------- |
| 8 | SOS-un `resolved` və briqadanın `on_scene` statusunu dəyişən endpoint/UI yoxdur (briqada `en_route`-da qalır) |
| 9 | Dispetçer paneli yalnız **açıq** həyəcanları göstərir (emal olunmuş həyəcan tarixçəsi yoxdur) |
| 10 | Case-də "eyni zona **və ya** 500 m radius" deyilir; yalnız 500 m radius qaydası həyata keçirilib |
| 11 | Real GPS Bakı sərhədindən (40.2–40.6 N, 49.5–50.2 E) kənardadırsa SOS `400` qaytarır |
| 12 | Rate limiter instansiya başınadır (paylaşılmır); istehsalda Upstash/Redis tövsiyə olunur |
| 13 | Hesablar seed ilə yaradılır: qeydiyyat, parol sıfırlama, MFA, token ləğvi yoxdur |
| 14 | Canlı yenilənmə 3 san polling ilə (WebSocket yoxdur); vətəndaş xəritəsi 6 san-də bir yenilənir |
| 15 | Yalnız mühərrik unit-test olunub; API/UI inteqrasiya testləri avtomatlaşdırılmayıb (skriptlər əllə işlədilib) |
| 16 | Brauzerdə mobil görünüş, konsol xətaları və bütün yükləmə/boş/xəta hallarının son əl yoxlaması tamamlanmayıb |
| 17 | AZ/EN seçimi səbəbindən konsolda "hydration mismatch" xəbərdarlıqları ola bilər (funksionallığı pozmur) |
| 18 | `npm run build` zamanı DB-yə prerender cəhdi qeyri-kritik `Failed query` log-ları yaradır (build uğurludur) |
| 19 | "Xarici marşrut API-si" simulyasiyadır (real OSRM/Google yoxdur); məntəqə tutumları OSM-də olmadığı üçün **təxminidir**; briqada adları və doluluq uydurmadır |
| 20 | Swagger UI CDN-dən yüklənir (internet lazımdır); Docker faylı yoxdur |

## 12. Sənədlər və mənbələr

| Sənəd | Məzmun |
| ----- | ------ |
| [`docs/Texniki-Izah-Senedi.docx`](docs/Texniki-Izah-Senedi.docx) | **Texniki izah sənədi (Word):** yanaşma, texnologiyalar, alqoritmlər, təhlükəsizlik, performans, test, məhdudiyyətlər, gələcək inkişaf |
| [`docs/diaqramlar.md`](docs/diaqramlar.md) | Arxitektura, ardıcıllıq, circuit breaker, flood müdafiəsi, RBAC, status maşınları, deploy |
| [`docs/erd.md`](docs/erd.md) | Verilənlər bazasının ER diaqramı və cədvəl izahı |
| [`public/openapi.yaml`](public/openapi.yaml) | OpenAPI 3.0 spesifikasiyası (Swagger: `/api-docs.html`) |
| [`docs/ai-beyannamesi.md`](docs/ai-beyannamesi.md) | Süni intellekt istifadəsi haqqında bəyannamə |
| [`PLAN.md`](PLAN.md) | Tapşırıq planı, qərarlar, qalan işlər |

**Məlumat mənbələri:** © OpenStreetMap contributors (ODbL), toplanış məntəqələri və xəritə plitələri · USGS Earthquake Hazards Program və Open-Meteo (açarsız, pulsuz, risk modulu).
