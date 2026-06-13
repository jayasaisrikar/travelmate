'use client';

import { useEffect, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';

/**
 * Rotating destination globe with animated flight arcs — the hero "moving asset".
 * Dark sphere, warm-white country dots, sunset-gradient arcs tracing routes
 * between Wayflo destinations. Rendered client-only (see DestinationGlobe.tsx).
 */

type City = { name: string; lat: number; lng: number };

const CITIES: City[] = [
  { name: 'Bengaluru', lat: 12.97, lng: 77.59 },
  { name: 'Bali', lat: -8.34, lng: 115.09 },
  { name: 'Tokyo', lat: 35.68, lng: 139.69 },
  { name: 'Lisbon', lat: 38.72, lng: -9.14 },
  { name: 'New York', lat: 40.71, lng: -74.0 },
  { name: 'Paris', lat: 48.85, lng: 2.35 },
  { name: 'Sydney', lat: -33.87, lng: 151.21 },
  { name: 'Cape Town', lat: -33.92, lng: 18.42 },
];

const ROUTES: Array<[string, string]> = [
  ['Bengaluru', 'Bali'],
  ['Bengaluru', 'Tokyo'],
  ['Lisbon', 'New York'],
  ['Tokyo', 'Sydney'],
  ['Paris', 'Cape Town'],
  ['New York', 'Paris'],
];

const by = (name: string) => CITIES.find(c => c.name === name)!;

const arcs = ROUTES.map(([from, to]) => {
  const a = by(from);
  const b = by(to);
  return { startLat: a.lat, startLng: a.lng, endLat: b.lat, endLng: b.lng };
});

const COUNTRIES_URL =
  'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson';

export default function DestinationGlobeInner() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [countries, setCountries] = useState<any[]>([]);

  // responsive square sizing
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setSize(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // country outlines (best-effort; globe still renders arcs without them)
  useEffect(() => {
    let active = true;
    fetch(COUNTRIES_URL)
      .then(r => r.json())
      .then(geo => {
        if (active && geo?.features) setCountries(geo.features);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // auto-rotate + framing once the globe is ready
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !size) return;
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.enableZoom = false;
    g.pointOfView({ lat: 18, lng: 40, altitude: 2.3 }, 0);
  }, [size]);

  const globeMaterial = new THREE.MeshPhongMaterial({
    color: 0x0c0a12,
    emissive: 0x1a0c04,
    emissiveIntensity: 0.35,
    shininess: 1.2,
  });

  return (
    <div ref={wrapRef} className="aspect-square w-full">
      {size > 0 && (
        <Globe
          ref={globeRef}
          width={size}
          height={size}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showAtmosphere
          atmosphereColor="#EA580C"
          atmosphereAltitude={0.16}
          hexPolygonsData={countries}
          hexPolygonResolution={3}
          hexPolygonMargin={0.62}
          hexPolygonUseDots
          hexPolygonColor={() => 'rgba(245,240,234,0.18)'}
          arcsData={arcs}
          arcColor={() => ['rgba(251,191,36,0.95)', 'rgba(234,88,12,0.9)', 'rgba(244,63,94,0.85)']}
          arcStroke={0.5}
          arcAltitudeAutoScale={0.4}
          arcDashLength={0.45}
          arcDashGap={0.18}
          arcDashInitialGap={() => Math.random()}
          arcDashAnimateTime={2600}
          pointsData={CITIES}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => '#FBBF24'}
          pointAltitude={0.01}
          pointRadius={0.32}
          pointResolution={18}
        />
      )}
    </div>
  );
}
