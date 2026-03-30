import { NextRequest, NextResponse } from 'next/server'

interface Place {
  name: string
  latitude: number
  longitude: number
  type: string
  address?: string
}

/**
 * Search for ANY destination using Nominatim (OpenStreetMap)
 * Supports infinite destinations - from major cities to small villages
 * 
 * Example: /api/destinations-search?query=Gokarna
 * Returns: { name: "Gokarna", latitude: 14.55, longitude: 74.75, ... }
 */
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('query')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      )
    }

    console.log(`🔍 Searching for destination: "${query}"`)

    // Step 1: Geocode destination using Nominatim (FREE, unlimited)
    const geocodeResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
      {
        headers: { 'User-Agent': 'TravelMate/1.0' }
      }
    )

    if (!geocodeResponse.ok) {
      throw new Error(`Nominatim error: ${geocodeResponse.statusText}`)
    }

    const geocodeResults = await geocodeResponse.json()

    if (!geocodeResults || geocodeResults.length === 0) {
      return NextResponse.json(
        {
          error: `Destination "${query}" not found. Try a different search.`,
          suggestions: 'Search for city names, landmarks, or regions'
        },
        { status: 404 }
      )
    }

    // Return top 5 results
    const destinations = geocodeResults.slice(0, 5).map((result: any) => ({
      name: result.name || result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      type: result.type,
      address: result.display_name,
      boundingbox: result.boundingbox
    }))

    return NextResponse.json({
      success: true,
      query,
      results: destinations,
      count: destinations.length
    })
  } catch (error) {
    console.error('❌ Destination search error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to search destinations',
        fallback: 'Try searching for a major city'
      },
      { status: 500 }
    )
  }
}
