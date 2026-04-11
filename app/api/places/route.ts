import { NextRequest, NextResponse } from 'next/server'
import { fetchPointsOfInterest, resolveDestination } from '@/services/places'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const radius = searchParams.get('radius')
    const address = searchParams.get('address')
    const types = searchParams.get('types')

    if (address && !lat) {
      const destination = await resolveDestination(address)
      return NextResponse.json({
        success: true,
        address: destination.address ?? destination.name,
        lat: destination.latitude,
        lon: destination.longitude,
        boundingbox: destination.boundingBox ?? null,
      })
    }

    if (query && lat && lon && radius && types) {
      const pois = await fetchPointsOfInterest({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        radius: parseInt(radius, 10),
        types: types.split(',').map(type => type.trim()).filter(Boolean),
      })

      return NextResponse.json({
        success: true,
        query,
        location: { lat: parseFloat(lat), lon: parseFloat(lon) },
        radius: parseInt(radius, 10),
        results: pois,
        count: pois.length,
      })
    }

    return NextResponse.json(
      { error: 'Provide address for geocoding or query, lat, lon, radius, and types for POI search' },
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
