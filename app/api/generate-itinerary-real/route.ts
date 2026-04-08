import { NextRequest, NextResponse } from 'next/server';

// 100% Reliable Curated Landmark Database
const CITY_LANDMARK_DB: Record<string, any[]> = {
  'Agra': [
    { time: '09:00', name: 'Taj Mahal Sunrise Tour', description: 'Experience the Taj Mahal in the golden hour', duration: 180, cost: 30, category: 'History', lat: 27.1751, lon: 78.0421 },
    { time: '13:00', name: 'Lunch at Pinch of Spice', description: 'Traditional North Indian cuisine', duration: 90, cost: 20, category: 'Food', lat: 27.1760, lon: 78.0081 },
    { time: '15:00', name: 'Agra Fort Exploration', description: 'UNESCO World Heritage Mughal fortress', duration: 150, cost: 15, category: 'History', lat: 27.1797, lon: 78.0211 },
    { time: '18:00', name: 'Sunset at Mehtab Bagh', description: 'View Taj Mahal from across the river', duration: 60, cost: 5, category: 'Nature', lat: 27.1856, lon: 78.0465 }
  ],
  'Paris': [
    { time: '09:00', name: 'Louvre Museum', description: 'World largest art museum', duration: 180, cost: 25, category: 'Art', lat: 48.8606, lon: 2.3376 },
    { time: '13:00', name: 'Lunch at Le Comptoir', description: 'Classic Parisian bistro', duration: 90, cost: 40, category: 'Food', lat: 48.8509, lon: 2.3432 },
    { time: '15:00', name: 'Eiffel Tower View', description: 'Iconic panoramic views', duration: 120, cost: 30, category: 'Culture', lat: 48.8584, lon: 2.2945 },
    { time: '19:00', name: 'Seine River Cruise', description: 'Evening cruise through the heart of Paris', duration: 90, cost: 20, category: 'Culture', lat: 48.8600, lon: 2.3000 }
  ],
  'Gokarna': [
    { time: '09:00', name: 'Om Beach Walk', description: 'Morning beach trek', duration: 120, cost: 0, category: 'Beach', lat: 14.5209, lon: 74.3276 },
    { time: '13:00', name: 'Lunch at Namaste Cafe', description: 'Beachside dining', duration: 90, cost: 15, category: 'Food', lat: 14.5215, lon: 74.3280 },
    { time: '16:00', name: 'Mahabaleshwar Temple', description: 'Ancient spiritual site', duration: 90, cost: 0, category: 'Culture', lat: 14.5445, lon: 74.3168 },
    { time: '18:30', name: 'Half Moon Beach Sunset', description: 'Dramatic cliffs and sunset views', duration: 90, cost: 0, category: 'Beach', lat: 14.5262, lon: 74.3328 }
  ],
  'Tokyo': [
    { time: '09:00', name: 'Senso-ji Temple', description: 'Historic Buddhist temple', duration: 120, cost: 5, category: 'Culture', lat: 35.7148, lon: 139.7967 },
    { time: '13:00', name: 'Tsukiji Outer Market', description: 'Fresh seafood and street food', duration: 120, cost: 35, category: 'Food', lat: 35.6653, lon: 139.7761 },
    { time: '16:00', name: 'Shibuya Crossing', description: 'Worlds busiest pedestrian crossing', duration: 60, cost: 0, category: 'Culture', lat: 35.6595, lon: 139.7004 },
    { time: '19:00', name: 'Robot Restaurant Show', description: 'Spectacular neon robot performance', duration: 120, cost: 80, category: 'Entertainment', lat: 35.6656, lon: 139.7409 }
  ],
  'London': [
    { time: '09:00', name: 'Big Ben & Houses of Parliament', description: 'Iconic Gothic architecture', duration: 120, cost: 0, category: 'History', lat: 51.4975, lon: -0.1246 },
    { time: '13:00', name: 'Fish & Chips at Borough Market', description: 'Traditional British cuisine', duration: 90, cost: 30, category: 'Food', lat: 51.5048, lon: -0.0865 },
    { time: '15:00', name: 'Tower of London', description: 'Medieval fortress and crown jewels', duration: 150, cost: 35, category: 'History', lat: 51.5055, lon: -0.0759 },
    { time: '18:00', name: 'West End Theatre Show', description: 'Broadway-style musical performance', duration: 180, cost: 60, category: 'Entertainment', lat: 51.5118, lon: -0.1286 }
  ],
  'Barcelona': [
    { time: '09:00', name: 'Sagrada Familia', description: 'Gaudis masterpiece basilica', duration: 150, cost: 32, category: 'Art', lat: 41.4036, lon: 2.1744 },
    { time: '13:00', name: 'Tapas at Cerveceria Catalana', description: 'Spanish small plates', duration: 90, cost: 45, category: 'Food', lat: 41.3874, lon: 2.1686 },
    { time: '16:00', name: 'Park Guell', description: 'Colorful mosaic park with city views', duration: 120, cost: 14, category: 'Art', lat: 41.4145, lon: 2.1527 },
    { time: '19:00', name: 'Gothic Quarter Stroll', description: 'Medieval narrow streets and architecture', duration: 90, cost: 0, category: 'Culture', lat: 41.3826, lon: 2.1754 }
  ],
  'New York': [
    { time: '09:00', name: 'Statue of Liberty', description: 'Iconic symbol of freedom', duration: 180, cost: 27, category: 'History', lat: 40.6892, lon: -74.0445 },
    { time: '13:00', name: 'Hot Dogs at Nathans Famous', description: 'Classic Coney Island fare', duration: 60, cost: 15, category: 'Food', lat: 40.5755, lon: -73.9797 },
    { time: '15:00', name: 'Times Square', description: 'Dazzling digital billboards', duration: 60, cost: 0, category: 'Culture', lat: 40.7580, lon: -73.9855 },
    { time: '19:00', name: 'Broadway Musical', description: 'World-class theatrical performance', duration: 180, cost: 150, category: 'Entertainment', lat: 40.7505, lon: -73.9927 }
  ],
  'Sydney': [
    { time: '09:00', name: 'Sydney Opera House', description: 'Iconic architecture and performing arts', duration: 120, cost: 45, category: 'Culture', lat: -33.8568, lon: 151.2153 },
    { time: '13:00', name: 'Fish & Chips at Bondi Beach', description: 'Seaside dining with ocean views', duration: 90, cost: 35, category: 'Food', lat: -33.8891, lon: 151.2768 },
    { time: '16:00', name: 'Blue Mountains Trek', description: 'Scenic hiking and waterfalls', duration: 240, cost: 50, category: 'Nature', lat: -33.7150, lon: 150.3135 },
    { time: '19:00', name: 'Taronga Zoo at Sunset', description: 'Native wildlife with harbor views', duration: 120, cost: 55, category: 'Nature', lat: -33.8417, lon: 151.2317 }
  ],
  'Dubai': [
    { time: '09:00', name: 'Burj Khalifa', description: 'Tallest building in the world', duration: 120, cost: 40, category: 'Architecture', lat: 25.1972, lon: 55.2744 },
    { time: '13:00', name: 'Dinner in Old Dubai', description: 'Traditional Emirati cuisine', duration: 90, cost: 35, category: 'Food', lat: 25.2674, lon: 55.2963 },
    { time: '16:00', name: 'Desert Safari', description: 'Camel ride and sand dunes', duration: 180, cost: 50, category: 'Adventure', lat: 25.0500, lon: 55.3140 },
    { time: '19:00', name: 'Gold Souk Bazaar', description: 'Traditional shopping district', duration: 120, cost: 0, category: 'Culture', lat: 25.2627, lon: 55.3039 }
  ],
  'Bangkok': [
    { time: '09:00', name: 'Grand Palace', description: 'Royal Thai palace with stunning architecture', duration: 150, cost: 15, category: 'Culture', lat: 13.6528, lon: 100.4917 },
    { time: '13:00', name: 'Thai Street Food Tour', description: 'Authentic pad thai and mango sticky rice', duration: 120, cost: 25, category: 'Food', lat: 13.7563, lon: 100.5018 },
    { time: '16:00', name: 'Floating Markets', description: 'Traditional boat vendors and fresh produce', duration: 120, cost: 20, category: 'Culture', lat: 13.5896, lon: 100.3524 },
    { time: '19:00', name: 'Muay Thai Boxing Match', description: 'Traditional Thai boxing spectacle', duration: 120, cost: 30, category: 'Entertainment', lat: 13.7563, lon: 100.5018 }
  ],
  'Visakhapatnam': [
    { time: '09:00', name: 'RK Beach Sunrise', description: 'Beautiful beach with golden sands', duration: 120, cost: 0, category: 'Beach', lat: 17.6869, lon: 83.2185 },
    { time: '13:00', name: 'Lunch at Dhabha', description: 'Traditional Andhra cuisine', duration: 90, cost: 18, category: 'Food', lat: 17.6790, lon: 83.2174 },
    { time: '16:00', name: 'Araku Valley Trek', description: 'Scenic valley with waterfalls and coffee plantations', duration: 180, cost: 35, category: 'Adventure', lat: 17.2505, lon: 83.1189 },
    { time: '18:00', name: 'Kailasagiri Temple Complex', description: 'Hilltop temple with panoramic city views', duration: 90, cost: 0, category: 'Culture', lat: 17.7839, lon: 83.3047 }
  ]
};

