import { NextRequest, NextResponse } from 'next/server'

interface TravelerProfile {
  destination: string
  arrivalDate: string
  arrivalTime: string
  arrivalMethod: 'flight' | 'train' | 'drive'
  departureDate: string
  departureTime: string
  activityIntensity: 'Relaxed' | 'Balanced' | 'Packed'
  sleepHours: number
  dietaryRestrictions: string[]
  budget: number
  interests: string[]
}

interface Activity {
  time: string
  name: string
  description: string
  duration: number
  cost: number
  category: string
  latitude: number
  longitude: number
  address: string
}

interface DayPlan {
  day: number
  date: string
  theme: string
  arrival?: { time: string; method: string }
  checkout?: { time: string }
  activities: Activity[]
  restSlots: { time: string; duration: string }[]
  totalActiveHours: number
  intensity: string
}

// Mock activities - in production, would pull real data from API
// For now, generates placeholder activities with 0,0 coords
// Real landmark data is in /api/generate-itinerary with real coordinates
function generateMockActivities(destination: string, interests: string[]): Activity[] {
  const destinationCoords: Record<string, [number, number]> = {
    'Hyderabad': [17.3629, 78.4747],
    'Mumbai': [18.9220, 72.8347],
    'Delhi': [28.6562, 77.2410],
    'Agra': [27.1751, 78.0421],
  }

  const mockActivities: Record<string, Activity[]> = {
    'Hyderabad': [
      {
        time: '09:00',
        name: 'Charminar & Old City Walk',
        description: 'Explore historic Charminar monument',
        duration: 120,
        cost: 15,
        category: 'History',
        latitude: 17.3629,
        longitude: 78.4747,
        address: 'Charminar, Hyderabad'
      },
      {
        time: '12:00',
        name: 'Haleem House Lunch',
        description: 'Traditional Hyderabadi haleem cuisine',
        duration: 60,
        cost: 18,
        category: 'Food',
        latitude: 17.3600,
        longitude: 78.4700,
        address: 'Old City, Hyderabad'
      },
      {
        time: '14:00',
        name: 'Hussain Sagar Lake',
        description: 'Scenic lake walk and Buddha statue view',
        duration: 90,
        cost: 0,
        category: 'Culture',
        latitude: 17.3736,
        longitude: 78.4825,
        address: 'Hussain Sagar, Hyderabad'
      },
      {
        time: '16:30',
        name: 'Falaknuma Palace Tour',
        description: 'Visit historic Falaknuma Palace',
        duration: 120,
        cost: 30,
        category: 'History',
        latitude: 17.3521,
        longitude: 78.4670,
        address: 'Falaknuma Palace, Hyderabad'
      },
      {
        time: '19:00',
        name: 'Peshawri Restaurant Dinner',
        description: 'Premium dining experience',
        duration: 120,
        cost: 35,
        category: 'Food',
        latitude: 17.3850,
        longitude: 78.4730,
        address: 'Oberoi Hotel, Hyderabad'
      }
    ],
    'Mumbai': [
      {
        time: '09:00',
        name: 'Gateway of India',
        description: 'Iconic Mumbai monument',
        duration: 90,
        cost: 0,
        category: 'History',
        latitude: 18.9220,
        longitude: 72.8347,
        address: 'Gateway of India, Mumbai'
      },
      {
        time: '11:00',
        name: 'Taj Hotel Heritage Tour',
        description: 'Historic hotel with ocean views',
        duration: 60,
        cost: 20,
        category: 'Culture',
        latitude: 18.9428,
        longitude: 72.8236,
        address: 'Taj Hotel, Mumbai'
      },
      {
        time: '13:00',
        name: 'Mahesh Lunch Home',
        description: 'Seafood restaurant experience',
        duration: 90,
        cost: 30,
        category: 'Food',
        latitude: 18.9428,
        longitude: 72.8347,
        address: 'Mahesh Lunch Home, Mumbai'
      },
      {
        time: '15:00',
        name: 'Marine Drive Walk',
        description: 'Scenic coastal promenade',
        duration: 90,
        cost: 0,
        category: 'Culture',
        latitude: 18.9432,
        longitude: 72.8236,
        address: 'Marine Drive, Mumbai'
      },
      {
        time: '19:00',
        name: 'The Bombay Brasserie Dinner',
        description: 'Premium dining with ambiance',
        duration: 120,
        cost: 45,
        category: 'Food',
        latitude: 19.0176,
        longitude: 72.8479,
        address: 'The Bombay Brasserie, Mumbai'
      }
    ],
    'Delhi': [
      {
        time: '09:00',
        name: 'Red Fort Tour',
        description: 'Magnificent Mughal fortress',
        duration: 120,
        cost: 30,
        category: 'History',
        latitude: 28.6562,
        longitude: 77.2410,
        address: 'Red Fort, Delhi'
      },
      {
        time: '12:00',
        name: 'Karim\'s Restaurant Lunch',
        description: 'Traditional Mughlai cuisine',
        duration: 90,
        cost: 18,
        category: 'Food',
        latitude: 28.6500,
        longitude: 77.2300,
        address: 'Jama Masjid Area, Delhi'
      },
      {
        time: '14:00',
        name: 'Jama Masjid Visit',
        description: 'India\'s largest mosque',
        duration: 90,
        cost: 15,
        category: 'Culture',
        latitude: 28.6505,
        longitude: 77.2308,
        address: 'Jama Masjid, Delhi'
      },
      {
        time: '16:30',
        name: 'Chandni Chowk Walking Tour',
        description: 'Historic market and bazaar',
        duration: 90,
        cost: 0,
        category: 'Shopping',
        latitude: 28.6505,
        longitude: 77.2300,
        address: 'Chandni Chowk, Delhi'
      },
      {
        time: '19:00',
        name: 'Bukhara Restaurant Dinner',
        description: 'Tandoori cuisine experience',
        duration: 120,
        cost: 40,
        category: 'Food',
        latitude: 28.5933,
        longitude: 77.2197,
        address: 'Bukhara Restaurant, Delhi'
      }
    ],
    'Agra': [
      {
        time: '05:00',
        name: 'Taj Mahal Sunrise Visit',
        description: 'The monument of love at dawn',
        duration: 120,
        cost: 40,
        category: 'History',
        latitude: 27.1751,
        longitude: 78.0421,
        address: 'Taj Mahal, Agra'
      },
      {
        time: '09:00',
        name: 'Marble Inlay Workshop Tour',
        description: 'Artisan craftsmanship showcase',
        duration: 90,
        cost: 15,
        category: 'Culture',
        latitude: 27.1810,
        longitude: 78.0350,
        address: 'Marble Workshop, Agra'
      },
      {
        time: '12:00',
        name: 'Panna II Restaurant Lunch',
        description: 'Local Agra cuisine',
        duration: 60,
        cost: 20,
        category: 'Food',
        latitude: 27.1850,
        longitude: 78.0285,
        address: 'Panna II, Agra'
      },
      {
        time: '14:00',
        name: 'Agra Fort Exploration',
        description: 'Mughal fortress complex',
        duration: 120,
        cost: 25,
        category: 'History',
        latitude: 27.1866,
        longitude: 78.0027,
        address: 'Agra Fort, Agra'
      },
      {
        time: '18:00',
        name: 'Taj View Hotel Dinner',
        description: 'Dinner with Taj Mahal view',
        duration: 120,
        cost: 35,
        category: 'Food',
        latitude: 27.1800,
        longitude: 78.0400,
        address: 'Hotel with Taj View, Agra'
      }
    ],
    'Vizag': [
      {
        time: '07:00',
        name: 'Sunrise at Vizag Beach',
        description: 'Beautiful coastal sunrise experience',
        duration: 90,
        cost: 0,
        category: 'Beach',
        latitude: 17.6869,
        longitude: 83.2185,
        address: 'Vizag Beach, Andhra Pradesh'
      },
      {
        time: '10:00',
        name: 'Araku Valley Day Trip',
        description: 'Scenic mountain valley exploration',
        duration: 240,
        cost: 45,
        category: 'Adventure',
        latitude: 17.7298,
        longitude: 82.5,
        address: 'Araku Valley, Andhra Pradesh'
      },
      {
        time: '13:00',
        name: 'Local Coffee Plantation Tour',
        description: 'Coffee and tribal culture experience',
        duration: 120,
        cost: 25,
        category: 'Culture',
        latitude: 17.7200,
        longitude: 82.4800,
        address: 'Araku Coffee Farms'
      },
      {
        time: '15:30',
        name: 'Submarine Museum Visit',
        description: 'Naval heritage and submarine tour',
        duration: 90,
        cost: 20,
        category: 'Culture',
        latitude: 17.6900,
        longitude: 83.2200,
        address: 'Submarine Museum, Vizag'
      },
      {
        time: '18:30',
        name: 'Dinner at Haritha Beach Resort',
        description: 'Seafood dinner with beach view',
        duration: 120,
        cost: 35,
        category: 'Food',
        latitude: 17.6850,
        longitude: 83.2100,
        address: 'Haritha Beach, Vizag'
      }
    ],
    'Bangalore': [
      {
        time: '09:00',
        name: 'Bangalore Palace Tour',
        description: 'Historic royal palace architecture',
        duration: 120,
        cost: 30,
        category: 'History',
        latitude: 12.9716,
        longitude: 77.5946,
        address: 'Bangalore Palace'
      },
      {
        time: '12:00',
        name: 'MTR Restaurant Lunch',
        description: 'Famous South Indian cuisine',
        duration: 60,
        cost: 15,
        category: 'Food',
        latitude: 12.9789,
        longitude: 77.5973,
        address: 'MTR Restaurant, Bangalore'
      },
      {
        time: '14:00',
        name: 'Vidhana Soudha Visit',
        description: 'Government building and landmark',
        duration: 90,
        cost: 0,
        category: 'Culture',
        latitude: 12.9848,
        longitude: 77.5904,
        address: 'Vidhana Soudha, Bangalore'
      },
      {
        time: '16:00',
        name: 'Cubbon Park Walk',
        description: 'Historic garden and nature walk',
        duration: 90,
        cost: 0,
        category: 'Nature',
        latitude: 12.9898,
        longitude: 77.5941,
        address: 'Cubbon Park, Bangalore'
      },
      {
        time: '18:30',
        name: 'Dinner at Karavali',
        description: 'Coastal cuisine experience',
        duration: 120,
        cost: 40,
        category: 'Food',
        latitude: 12.9716,
        longitude: 77.5946,
        address: 'Karavali Restaurant, Bangalore'
      }
    ],
    'Pune': [
      {
        time: '09:00',
        name: 'Aga Khan Palace Tour',
        description: 'Historic palace and museum',
        duration: 120,
        cost: 25,
        category: 'History',
        latitude: 18.5290,
        longitude: 73.8243,
        address: 'Aga Khan Palace, Pune'
      },
      {
        time: '12:00',
        name: 'Lunch at Hari Om',
        description: 'Traditional Maharashtrian cuisine',
        duration: 60,
        cost: 18,
        category: 'Food',
        latitude: 18.5205,
        longitude: 73.8567,
        address: 'Hari Om Restaurant, Pune'
      },
      {
        time: '14:00',
        name: 'Osho Ashram Visit',
        description: 'Spiritual and meditation center',
        duration: 120,
        cost: 35,
        category: 'Culture',
        latitude: 18.5335,
        longitude: 73.8673,
        address: 'Osho Ashram, Pune'
      },
      {
        time: '16:30',
        name: 'Shaniwar Wada Fort',
        description: 'Historic Marathi fort and palace',
        duration: 90,
        cost: 20,
        category: 'History',
        latitude: 18.5196,
        longitude: 73.8451,
        address: 'Shaniwar Wada, Pune'
      },
      {
        time: '18:30',
        name: 'Dinner at Blue Moose',
        description: 'Modern Indian fusion dining',
        duration: 120,
        cost: 38,
        category: 'Food',
        latitude: 18.5250,
        longitude: 73.8550,
        address: 'Blue Moose, Pune'
      }
    ],
    'Kochi': [
      {
        time: '07:00',
        name: 'Chinese Fishing Nets Tour',
        description: 'Ancient fishing technique experience',
        duration: 90,
        cost: 15,
        category: 'Culture',
        latitude: 9.9673,
        longitude: 76.2487,
        address: 'Chinese Fishing Nets, Kochi'
      },
      {
        time: '10:00',
        name: 'Backwater Houseboat Cruise',
        description: 'Scenic backwater journey',
        duration: 180,
        cost: 50,
        category: 'Nature',
        latitude: 9.9312,
        longitude: 76.2673,
        address: 'Kochi Backwaters'
      },
      {
        time: '13:00',
        name: 'Lunch on Houseboat',
        description: 'Authentic Kerala cuisine',
        duration: 90,
        cost: 25,
        category: 'Food',
        latitude: 9.9500,
        longitude: 76.2600,
        address: 'Backwater Houseboat'
      },
      {
        time: '15:00',
        name: 'Jewish Synagogue & Spice Market',
        description: 'Historic spice market and synagogue',
        duration: 120,
        cost: 20,
        category: 'Culture',
        latitude: 9.9673,
        longitude: 76.2365,
        address: 'Jew Town, Kochi'
      },
      {
        time: '18:00',
        name: 'Sunset at Fort Kochi Beach',
        description: 'Beach walk and sunset experience',
        duration: 90,
        cost: 0,
        category: 'Beach',
        latitude: 9.9673,
        longitude: 76.2487,
        address: 'Fort Kochi Beach'
      }
    ]
  }

  return mockActivities[destination] || [
    {
      time: '09:00',
      name: `Main Attraction in ${destination}`,
      description: `Explore ${destination}`,
      duration: 120,
      cost: 20,
      category: interests[0] || 'Culture',
      latitude: 0,
      longitude: 0,
      address: `${destination}`
    }
  ]
}
function analyzeProfile(profile: TravelerProfile) {
  const arrival = new Date(`${profile.arrivalDate}T${profile.arrivalTime}`)
  const departure = new Date(`${profile.departureDate}T${profile.departureTime}`)
  
  const totalDays = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))
  
  // Calculate actual available hours per day
  const activityHoursPerDay = {
    'Relaxed': 4,
    'Balanced': 6,
    'Packed': 9
  }[profile.activityIntensity]
  
  const availableHours = profile.sleepHours + 1 // 1 hour meals/misc
  const restHours = 24 - availableHours
  
  return {
    totalDays,
    arrivalDay: arrival,
    departureDay: departure,
    activityHoursPerDay,
    availableHours,
    restHours,
    hasJetLag: profile.arrivalMethod === 'flight' && totalDays < 5,
    analysis: `Trip: ${totalDays} days | Activity: ${activityHoursPerDay}h/day | Rest: ${profile.sleepHours}h sleep + buffers`
  }
}

