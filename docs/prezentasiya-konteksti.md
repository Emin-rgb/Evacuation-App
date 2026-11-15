# Təqdimat üçün tam kontekst (Claude-a verin)

> **İstifadə qaydası:** bu faylın **bütün məzmununu** Claude-a yapışdırın (və ya fayl kimi əlavə edin). Aşağıdakı "Claude üçün tapşırıq" hissəsi onu nə edəcəyini deyir. Sonra istədiyiniz formatı yazın (məs. "PowerPoint slayd mətni", "Gamma/Canva üçün", "hər slayd üçün natiq mətni").

---

## 0. Claude üçün tapşırıq (prompt)

```
Aşağıdakı kontekst əsasında 7 dəqiqəlik bir təqdimat hazırla (Azərbaycan dilində).
Təqdimat Digital Azerbaijan Challenge finalında münsiflər qarşısındadır.
İstəyirəm:
1. Pitch deck üslubunda 9 slayd + canlı demo bölməsi (bölmə 11.2-yə uyğun): hər slayd üçün başlıq, ən çox 3-4 qısa bənd, (varsa) rəqəm və hansı şəkil/diaqram qoyulacağı.
2. Hər slayd üçün natiq mətni (sadə dildə, danışıq tərzində, 30-45 saniyə).
3. Vizual təklif: rəng palitrası, şrift, ikon üslubu (fövqəladə hal mövzusuna uyğun, təmiz və peşəkar).
4. Sonda münsiflərin verə biləcəyi 10 sual və qısa cavablar.
Münsiflərin qiymətləndirmə meyarlarına (bölmə 11.1) və vaxt bölgüsünə əməl et. Yalnız kontekstdəki faktlardan istifadə et, rəqəm və xüsusiyyət uydurma. Zəif tərəfləri dürüst göstər.
Təqdimat canlı demo ilə birləşəcək: demo slaydlarında "Burada canlı demo göstərilir" yaz və demo addımlarını qısa yaz.
```

---

## 1. Layihənin bir cümləlik təsviri

**Fövqəladə Hallar və Şəhər Təhlükəsizlik Şəbəkəsi** (*Urban Crisis & Crowd Evacuation Engine*): zəlzələ, sel kimi hallarda vətəndaşa ən yaxın **boş** toplanış məntəqəsini və təhlükəsiz təxliyə marşrutunu göstərən, dispetçerə isə SOS-ları canlı izləməyə və **Qırmızı Həyəcanı bir kliklə təsdiq etməyə** imkan verən 4 saatlıq işlək sistem.

- **Canlı ünvan:** https://evacuation-baku.vercel.app
- **Kod:** https://github.com/KamranPirishzade/evacuation-baku
- **Swagger (API sənədi):** https://evacuation-baku.vercel.app/api-docs.html
- **Komanda:** 3 nəfər, 4 saat (yarış tapşırığı)

## 2. Problem (case-dən)

- Zəlzələ, güclü sel, sənaye qəzaları zamanı yollar bağlanır, panika yaranır, çıxış yollarında tıxac olur.
- **Vətəndaş** ən yaxın toplanış məntəqəsinin nə qədər dolu olduğunu və hansı yolun bağlı olduğunu görə bilmir.
- **Dispetçerlər** çoxsaylı SOS-u emal edib briqadaları ən kritik nöqtələrə yönləndirməkdə çətinlik çəkir.

## 3. Həll (əsas ideya)

Üç prinsip:
1. **Eyni canlı mənzərə:** vətəndaş və dispetçer eyni məlumatı görür (doluluq, bağlı yollar, SOS).
2. **Avtomatlaşdırma:** klasteri tapmaq, doludan qaçmaq, marşrutu yenidən hesablamaq sistemin işidir.
3. **Bir klik:** insan qərarı (briqada göndər + yeni məntəqə aç) bir kliklə icra olunur.

## 4. İki modul və funksiyalar

