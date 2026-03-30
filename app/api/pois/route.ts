import { NextRequest, NextResponse } from 'next/server'

interface POI {
  name: string
  type: string // restaurant, hotel, museum, beach, temple, etc.
  latitude: number
  longitude: number
  address?: string
  tags?: Record<string, string>
}

/**
 * Fetch real Points of Interest (POIs) for a destination
 * Uses Overpass API (FREE, unlimited) - queries OpenStreetMap data
 * 
 * Example: /api/pois?lat=14.55&lon=74.75&radius=5000&types=restaurant,beach
 * Returns real restaurants, beaches, temples, hotels, etc. in that area
 */
export async function GET(request: NextRequest) {
  try {
    const lat = request.nextUrl.searchParams.get('lat')
    const lon = request.nextUrl.searchParams.get('lon')
    const radius = request.nextUrl.searchParams.get('radius') || '5000' // 5km default
    const typesParam = request.nextUrl.searchParams.get('types') || 'restaurant,museum,hotel,beach,temple'

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude required' },
        { status: 400 }
      )
    }

    console.log(`📍 Fetching POIs for (${lat}, ${lon}), radius: ${radius}m, types: ${typesParam}`)

    const types = typesParam.split(',').map(t => t.trim())
    const allPOIs: POI[] = []

    // Build Overpass API query for each type
    // This gets REAL data from OpenStreetMap
    const overpassQueries = buildOverpassQueries(parseFloat(lat), parseFloat(lon), parseInt(radius), types)

    // Execute queries (with rate limiting)
    for (const query of overpassQueries) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.warn(`⚠️ Overpass API status: ${response.status}`)
          continue
        }

        const data = await response.json()

        // Parse OSM elements into POIs
        if (data.elements) {
          const pois = data.elements
            .filter((elem: any) => elem.tags && elem.tags.name)
            .map((elem: any) => ({
              name: elem.tags.name,
              type: elem.tags.tourism || elem.tags.amenity || elem.tags.natural || 'landmark',
              latitude: elem.lat || elem.center?.lat,
              longitude: elem.lon || elem.center?.lon,
              address: elem.tags['addr:full'] || `${elem.tags['addr:street'] || ''} ${elem.tags['addr:city'] || ''}`.trim(),
              tags: elem.tags
            }))
            .filter((poi: POI) => poi.latitude && poi.longitude)

          allPOIs.push(...pois)
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        console.warn('⚠️ Error fetching POI batch:', err)
        continue
      }
    }

    // Deduplicate by name
    const uniquePOIs = Array.from(
      new Map(allPOIs.map(poi => [poi.name, poi])).values()
    )

    // Sort by type relevance and limit
    const sortedPOIs = uniquePOIs.slice(0, 50)

    return NextResponse.json({
      success: true,
      location: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
      radius: parseInt(radius),
      pois: sortedPOIs,
      count: sortedPOIs.length,
      types: types
    })
  } catch (error) {
    console.error('❌ POI fetch error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch POIs',
        pois: []
      },
      { status: 500 }
    )
  }
}

/**
 * Build Overpass API queries for different POI types
 * Returns array of queries to execute sequentially
 */
function buildOverpassQueries(
  lat: number,
  lon: number,
  radius: number,
  types: string[]
): string[] {
  const queries: string[] = []

  const typeMap: Record<string, string> = {
    restaurant: '[amenity=restaurant]',
    hotel: '[tourism=hotel][tourism=guest_house][tourism=hostel]',
    beach: '[natural=beach]',
    temple: '[amenity=place_of_worship]',
    museum: '[tourism=museum]',
    park: '[leisure=park]',
    cafe: '[amenity=cafe]',
    bar: '[amenity=bar]',
    market: '[amenity=marketplace]',
    viewpoint: '[tourism=viewpoint]',
    attraction: '[tourism=attraction]'
  }

  // Create query for each type
  for (const type of types) {
    const osmTag = typeMap[type] || `[name~"${type}",i]`

    // Overpass QL query - gets all nodes and ways with that tag within radius
    const query = `
      [out:json][timeout:10];
      (
        node${osmTag}(around:${radius},${lat},${lon});
        way${osmTag}(around:${radius},${lat},${lon});
        relation${osmTag}(around:${radius},${lat},${lon});
      );
      out body center geom;
    `

    queries.push(query)
  }

  return queries
}
