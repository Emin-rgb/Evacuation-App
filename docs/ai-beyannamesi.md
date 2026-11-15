# Süni intellekt (AI) istifadəsi haqqında bəyannamə

## 1. Xülasə

| Məsələ | Məlumat |
| ------ | ------- |
| İstifadə olunan alət | **Claude Code** (Anthropic-in terminal kod agenti), model: Claude Sonnet 5.5 |
| Harada işlədi | Komandanın lokal repozitoriyasında, terminalda |
| Nəyi etdi | Tətbiq kodunun, testlərin və sənədlərin böyük hissəsini **insan rəhbərliyi altında** yazdı |
| Məhsulda AI | **Yoxdur.** Hazır tətbiq heç bir LLM/AI çağırışı etmir |
| Digər AI alətləri | Elan olunmayıb (komanda başqa alət istifadə etdisə bura əlavə etməlidir) |

## 2. Mərhələlər üzrə istifadə (git tarixçəsindən)

| Vaxt | Commit | AI-nin rolu |
| ---- | ------ | ----------- |
| 10:53–11:56 | scaffold, shell, DB sxemi və seed, xəritə, ən yaxın məntəqələr, Dijkstra marşrut, dispetçer paneli | Tapşırıq 1–6: kod, sxem, endpointlər, UI |
| 12:15–12:29 | simulyator, avtomatik alternativ marşrut, SOS və "Təhlükəsizəm", Qırmızı Həyəcan mühərriki, bir kliklə təsdiq, unit testlər | Tapşırıq 8–13 |
| 12:34 | README, texniki sənəd, AI bəyannaməsi | Sənəd layihələri (kod oxunaraq yazıldı) |
| 12:45 | **Drop 1:** prioritet SOS, əlçatan marşrut, AZ/EN i18n | Sxem, mühərrik filtri, UI, testlər |
| 13:21 | **Drop 2:** circuit breaker, oflayn ehtiyat marşrut | Breaker, timeout, statik qraf, UI, testlər; curl ilə 503 və yavaş rejimdə yoxlama |
| 13:05–13:54 | real Leaflet xəritəsi, real OSM məntəqələri, gündəlik risk modulu | Xəritə, idxal skripti, risk mühərriki |
| 14:11 | **Drop 3:** rate limit, dublikat filtri, JWT/RBAC, gecikmə optimallaşdırması, yük skripti | Kod və testlər; yük testini komanda işlədib nəticələri yoxlayıb |
| 14:28 | istifadəçi hesabları (scrypt), hesab bloklama, `handled_by` audit | Kod və testlər |
| 14:34 | demo düzəlişləri | Audit zamanı tapılan səhvlərin düzəlişi |
| son | Azərbaycan dilində sənədlər: README, texniki sənəd (Word), diaqramlar, ERD, OpenAPI/Swagger | Agent yazdı, komanda yoxladı |

Vercel-ə yerləşdirmə komandanın işidir, AI töhfəsi deyil.

## 3. Nəzarət necə təmin edildi

- **Kiçik addımlar:** hər tapşırıq ayrıca commit, hər birinin qəbul yoxlaması var (`PLAN.md`); yoxlama keçəndən sonra tapşırıq işarələnir.
- **Qərarlar komandanındır:** əhatə, texnologiya yığını, "qurmayacağıq" siyahısı, hədlər (4 SOS / 500 m / 5 dəq, 95% yüklənmə, 90% alternativ) və demo ssenarisi case-dən və komandadan gəlir. Kompromislər `PLAN.md` (Decisions) və texniki sənəddə yazılıb.
- **Yazılı qaydalar:** `CLAUDE.md` yeni asılılıq əlavə etməyi və tapşırıqdan kənar dəyişikliyi qadağan edir.
- **Yoxlama:** `npm test` (68 test), `npm run build`; əsas funksionallıq və üç drop işləyən serverə qarşı API skriptləri ilə bir-bir yoxlanıb. Bu yoxlama real səhvlər tapdı (simulyator açarlarının seed ilə sıfırlanmaması, Yasamal/Xətai-də yol bağlama demosunun işləməməsi, vətəndaş xəritəsinin yenilənməməsi) və düzəldildi.
- **Tarixçə yoxlanıla bilər:** hər dəyişiklik şərh olunmuş commit-dir.

## 4. AI köməyinin məhdudiyyətləri

- AI kodunda səhv ola bilər. Avtomatik testlər yalnız mühərrikdədir; qalanı skript və əl ilə yoxlanıb. Brauzerdə son əl yoxlaması tam deyil.
- Yol qrafının koordinatları təxminidir; **marşrut xətləri real küçələri izləmir** (texniki sənəd, bölmə 12).
- Tutumlar, briqada adları və doluluq dəyərləri uydurma və ya təxminidir.

## 5. İstifadə olunmayanlar

- Məhsulda AI/LLM funksiyası yoxdur; icra zamanı model çağırılmır (`GEMINI_API_KEY` istifadə olunmur).
- AI ilə yaradılmış şəkil, səs və ya üçüncü tərəf məlumat dəsti yoxdur (xəritə: OpenStreetMap).

> **Təhvildən əvvəl komanda tamamlamalıdır:** "Digər AI alətləri" sətrini təsdiqləyin (Claude Code-dan kənar chat köməkçisi və s. istifadə olunubsa əlavə edin).