### Modul 1: Vətəndaş (`/citizen`, mobil üçün)
- Rayon seçimi və ya "Mənim yerim" ilə ən yaxın toplanış məntəqələri (Sığınacaq / Park / Stadion) və **cari doluluq faizi**.
- Xəritədə **təxliyə marşrutu** (məsafə, piyada vaxtı, küçə-küçə istiqamət).
- **Avtomatik alternativ marşrut:** marşrutdakı yol bağlananda və ya hədəf məntəqə **90%** dolanda marşrut hər 3 saniyədə yenidən yoxlanılır, səbəb göstərilir ("Yol bağlandı" / "Məntəqə 90% dolub").
- **Bir kliklə SOS** (Yanğın / Dağıntı / Su basması / Tibbi yardım) və **"Təhlükəsizəm"** statusu.
- Gündəlik risk paneli (zəlzələ və sel, USGS və Open-Meteo, indikativ).
- Qatlanan "bələdçi" paneli (istifadəçiyə addım-addım izah).

### Modul 2: Dispetçer (`/dispatcher`, giriş tələb edir)
- **Canlı panel** (3 san yenilənmə): aktiv SOS, təhlükəsiz vətəndaşlar, kritik məntəqələr, boş briqadalar, real Bakı xəritəsi, məntəqə doluluğu, briqada statusu.
- **Qırmızı Həyəcan** avtomatik yaranır:
  - **5 dəqiqə** ərzində **500 m** radiusda ən azı **4 fərqli** vətəndaşdan SOS, **və ya**
  - hər hansı məntəqənin doluluğu **95%-dən çox**.
- **Bir kliklə təsdiq:** "Əlavə Xilasetmə Briqadası Göndər və Yeni Toplanış Nöqtəsi Aç". Nəticə: ən yaxın briqada "Yolda" olur, ehtiyat məntəqə açılır və vətəndaş xəritəsində görünür, təsdiq edən istifadəçi qeyd olunur.
- **Simulyator** (demo üçün): yolu bağla/aç, məntəqə doluluğunu dəyiş, "4 SOS yaxınlıqda", xarici marşrut API-sini çökdür (503 / yavaş / bərpa), zəlzələ/güclü yağış riskini simulyasiya et.

## 5. Challenge Drop-lar (münsiflərin gözlənilməz dəyişiklikləri)

Sistem qatlı və modulyar olduğu üçün hər üç dəyişiklik **mövcud axınları pozmadan, əlavə** şəkildə edildi.

### Drop 1: "Xüsusi qayğı" rolu və AZ/EN dil
- Rol: **Hərəkət məhdudiyyətli / xüsusi qayğıya ehtiyacı olan vətəndaş**. SOS göndərəndə avtomatik **"Kritik Prioritet #1"** olur, dispetçerdə siyahının başında qırmızı nişanla görünür.
- Marşrut yalnız **əlçatan** (panduslu, maneəsiz) yollar və məntəqələr üzərində qurulur; əlçatan olmayan məntəqə (məs. ADA Universiteti) təklif olunmur.
- Texniki: ikinci qraf yaradılmadı; yollar və məntəqələr `is_accessible` bayrağı daşıyır, Dijkstra-ya `accessibleOnly` filtri verilir.
- **AZ/EN** dinamik dil keçidi (bütün interfeys). Tipli lüğət: açar çatışmasa kompilyasiya xətası verir. Server mətn deyil kod göndərir, tərcüməni müştəri edir.

### Drop 2: Xarici xəritə/marşrut API-si çökür (503 və ya > 5 san)
- Sistem **çökmür**; **Circuit Breaker**: 2 ardıcıl xəta → açılır, 15 san gözləyir, sınaq sorğusu göndərir, uğurlu olarsa bağlanır. 5 saniyədən uzun cavab da xəta sayılır.
- **Ehtiyat zənciri:** canlı API → son yaxşı snapshot (10 dəq keş, bağlı yollar saxlanır) → **statik lokal qraf**.
- İstifadəçi görür: **"Oflayn / Ehtiyat marşrut rejimində işləyir"**; məsafə "təxmini" işarələnir; bərpa olanda "Xidmət bərpa olundu".
- Kəsinti açarı DB-dədir (bütün serverless instansiyalarda eyni işləsin).

