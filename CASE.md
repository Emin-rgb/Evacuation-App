# Fövqəladə Hallar və Şəhər Təhlükəsizlik Şəbəkəsi: Vətəndaş SOS Monitorinqi və Dinamik Təxliyə Sistemi

**Müddət:** $4$ saat

---

## 1. Problem Konteksti (Problem Statement)

Zəlzələ, güclü sel, sənaye qəzaları və ya kütləvi tədbirlər zamanı şəhərin müxtəlif zonalarında yolların bağlanması, binaların zədələnməsi və insanlar arasında yaranan panika nəticəsində çıxış yollarında tıxaclar yaranır.

Mövcud sistemlərdə vətəndaşlar ən yaxın təhlükəsizlik toplanış məntəqəsinin nə qədər dolu olduğunu və ya hansı yolun bağlı olduğunu görə bilmir. Fövqəladə hallar dispetçerləri isə vətəndaşlardan gələn çoxsaylı SOS siqnallarını emal edərək xilasetmə briqadalarını ən kritik nöqtələrə operativ yönləndirməkdə çətinlik çəkirlər.

---

## 2. Tapşırıq (Task Requirement)

$3$ nəfərlik komandanız $4$ saat ərzində **"Urban Crisis & Crowd Evacuation Engine"** mikro-sisteminin işlək prototipini hazırlamalıdır. Sistem aşağıdakı iki əsas moduldan ibarət olmalıdır:

### Modul 1: Vətəndaş Təhlükəsizlik Modulu (API / Web App)

- Vətəndaşın seçdiyi rayon və ya koordinat üzrə ən yaxın təhlükəsizlik toplanış məntəqələrini (Sığınacaq / Park / Stadion), onların cari doluluq faizini və tövsiyə olunan təxliyə marşrutunu göstərmək.
- Vətəndaşlara bir kliklə SOS siqnalı göndərmək (təhlükə növü: _Yanğın / Dağıntı / Su basması / Tibbi yardım_) və **"Təhlükəsizəm"** statusunu yeniləmək imkanı vermək.
- Sistem tərəfindən təqdim olunan Xarici Xəritə və Marşrutlandırma API-si (və ya simulyasiya olunmuş yol-nəqliyyat endpointi) əsasında hər hansı bir yol bağlandıqda və ya toplanış məntəqəsi $90\%$ dolduqda vətəndaşa avtomatik alternativ təxliyə marşrutu təklif etmək.

### Modul 2: Fövqəladə Hallar Dispetçer Modulu və Analitika Mühərriki (Analytics Engine)

- **Əsas funksionallıq:** Şəhər zonaları üzrə daxil olan SOS siqnallarını, toplanış məntəqələrinin doluluq səviyyəsini və aktiv xilasetmə briqadalarının statusunu canlı paneldə (real-time dashboard) əks etdirmək.
- **Kritik Böhran Alqoritmi:** Əgər eyni zonadan (və ya $500\text{ m}$ radiusda) $5$ dəqiqə ərzində ən azı $4$ fərqli SOS siqnalı daxil olarsa və ya hər hansı toplanış məntəqəsinin doluluğu $95\%$-i keçərsə, operator panelində avtomatik olaraq **"Qırmızı Həyəcan: Əlavə Xilasetmə Briqadası Göndər və Yeni Toplanış Nöqtəsi Aç"** xəbərdarlığı yaradılmalı və bu qərarın icrası bir kliklə təsdiq edilə bilməlidir.

> **Vacib Qeyd — Dinamik Texniki Şərtlər (Challenge Drop):**
> Yarış müddətində saat **12:00**, **13:00** və **14:00**-da münsiflər heyəti tərəfindən $3$ gözlənilməz dəyişiklik (yeni rol/dil əlavəsi, xarici API kəsintisi, yüksək yük və təhlükəsizlik tələbi) elan olunacaq. Sistem arxitekturanızı elastik və dəyişikliklərə açıq (modulyar və genişlənə bilən) şəkildə layihələndirin.

---

## 3. Təhvil verilməli olan materialların siyahısı

