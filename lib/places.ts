/** Semt: taraftarın seçtiği, maç izlemeye gittiği bölge (ilçeden daha dar) */
export interface District {
  id: string;
  name: string;
  center: [number, number];
}

export interface City {
  id: string;
  name: string;
  center: [number, number];
  districts: District[];
}

export const cities: City[] = [
  {
    id: 'ankara',
    name: 'Ankara',
    center: [39.92, 32.85],
    districts: [
      { id: 'kizilay', name: 'Kızılay', center: [39.92, 32.856] },
      { id: 'tunali', name: 'Tunalı / Kavaklıdere', center: [39.907, 32.86] },
      { id: 'bahcelievler', name: 'Bahçelievler / Emek', center: [39.924, 32.827] },
      { id: 'besevler', name: 'Beşevler / Tandoğan', center: [39.933, 32.832] },
      { id: 'balgat', name: 'Balgat / Söğütözü', center: [39.905, 32.815] },
      { id: 'dikmen', name: 'Dikmen / Çankaya', center: [39.88, 32.845] },
      { id: 'cayyolu', name: 'Çayyolu / Ümitköy', center: [39.883, 32.69] },
      { id: 'bilkent', name: 'Bilkent', center: [39.884, 32.756] },
      { id: 'batikent', name: 'Batıkent', center: [39.969, 32.716] },
      { id: 'akkopru', name: 'Akköprü / Ankamall', center: [39.951, 32.831] },
      { id: 'eryaman', name: 'Eryaman / Etimesgut', center: [39.98, 32.647] },
      { id: 'kecioren', name: 'Keçiören', center: [39.98, 32.87] },
      { id: 'cebeci', name: 'Cebeci', center: [39.931, 32.876] },
      { id: 'cukurambar', name: 'Çukurambar', center: [39.908, 32.806] },
      { id: 'oran', name: 'Oran', center: [39.884, 32.858] },
    ],
  },
];

/** Pilot şehir: ilk girişte Ankara açılır (seçilen şehir tarayıcıda hatırlanır) */
export const DEFAULT_CITY = 'ankara';
export const cityById = (id: string) => cities.find((c) => c.id === id);
export const districtById = (cityId: string, id: string) => cityById(cityId)?.districts.find((d) => d.id === id);
export const districtName = (cityId: string, id: string) => districtById(cityId, id)?.name ?? id;

/** "İzmir" → "İzmir’de", "Beşiktaş" → "Beşiktaş’ta" (ünlü uyumu + sert ünsüz) */
export function locative(name: string) {
  const lower = name.toLocaleLowerCase('tr-TR');
  const vowels = [...lower].filter((c) => 'aıoueiöü'.includes(c));
  const back = 'aıou'.includes(vowels[vowels.length - 1] ?? 'a');
  const hard = 'çfhkpsşt'.includes(lower[lower.length - 1]);
  return `${name}’${hard ? 't' : 'd'}${back ? 'a' : 'e'}`;
}

/** İki nokta arası kuş uçuşu mesafe (km) */
export function distanceKm(a: [number, number], b: [number, number]) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
