# Tam təqdimat planı (Claude-a göndərmək üçün): 7 dəqiqə, Azərbaycan dilində

> **Claude-a tapşırıq:** bu planı və əlavə olunan ekran görüntülərini götür, **Azərbaycan dilində 10 slaydlıq təqdimat** (PowerPoint / Google Slides / Canva üçün) hazırla. Hər slaydın başlığını, mətnini və şəklini aşağıda yazıldığı kimi istifadə et. Rəqəmləri dəyişmə, yeni fakt uydurma. Hər slayd üçün natiq mətni də yaz (planda verilib, istəsən sadələşdir). Üslub: təmiz, peşəkar, fövqəladə hal mövzusuna uyğun; rəng: tünd mavi `#1F3A5F`, qırmızı `#DC2626`, yaşıl `#16A34A`, narıncı `#F59E0B`, açıq fon `#FFFFFF` / `#F4F6F9`; şrift: Inter və ya Arial; hər slaydda ən çox 4 qısa bənd, rəqəmlər iri.

**Layihə:** Fövqəladə Hallar və Şəhər Təhlükəsizlik Şəbəkəsi (Urban Crisis & Crowd Evacuation Engine) · **Canlı:** https://evacuation-baku.vercel.app · **Kod:** https://github.com/KamranPirishzade/evacuation-baku · **Tədbir:** Digital Azerbaijan Challenge finalı, 3 nəfərlik komanda, 4 saat

**Ekran görüntüləri (`docs/screenshots/` qovluğu):**

| Fayl | Nə göstərir |
| ---- | ----------- |
| `01-ana-sehife.png` | Açılış səhifəsi (problem + necə işləyir) |
| `02-vetendas-marsrut.png` | Vətəndaş: Nərimanov, ən yaxın məntəqələr, doluluq, mavi marşrut |
| `03-vetendas-mobil.png` | Vətəndaş modulu telefon görünüşündə |
| `04-yol-baglandi-alternativ-marsrut.png` | Yol bağlandı, marşrut avtomatik dəyişdi |
| `05-xususi-qayqi-elcatan-marsrut.png` | Xüsusi qayğı rolu: əlçatan marşrut |
| `06-dispetcer-giris.png` | Dispetçer girişi (e-poçt + parol) |
| `07-dispetcer-panel.png` | Dispetçer canlı paneli |
| `08-simulyator.png` | Simulyator paneli |
| `09-qirmizi-heyecan.png` | Qırmızı Həyəcan kartı (4 fərqli SOS) |
| `10-tesdiq-briqada-yolda.png` | Təsdiqdən sonra briqada "Yolda" |
| `11-mentaqe-yuklenmesi.png` | Məntəqə 96%: ikinci həyəcan növü |
| `12-oflayn-rejim.png` | Xarici API çökdü: "Oflayn / Ehtiyat marşrut rejimi" |
| `13-swagger.png` | Swagger API sənədləri |
| `14-arxitektura-diaqrami.png` | Arxitektura diaqramı |
| `15-erd-diaqrami.png` | Verilənlər bazası ER diaqramı |
| `16-saxta-sos-mudafiesi.png` | Saxta SOS-a qarşı qat-qat müdafiə |
| `17-circuit-breaker.png` | Circuit breaker və ehtiyat zənciri |

*(Bəzi şəkil çatışmırsa, həmin slaydı mətn və ikonlarla düzəlt.)*

---

## Münsiflər nəyi qiymətləndirir (slaydları bu meyarlara görə qur)

| Meyar | Faiz | Slaydlar |
| ----- | ---- | -------- |
| Əsas funksionallığın düzgünlüyü | 30% | 3, 4 (canlı demo) |
| Challenge drop-lara uyğunlaşma | 20% | 5 |
| Arxitektura və kod keyfiyyəti | 15% | 6 |
| Test, etibarlılıq, dayanıqlılıq | 15% | 7 |
| AI-nin nəzarətli istifadəsi | 10% | 8 |
| Demo, komanda işi, texniki müdafiə | 10% | bütün təqdimat, 9, 10 |

---

# SLAYDLAR

## Slayd 1 (0:00–0:30): Hook və başlıq