### Drop 3: 500+ saxta SOS (SOS Flood), RBAC, gecikmə < 300 ms
- **Saxta SOS müdafiəsi (ucuzdan bahaya):** IP limiti (20/dəq) → Zod yoxlaması və Bakı koordinat sərhədi → vətəndaş limiti (3/dəq) → **dublikat filtri** (5 dəq-də həll olunmamış SOS varsa yenisi yazılmır) → həyəcan yalnız **fərqli vətəndaşları** sayır. Rədd olunan sorğu bazaya toxunmur.
- **RBAC + JWT:** e-poçt + parol ilə giriş; httpOnly cookie-də HS256 JWT (`node:crypto`, yeni asılılıq yox). Rollar: **dispatcher** (təsdiq, rədd, simulyator, yol/məntəqə dəyişikliyi) və **supervisor** (yalnız oxuma, API 403 qaytarır). Parollar **scrypt** ilə hash-lənir; 5 yanlış cəhddən sonra hesab 5 dəqiqə bloklanır.
- **Gecikmə:** SOS yazısı 2 DB gediş-gəlişinə endirildi; həyəcan aşkarlaması cavabdan **sonra** (`after()`) tək-uçuş rejimində işləyir; dashboard SOS siyahısı 100 ilə məhdud.

## 6. Arxitektura (sadə izah)

Qatlar (yalnız aşağıya idxal): **Ekran (Next.js) → API route (Zod) → Servis → Təmiz mühərrik / Provayder → Verilənlər bazası**.

| Qat | Nə edir | Texnologiya |
| --- | ------- | ----------- |
| Frontend | Vətəndaş və dispetçer ekranları, xəritə | Next.js 16, React, TypeScript, Tailwind v4, shadcn/ui, Leaflet + OpenStreetMap |
| Backend | API, doğrulama, giriş | Next.js Route Handlers, Zod, JWT cookie, RBAC |
| Servis qatı | Biznes məntiqi (SOS, həyəcan, marşrut, dashboard, risk, istifadəçi) | TypeScript |
| Mühərrik | Təmiz funksiyalar: marşrut, böhran qaydası, risk, circuit breaker, rate limit | I/O yoxdur, unit-test olunur |
| Verilənlər bazası | 10 cədvəl | PostgreSQL (Neon) + Drizzle ORM |
| Xarici | Risk məlumatı, xəritə plitələri; simulyasiya olunmuş marşrut/trafik API-si | USGS, Open-Meteo, OpenStreetMap |
| Yerləşdirmə | | Vercel + Neon |

Diaqram üçün sadə axın: `Brauzer → API (Vercel) → Servis → Mühərrik → PostgreSQL (Neon)`; yanda: USGS, Open-Meteo, OSM.

**Niyə bu arxitektura:** mühərrik I/O etmir, ona görə test etmək və izah etmək asandır; yeni qayda mühərrikə, yeni xarici mənbə provayderə, yeni rol `rbac.ts`-ə əlavə olunur, digər qatlar toxunulmaz qalır (drop-lara uyğunlaşma bu sayədə asan oldu).

**Verilənlər bazası (10 cədvəl):** `zones`, `road_nodes`, `road_edges`, `shelters`, `citizens`, `sos_signals`, `alerts`, `rescue_teams`, `users`, `system_flags`. Vətəndaş anonim UUID-dir (ad, telefon toplanmır).

## 7. Əsas alqoritmlər (sadə dillə)

- **Marşrut:** vətəndaş ən yaxın yol düyününə bağlanır; **Dijkstra** yalnız açıq yollarda ən qısa yolu tapır; dolu (≥90%) və əlçatmaz məntəqələr keçilir; ən yaxın boş məntəqə seçilir.
- **Alternativ marşrutun səbəbi:** server kod göndərir (`road_closed` / `shelter_full`), ekran tərcümə edir.
- **Qırmızı Həyəcan:** son 5 dəqiqənin SOS-larına baxılır; 500 m-də **4 fərqli vətəndaş** varsa həyəcan; məntəqə **>95%** olarsa ayrıca həyəcan. Eyni rayonda açıq həyəcan varsa təkrar yaranmır.
- **Təsdiq:** dörd yazı (həyəcan, briqada, ehtiyat məntəqə, SOS-lar) **tək atomik əməliyyatdır**: ya hamısı olur, ya heç biri. İkinci təsdiq cəhdi 409 alır.
- **Risk:** USGS zəlzələ məlumatı və Open-Meteo yağış proqnozu ilə 0–100 bal; sel riski yüksək olanda "dolu" eşiyi 90%-dən 80%-ə düşür.

