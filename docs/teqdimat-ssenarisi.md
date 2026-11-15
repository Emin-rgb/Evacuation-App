# Münsiflərə təqdimat ssenarisi (7 dəqiqə) və texniki suallar

**Canlı ünvan:** <https://evacuation-baku.vercel.app> · **Swagger:** `/api-docs.html` · **Kod:** <https://github.com/KamranPirishzade/evacuation-baku>

---

## 0. Başlamazdan əvvəl (2 dəqiqə, təqdimatdan əvvəl)

| # | Nə etməli | Niyə |
| - | --------- | ---- |
| 1 | `npm run db:seed` (demo vəziyyətini sıfırlayır, simulyator açarlarını söndürür) | Təmiz başlanğıc, "oflayn rejim" qalıq açarı olmasın |
| 2 | İki brauzer pəncərəsi yan-yana: **sol** `/citizen` (kiçik, telefon eni), **sağ** `/dispatcher` | Hər iki tərəfi eyni anda göstərmək |
| 3 | Sağ pəncərədə əvvəlcədən daxil olun: `nigar@dac.az` / `dispatcher123`, **Simulyator**-u bağlı saxlayın | Girişi canlı yazıb vaxt itirməmək |
| 4 | Ayrıca tab: `/api-docs.html` (Swagger), README-dəki arxitektura diaqramı, `docs/erd.md` | Suallar üçün hazır |
| 5 | Terminalı hazır saxlayın: `SPREAD=1 npx tsx scripts/load-sos.ts https://evacuation-baku.vercel.app 600 50` | Drop 3 yük testini göstərmək |
| 6 | Ehtiyat: lokal `npm run dev` (http://localhost:3000) açıq olsun | İnternet/Vercel problemi olsa keçmək üçün |
| 7 | Dil: **AZ** seçili qalsın | Axıcı demo |

> **Dəyişməyin:** demo rayonu **Nərimanov**, bağlanan yol **Tbilisi yolu**. Yasamal və Xətai-də ən yaxın məntəqə başlanğıc düyünündədir, orada yol bağlamaq marşruta təsir etmir.

---

## 1. 7 dəqiqəlik axın

### 0:00–0:45 | Problem və həll (açılış səhifəsi)

**Göstərin:** `/` səhifəsi (problem + "Necə işləyir" 4 addım).

**Deyin:** *"Zəlzələ və ya sel zamanı vətəndaş hansı sığınacağın dolu, hansı yolun bağlı olduğunu görmür; dispetçerlər isə SOS selində itir. Biz iki modullu bir sistem qurduq: vətəndaş canlı mənzərəni görür və marşrutu avtomatik dəyişir; dispetçer isə qərarı bir kliklə icra edir. Çətin hissəni (klasteri tapmaq, doludan qaçmaq, yolu yenidən hesablamaq) sistem edir."*

### 0:45–1:45 | Vətəndaş modulu

**Göstərin (sol pəncərə):** rayon olaraq **Nərimanov** seçin.

**Nə görünür:** 3 ən yaxın məntəqə, doluluq zolaqları, xəritədə mavi marşrut, "Gündəlik risk" paneli (açılıb-bağlanır).

**Deyin:** *"Vətəndaş rayon seçir (və ya 'Mənim yerim'). Sistem onu ən yaxın yol düyününə bağlayır, Dijkstra ilə yalnız açıq yollar üzərində ən yaxın boş məntəqəni seçir. Doluluq faizi canlıdır. Risk paneli real USGS və Open-Meteo məlumatıdır, indikativdir."*

### 1:45–2:45 | Avtomatik alternativ marşrut

1. **Sağ:** Simulyator → *Yollar* → **Tbilisi yolu** → **Bağla**.
2. **Sol (3 saniyə ərzində):** "Yol bağlandı" xəbərdarlığı, marşrut **Bakı Olimpiya Stadionu**na dəyişir.
3. **Sağ:** Simulyator → *Məntəqələr* → hədəf məntəqəni **92%** edin → **Təyin et**. **Sol:** "Məntəqə 90% dolub", marşrut növbəti məntəqəyə.

**Deyin:** *"Marşrut hər 3 saniyədə yenidən yoxlanılır. Server səbəbi mətn deyil kodla göndərir (`road_closed`, `shelter_full`), tərcüməni müştəri edir."*

### 2:45–3:45 | SOS → Qırmızı Həyəcan → bir klik

1. **Sol:** **SOS** → *Tibbi yardım*. **Sağ:** SOS siyahısında və xəritədə görünür.
2. **Sağ:** Simulyator → **"4 SOS yaxınlıqda"**.
3. **Sağ:** yanıb-sönən **Qırmızı Həyəcan** kartı çıxır: *"Əlavə Xilasetmə Briqadası Göndər və Yeni Toplanış Nöqtəsi Aç"*. **Təsdiq** düyməsini basın.
4. **Nəticə:** ən yaxın briqada **"Yolda"** olur, toast "Təsdiq edən: Nigar Huseynova" göstərir, ehtiyat məntəqə vətəndaş xəritəsində (≤6 san) görünür.

**Deyin:** *"Qayda: 5 dəqiqədə, 500 m-də ən azı 4 FƏRQLİ vətəndaş. Eyni nəfərin təkrarı sayılmır. Təsdiq tək atomik tranzaksiyadır: həyəcan, briqada, ehtiyat məntəqə və SOS-lar birlikdə yenilənir, ona görə yarımçıq vəziyyət olmur."*

### 3:45–4:15 | Məntəqə həddən artıq dolu və "Təhlükəsizəm"

- **Sağ:** bir məntəqəni **96%** edin → ikinci həyəcan növü (**məntəqə yüklənməsi**; qayda: 95%-dən **çox**).
- **Sol:** **Təhlükəsizəm** → **Sağ:** "Təhlükəsiz vətəndaşlar" sayı artır.

### 4:15–5:00 | Drop 1: Xüsusi qayğı və AZ/EN

- **Sol:** *"Xüsusi qayğıya ehtiyacım var"* açarını yandırın → marşrut yalnız **əlçatan** yollar/məntəqələr üzərində qurulur (əlçatan olmayan **ADA Universiteti** keçilir, **Əlçatan marşrut** nişanı). **SOS** göndərsəniz **Kritik Prioritet #1** olur və dispetçerdə başda qırmızı nişanla görünür.
- **Hər iki pəncərədə AZ → EN** düyməsi: bütün interfeys dəyişir.

**Deyin:** *"Əlçatanlıq ikinci qraf deyil, eyni qrafda bayraqdır: Dijkstra-ya `accessibleOnly` filtri verilir. Dil üçün tipli lüğət var, açar çatışmasa kompilyasiya xətası verir."*

### 5:00–5:40 | Drop 2: Xarici marşrut API-si çökür

- **Sağ:** Simulyator → *Xarici marşrut API* → **503 xətası**.
- **Sol:** çökmə yoxdur; sarı **"Oflayn / Ehtiyat marşrut rejimində işləyir"** bannerı, marşrut davam edir (məsafə "təxmini").
- **Sağ:** **Bərpa et** → ~15 saniyə sonra "Xidmət bərpa olundu".

**Deyin:** *"Circuit breaker: 2 ardıcıl xətadan sonra açılır, 15 san gözləyir, sınaq sorğusu göndərir. Zəncir: canlı → son yaxşı snapshot → statik lokal qraf. 5 saniyədən uzun cavab da xəta sayılır. Heç bir halda istisna yuxarı atılmır."*

### 5:40–6:30 | Drop 3: saxta SOS axını və təhlükəsizlik

1. **Terminal:** yük testini işə salın (`SPREAD=1 npx tsx scripts/load-sos.ts ...`). Nəticə: 600 sorğunun ~350-450-si **429**, dublikatlar **200**, sərhəddən kənar **400**; **dispetçer paneli bloklanmır, saxta həyəcan yaranmır**.
2. **Sağ:** *Çıxış* → **supervisor@dac.az / supervisor123** ilə daxil olun: təsdiq və Simulyator düymələri söndürülüb (API `403`). Sonra yenə dispetçer kimi daxil olun.

**Deyin:** *"Qatlar ucuzdan bahaya: IP limiti, Zod və Bakı sərhədi, vətəndaş limiti, dublikat filtri, sonra yalnız fərqli vətəndaşları sayan qayda. Rədd olunan sorğu bazaya toxunmur. Dispetçer əməliyyatları JWT cookie və rol ilə qorunur; parollar scrypt ilə hash-lənir; 5 yanlış cəhddən sonra hesab 5 dəqiqə bloklanır."*

### 6:30–7:00 | Arxitektura və yekun

**Göstərin:** README-dəki arxitektura diaqramı.

**Deyin:** *"Qatlı arxitektura: UI → API → servis → təmiz mühərrik → DB. Mühərrik I/O etmir, ona görə 68 unit test ilə örtülüb; API üçün 21 yoxlamalı smoke test də var. Yeni drop-lar mövcud kodu pozmadan əlavə edildi: yeni qayda mühərrikə, yeni xarici mənbə provayderə, yeni rol `rbac.ts`-ə. Kod yazmaqda Claude Code, sənədlərdə Gemini köməkçi idi; qərarlar və yoxlama komandanındır. Zəif tərəfimizi də açıq deyirik: yol xətləri hələ real küçələri izləmir, bunu OSM yol məlumatı ilə həll etmək növbəti addımdır."*

---

## 2. Münsiflərin verə biləcəyi texniki suallar və cavablar

### Arxitektura və kod

**Niyə Next.js (tək proyekt) və niyə bu qat bölgüsü?**
4 saatda UI və API-ni bir yerdə, tip təhlükəsizliyi ilə qurmaq üçün. Qaydalar: `UI → lib/api.ts → route → servis → mühərrik/provayder → DB`, yalnız aşağıya idxal. DB-yə yalnız servislər toxunur, mühərrik I/O etmir. Kompromis: backend ayrıca miqyaslandırılmır.

**Challenge drop-lara necə elastik uyğunlaşdınız?**
Hər drop əlavə (additive) oldu: Drop 1 `role` və `is_accessible` bayraqları + `accessibleOnly` filtri; Drop 2 provayder sarğısı (breaker + keş + statik) və bir DB açarı; Drop 3 `rate-limit`, `rbac`, `jwt` mühərrik faylları və route-larda `guard()`. Mövcud axınlar dəyişmədi.

**Verilənlər bazası nədir?**
PostgreSQL (Neon) + Drizzle ORM, 10 cədvəl (`docs/erd.md`). Enum-lar, xarici açarlar və 3 indeks var (`created_at`, `zone_id`, `(citizen_id, created_at)`).

### Alqoritmlər

**Marşrutu necə hesablayırsınız?**
Vətəndaşın nöqtəsi ən yaxın yol düyününə bağlanır; Dijkstra yalnız **açıq** seqmentlərdə işləyir; doluluğu eşikdən (90%, sel riski yüksək olanda 80%) çox və əlçatmaz məntəqələr keçilir; `piyada girişi + qraf məsafəsi + piyada çıxışı` minimumu seçilir. Qraf 20 düyün/31 seqmentdir, O(V²) kifayətdir, böyük şəhər üçün heap lazımdır.

**Qırmızı Həyəcan qaydası necə işləyir?**
Son 5 dəqiqənin həll olunmamış SOS-ları götürülür, hər siqnal mərkəz kimi yoxlanılır, 500 m-də **fərqli vətəndaşların** sayı ≥4 isə həyəcan yaranır. Məntəqə üçün doluluq **95%-dən çox** olmalıdır (95% özü yox). Açıq həyəcanı olan rayon üçün yenisi yaranmır.

**Niyə "fərqli vətəndaş" sayırsınız?**
Bir nəfərin düyməni təkrar basması saxta həyəcan yaratmasın deyə. Üstəlik dublikat filtri və limitlər də var.

**İki dispetçer eyni anda təsdiq etsə?**
Təsdiq tək `db.batch` (atomik) əməliyyatdır və yalnız `open` həyəcanda işləyir; ikincisi `409` alır.

**Alternativ marşrutun səbəbini necə bilirsiniz?**
Müştəri əvvəlki məntəqəni `prev` kimi göndərir. Hədəf dəyişib və köhnə dolu/qeyri-aktivdirsə `shelter_full`, əks halda `road_closed`; hədəf eyni, amma yol bütün yolların açıq olduğu yoldan fərqlidirsə `road_closed` (dolanma).

### Dayanıqlılıq (Drop 2)

**Circuit breaker necə işləyir?**
Closed → ardıcıl 2 xəta → Open (15 san) → Half-open (bir sınaq sorğusu) → uğurludursa Closed. 503 və 5 saniyədən uzun cavab xəta sayılır. Ehtiyat zənciri: canlı → son yaxşı snapshot (TTL 10 dəq, bağlı yollar saxlanır) → statik lokal qraf. Kəsinti açarı DB-dədir ki, bütün serverless instansiyalarda eyni işləsin.

**"Xarici API" real deyil?**
Düzdür: simulyasiya olunmuş provayderdir (case "simulyasiya olunmuş yol-nəqliyyat endpointi"nə icazə verir). Provayder interfeysi sayəsində real OSRM/Google ilə əvəz etmək asandır.

### Təhlükəsizlik və yük (Drop 3)

**Saxta SOS-lardan necə qorunursunuz?**
IP limiti (20/dəq) → Zod (Bakı koordinat sərhədi) → vətəndaş limiti (3/dəq) → dublikat filtri (5 dəq) → fərqli vətəndaş qaydası. Rədd olunan sorğu DB-yə toxunmur.

**Limiter niyə yaddaşdadır?**
Sadəlik üçün; serverless instansiya başınadır, paylanmış hücumda hədd instansiyalar üzrə çoxala bilər. İstehsalda Redis/Upstash və ya kənar rate limit. Dublikat filtri və fərqli vətəndaş qaydası yenə də qoruyur.

**JWT-ni niyə özünüz yazdınız?**
Yeni asılılıq əlavə etməmək üçün `node:crypto` ilə HS256; `alg:none`, dəyişdirilmiş və vaxtı keçmiş token rədd olunur; cookie httpOnly + SameSite=Lax. Kompromis: sessiya ləğvi/yenilənməsi yoxdur.

**Parollar və hesablar?**
scrypt (təsadüfi duz), sabit vaxtlı müqayisə; yanlış e-poçt və yanlış parol eyni `401` və təxminən eyni müddət; 5 yanlış cəhddən sonra 5 dəq bloklama; IP və e-poçt üzrə rate limit. Rollar: `dispatcher` (hər şey), `supervisor` (yalnız oxuma). Ayrıca admin paneli, qeydiyyat, parol sıfırlama yoxdur.

**Gecikmə < 300 ms necə təmin olunur və nə qədərdir?**
SOS yazısı 2 DB gediş-gəlişi, Qırmızı Həyəcan aşkarlaması cavabdan **sonra** (`after()`), tək-uçuş; dashboard SOS siyahısı 100 ilə məhdud, KPI `count()` ilə. **Ölçmə:** lokalda orta **99–140 ms**. Canlı saytda mənim maşınımdan 600 sorğuda orta **332 ms** (p50 204 ms) çıxdı; bu rəqəm internet gecikməsini də daxil edir (hətta DB-siz statik fayl da bu maşından 0,4–0,9 san cavab verir), ona görə server tərəfi gecikməsi bundan aşağıdır, lakin onu ayrıca ölçməmişik. **Bunu açıq deyin.**

### Real vaxt, test, miqyas

**Niyə WebSocket yox?** 3 saniyəlik polling sadə və etibarlıdır; kompromis: kiçik gecikmə və artıq sorğu. Növbəti addım: SSE/WebSocket.

**Test?** 68 unit test (`npm test`: marşrut, böhran qaydaları, breaker, risk, rate limit, JWT, parol, RBAC), API üçün `scripts/smoke-test.ts` (21 yoxlama, canlı saytda keçib), yük testi `scripts/load-sos.ts`. UI testləri avtomatlaşdırılmayıb.

**Miqyaslanma?** Serverless funksiyalar üfüqi miqyaslanır; DB üçün indekslər və məhdud siyahılar; marşrut üçün heap Dijkstra və real qraf; limiter üçün paylanmış saxlama; aşkarlama üçün rayon üzrə bölgü.

### AI və məlumat

**AI-dan necə istifadə etdiniz?**
Claude Code kod, test və sənədlərdə; Gemini sənədlərin hazırlanmasında köməkçi. Qərarlar, hədlər, əhatə və yoxlama komandanındır; hər tapşırıq ayrıca commit və qəbul yoxlaması ilə. Məhsulda AI funksiyası yoxdur (`docs/ai-beyannamesi.md`).

**Məlumat real-dır?**
Məntəqələr OpenStreetMap-dən real yerlərdir (park, stadion, universitet); **tutumlar təxminidir** (OSM-də yoxdur, sahədən hesablanır və bu açıq yazılıb). Briqada adları, doluluq və əlçatanlıq bayraqları uydurmadır. Risk modulu real USGS/Open-Meteo, lakin indikativdir.

**Gizlilik?**
Vətəndaşlar anonim UUID-dir; ad, telefon, cihaz identifikatoru toplanmır; yer məlumatı yalnız SOS/paylaşma zamanı saxlanır.

---

## 3. Zəif tərəflər: soruşsalar dürüst cavab

| Sual | Cavab |
| ---- | ----- |
| "Xəritədə marşrut xətləri küçələri izləmir?" | Doğrudur. Qraf yalnız 20 düyün/31 düz seqmentdir; bəzi məntəqələr yol düyününə 5 km-ə qədər məsafədən bağlanır (Olimpiya Stadionu 4,9 km). Məntiq (Dijkstra, bağlı yol, eşik, səbəb) düzgün işləyir, **həndəsə** isə sxematikdir. Plan: OSM Overpass-dan real yol şəbəkəsi, məntəqələri qrafa < 300 m ilə bağlamaq, real polyline, rejimə görə ETA. |
| "ETA niyə 71 dəqiqə?" | Yalnız piyada (80 m/dəq) hesablanır, nəqliyyat/təcili rejimi yoxdur. |
| "Briqada `on_scene` olur?" | Yox: statusu `en_route`-dan sonra dəyişən endpoint/UI yoxdur; SOS `resolved` də eyni. Plan 23.3. |
| "Eyni zona **və ya** 500 m?" | Yalnız 500 m radius qaydasını həyata keçirmişik. |
| "Dispetçer paneli mobildə?" | `/citizen` mobil üçün yoxlanılıb; geniş dispetçer paneli əsasən masaüstü üçündür, mobil yoxlaması tamamlanmayıb. |
| "Test örtüyü?" | Mühərrik unit-testləri güclüdür; UI/e2e testlər yoxdur. |
| "Hesab idarəetməsi?" | Hesablar seed ilə; qeydiyyat, parol sıfırlama, MFA, sessiya ləğvi yoxdur. |

Bütün siyahı: `README.md` bölmə 11 və `PLAN.md` Tapşırıq 23.

---

## 4. Ehtiyat plan

| Problem | Həll |
| ------- | ---- |
| Vercel/internet işləmir | Lokal `npm run dev`; xəritə plitələri üçün internet lazımdır, yoxsa məlumat yenə də işləyir |
| Qırmızı Həyəcan çıxmır | "4 SOS yaxınlıqda" düyməsini bir də basın (açıq həyəcanı olan rayonda təkrar yaranmır, əvvəlcə **Təsdiq**/**Rədd** edin) |
| Marşrut "ehtiyat rejimdə" qalıb | Simulyator → **Bərpa et**, 15 san gözləyin; və ya `npm run db:seed` |
| Giriş bloklanıb (5 yanlış cəhd) | `npm run db:seed` bloku sıfırlayır; və ya başqa dispetçer hesabı (`rauf@dac.az`) |
| Vətəndaş SOS-u "429" verir | Eyni IP-dən dəqiqədə 20 limit; 1 dəqiqə gözləyin |
| Demo yarımçıq qaldı | `npm run db:seed`, səhifələri yeniləyin |

## 5. Yadda saxlanacaq rəqəmlər

| Məsələ | Dəyər |
| ------ | ----- |
| Qırmızı Həyəcan | **4** fərqli vətəndaş · **500 m** · **5 dəq** · məntəqə **>95%** |
| Alternativ marşrut | məntəqə **≥90%** (sel riski yüksəkdə 80%) · yoxlama hər **3 san** |
| Circuit breaker | **2** xəta → open · **15 san** gözləmə · timeout **5 san** · keş **10 dəq** |
| SOS qorunması | IP **20/dəq** · vətəndaş **3/dəq** · dublikat pəncərəsi **5 dəq** |
| Giriş | **5** yanlış cəhd → **5 dəq** blok · JWT **8 saat** |
| Gecikmə | lokal **99–140 ms**; canlı (mənim maşınımdan) **332 ms** orta, p50 204 ms |
| Test | **68** unit test · **21** API yoxlaması · **21** endpoint · **10** cədvəl |
| Hesablar | `nigar@dac.az`, `rauf@dac.az` (`dispatcher123`) · `supervisor@dac.az` (`supervisor123`) |
