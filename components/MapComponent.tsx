'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface Activity {
  time: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  estimated_cost: number | null;
  category: string;
  description?: string;
  address?: string | null;
}

interface MapComponentProps {
  activities: Activity[];
  destination: string;
  destinationCoordinates?: { latitude: number; longitude: number } | null;
  stay?: {
    name: string;
    latitude: number;
    longitude: number;
    address: string | null;
  } | null;
  selectedActivityIndex?: number | null;
  focusStayTrigger?: number;
}

function hasValidCoordinates(activity: Activity): activity is Activity & { latitude: number; longitude: number } {
  return typeof activity.latitude === 'number' && typeof activity.longitude === 'number';
}

export function MapComponent({
  activities,
  destination,
  destinationCoordinates,
  stay,
  selectedActivityIndex,
  focusStayTrigger,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [leaflet, setLeaflet] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activityMarkersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  const validActivities = useMemo(() => activities.filter(hasValidCoordinates), [activities]);

  useEffect(() => {
    let mounted = true;

    const loadLeaflet = async () => {
      const module = await import('leaflet');

      if (mounted) {
        setLeaflet(module.default ?? module);
      }
    };

    loadLeaflet();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!leaflet || !mapContainerRef.current) {
      return;
    }

    if (!mapRef.current) {
      mapRef.current = leaflet.map(mapContainerRef.current, {
        zoomControl: false,
        scrollWheelZoom: false,
      });

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      leaflet.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    activityMarkersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const bounds: any[] = [];

    if (destinationCoordinates) {
      const destinationMarker = leaflet.marker([destinationCoordinates.latitude, destinationCoordinates.longitude], {
        icon: leaflet.divIcon({
          html: `
            <div style="
              width: 42px;
              height: 42px;
              border-radius: 14px;
              background: #3F3D56;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 12px;
              border: 3px solid white;
              box-shadow: 0 12px 28px rgba(46, 40, 51, 0.18);
            ">${destination.slice(0, 2).toUpperCase()}</div>
          `,
          className: 'wayflo-destination-marker',
          iconSize: [42, 42],
          iconAnchor: [21, 42],
        }),
      }).addTo(map);

      destinationMarker.bindPopup(`
        <div style="font-family: system-ui; min-width: 180px;">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #6C63FF;">Destination</div>
          <div style="margin-top: 4px; font-size: 16px; font-weight: 800; color: #3F3D56;">${destination}</div>
        </div>
      `);

      markersRef.current.push(destinationMarker);
      bounds.push([destinationCoordinates.latitude, destinationCoordinates.longitude]);
    }

    if (stay) {
      const stayMarker = leaflet.marker([stay.latitude, stay.longitude], {
        icon: leaflet.divIcon({
          html: `
            <div style="
              width: 42px;
              height: 42px;
              border-radius: 14px;
              background: #FF6584;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 12px;
              border: 3px solid white;
              box-shadow: 0 12px 28px rgba(46, 40, 51, 0.18);
            ">ST</div>
          `,
          className: 'wayflo-stay-marker',
          iconSize: [42, 42],
          iconAnchor: [21, 42],
        }),
      }).addTo(map);

      stayMarker.bindPopup(`
        <div style="font-family: system-ui; min-width: 200px;">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #FF6584;">Stay</div>
          <div style="margin-top: 4px; font-size: 16px; font-weight: 800; color: #3F3D56;">${stay.name}</div>
          ${stay.address ? `<div style="margin-top: 4px; font-size: 13px; color: #6F6C82;">${stay.address}</div>` : ''}
        </div>
      `);

      markersRef.current.push(stayMarker);
      bounds.push([stay.latitude, stay.longitude]);
    }

    validActivities.forEach((activity, index) => {
      const palette = ['#6C63FF', '#FF6584', '#FF6584', '#3F3D56'];
      const color = palette[index % palette.length];

      const marker = leaflet.marker([activity.latitude, activity.longitude], {
        icon: leaflet.divIcon({
          html: `
            <div style="
              width: 40px;
              height: 40px;
              border-radius: 14px;
              background: ${color};
              color: ${color === '#FF6584' ? '#3F3D56' : '#ffffff'};
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              border: 3px solid white;
              box-shadow: 0 12px 28px rgba(46, 40, 51, 0.16);
            ">${index + 1}</div>
          `,
          className: 'wayflo-stop-marker',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        }),
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 220px;">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #8A869C;">Stop ${index + 1}</div>
          <div style="margin-top: 4px; font-size: 16px; font-weight: 800; color: #3F3D56;">${activity.time} - ${activity.name}</div>
          <div style="margin-top: 4px; font-size: 13px; color: #6F6C82;">${activity.category}</div>
          ${activity.address ? `<div style="margin-top: 4px; font-size: 13px; color: #6F6C82;">${activity.address}</div>` : ''}
        </div>
      `);

      markersRef.current.push(marker);
      activityMarkersRef.current.push(marker);
      bounds.push([activity.latitude, activity.longitude]);
    });

    if (validActivities.length > 1) {
      polylineRef.current = leaflet.polyline(
        validActivities.map(activity => [activity.latitude, activity.longitude] as [number, number]),
        {
          color: '#6C63FF',
          weight: 3,
          opacity: 0.75,
          dashArray: '8, 8',
        }
      ).addTo(map);
    }

    if (bounds.length > 0) {
      map.fitBounds(leaflet.latLngBounds(bounds).pad(0.16));
    } else if (destinationCoordinates) {
      map.setView([destinationCoordinates.latitude, destinationCoordinates.longitude], 10);
    }

    map.invalidateSize();

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      activityMarkersRef.current = [];

      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    };
  }, [destination, destinationCoordinates, leaflet, validActivities]);

  useEffect(() => {
    if (selectedActivityIndex === null || selectedActivityIndex === undefined) {
      return;
    }

    const map = mapRef.current;
    const marker = activityMarkersRef.current[selectedActivityIndex];

    if (!map || !marker) {
      return;
    }

    const target = marker.getLatLng();
    map.flyTo(target, Math.max(map.getZoom(), 14), {
      duration: 0.7,
    });
    marker.openPopup();
  }, [leaflet, selectedActivityIndex, validActivities.length]);

  useEffect(() => {
    if (!stay || focusStayTrigger === undefined || focusStayTrigger <= 0) {
      return;
    }

    const map = mapRef.current;

    if (!map) {
      return;
    }

    const target = leaflet.latLng(stay.latitude, stay.longitude);
    map.flyTo(target, Math.max(map.getZoom(), 14), {
      duration: 0.7,
    });
  }, [focusStayTrigger, leaflet, stay]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (validActivities.length === 0 && !destinationCoordinates) {
    return (
      <div className="flex h-full flex-col rounded-[28px] border border-[#DDDCE8] bg-white p-6 shadow-[0_16px_48px_rgba(46,40,51,0.06)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6584] text-sm font-black text-[#3F3D56]">
            MAP
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-[#3F3D56]">No map coordinates yet</h3>
            <p className="mt-2 text-sm leading-6 text-[#6F6C82]">
              This trip does not include geocoded stops yet, so we can’t place markers on the map.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-0 flex h-full flex-col rounded-[28px] border border-[#DDDCE8] bg-white p-4 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-5 lg:h-[360px]">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Trip map</div>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-[#3F3D56]">Where the trip actually goes</h3>
        </div>
        <div className="text-sm text-[#6F6C82]">
          {validActivities.length} mapped stop{validActivities.length === 1 ? '' : 's'}
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="relative z-0 min-h-[240px] flex-1 overflow-hidden rounded-[24px] border border-[#DDDCE8] bg-[#FBFAFF] lg:min-h-0"
      />
    </div>
  );
}
