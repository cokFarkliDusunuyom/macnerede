'use client';

import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import Crest from './Crest';
import { KindIcon } from './bits';
import type { CafeKind } from '@/lib/types';
import type { BigTeam } from '@/lib/teams';
import { useTheme } from '@/lib/theme';

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
export const mapsEnabled = KEY.length > 0;

export interface MapCafe {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: CafeKind;
  pro: boolean;
  fanOf: BigTeam | null;
  cover?: string | null;
  /** Rehber mekanı (anlaşmalı değil): daha sade işaretçi */
  guide?: boolean;
}

export interface MapProps {
  cafes: MapCafe[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  center: [number, number];
  zoom?: number;
  /** Ziyaretçinin konumu ("Bana en yakın" açıkken) */
  me?: { lat: number; lng: number } | null;
}

// API anahtarı yokken: sürüklenip yakınlaştırılabilen OpenStreetMap haritası (Leaflet tarayıcıda çalışır)
const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false, loading: () => <div className="skeleton" style={{ width: '100%', height: '100%' }} /> });

export default function CafeMap(props: MapProps) {
  const theme = useTheme();
  if (!mapsEnabled) return <LeafletMap {...props} />;
  const { cafes, activeId, onSelect, center, zoom = 13 } = props;
  return (
    <APIProvider apiKey={KEY} language="tr" region="TR">
      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: center[0], lng: center[1] }}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
        style={{ width: '100%', height: '100%' }}
      >
        {cafes.map((c, i) => (
          <AdvancedMarker key={c.id} position={{ lat: c.lat, lng: c.lng }} onClick={() => onSelect?.(c.id)} zIndex={c.id === activeId ? 1000 : c.pro ? 500 : i} title={c.name}>
            <CafePin c={c} active={c.id === activeId} delay={Math.min(i, 12) * 0.05} />
          </AdvancedMarker>
        ))}
        <FitBounds cafes={cafes} activeId={activeId ?? null} />
      </Map>
    </APIProvider>
  );
}

/** Harita mekanların hepsini kapsayacak şekilde açılır (taraftar stadı değil, yakınındaki mekanı arıyor) */
function FitBounds({ cafes, activeId }: { cafes: MapCafe[]; activeId: string | null }) {
  const map = useMap();
  const key = cafes.map((c) => c.id).join(',');

  useEffect(() => {
    if (!map) return;
    const pts = cafes.map((c) => ({ lat: c.lat, lng: c.lng }));
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setCenter(pts[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    pts.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 70);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  useEffect(() => {
    const c = cafes.find((x) => x.id === activeId);
    if (map && c) map.panTo({ lat: c.lat, lng: c.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, activeId]);

  return null;
}

/** Mekan işaretçisi: kapak fotoğrafı varsa o, yoksa taraftar arması ya da mekan türü ikonu */
export function CafePin({ c, active, delay = 0 }: { c: MapCafe; active: boolean; delay?: number }) {
  return (
    <motion.div
      className={`marker${c.pro ? ' pro' : ''}${c.guide ? ' guide' : ''}${active ? ' active' : ''}${c.cover ? ' has-photo' : ''}`}
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 14, delay }}
    >
      {c.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.cover} alt="" />
      ) : c.fanOf ? (
        <Crest id={c.fanOf} size={22} />
      ) : (
        <KindIcon kind={c.kind} size={18} />
      )}
      {active && <span className="marker-label">{c.name}</span>}
    </motion.div>
  );
}