## 8. Təhlükəsizlik (qısa siyahı)

Zod ilə hər girişin yoxlanması · parametrli SQL (injection yoxdur) · scrypt parol hash-i · JWT httpOnly cookie, SameSite=Lax · RBAC (supervisor 403) · hesab bloklama (5 cəhd → 5 dəq) · IP və hesab üzrə rate limit · dublikat filtri · Bakı koordinat sərhədi · anonim vətəndaş (gizlilik) · təsdiq edənin qeydi (audit) · istehsalda `JWT_SECRET` yoxdursa sistem bağlı qalır.

## 9. Test və yoxlama nəticələri

- **68 unit test** keçir (marşrut, böhran qaydaları, circuit breaker, risk, rate limit, JWT, parol, RBAC, dublikat filtri).
- **API smoke test:** 21 yoxlama canlı saytda keçib (case-dəki bütün funksiyalar + 3 drop).
- **Yoxlanılan hədlər:** 3 SOS → həyəcan yoxdur, 4-cü → həyəcan; məntəqə tam 95% → yox, 96% → bəli; 89% → marşrut dəyişmir, 90% → dəyişir; bir nəfərin təkrar SOS-u həyəcan yaratmır; 1,1 km aralı 4 SOS həyəcan yaratmır.
- **Yük testi (Drop 3):** 600 saxta sorğu, paralel 50: ~350–450 sorğu `429` ilə rədd olunur; saxta həyəcan yaranmır, dispetçer paneli donmur.
- **Gecikmə (dürüst):** lokalda orta **99–140 ms** (hədəf < 300 ms). Canlı saytda öz kompüterimizdən orta **332 ms** (p50 204 ms): bu rəqəm internet gecikməsini də daxil edir (hətta DB-siz statik fayl da həmin maşından 0,4–0,9 san cavab verir); server tərəfi ayrıca ölçülməyib.

## 9.1. Əsas rəqəmlər (slayda qoymaq üçün)

| Göstərici | Dəyər |
| --------- | ----- |
| Qırmızı Həyəcan | **4** fərqli vətəndaş · **500 m** · **5 dəq** · məntəqə **>95%** |
| Alternativ marşrut | məntəqə **≥90%** · yoxlama hər **3 san** |
| Circuit breaker | **2** xəta → açılır · **15 san** gözləmə · timeout **5 san** |
| SOS müdafiəsi | IP **20/dəq** · vətəndaş **3/dəq** · dublikat **5 dəq** |
| Testlər | **68** unit test · **21** API yoxlaması |
| Sistem | **21** API endpoint · **10** DB cədvəli · **2** modul · **3** drop |
| Gecikmə (lokal) | **99–140 ms** (hədəf < 300 ms) |
| Rollar | dispetçer · nəzarətçi (supervisor) · vətəndaş · xüsusi qayğılı vətəndaş |

## 10. Demo ssenarisi (7 dəqiqə; təqdimatda canlı göstərilir)

İki pəncərə yan-yana: sol `/citizen`, sağ `/dispatcher` (giriş: `nigar@dac.az` / `dispatcher123`).

