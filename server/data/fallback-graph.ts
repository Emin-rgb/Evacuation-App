/**
 * Static fallback road graph (Drop 2). Single source of truth for the seed AND the offline routing mode:
 * when the external traffic API is down, routing runs on this bundled graph (all roads assumed open).
 * Node keys (n1..n20) are stable; the seed stores them as `key|name` so they can be mapped to DB ids.
 */
export function haversineM(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// key: [name, lat, lng]
export const NODES: Record<string, [string, number, number]> = {
  n1: ["Hüseyn Cavid / Şərifzadə", 40.3905, 49.8038],
  n2: ["Həsən Əliyev / Təbriz", 40.3868, 49.8165],
  n3: ["Rəsul Rza / Yasamal", 40.3815, 49.8275],
  n4: ["28 May", 40.3797, 49.8466],
  n5: ["Nizami / Fizuli", 40.3792, 49.8367],
  n6: ["Dənizkənarı Bulvar", 40.3715, 49.8452],
  n7: ["İçərişəhər", 40.3657, 49.8359],
  n8: ["Azadlıq prospekti", 40.4012, 49.8394],
  n9: ["Nəsimi bazarı", 40.4037, 49.8318],
  n10: ["Metro 20 Yanvar", 40.4089, 49.8081],
  n11: ["Nərimanov / Əhməd Rəcəbli", 40.4018, 49.8693],
  n12: ["Tbilisi prospekti", 40.4224, 49.8621],
  n13: ["Binəqədi mərkəz", 40.4512, 49.8186],
  n14: ["Binəqədi / Biləcəri", 40.4457, 49.8059],
  n15: ["Xətai / Əhmədli", 40.3834, 49.8727],
  n16: ["Xətai / Nobel", 40.3851, 49.9022],
  n17: ["Xətai / Gənclik", 40.4019, 49.8513],
  n18: ["Heydər Əliyev Mərkəzi", 40.3954, 49.8678],
  n19: ["Zığ yolu", 40.4308, 49.8512],
  n20: ["Neftçilər prospekti", 40.3713, 49.8531],
};

export const EDGES: [string, string, string][] = [
  ["n1", "n2", "Hüseyn Cavid prospekti"],
  ["n2", "n3", "Həsən Əliyev küçəsi"],
  ["n3", "n5", "Rəsul Rza küçəsi"],
  ["n5", "n4", "Nizami küçəsi"],
  ["n5", "n7", "Fizuli küçəsi"],
  ["n7", "n6", "Neftçilər yolu"],
  ["n6", "n4", "Dənizkənarı Bulvar"],
  ["n6", "n20", "Neftçilər prospekti"],
  ["n20", "n15", "Neftçilər prospekti"],
  ["n4", "n17", "28 May küçəsi"],
  ["n3", "n9", "Mirzə Ibrahimov"],
  ["n2", "n10", "Şəmsi Bədəlbəyli"],
  ["n10", "n9", "Azadlıq prospekti"],
  ["n9", "n8", "Azadlıq prospekti"],
  ["n8", "n17", "Azadlıq prospekti"],
  ["n8", "n11", "Rəşid Behbudov"],
  ["n17", "n18", "Heydər Əliyev prospekti"],
  ["n18", "n11", "Heydər Əliyev prospekti"],
  ["n11", "n12", "Tbilisi prospekti"],
  ["n12", "n19", "Tbilisi prospekti"],
  ["n19", "n13", "Zığ yolu"],
  ["n13", "n14", "Binəqədi şossesi"],
  ["n14", "n10", "Biləcəri yolu"],
  ["n14", "n1", "Ələsgər Qayıbov"],
  ["n10", "n1", "Şərifzadə küçəsi"],
  ["n18", "n15", "Əhmədli yolu"],
  ["n15", "n16", "Xətai prospekti"],
  ["n16", "n18", "Nobel prospekti"],
  ["n17", "n15", "Gənclik yolu"],
  ["n12", "n13", "Mərdəkan yolu"],
  ["n12", "n8", "Tbilisi yolu"],
];

// Drop 1: edges without ramps/with stairs (indices into EDGES by "a-b"), graph stays connected for accessible-only routing
export const INACCESSIBLE_EDGES = new Set(["n3-n5", "n5-n7", "n6-n4", "n10-n9", "n8-n11", "n18-n15"]);