- **Başlıq (iri):** *"Zəlzələ olub. Sığınacaq dolu, yol bağlıdır. Kim bilir?"*
- **Alt başlıq:** Fövqəladə Hallar və Şəhər Təhlükəsizlik Şəbəkəsi
- **Kiçik mətn:** Vətəndaş SOS Monitorinqi və Dinamik Təxliyə Sistemi · Digital Azerbaijan Challenge · evacuation-baku.vercel.app
- **Şəkil:** `01-ana-sehife.png` (kiçik, sağda) və qalxan ikonu
- **Natiq:** "Təsəvvür edin ki, zəlzələ olub. Min nəfər eyni yola çıxır, ən yaxın sığınacaq doludur, bir yol bağlıdır. Vətəndaş bunu bilmir, dispetçer isə yüzlərlə SOS-un içində itir. Biz bu problemi həll edən sistem hazırladıq."

## Slayd 2 (0:30–1:00): Problem

- **Başlıq:** Problem: məlumat yoxdur, qərar gecikir
- **İki sütun:**
  - **Vətəndaş:** hansı sığınacağın dolu olduğunu görmür · hansı yolun bağlı olduğunu bilmir · marşrut köhnəlir
  - **Dispetçer:** yüzlərlə SOS içində itir · briqadanı hara göndərəcəyini tez seçə bilmir
- **Natiq:** "Fövqəladə halda ən böyük düşmən yalnız fəlakət deyil, məlumatsızlıqdır. Vətəndaş doğru yeri bilmir, dispetçer isə ən kritik nöqtəni tez seçə bilmir."

## Slayd 3 (1:00–1:25): Həll: iki modul, üç prinsip

- **Başlıq:** Həll: eyni canlı mənzərə, avtomatlaşdırma, bir klik
- **Üç kart:**
  1. **Eyni canlı mənzərə** — vətəndaş və dispetçer eyni məlumatı görür
  2. **Avtomatlaşdırma** — doludan qaçmaq, marşrutu yeniləmək, klasteri tapmaq sistemin işidir
  3. **Bir klik** — briqada göndər + yeni məntəqə aç
- **Altda iki modul:** Vətəndaş modulu · Dispetçer modulu
- **Şəkil:** `02-vetendas-marsrut.png` və `07-dispetcer-panel.png` yan-yana
- **Natiq:** "Sistem iki moduldan ibarətdir: vətəndaş üçün və dispetçer üçün. Üç prinsipə əsaslanır: eyni canlı mənzərə, avtomatlaşdırma və bir kliklə qərar."

## Slayd 4 (1:25–3:40): CANLI DEMO (əsas funksionallıq)

- **Başlıq:** Canlı demo
- **Slaydda yalnız qısa siyahı (demo gedərkən ekranda):**
  1. Rayon seç → ən yaxın məntəqələr + doluluq + marşrut
  2. Yol bağlanır → marşrut özü dəyişir
  3. Məntəqə 90%+ dolur → marşrut yenə dəyişir
  4. SOS → dispetçer görür
  5. 4 fərqli SOS → **Qırmızı Həyəcan** → **bir kliklə təsdiq**
- **Şəkillər (ehtiyat, demo işləməsə):** `02`, `04`, `09`, `10`, `11`
- **Demo addımları (komandada üç nəfər: biri danışır, biri sol, biri sağ pəncərədə):**
  1. Sol: `/citizen` → rayon **Nərimanov**. De: "Vətəndaş rayonunu seçir. Ən yaxın üç məntəqə doluluq faizi ilə görünür və xəritədə marşrut çəkilir."
  2. Sağ: Simulyator → **Tbilisi yolu** → Bağla. Sol (3 san): "Yol bağlandı", marşrut Olimpiya Stadionuna dəyişir. De: "Vətəndaş heç nə basmadı. Sistem hər 3 saniyədə marşrutu yoxlayır."
  3. Sağ: hədəf məntəqə **92%**. Sol: "Məntəqə 90% dolub", marşrut dəyişir.
  4. Sol: **SOS → Tibbi yardım**. Sağ: SOS siyahısında və xəritədə görünür.
  5. Sağ: Simulyator → **4 SOS yaxınlıqda** → yanıb-sönən **Qırmızı Həyəcan**. De: "Qayda: 5 dəqiqədə, 500 m-də 4 fərqli nəfər. Eyni nəfərin təkrarı sayılmır."
  6. Sağ: **Təsdiq**. Nəticə: briqada "Yolda", ehtiyat məntəqə açılır, vətəndaş xəritəsində görünür, "Təsdiq edən: Nigar Huseynova". De: "Bütün bunlar bir əməliyyatdır: ya hamısı olur, ya heç biri."
  7. Sağ: bir məntəqə **96%** → ikinci həyəcan. Sol: **Təhlükəsizəm** → dispetçerdə sayı artır.
- **Diqqət:** yalnız **Nərimanov** və **Tbilisi yolu** işlədin.

