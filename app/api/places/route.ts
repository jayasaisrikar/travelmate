import { NextRequest, NextResponse } from 'next/server'

/**
 * Places API Implementation
 * Uses Geoapify (90K free requests/month) + Nominatim (unlimited free)
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const radius = searchParams.get('radius') || '5000'
    const address = searchParams.get('address')

    // Geocoding mode
    if (address && !lat) {
      return geocodeAddress(address)
    }

    // POI Search mode
    if (query && lat && lon) {
      return searchPlaces(query, parseFloat(lat), parseFloat(lon), parseInt(radius))
    }

    return NextResponse.json(
      { error: 'Missing parameters. Use ?query=restaurants&lat=48&lon=2 or ?address=Paris' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Places API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch places' },
      { status: 500 }
    )
  }
}

async function geocodeAddress(address: string) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'TravelMate-App/1.0'
        }
      }
    )

    if (!response.ok) throw new Error('Nominatim request failed')

    const data = await response.json()
    
    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Address not found',
        results: []
      })
    }

    return NextResponse.json({
      success: true,
      address: data[0].display_name,
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      boundingbox: data[0].boundingbox,
    })
  } catch (error) {
    console.error('Geocoding error:', error)
    throw new Error(`Geocoding failed: ${error}`)
  }
}

async function searchPlaces(
  query: string,
  lat: number,
  lon: number,
  radius: number
) {
  try {
    const apiKey = process.env.GEOAPIFY_API_KEY

    if (!apiKey) {
      console.warn('GEOAPIFY_API_KEY not set, using Nominatim fallback')
      return searchPlacesNominatim(query, lat, lon, radius)
    }

    // Map generic queries to Geoapify categories
    const categoryMap: Record<string, string> = {
      restaurant: 'catering.restaurant',
      restaurants: 'catering.restaurant',
      hotel: 'accommodation.hotel',
      hotels: 'accommodation.hotel',
      attraction: 'tourism.attraction',
      attractions: 'tourism.attraction',
      cafe: 'catering.cafe',
      cafes: 'catering.cafe',
      bar: 'catering.bar',
      bars: 'catering.bar',
      museum: 'tourism.museum',
      museums: 'tourism.museum',
      park: 'leisure.park',
      parks: 'leisure.park',
    }

    const category = categoryMap[query.toLowerCase()] || query

    const geoapifyUrl = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${lon},${lat},${radius}&limit=30&apiKey=${apiKey}`
    
    const response = await fetch(geoapifyUrl)

    if (!response.ok) {
      throw new Error(`Geoapify request failed: ${response.statusText}`)
    }

    const data = await response.json()

    // Transform Geoapify response to standard format
    const places = (data.features || []).map((feature: any) => ({
      id: feature.properties.place_id,
      name: feature.properties.name || feature.properties.address_line1,
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
      address: feature.properties.formatted || feature.properties.address_line2,
      category: feature.properties.categories?.[0] || 'place',
      distance: null,
      phone: feature.properties.contact?.phone || null,
      website: feature.properties.website || null,
      opening_hours: feature.properties.opening_hours || null,
    }))

    return NextResponse.json({
      success: true,
      query,
      location: { lat, lon },
      radius,
      results: places,
      count: places.length,
      provider: 'geoapify'
    })
  } catch (error) {
    console.error('Geoapify search error:', error)
    console.warn('Falling back to Nominatim')
    return searchPlacesNominatim(query, lat, lon, radius)
  }
}

async function searchPlacesNominatim(
  query: string,
  lat: number,
  lon: number,
  radius: number
) {
  try {
    const searchQuery = `${query} near ${lat},${lon}`

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=20`,
      {
        headers: {
          'User-Agent': 'TravelMate-App/1.0'
        }
      }
    )

    if (!response.ok) throw new Error('Nominatim request failed')

    const data = await response.json()

    const places = (data || []).map((place: any) => ({
      id: place.osm_id,
      name: place.name,
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon),
      address: place.display_name,
      category: place.class || 'place',
      distance: null,
      phone: null,
      website: null,
      opening_hours: null,
    }))

    return NextResponse.json({
      success: true,
      query,
      location: { lat, lon },
      radius,
      results: places,
      count: places.length,
      provider: 'nominatim',
      note: 'Using Nominatim (less comprehensive than Geoapify)',
    })
  } catch (error) {
    console.error('Nominatim search error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Places search failed',
      results: [],
    }, { status: 500 })
  }
}
