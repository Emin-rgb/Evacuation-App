export const t = {
  app: {
    name: "Təhlükəsizlik Mərkəzi",
    description: "Böhran zamanı təxliyə və dispetçer sistemi",
  },
  nav: {
    citizen: "Vətəndaş",
    dispatcher: "Dispetçer",
  },
  landing: {
    title: "Şəhər böhranı və təxliyə mühərriki",
    subtitle:
      "Toplanış məntəqələrini, bağlı yolları və təcili çağırışları real vaxtda izləyin.",
    citizenTitle: "Vətəndaş",
    citizenDesc:
      "Ən yaxın toplanış məntəqəsini, təxliyə marşrutunu və bir toxunuşla SOS siqnalını görün.",
    citizenCta: "Vətəndaş görünüşünü aç",
    dispatcherTitle: "Dispetçer",
    dispatcherDesc:
      "SOS siqnallarını, məntəqələri və xilasetmə briqadalarını izləyin, Qırmızı Həyəcanı təsdiqləyin.",
    dispatcherCta: "Dispetçer panelini aç",
  },
  citizen: {
    title: "Təxliyə köməkçisi",
    subtitle: "Rayonunuzu seçin və ən yaxın təhlükəsiz məntəqəyə gedin.",
    district: "Rayon",
    districtPlaceholder: "Rayon seçin",
    nearest: "Ən yaxın məntəqələr",
    myLocation: "Mənim yerim",
    locating: "Yer təyin edilir...",
    locationFailed: "Yer təyin edilmədi, rayon istifadə olunur.",
    pickDistrict: "Məntəqələri görmək üçün rayon seçin.",
    noShelters: "Aktiv məntəqə tapılmadı.",
    sheltersError: "Məntəqələr yüklənmədi.",
    occupancy: "Doluluq",
    types: { shelter: "Sığınacaq", park: "Park", stadium: "Stadion" },
    sos: "SOS",
    safe: "Təhlükəsizəm",
  },
  map: {
    error: "Xəritə yüklənmədi.",
    retry: "Yenidən cəhd et",
    empty: "Xəritə məlumatı yoxdur.",
  },
  dispatcher: {
    title: "Dispetçer paneli",
    subtitle: "Canlı SOS, məntəqə və briqada vəziyyəti.",
    kpiSos: "Aktiv SOS",
    kpiSafe: "Təhlükəsiz vətəndaşlar",
    kpiCritical: "Kritik məntəqələr",
    kpiTeams: "Boş briqadalar",
    alerts: "Qırmızı Həyəcan",
    tabSos: "SOS siqnalları",
    tabShelters: "Məntəqələr",
    tabTeams: "Briqadalar",
  },
} as const;
