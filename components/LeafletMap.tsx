'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, LocateFixed, Map as MapIcon } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { CafePin, type MapProps } from './CafeMap';

// Anahtarsız, ücretsiz OpenStreetMap haritası; koyu temada karolar CSS filtresiyle koyulaşır (.lf-dark)
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Sürüklenip yakınlaştırılabilen harita. İşaretçiler Leaflet'in kendi katmanında durur (kaydırınca kaymaz),
 * içleri React portalıyla CafePin olarak çizilir.
 */
export default function LeafletMap({ cafes, activeId, onSelect, center, zoom = 13, me }: MapProps) {
  const theme = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [pins, setPins] = useState<{ id: string; el: HTMLElement }[]>([]);
  const markers = useRef(new Map<string, L.Marker>());
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  // Harita bir kez kurulur
  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { center: center, zoom, zoomControl: false, attributionControl: true, tap: true } as L.MapOptions);
    L.control.zoom({ position: 'bottomright', zoomInTitle: 'Yakınlaştır', zoomOutTitle: 'Uzaklaştır' }).addTo(m);
    m.attributionControl.setPrefix(false);
    // Mobilde liste ↔ harita geçişinde kap 0×0'dan büyüyor: boyutu yeniden ölç
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    setMap(m);
    return () => {
      ro.disconnect();
      m.remove();
      markers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    const layer = L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map]);

  // İşaretçiler: mekan listesi değişince yeniden kurulur
  const key = cafes.map((c) => `${c.id}@${c.lat},${c.lng}`).join('|');
  useEffect(() => {
    if (!map) return;
    const next: { id: string; el: HTMLElement }[] = [];
    for (const c of cafes) {
      const el = document.createElement('div');
      el.className = 'lf-pin-inner';
      const marker = L.marker([c.lat, c.lng], {
        icon: L.divIcon({ html: el, className: 'lf-pin', iconSize: [0, 0], iconAnchor: [0, 0] }),
        title: c.name,
        alt: c.name,
        keyboard: true,
        riseOnHover: true,
      })
        .on('click', () => selectRef.current?.(c.id))
        .addTo(map);
      markers.current.set(c.id, marker);
      next.push({ id: c.id, el });
    }
    setPins(next);
    fitAll(map, cafes, me, center, zoom, false);
    return () => {
      markers.current.forEach((m) => m.remove());
      markers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  // Konum gelince: kendini ve en yakın birkaç mekanı göster
  const meKey = me ? `${me.lat},${me.lng}` : '';
  useEffect(() => {
    if (!map || !me) return;
    const dot = L.marker([me.lat, me.lng], {
      icon: L.divIcon({ html: '<span class="me-dot"></span>', className: 'lf-me', iconSize: [22, 22], iconAnchor: [11, 11] }),
      title: 'Konumun',
      keyboard: false,
      zIndexOffset: -100,
    }).addTo(map);
    fitAll(map, cafes, me, center, zoom);
    return () => {
      dot.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, meKey]);

  // Seçili mekan öne çıksın ve haritada ortalansın
  useEffect(() => {
    markers.current.forEach((m, id) => m.setZIndexOffset(id === activeId ? 1000 : 0));
    const c = cafes.find((x) => x.id === activeId);
    if (map && c) map.flyTo([c.lat, c.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, activeId, key]);

  const active = cafes.find((x) => x.id === activeId) ?? null;
  const byId = new Map(cafes.map((c) => [c.id, c]));

  return (
    <div className={`embed-map leaflet-host${theme === 'dark' ? ' lf-dark' : ''}`}>
      <div ref={box} className="lf-box" />
      {pins.map(({ id, el }, i) => {
        const c = byId.get(id);
        return c ? createPortal(<CafePin c={c} active={c.id === activeId} delay={Math.min(i, 12) * 0.03} />, el, id) : null;
      })}
      <div className="embed-actions">
        {me && map && (
          <button type="button" className="open-maps" onClick={() => fitAll(map, cafes, me, center, zoom)}>
            <LocateFixed size={14} /> Konumum
          </button>
        )}
        {active && cafes.length > 1 && map && (
          <button type="button" className="open-maps" onClick={() => fitAll(map, cafes, null, center, zoom)}>
            <MapIcon size={14} /> Tüm mekanlar
          </button>
        )}
        {active && (
          <a className="open-maps" href={`https://www.google.com/maps/search/?api=1&query=${active.lat},${active.lng}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} /> Google Maps’te aç
          </a>
        )}
      </div>
    </div>
  );
}

/** Konum varsa kendini + en yakın 3 mekanı, yoksa bütün mekanları kapsayacak şekilde aç */
function fitAll(map: L.Map, cafes: MapProps['cafes'], me: MapProps['me'], center: [number, number], zoom: number, animate = true) {
  let pts: [number, number][] = cafes.map((c) => [c.lat, c.lng]);
  if (me) {
    const near = [...cafes].sort((a, b) => dist2(a, me) - dist2(b, me)).slice(0, 3);
    pts = [[me.lat, me.lng], ...near.map((c) => [c.lat, c.lng] as [number, number])];
  }
  if (pts.length === 0) return map.setView(center, zoom, { animate });
  if (pts.length === 1) return map.setView(pts[0], 15, { animate });
  map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 16, animate });
}

const dist2 = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => (a.lat - b.lat) ** 2 + ((a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180)) ** 2;
