// Firebase bağlı değilken anlaşmalı mekan kartlarının nasıl göründüğünü göstermek için örnek mekanlar.
// İsimler ve numaralar uydurmadır; Firebase bağlandığında bu dosya hiç kullanılmaz.
import { allMatches, bigTeamsIn } from './fixtures';
import type { Broadcast, Cafe, CafeKind, PlanId } from './types';
import type { BigTeam } from './teams';

type Row = [id: string, name: string, kind: CafeKind, city: string, district: string, address: string, lat: number, lng: number, cap: number, screens: string, big: boolean, alc: boolean, hookah: boolean, garden: boolean, p: [number, number], fan: BigTeam | null, plan: PlanId];

const rows: Row[] = [
];

export const demoCafes: Cafe[] = rows.map((r, i) => ({
  id: r[0],
  name: r[1],
  kind: r[2],
  city: r[3],
  district: r[4],
  address: r[5],
  lat: r[6],
  lng: r[7],
  capacity: r[8],
  screens: r[9],
  features: { bigScreen: r[10], alcohol: r[11], hookah: r[12], garden: r[13] },
  priceMin: r[14][0],
  priceMax: r[14][1],
  fanOf: r[15],
  plan: r[16],
  phone: `9000000${String(1000 + i).padStart(5, '0')}`,
  membership: { status: 'active', startedAt: '2026-09-01', renewsAt: '2026-11-01' },
  createdAt: '2026-09-01',
}));

function hash(s: string) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

export function demoBroadcasts(): Broadcast[] {
  const out: Broadcast[] = [];
  for (const m of allMatches) {
    const teams = bigTeamsIn(m);
    for (const c of demoCafes) {
      const r = hash(c.id + m.id);
      const fanMatch = !!c.fanOf && teams.includes(c.fanOf);
      const base = m.derby ? 10 : 7;
      if (!fanMatch && r % 10 >= base) continue;
      const isBar = c.kind === 'Pub' || c.kind === 'Bar';
      out.push({
        cafeId: c.id,
        matchId: m.id,
        sound: c.kind === 'Kıraathane' ? r % 2 === 0 : r % 5 !== 0,
        entryFee: isBar && (m.derby || m.comp !== 'superlig') ? [100, 150, 200][r % 3] : null,
        minSpend: !isBar && m.derby ? [250, 300, 400][r % 3] : null,
        reservationRequired: !!m.derby && isBar,
        note: m.derby && r % 3 === 0 ? (isBar ? 'Giriş ücretine 1 içecek dahil' : 'Çay sınırsız, masalar 2 saat önceden dolar') : undefined,
      });
    }
  }
  return out;
}
