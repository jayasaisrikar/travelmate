'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Activity {
  time: string
  name: string
  latitude: number
  longitude: number
  estimated_cost: number
  category: string
}

interface MapComponentProps {
  activities: Activity[]
  destination: string
}

export function MapComponent({ activities, destination }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylineRef = useRef<L.Polyline | null>(null)

  useEffect(() => {
    if (!mapRef.current && activities.length > 0) {
      // Initialize map
      const map = L.map('map').setView([activities[0].latitude, activities[0].longitude], 13)
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
    }

    if (mapRef.current && activities.length > 0) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []

      // Clear existing polyline
      if (polylineRef.current) {
        polylineRef.current.remove()
      }

      // Create custom icons
      const createIcon = (index: number) => {
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4']
        const color = colors[index % colors.length]
        
        return L.divIcon({
          html: `
            <div style="
              background: ${color};
              color: white;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 14px;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              ${index + 1}
            </div>
          `,
          iconSize: [40, 40],
          className: 'custom-marker',
        })
      }

      // Add markers for each activity
      activities.forEach((activity, index) => {
        const marker = L.marker([activity.latitude, activity.longitude], {
          icon: createIcon(index),
        }).addTo(mapRef.current!)

        // Popup with activity details
        const popupContent = `
          <div style="font-family: system-ui; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
              ${activity.time} - ${activity.name}
            </h3>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
              ${activity.category}
            </p>
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #3b82f6;">
              $${activity.estimated_cost}
            </p>
          </div>
        `

        marker.bindPopup(popupContent)
        markersRef.current.push(marker)
      })

      // Draw polyline connecting activities
      const coordinates = activities.map(a => [a.latitude, a.longitude] as [number, number])
      if (coordinates.length > 1) {
        polylineRef.current = L.polyline(coordinates, {
          color: '#3b82f6',
          weight: 2,
          opacity: 0.7,
          dashArray: '5, 5',
        }).addTo(mapRef.current!)
      }

      // Fit map to all markers
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current)
        mapRef.current!.fitBounds(group.getBounds().pad(0.1))
      }
    }
  }, [activities])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trip Map - {destination}</h2>
        <p className="text-sm text-slate-600">{activities.length} activities</p>
      </div>
      
      <div
        id="map"
        style={{
          height: '500px',
          borderRadius: '8px',
          border: '2px solid #e2e8f0',
          overflow: 'hidden',
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activities.map((activity, idx) => (
          <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex gap-3">
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'][
                    idx % 5
                  ],
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{activity.time}</div>
                <div className="text-sm text-slate-600">{activity.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {activity.category} • ${activity.estimated_cost}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