// ReAct Agent: PLAN step
function planDayStructure(profile: TravelerProfile, analysis: ReturnType<typeof analyzeProfile>) {
  const dayPlans: DayPlan[] = []
  const mockActivities = generateMockActivities(profile.destination, profile.interests)
  
  const destinationCoords: Record<string, [number, number]> = {
    'Hyderabad': [17.3629, 78.4747],
    'Mumbai': [18.9220, 72.8347],
    'Delhi': [28.6562, 77.2410],
    'Agra': [27.1751, 78.0421],
    'Vizag': [17.6869, 83.2185],
    'Bangalore': [12.9716, 77.5946],
    'Pune': [18.5204, 73.8567],
    'Kochi': [9.9312, 76.2673],
  }
  
  for (let d = 1; d <= analysis.totalDays; d++) {
    const currentDate = new Date(analysis.arrivalDay)
    currentDate.setDate(currentDate.getDate() + d - 1)
    
    const isFirstDay = d === 1
    const isLastDay = d === analysis.totalDays
    
    let dayTheme = `Day ${d}: Explore ${profile.destination}`
    let activities: Activity[] = []
    let restSlots: { time: string; duration: string }[] = []
    let activeHours = 0
    
    if (isFirstDay) {
      // First day: arrival + light activities
      dayTheme = `Arrival Day - Settle in at ${profile.destination}`
      
      // Get destination coordinates for arrival
      const destCoords = destinationCoords[profile.destination] || [0, 0]
      
      activities = [
        {
          time: profile.arrivalTime,
          name: `Arrive at ${profile.destination} via ${profile.arrivalMethod}`,
          description: `${profile.arrivalMethod === 'flight' ? 'Flight' : profile.arrivalMethod === 'train' ? 'Train' : 'Drive'} arrival and check-in`,
          duration: 120,
          cost: profile.arrivalMethod === 'flight' ? 25 : 0,
          category: 'Travel',
          latitude: destCoords[0],
          longitude: destCoords[1],
          address: `${profile.destination} Airport/Station`
        }
      ]
      
      activeHours = 3
      restSlots = [
        { time: '14:00', duration: '2 hours' },
        { time: '20:00', duration: '1 hour' }
      ]
    } else if (isLastDay) {
      // Last day: checkout + minimal activities
      dayTheme = `Departure Day - Last moments in ${profile.destination}`
      
      activities = [
        {
          time: '09:00',
          name: `Final ${profile.destination} experience`,
          description: 'Breakfast and last-minute shopping or sightseeing',
          duration: 60,
          cost: 15,
          category: 'Food & Culture',
          latitude: 0,
          longitude: 0,
          address: profile.destination
        }
      ]
      
      activeHours = 2
      restSlots = []
    } else {
      // Full days: varied schedule with real activities
      activeHours = analysis.activityHoursPerDay
      
      // Calculate how many activities to include (based on active hours)
      const activityCount = Math.ceil(activeHours / 2)
      
      // Create unique mix of activities for each day
      // Day 2: activities 0,1,2
      // Day 3: activities 2,3,4 (shifted)
      // Day 4: activities 1,2,3 (rotated)
      const dayIndex = d - 2
      
      for (let i = 0; i < Math.min(activityCount, mockActivities.length); i++) {
        // Rotate which activities appear each day to create variety
        const activityIndex = (i + dayIndex * 2) % mockActivities.length
        const mockActivity = mockActivities[activityIndex]
        
        // Calculate proper time (9:00 start, 3 hours per activity)
        const startHour = 9 + (i * 3)
        const timeStr = `${String(startHour).padStart(2, '0')}:00`
        
        activities.push({
          ...mockActivity,
          time: timeStr
        })
      }
      
      // Add rest slots based on intensity
      if (profile.activityIntensity === 'Relaxed') {
        restSlots = [
          { time: '12:00', duration: '90 min' },
          { time: '17:00', duration: '2 hours' }
        ]
      } else if (profile.activityIntensity === 'Balanced') {
        restSlots = [
          { time: '12:30', duration: '60 min' },
          { time: '15:00', duration: '45 min' }
        ]
      } else {
        // Packed
        restSlots = [
          { time: '12:00', duration: '30 min' }
        ]
      }
    }
    
    dayPlans.push({
      day: d,
      date: currentDate.toISOString().split('T')[0],
      theme: dayTheme,
      ...(isFirstDay && { arrival: { time: profile.arrivalTime, method: profile.arrivalMethod } }),
      ...(isLastDay && { checkout: { time: profile.departureTime } }),
      activities,
      restSlots,
      totalActiveHours: activeHours,
      intensity: profile.activityIntensity
    })
  }
  
  return dayPlans
}

