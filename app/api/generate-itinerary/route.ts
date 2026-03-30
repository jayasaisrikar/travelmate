import { NextRequest, NextResponse } from 'next/server'

async function generateWithKimi(destination: string, duration: number, budget: string, interests: string[]) {
  try {
    const apiKey = process.env.NVIDIA_KIMI_API_KEY
    if (!apiKey) throw new Error('No NVIDIA Kimi API key')

    const prompt = `You are a travel planner. Create a simple JSON itinerary.
    
Destination: ${destination}
Duration: ${duration} days
Budget: ${budget}
Interests: ${interests.join(', ')}

Output ONLY this JSON structure with real place names (no generic names):
{
  "title": "Trip to ${destination}",
  "destination": "${destination}",
  "duration": ${duration},
  "daily_plans": [{
    "day": 1,
    "theme": "Explore ${destination}",
    "activities": [
      {"time": "09:00", "name": "Real place 1", "description": "Visit", "estimated_cost": 20, "category": "Culture"},
      {"time": "12:00", "name": "Real restaurant 1", "description": "Lunch", "estimated_cost": 30, "category": "Food"},
      {"time": "15:00", "name": "Real place 2", "description": "Visit", "estimated_cost": 20, "category": "Culture"},
      {"time": "19:00", "name": "Real restaurant 2", "description": "Dinner", "estimated_cost": 35, "category": "Food"}
    ]
  }],
  "total_estimated_cost": ${duration * 150},
  "budget_breakdown": {"flights": 200, "hotels": 400, "food": 150, "activities": 100, "transport": 50, "misc": 0, "total": ${duration * 150}},
  "tips": ["Book ahead", "Try local food", "Use transit"]
}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2.5',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          top_p: 0.5,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API error ${response.status}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in response')
    }

    let jsonString = content.trim()
    jsonString = jsonString.replace(/^```json\s*/i, '')
    jsonString = jsonString.replace(/\s*```$/i, '')
    jsonString = jsonString.replace(/^```\s*/i, '')
    jsonString = jsonString.replace(/\s*```$/i, '')
    jsonString = jsonString.trim()

    const itinerary = JSON.parse(jsonString)
    console.log(`✅ Kimi generated itinerary for ${destination}`)
    return itinerary
  } catch (error) {
    console.error('Kimi error:', error instanceof Error ? error.message : error)
    return null
  }
}

function generateItineraryWithRealNames(destination: string, duration: number, budget: string, interests: string[]) {
  const realActivities: Record<string, { time: string; name: string; category: string; cost: number; lat: number; lon: number }[]> = {
    'Paris': [
      { time: '09:00', name: 'Louvre Museum', category: 'Culture', cost: 25, lat: 48.8606, lon: 2.3352 },
      { time: '12:00', name: 'Lunch at Le Cafe de Flore', category: 'Food', cost: 35, lat: 48.8534, lon: 2.3314 },
      { time: '15:00', name: 'Arc de Triomphe Visit', category: 'Culture', cost: 15, lat: 48.8738, lon: 2.2950 },
      { time: '19:00', name: 'Dinner at Astrance', category: 'Food', cost: 45, lat: 48.8566, lon: 2.2975 }
    ],
    'Tokyo': [
      { time: '09:00', name: 'Shibuya Crossing', category: 'Culture', cost: 0, lat: 35.6595, lon: 139.7004 },
      { time: '12:00', name: 'Lunch at Tsukiji Outer Market', category: 'Food', cost: 20, lat: 35.6645, lon: 139.7745 },
      { time: '15:00', name: 'Senso-ji Temple Visit', category: 'Culture', cost: 10, lat: 35.7148, lon: 139.7967 },
      { time: '19:00', name: 'Dinner at Ramen Alley', category: 'Food', cost: 15, lat: 35.6629, lon: 139.7705 }
    ],
    'Barcelona': [
      { time: '09:00', name: 'Sagrada Familia', category: 'Culture', cost: 30, lat: 41.4036, lon: 2.1744 },
      { time: '12:00', name: 'Lunch at Cerveceria Catalana', category: 'Food', cost: 25, lat: 41.3874, lon: 2.1686 },
      { time: '15:00', name: 'Park Guell', category: 'Culture', cost: 20, lat: 41.4142, lon: 2.1529 },
      { time: '19:00', name: 'Dinner at El Xampanyet', category: 'Food', cost: 30, lat: 41.3835, lon: 2.1801 }
    ],
    'Rome': [
      { time: '09:00', name: 'Colosseum Tour', category: 'History', cost: 35, lat: 41.8902, lon: 12.4922 },
      { time: '12:00', name: 'Lunch at Armando al Pantheon', category: 'Food', cost: 30, lat: 41.8986, lon: 12.4769 },
      { time: '15:00', name: 'Vatican Museums', category: 'Culture', cost: 40, lat: 41.9065, lon: 12.4545 },
      { time: '19:00', name: 'Dinner in Trastevere', category: 'Food', cost: 35, lat: 41.8927, lon: 12.4695 }
    ],
    'Berlin': [
      { time: '09:00', name: 'Brandenburg Gate', category: 'History', cost: 0, lat: 52.5163, lon: 13.3777 },
      { time: '12:00', name: 'Lunch at Curry 36', category: 'Food', cost: 12, lat: 52.5051, lon: 13.3996 },
      { time: '15:00', name: 'Berlin Wall Memorial', category: 'History', cost: 10, lat: 52.5380, lon: 13.3905 },
      { time: '19:00', name: 'Dinner at Prater Garten', category: 'Food', cost: 25, lat: 52.5250, lon: 13.4009 }
    ],
    'Agra': [
      { time: '09:00', name: 'Taj Mahal Sunrise Visit', category: 'History', cost: 40, lat: 27.1751, lon: 78.0421 },
      { time: '11:30', name: 'Marble Inlay Workshop Tour', category: 'Culture', cost: 15, lat: 27.1810, lon: 78.0350 },
      { time: '14:00', name: 'Lunch at Panna II Restaurant', category: 'Food', cost: 20, lat: 27.1850, lon: 78.0285 },
      { time: '16:00', name: 'Agra Fort Exploration', category: 'History', cost: 25, lat: 27.1866, lon: 78.0027 },
      { time: '19:00', name: 'Dinner with Taj View at Hotel', category: 'Food', cost: 35, lat: 27.1800, lon: 78.0400 }
    ],
    'Delhi': [
      { time: '09:00', name: 'Red Fort Tour', category: 'History', cost: 30, lat: 28.6562, lon: 77.2410 },
      { time: '12:00', name: 'Lunch at Karim\'s Restaurant', category: 'Food', cost: 18, lat: 28.6500, lon: 77.2300 },
      { time: '14:00', name: 'Jama Masjid Visit', category: 'Culture', cost: 15, lat: 28.6505, lon: 77.2308 },
      { time: '16:30', name: 'Chandni Chowk Walking Tour', category: 'Shopping', cost: 0, lat: 28.6505, lon: 77.2300 },
      { time: '19:00', name: 'Dinner at Bukhara Restaurant', category: 'Food', cost: 40, lat: 28.5933, lon: 77.2197 }
    ],
    'Jaipur': [
      { time: '09:00', name: 'City Palace Tour', category: 'Culture', cost: 25, lat: 26.9262, lon: 75.8244 },
      { time: '11:30', name: 'Hawa Mahal (Palace of Winds)', category: 'History', cost: 20, lat: 26.9257, lon: 75.8292 },
      { time: '14:00', name: 'Lunch at 1135 AD Restaurant', category: 'Food', cost: 25, lat: 26.9124, lon: 75.8262 },
      { time: '16:00', name: 'Jantar Mantar Observatory', category: 'History', cost: 20, lat: 26.9244, lon: 75.8237 },
      { time: '19:00', name: 'Dinner at Tapestry Restaurant', category: 'Food', cost: 30, lat: 26.9124, lon: 75.7975 }
    ],
    'Mumbai': [
      { time: '09:00', name: 'Gateway of India', category: 'History', cost: 0, lat: 18.9220, lon: 72.8347 },
      { time: '11:00', name: 'Taj Hotel Heritage Tour', category: 'Culture', cost: 20, lat: 18.9428, lon: 72.8236 },
      { time: '13:00', name: 'Lunch at Mahesh Lunch Home', category: 'Food', cost: 30, lat: 18.9428, lon: 72.8347 },
      { time: '15:00', name: 'Marine Drive Walk', category: 'Culture', cost: 0, lat: 18.9432, lon: 72.8236 },
      { time: '19:00', name: 'Dinner at The Bombay Brasserie', category: 'Food', cost: 45, lat: 19.0176, lon: 72.8479 }
    ],
    'Kerala': [
      { time: '08:00', name: 'Sunrise Backwater Houseboat Ride', category: 'Nature', cost: 50, lat: 9.5790, lon: 76.5214 },
      { time: '12:00', name: 'Lunch on Houseboat', category: 'Food', cost: 25, lat: 9.5800, lon: 76.5220 },
      { time: '14:00', name: 'Spice Garden Tour', category: 'Culture', cost: 20, lat: 9.5850, lon: 76.5300 },
      { time: '16:30', name: 'Beach Walk at Munnar', category: 'Beach', cost: 0, lat: 10.5892, lon: 76.7844 },
      { time: '19:00', name: 'Dinner with Local Cuisine', category: 'Food', cost: 28, lat: 9.5790, lon: 76.5214 }
    ],
    'Hyderabad': [
      { time: '09:00', name: 'Charminar & Old City Walk', category: 'History', cost: 15, lat: 17.3629, lon: 78.4747 },
      { time: '12:00', name: 'Lunch at Haleem House', category: 'Food', cost: 18, lat: 17.3600, lon: 78.4700 },
      { time: '14:00', name: 'Hussain Sagar Lake Visit', category: 'Culture', cost: 0, lat: 17.3736, lon: 78.4825 },
      { time: '16:30', name: 'Falaknuma Palace Tour', category: 'History', cost: 30, lat: 17.3521, lon: 78.4670 },
      { time: '19:00', name: 'Dinner at Peshawri Restaurant', category: 'Food', cost: 35, lat: 17.3850, lon: 78.4730 }
    ],
    'Vizag': [
      { time: '07:00', name: 'Sunrise at Vizag Beach', category: 'Beach', cost: 0, lat: 17.6869, lon: 83.2185 },
      { time: '10:00', name: 'Araku Valley Day Trip', category: 'Adventure', cost: 45, lat: 17.7298, lon: 82.5 },
      { time: '13:00', name: 'Coffee Plantation Tour', category: 'Culture', cost: 25, lat: 17.7200, lon: 82.4800 },
      { time: '15:30', name: 'Submarine Museum Visit', category: 'Culture', cost: 20, lat: 17.6900, lon: 83.2200 },
      { time: '18:30', name: 'Dinner at Haritha Beach Resort', category: 'Food', cost: 35, lat: 17.6850, lon: 83.2100 }
    ],
    'Bangalore': [
      { time: '09:00', name: 'Bangalore Palace Tour', category: 'History', cost: 30, lat: 12.9716, lon: 77.5946 },
      { time: '12:00', name: 'Lunch at MTR Restaurant', category: 'Food', cost: 15, lat: 12.9789, lon: 77.5973 },
      { time: '14:00', name: 'Vidhana Soudha Visit', category: 'Culture', cost: 0, lat: 12.9848, lon: 77.5904 },
      { time: '16:00', name: 'Cubbon Park Walk', category: 'Nature', cost: 0, lat: 12.9898, lon: 77.5941 },
      { time: '18:30', name: 'Dinner at Karavali', category: 'Food', cost: 40, lat: 12.9716, lon: 77.5946 }
    ],
    'Pune': [
      { time: '09:00', name: 'Aga Khan Palace Tour', category: 'History', cost: 25, lat: 18.5290, lon: 73.8243 },
      { time: '12:00', name: 'Lunch at Hari Om', category: 'Food', cost: 18, lat: 18.5205, lon: 73.8567 },
      { time: '14:00', name: 'Osho Ashram Visit', category: 'Culture', cost: 35, lat: 18.5335, lon: 73.8673 },
      { time: '16:30', name: 'Shaniwar Wada Fort', category: 'History', cost: 20, lat: 18.5196, lon: 73.8451 },
      { time: '18:30', name: 'Dinner at Blue Moose', category: 'Food', cost: 38, lat: 18.5250, lon: 73.8550 }
    ],
    'Kochi': [
      { time: '07:00', name: 'Chinese Fishing Nets Tour', category: 'Culture', cost: 15, lat: 9.9673, lon: 76.2487 },
      { time: '10:00', name: 'Backwater Houseboat Cruise', category: 'Nature', cost: 50, lat: 9.9312, lon: 76.2673 },
      { time: '13:00', name: 'Lunch on Houseboat', category: 'Food', cost: 25, lat: 9.9500, lon: 76.2600 },
      { time: '15:00', name: 'Jewish Synagogue & Spice Market', category: 'Culture', cost: 20, lat: 9.9673, lon: 76.2365 },
      { time: '18:00', name: 'Sunset at Fort Kochi Beach', category: 'Beach', cost: 0, lat: 9.9673, lon: 76.2487 }
    ]
  }

  const activities = realActivities[destination] || [
    { time: '09:00', name: `Main Attraction in ${destination}`, category: interests[0] || 'Culture', cost: 20, lat: 0, lon: 0 },
    { time: '12:00', name: `Local Restaurant in ${destination}`, category: 'Food', cost: 25, lat: 0, lon: 0 },
    { time: '15:00', name: `${interests[1] || 'Cultural'} Site in ${destination}`, category: interests[1] || 'Culture', cost: 20, lat: 0, lon: 0 },
    { time: '19:00', name: `Premium Dining in ${destination}`, category: 'Food', cost: 30, lat: 0, lon: 0 }
  ]

  const totalCost = duration * (budget === 'Budget' ? 80 : budget === 'Mid-range' ? 150 : 300)

  return {
    title: `${duration} Days in ${destination} - ${interests.join(' & ')} Experience`,
    destination,
    duration,
    daily_plans: Array.from({ length: duration }, (_, d) => ({
      day: d + 1,
      date: `Day ${d + 1}`,
      theme: `Explore ${destination} - Day ${d + 1}`,
      activities: activities.map((a: any) => ({
        time: a.time,
        name: a.name,
        category: a.category,
        cost: a.cost,
        description: `Enjoy ${a.name}`,
        estimated_cost: a.cost,
        latitude: a.lat || 0,
        longitude: a.lon || 0,
        address: `${destination}, ${a.name}`
      }))
    })),
    total_estimated_cost: totalCost,
    budget_breakdown: {
      flights: Math.round(totalCost * 0.3),
      hotels: Math.round(totalCost * 0.4),
      food: Math.round(totalCost * 0.15),
      activities: Math.round(totalCost * 0.1),
      transport: Math.round(totalCost * 0.05),
      misc: 0,
      total: totalCost
    },
    tips: [
      `Book top attractions in advance for ${destination}`,
      `Try local cuisine at recommended venues`,
      `Use public transportation for exploring ${destination}`
    ]
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { destination, duration, budget, interests } = body

    if (!destination || !duration || !budget || !interests) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`📍 Generating itinerary for ${destination} (${duration} days, ${budget})`)
    
    // Try Kimi first
    let itinerary = await generateWithKimi(destination, duration, budget, interests)
    
    // Fall back to real landmarks database if Kimi fails
    if (!itinerary) {
      console.log(`⚠️ Kimi failed, using fallback real landmarks database`)
      itinerary = generateItineraryWithRealNames(destination, duration, budget, interests)
    }

    return NextResponse.json({
      success: true,
      itinerary,
      budgetBreakdown: itinerary.budget_breakdown,
      source: itinerary ? 'kimi' : 'fallback',
    })
  } catch (error) {
    console.error('❌ Itinerary generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate itinerary' },
      { status: 500 }
    )
  }
}