1. **Problem və həll** (ana səhifə) – 45 san.
2. **Vətəndaş:** rayon **Nərimanov** → 3 ən yaxın məntəqə, doluluq %, marşrut, risk paneli – 1 dəq.
3. **Yol bağlanır:** Simulyator → **Tbilisi yolu** → Bağla → 3 san sonra "Yol bağlandı", marşrut Olimpiya Stadionuna dəyişir. Sonra hədəf məntəqə **92%** → "Məntəqə 90% dolub", marşrut yenə dəyişir – 1 dəq.
4. **SOS və Qırmızı Həyəcan:** vətəndaş SOS → Tibbi yardım; Simulyator → **4 SOS yaxınlıqda** → yanıb-sönən Qırmızı Həyəcan → **Təsdiq** → briqada "Yolda", ehtiyat məntəqə açılır, vətəndaş xəritəsində görünür – 1 dəq.
5. **Məntəqə 96%** → ikinci həyəcan növü; vətəndaş **Təhlükəsizəm** → dispetçerdə sayı artır – 30 san.
6. **Drop 1:** "Xüsusi qayğıya ehtiyacım var" → əlçatan marşrut; AZ/EN keçidi – 45 san.
7. **Drop 2:** Simulyator → **503 xətası** → sarı "Oflayn / Ehtiyat marşrut rejimində işləyir", sistem çökmür; Bərpa et – 35 san.
8. **Drop 3:** terminalda yük testi (600 saxta SOS → çoxu rədd); supervisor ilə giriş → təsdiq düyməsi işləmir (403) – 50 san.
9. **Arxitektura və yekun:** diaqram, AI istifadəsi, dürüst zəif tərəf – 30 san.

**Demo üçün xəbərdarlıq:** yalnız **Nərimanov** rayonu və **Tbilisi yolu** (Yasamal və Xətai-də yol bağlamaq marşruta təsir etmir).

## 11. Pitch deck: münsiflər nə gözləyir və 7 dəqiqə necə bölünür

### 11.1. Münsiflər necə qiymətləndirir (case-dən) və vaxt buna uyğun bölünür

| Meyar | Faiz | Münsiflər nə görmək istəyir | Təqdimatda ayrılan vaxt |
| ----- | ---- | --------------------------- | ----------------------- |
| Əsas funksionallığın düzgünlüyü | **30%** | Hər tələb canlı işləyir: məntəqələr + doluluq, marşrut, SOS, Təhlükəsizəm, avtomatik alternativ, dashboard, Qırmızı Həyəcan, bir klik | **~2,5 dəq (canlı demo)** |
| Challenge drop-lara uyğunlaşma | **20%** | Üç dəyişikliyin hər biri işləyir və arxitektura onu necə rahat qəbul etdi | **~1,5 dəq** |
| Arxitektura və kod keyfiyyəti | **15%** | Aydın qatlar, niyə belə, frontend/backend/DB/API adları | **~1 dəq** |
| Test, etibarlılıq, dayanıqlılıq | **15%** | Testlər, xəta halları (API çökür, saxta SOS), sistem çökmür | **~0,75 dəq** |
| AI-nin nəzarətli istifadəsi | **10%** | Hansı alət, harada, insan nəzarəti necə | **~0,4 dəq** |
| Demo, komanda işi, texniki müdafiə | **10%** | Axıcı demo, rolların bölgüsü, suallara dürüst cavab | **bütün təqdimat + sual-cavab** |

**Nəticə:** demo ən vacibdir (30% + 20% canlı göstərilir). Slaydlar yalnız onu dəstəkləməlidir, uzun mətn olmasın.

### 11.2. Pitch deck: 9 slayd + canlı demo (cəmi 7:00)

Qayda: **hər slaydda bir fikir**, ən çox 3–4 qısa bənd, mətn 30 sözdən az, rəqəm iri.