// ReAct Agent: VERIFY step
function verifyItinerary(dayPlans: DayPlan[], profile: TravelerProfile) {
  const validation = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[],
    totalCost: 0,
    totalActivities: 0
  }
  
  dayPlans.forEach(day => {
    validation.totalActivities += day.activities.length
    day.activities.forEach(a => {
      validation.totalCost += a.cost
    })
    
    // Check if active hours match intensity
    if (Math.abs(day.totalActiveHours - {
      'Relaxed': 4,
      'Balanced': 6,
      'Packed': 9
    }[profile.activityIntensity]) > 2) {
      validation.warnings.push(`Day ${day.day}: Active hours (${day.totalActiveHours}h) differs from expected`)
    }
  })
  
  if (validation.totalCost > profile.budget * 1.1) {
    validation.warnings.push(`Budget may be tight: $${validation.totalCost} vs budget $${profile.budget}`)
  }
  
  return validation
}

async function generateAgenticItinerary(profile: TravelerProfile) {
  try {
    // THINK: Analyze profile
    console.log('🤔 THINK: Analyzing traveler profile...')
    const analysis = analyzeProfile(profile)
    console.log(`Analysis: ${analysis.analysis}`)
    
    // PLAN: Create day structure
    console.log('📋 PLAN: Creating day structure...')
    const dayPlans = planDayStructure(profile, analysis)
    
    // VERIFY: Validate itinerary
    console.log('✅ VERIFY: Validating itinerary...')
    const validation = verifyItinerary(dayPlans, profile)
    
    if (validation.warnings.length > 0) {
      console.warn('Warnings:', validation.warnings)
    }
    
    // Calculate total cost
    const totalCost = dayPlans.reduce((sum, day) => {
      return sum + day.activities.reduce((daySum, activity) => daySum + activity.cost, 0)
    }, 0)
    
    return {
      destination: profile.destination,
      title: `${analysis.totalDays}-Day ${profile.activityIntensity} ${profile.destination} Itinerary`,
      duration: analysis.totalDays,
      dailyPlans: dayPlans,
      totalEstimatedCost: totalCost,
      budgetBreakdown: {
        activities: totalCost * 0.4,
        meals: totalCost * 0.3,
        transport: totalCost * 0.2,
        accommodation: totalCost * 0.1,
        total: totalCost
      },
      tips: [
        `Sleep ${profile.sleepHours} hours each night for optimal energy`,
        profile.activityIntensity === 'Relaxed' ? 'Take time to relax and enjoy local cafes' : 
        profile.activityIntensity === 'Balanced' ? 'Good balance of activities and rest' :
        'Packed schedule - prioritize must-see activities',
        `Budget-aware: Focus on free attractions and affordable dining`,
        `Dietary note: ${profile.dietaryRestrictions.length > 0 ? `Restaurants filtered for ${profile.dietaryRestrictions.join(', ')}` : 'No restrictions'}`
      ],
      validation
    }
  } catch (error) {
    console.error('Agentic generation error:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      destination,
      arrivalDate,
      arrivalTime,
      arrivalMethod,
      departureDate,
      departureTime,
      activityIntensity,
      sleepHours,
      dietaryRestrictions,
      budget,
      interests
    } = body

    // Validate required fields
    if (!destination || !arrivalDate || !departureDate || !activityIntensity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const profile: TravelerProfile = {
      destination,
      arrivalDate,
      arrivalTime: arrivalTime || '09:00',
      arrivalMethod: arrivalMethod || 'flight',
      departureDate,
      departureTime: departureTime || '18:00',
      activityIntensity,
      sleepHours: sleepHours || 8,
      dietaryRestrictions: dietaryRestrictions || [],
      budget: budget || 2000,
      interests: interests || ['Culture', 'Food']
    }

    console.log(`🚀 ReAct Agent: Generating ${activityIntensity} itinerary for ${destination}`)
    
    const itinerary = await generateAgenticItinerary(profile)

    return NextResponse.json({
      success: true,
      itinerary,
      source: 'agentic-react'
    })
  } catch (error) {
    console.error('❌ Agentic itinerary error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate itinerary' },
      { status: 500 }
    )
  }
}