## Slayd 5 (3:40–5:10): Challenge Drop-lar (20%)

- **Başlıq:** Üç gözlənilməz dəyişiklik, üçünə də uyğunlaşdıq
- **Üç sütun (hər birində: dəyişiklik → həll → nəticə):**
  - **Drop 1: Xüsusi qayğı rolu + AZ/EN** — SOS avtomatik *Kritik Prioritet #1*; marşrut yalnız əlçatan yollarla; interfeys iki dildə. *(şəkil: `05`)*
  - **Drop 2: Xarici API çökür (503 / >5 san)** — Circuit breaker → keş → statik qraf; "Oflayn / Ehtiyat marşrut rejimi"; sistem çökmür. *(şəkil: `12`, `17`)*
  - **Drop 3: 500+ saxta SOS + RBAC + gecikmə** — limit + dublikat filtri + fərqli vətəndaş qaydası; JWT/RBAC; orta gecikmə lokalda 99–140 ms. *(şəkil: `16`)*
- **Natiq (demo ilə):** 
  - Drop 1: "Xüsusi qayğı qutusunu yandırıram. Marşrut yalnız əlçatan yollardan keçir, ADA Universiteti təklif olunmur. Bu insan SOS göndərsə, dispetçerdə ən yuxarıda qırmızı nişanla görünür. Dil də bir düymə ilə dəyişir."
  - Drop 2: "Xarici marşrut xidmətini çökdürürəm. Sistem çökmədi. Sarı xəbərdarlıq çıxdı və marşrut yerli ehtiyat məlumatla hesablanır. Bərpa olunanda özü geri qayıdır."
  - Drop 3: "600 saxta SOS göndəririk. Çoxu rədd olunur, dispetçer paneli donmur, saxta həyəcan yaranmır. Dispetçer əməliyyatları giriş və rolla qorunur: nəzarətçi baxa bilər, briqada göndərə bilməz."
- **Demo (qısa):** Xüsusi qayğı qutusu → AZ/EN; Simulyator → 503 xətası → Bərpa et; terminalda yük testi; supervisor ilə giriş (təsdiq düyməsi söndürülüb).

## Slayd 6 (5:10–6:10): Arxitektura (15%)

- **Başlıq:** Qatlı və genişlənə bilən arxitektura
- **Şəkil (böyük):** `14-arxitektura-diaqrami.png`
- **Üç bənd:**
  - Ekran (Next.js) → API (Zod) → Servis → Təmiz mühərrik → PostgreSQL (Neon)
  - Mühərrik I/O etmir: test etmək və izah etmək asandır
  - Yeni qayda mühərrikə, yeni mənbə provayderə, yeni rol `rbac.ts`-ə: digər qatlar dəyişmir
- **Altda texnologiya sətri:** Next.js 16 · React · TypeScript · Tailwind · Leaflet/OpenStreetMap · PostgreSQL (Neon) · Drizzle ORM · Vercel
- **Natiq:** "Qaydalar yalnız aşağıya doğru idxal edir. Verilənlər bazasına yalnız servislər toxunur, hesablama mühərriki ayrıdır. Ona görə üç dəyişikliyi köhnə kodu pozmadan əlavə edə bildik."
- **Əlavə (ehtiyat) şəkil:** `15-erd-diaqrami.png` (10 cədvəl)

## Slayd 7 (6:10–6:35): Etibarlılıq və test (15%)

- **Başlıq:** Testlərlə və yoxlamalarla təsdiqləndi
- **Dörd iri rəqəm kartı:**
  - **68** unit test
  - **21** API yoxlaması (canlı saytda keçib)
  - **21** API endpoint · **10** DB cədvəli
  - **99–140 ms** orta gecikmə (lokal; hədəf <300 ms)
- **Altda 3 qısa bənd:** Circuit breaker və ehtiyat marşrut · Atomik təsdiq (ya hamısı, ya heç biri) · Rate limit və dublikat filtri
- **Şəkil:** `13-swagger.png` (kiçik)
- **Natiq:** "Hesablama mühərriki 68 testlə yoxlanıb, API üçün 21 yoxlamalı skript canlı saytda keçib. Gecikməni lokalda 99–140 millisaniyə ölçdük. Canlı saytda öz kompüterimizdən orta 332 oldu, bu rəqəmə internet gecikməsi də daxildir."

## Slayd 8 (6:35–6:50): AI və komanda (10%)