| # | Vaxt | Slayd | Bir fikir (natiq deyir) | Vizual |
| - | ---- | ----- | ----------------------- | ------ |
| 1 | 0:00–0:25 | **Hook + başlıq** | "Zəlzələ olub. Min nəfər eyni yola çıxır. Sığınacaq doludur, yol bağlıdır. Kim bilir? Heç kim." (sonra layihə adı) | Böyük sual + qalxan loqosu |
| 2 | 0:25–0:50 | **Problem** | Vətəndaş görmür (hansı sığınacaq dolu, hansı yol bağlı); dispetçer itir (yüzlərlə SOS) | İki sütun, 2 ikon |
| 3 | 0:50–1:10 | **Həll** | Eyni canlı mənzərə · avtomatlaşdırma · bir klik | Üç kart |
| 4 | 1:10–3:40 | **CANLI DEMO (əsas funksionallıq)** | Nərimanov → marşrut → yol bağlanır → marşrut dəyişir → SOS → Qırmızı Həyəcan → bir klik təsdiq | Tətbiq özü (slayd: "Demo") |
| 5 | 3:40–5:10 | **Challenge drop-lar (demo davamı)** | Drop 1 xüsusi qayğı + dil · Drop 2 API çökür, sistem çökmür · Drop 3 saxta SOS axını + RBAC | Üç sütun; demo davam edir |
| 6 | 5:10–6:10 | **Arxitektura** | Qatlar: Ekran → API → Servis → Mühərrik → DB. Yeni dəyişiklik köhnə kodu pozmur | Qat diaqramı + texnologiya adları |
| 7 | 6:10–6:35 | **Etibarlılıq və test** | 68 test · 21 API yoxlaması · yük testi · circuit breaker · atomik təsdiq | 4 rəqəm kartı |
| 8 | 6:35–6:50 | **AI və komanda** | Claude Code kod/test/sənəd, Gemini sənəd; qərar və yoxlama komandanın | Üç ikon + komanda |
| 9 | 6:50–7:00 | **Dürüst zəiflik + növbəti addım + təşəkkür** | Marşrut həndəsəsi hələ sxematikdir; növbəti: real OSM yol şəbəkəsi | Yol xəritəsi, canlı ünvan, QR kod |

> Demo slaydları (4, 5) əslində slayd deyil, canlı tətbiqdir. Slayddan tətbiqə keçmək üçün iki pəncərə əvvəlcədən açıq olsun. Slayd 4 və 5-də yalnız qısa "Demo" lövhəsi göstərin və tətbiqə keçin.

### 11.3. Münsiflərin gözlədiyi "ağıllı" hərəkətlər

- **Əvvəlcə nəticə, sonra izah:** əvvəl göstərin, sonra "bunu necə etdik" deyin.
- **Hər tələbi ad çəkərək göstərin** ("indi case-dəki 'avtomatik alternativ marşrut' tələbini göstərirəm"). Münsiflər siyahını yoxlayır.
- **Drop-ları ayrıca elan edin** ("Drop 1, Drop 2, Drop 3") ki, 20%-lik hissəni asan tapsınlar.
- **Texniki müdafiə:** hər qərar üçün bir cümləlik "niyə" hazır olsun (bölmə 14).
- **Dürüstlük:** zəif tərəfi özünüz deyin (bölmə 13). Gizlədilən problemi münsiflər tapanda etibar itir, özünüz deyəndə gücə çevrilir.
- **Komanda işi:** 3 nəfər bölüşün: biri danışır, biri sol (vətəndaş), biri sağ (dispetçer) pəncərədə basır. Sonda hər kəs bir suala cavab versin.
- **Zaman:** 7 dəqiqəni keçməyin; demo uzanarsa Drop 3-ün yük testini qısa tutun, amma Drop 2 və RBAC-ı atmayın.

### 11.4. Başlanğıc üçün hazır "hook" variantları (birini seçin)

1. *"Zəlzələdən 5 dəqiqə sonra siz telefonunuzu açırsınız. Ən yaxın sığınacaq hansıdır? Dolu deyil ki? Yol açıqdır?"*
2. *"Dispetçerin ekranında 500 SOS yanır. Hansı həqiqidir? Hansına briqada göndərməli?"*
3. *"Fövqəladə halda ən böyük düşmən yalnız fəlakət deyil, məlumatsızlıqdır."*

## 12. AI istifadəsi (slayda qısa qeyd)

- **Claude Code:** kod, test və sənədlərin yazılmasında köməkçi.
- **Google Gemini:** sənədlərin hazırlanmasında və redaktəsində köməkçi.
- **Məhsulda AI yoxdur.** Qərarlar, hədlər, əhatə və yoxlama komandanındır; hər tapşırıq ayrıca commit və qəbul yoxlaması ilə.
- Yoxlama real səhvlər tapdı və düzəldildi (məs. simulyatorda demo üçün həyəcanın çıxmaması, vətəndaş xəritəsinin yenilənməməsi).