1. **İşlək proqramın mənbə kodu:** GitHub, GitLab və ya digər repository-nin linki.
2. **İşə salınma təlimatı və arxitektura qeydi (`README.md`):** Layihənin lokal mühitdə (Docker və ya runtime vasitəsilə) işə salınma addımları, "challenge drop" dəyişikliklərinə uyğunlaşdırma izahı və sistem arxitekturasının sxemi (frontend, backend, DB və API adları ilə birlikdə).
3. **Süni intellekt (AI) istifadəsi haqqında bəyannamə (AI Declaration):** Kod yazılmasında, testlərdə, arxitektura seçimində və "challenge drop" dəyişikliklərində hansı AI alətlərindən (ChatGPT, GitHub Copilot və s.) hansı mərhələdə və necə istifadə edildiyini göstəərən hesabat.
4. **Texniki izah sənədi:** (MS Word, PDF və ya Notepad formatında) Problem həlli yanaşmasını, seçilmiş texnologiyaları, təhlükəsizlik və performans tədbirlərini, eləcə də gələcək inkişaf imkanlarını əhatə edən qısa sənəd.

---

## 5. Qiymətləndirmə meyarları və faiz bölgüsü

- **Əsas funksionallığın düzgünlüyü:** $30\%$
- **Əlavə texniki şərtlərlə ("challenge drop") uyğunlaşma:** $20\%$
- **Arxitektura və kod keyfiyyəti:** $15\%$
- **Test, etibarlılıq və dayanıqlılıq:** $15\%$
- **Süni intellekt (AI) alətlərinin nəzarətli istifadəsi:** $10\%$
- **Demo, komanda işi və texniki müdafiə:** $10\%$

## Challenge Drop 1

Sistemə "Hərəkət Məhdudiyyətli Şəxs/ Xüsusi Qayğıya Ehtiyacı Olan Vətəndaş" (Prioritet SOS) rolu əlavə eedilməlidir. Bu rola malik istifadəçi SOS siqnalı göndərildikdə müraciət avtomatik olaraq " Kritik Prioritet" (Priority#1) statusu almalı vəə sistem ona yalnız əlil arabası / tibbi nəqliyyat üçün əlçatab olan (panduslu və maneəsiz) təxliyyə marşurutu təyin eedilməlidir.

Əlavə olaraq, bütün istifadəçi interfeysi (UI) həm Azərbaycan (Az), Hhəm də ingilis (En) dillərində dinamik olaraq dəyişdirilə bilən (i18n) olmalıdır.

### Challenge Drop 2

Vətəndaş modulunun istifadə etdiyi Xarici Xəritə və Marşurutlaşdırma API- sı sıradan çıxmışdır (HTTP 503 Service Unavailable xətası qaytarır və ya cavab müddəti 5 saniyəni keçir).

Sistem bu xəta zamanı çökməməli (unhandled excption verməməli), Circuit Braker / Fallback mxanizmi avtomatik işə düşməli və məsafə / marşrut hesablamalarını lokal ehtiyyat məlumat bazasından (statik koordinat matrisi və ya son keşlənmiş marşurutlar.0 icra edərək istifadəçiyə "Oflayn / Ehtiyat marşrut rejimində işləyir" bildirişi ilə xidmət göstərməyə davam etdirməlidir.

### Challenge Drop 3

Böhran zamanı panika və ya bot hücumu nəticəsində sistemə eyni anda 500-dən çox SAXTA SOS sorğusu (SOS Flood / SOS Attack) göndərilməsi ssenarisi aktivləşmişdir. Komanda SOS endpointlərini Rate Limiting və duplikat filtrasiyası ilə qorumalı (saxta sorğuların dispetçer panelini bloklamasının qarşısını almalı), dispetçer panelinin kritik əməliyyatlarını (xilasetmə briqadasının yönləndirilməsi) JWT / Rol-Based Access Control (RBAC) ilə təhlükəsizləşdirilməsi və kütləvi sorğular zamanı sistemin orta cavab müddətinin (latency) 300 ms-dən aşağı qalmasını təmin etməlidir.