function getUniqueActivitiesForDays(landmarks: any[], numDays: number): any[][] {
  const dailyActivities: any[][] = [];
  const totalActivities = landmarks.length;
  
  for (let d = 0; d < numDays; d++) {
    // Pick 2 unique activities per day, avoiding repeats from previous days
    const used = new Set();
    dailyActivities.forEach(day => {
      day.forEach((act: any) => {
        used.add(landmarks.indexOf(act));
      });
    });
    
    const available = landmarks.filter((_, i) => !used.has(i));
    
    if (available.length >= 2) {
      // If we have unique activities, pick first 2 available
      dailyActivities.push([available[0], available[1]]);
    } else if (available.length === 1) {
      // If only 1 unique left, use it and wrap around
      dailyActivities.push([available[0], landmarks[(d + 1) % totalActivities]]);
    } else {
      // All used, cycle through
      dailyActivities.push([
        landmarks[d % totalActivities],
        landmarks[(d + 1) % totalActivities]
      ]);
    }
  }
  
  return dailyActivities;
}

export async function POST(req: NextRequest) {
  const profile = await req.json();
  const city = profile.destination || 'Agra';
  const landmarks = CITY_LANDMARK_DB[city] || CITY_LANDMARK_DB['Agra'];

  const duration = profile.duration || 2;
  const dayActivitiesGroups = getUniqueActivitiesForDays(landmarks, duration);
  
  const dailyPlans = dayActivitiesGroups.map((dayActivities, d) => {
    return {
      day: d + 1,
      date: `Day ${d + 1}`,
      theme: `${city} - Experience`,
      activities: dayActivities.map(a => ({
        time: a.time,
        name: a.name,
        description: a.description,
        duration: a.duration,
        cost: a.cost,
        category: a.category,
        latitude: a.lat,
        longitude: a.lon,
        address: city
      })),
      restSlots: [{ time: '18:00', duration: '2 hours' }]
    };
  });

  return NextResponse.json({
    itinerary: {
      destination: city,
      duration,
      totalBudget: profile.budget,
      dailyPlans,
      tips: ['Wear comfortable shoes', 'Carry a water bottle', 'Check museum timings']
    }
  });
}