## 13. Dürüst məhdudiyyətlər (gizlətməyin, münsiflər soruşa bilər)

1. **Marşrut xətləri real küçələri tam izləmir:** yol qrafı 20 düyün / 31 düz seqmentdir; bəzi məntəqələr yol düyününə 5 km-ə qədər məsafədən bağlanır. Məntiq (Dijkstra, bağlı yol, eşik, səbəb) düzgündür, **həndəsə** sxematikdir. Növbəti addım: OpenStreetMap-dən real yol şəbəkəsi.
2. ETA yalnız **piyada** (80 m/dəq); nəqliyyat/təcili rejimi yoxdur.
3. Briqada `on_scene` və SOS `resolved` statuslarını dəyişən funksiya yoxdur.
4. Case "eyni zona **və ya** 500 m" deyir; yalnız 500 m qaydası həyata keçirilib.
5. Rate limiter instansiya başınadır (istehsalda Redis/Upstash lazımdır).
6. Hesablar seed ilə yaradılıb; qeydiyyat, parol sıfırlama, MFA yoxdur.
7. Canlı yenilənmə 3 saniyəlik polling ilə (WebSocket yoxdur).
8. "Xarici marşrut API-si" simulyasiyadır (case buna icazə verir); məntəqə tutumları təxminidir (OSM-də yoxdur); briqada adları və doluluq uydurmadır.
9. UI/e2e testləri avtomatlaşdırılmayıb; dispetçer paneli əsasən masaüstü üçündür.

## 14. Münsiflərin ehtimal olunan sualları (qısa cavablarla)

1. **Niyə bu texnologiyalar?** Next.js ilə UI və API bir yerdə, 4 saatda sürət; PostgreSQL ilişkisel model və indekslər üçün; Neon serverless üçün.
2. **Marşrutu necə hesablayırsınız?** Dijkstra, yalnız açıq yollar, dolu məntəqələr keçilir.
3. **Saxta SOS-dan necə qorunursunuz?** IP limiti, koordinat yoxlaması, vətəndaş limiti, dublikat filtri, fərqli vətəndaş qaydası.
4. **Xarici API çökəndə nə olur?** Circuit breaker + keş + statik lokal qraf; sistem çökmür.
5. **İki dispetçer eyni anda təsdiq etsə?** Təsdiq atomik əməliyyatdır; ikinci 409 alır.
6. **Gecikmə nə qədərdir?** Lokal 99–140 ms; canlıda ölçmə internet gecikməsini də daxil edir (332 ms orta).
7. **Test necə?** 68 unit test, 21 API yoxlaması, yük testi; UI testləri yoxdur.
8. **Məlumat real-dır?** Məntəqələr OpenStreetMap-dən real yerlərdir; tutum təxmini, briqadalar uydurmadır.
9. **Miqyaslanma?** Serverless, indekslər, məhdud siyahılar; növbəti: heap Dijkstra, Redis limiter, WebSocket.
10. **AI-dan necə istifadə etdiniz?** Claude Code (kod/test/sənəd), Gemini (sənəd); qərarlar və yoxlama komandanındır.
11. **Ən böyük zəiflik?** Marşrut həndəsəsi sxematikdir; həlli real OSM yol məlumatıdır.

## 15. Vizual və ton təklifi (Claude-a deyin)

- **Rəng:** tünd mavi (etibar) + qırmızı (həyəcan) + yaşıl (təhlükəsiz) + az sayda narıncı (xəbərdarlıq). Açıq fon.
- **Şrift:** sadə sans-serif (məs. Inter / Arial), böyük başlıq, az mətn.
- **Üslub:** hər slaydda ən çox 3–4 bənd, çoxlu boşluq, rəqəmləri iri göstər.
- **Şəkillər:** tətbiqin ekran görüntüləri (vətəndaş xəritəsi + marşrut, dispetçer paneli, Qırmızı Həyəcan kartı, oflayn rejim bannerı), arxitektura diaqramı.
- **Ton:** sadə, inamlı, dürüst; texniki sözləri qısa izah edin.