- **Başlıq:** AI köməkçi idi, qərar komandanındır
- **Üç bənd:**
  - **Claude Code:** kod, test və sənədlərdə köməkçi
  - **Gemini:** sənədlərin hazırlanmasında köməkçi
  - **Komanda:** əhatə, hədlər, arxitektura qərarları və hər addımın yoxlanması
- **Kiçik qeyd:** Məhsulda AI funksiyası yoxdur · Hər tapşırıq ayrıca commit və qəbul yoxlaması ilə
- **Natiq:** "Kodu Claude Code ilə yazdıq, sənədlərdə Gemini-dən istifadə etdik. Qərarları və yoxlamanı komanda verdi. Yoxlama zamanı real səhvlər tapıb düzəltdik."

## Slayd 9 (6:50–7:00): Dürüst zəiflik və növbəti addım

- **Başlıq:** Dürüst bəyanat və növbəti addım
- **Sol (bu gün):** marşrut məntiqi düzgün işləyir, amma xəritədəki xətlər real küçələri tam izləmir (20 düyünlü sxematik qraf)
- **Sağ (növbəti):** OpenStreetMap-dən real yol şəbəkəsi · təcili yardım rejimi və real ETA · WebSocket · Redis ilə paylanmış limit
- **Natiq:** "Zəif tərəfimizi özümüz deyirik: marşrutun məntiqi düzgündür, amma xətlərin həndəsəsi hələ sxematikdir. Növbəti addım real yol məlumatıdır."

## Slayd 10: Təşəkkür (sual-cavab zamanı ekranda qalır)

- **Başlıq:** Təşəkkür edirik
- **Mətn:** Canlı: evacuation-baku.vercel.app · Kod: github.com/KamranPirishzade/evacuation-baku · API sənədi: /api-docs.html
- **Şəkil:** QR kod (canlı ünvana), komandanın adları

---

# Sual-cavab üçün hazır cavablar (qısa)

1. **Marşrutu necə hesablayırsınız?** Dijkstra, yalnız açıq yollar; dolu (≥90%) məntəqələr keçilir.
2. **Saxta SOS-dan necə qorunursunuz?** IP limiti (20/dəq), koordinat yoxlaması, vətəndaş limiti (3/dəq), dublikat filtri (5 dəq), həyəcan yalnız fərqli vətəndaşları sayır.
3. **Xarici API çökəndə?** Circuit breaker (2 xəta → açıq, 15 san gözləmə) → son yaxşı snapshot → statik lokal qraf.
4. **İki dispetçer eyni anda təsdiq etsə?** Təsdiq atomik əməliyyatdır, ikincisi 409 alır.
5. **Gecikmə?** Lokal 99–140 ms; canlıda öz kompüterimizdən 332 ms (internet gecikməsi daxil), server tərəfi ayrıca ölçülməyib.
6. **Məlumat real-dır?** Məntəqələr OpenStreetMap-dən real yerlərdir; tutum təxmini, briqada adları və doluluq uydurmadır; risk modulu real USGS/Open-Meteo.
7. **Ən böyük zəiflik?** Marşrut xətlərinin həndəsəsi sxematikdir; həlli real OSM yol məlumatıdır.
8. **Miqyaslanma?** Serverless, indekslər, məhdud siyahılar; növbəti: heap Dijkstra, Redis limiter, WebSocket.
9. **Niyə WebSocket yox?** 3 saniyəlik polling sadə və etibarlıdır; növbəti addım WebSocket.
10. **AI?** Claude Code (kod/test/sənəd), Gemini (sənəd); qərar və yoxlama komandanındır.

# Əsas rəqəmlər (ezber)

**4** fərqli vətəndaş · **500 m** · **5 dəq** · məntəqə **>95%** həyəcan, **≥90%** marşrut dəyişir · yoxlama hər **3 san** · breaker: **2** xəta, **15 san**, timeout **5 san** · IP **20/dəq**, vətəndaş **3/dəq** · **68** test, **21** API yoxlaması, **21** endpoint, **10** cədvəl.

# Demo üçün qaydalar

- Başlamazdan əvvəl `npm run db:seed`; iki pəncərə yan-yana; dispetçer kimi əvvəlcədən daxil olun (`nigar@dac.az` / `dispatcher123`); supervisor: `supervisor@dac.az` / `supervisor123`.
- **Yalnız Nərimanov və Tbilisi yolu** (Yasamal və Xətai-də yol bağlamaq marşruta təsir etmir).
- Hər kliklədən sonra 3 saniyə gözləyin. Həyəcan çıxmasa əvvəlki həyəcanı Təsdiq/Rədd edib "4 SOS yaxınlıqda"nı yenidən basın.
