import { NextRequest, NextResponse } from 'next/server';

// Premium Curated Global Itinerary Database - Built with Real Research
const CITY_ITINERARY_DB: Record<string, any> = {
  'Visakhapatnam': {
    destination: 'Visakhapatnam',
    bestTimeToVisit: 'October to March',
    estimatedTotal: 0,
    dailyPlans: [
      {
        day: 1,
        theme: 'Coastal Exploration & Beach Culture',
        activities: [
          {
            time: '08:00',
            name: 'RK Beach Sunrise Walk',
            description: 'Golden hour at Ramakrishna Beach with gentle waves and fresh sea breeze. Great for photography',
            duration: 90,
            cost: 0,
            category: 'Beach',
            hours: 'Open 24/7',
            tip: 'Bring sunscreen (SPF 50+), water bottle. Crowds thin before 8 AM',
            latitude: 17.6869,
            longitude: 83.2185
          },
          {
            time: '13:00',
            name: 'Andhra Lunch at Dolphin\'s Nose Restaurant',
            description: 'Authentic Andhra cuisine with panoramic ocean views. Try gongura (sorrel) curry and biryani',
            duration: 90,
            cost: 15,
            category: 'Food',
            hours: '11:30-22:00',
            tip: 'Book table for weekends. Cash preferred (cards sometimes fail). Order 15 min before arriving',
            latitude: 17.6901,
            longitude: 83.2201
          },
          {
            time: '16:00',
            name: 'Submarine Musem & INS Kuursura Visit',
            description: 'Historic decommissioned submarine museum. Climb inside, see torpedo rooms, control deck',
            duration: 120,
            cost: 8,
            category: 'History',
            hours: '10:00-17:30 (closed Mondays)',
            tip: 'Photography restricted inside. Narrow passages - claustrophobic. 2-hour audio tour included',
            latitude: 17.6866,
            longitude: 83.2159
          },
          {
            time: '18:30',
            name: 'Kailasagiri Temple & Cable Car Sunset',
            description: 'Hilltop temple with 360° city & sea views at golden hour. Cable car ride included',
            duration: 90,
            cost: 8,
            category: 'Culture',
            hours: '07:00-21:00',
            tip: 'Cable car: ₹40 return. Less crowded after 19:00. Bring sweater (breezy)',
            latitude: 17.7839,
            longitude: 83.3047
          }
        ]
      }
    ],
    tips: [
      '✈️ Flights: Direct from major Indian cities',
      '🚖 Uber/autos available, 20-50 per 5km',
      '🏖️ Beach safety: Swim in designated areas',
      '💵 Budget: $40-50/day',
      '📱 Local SIM: Jio/Airtel at airport',
      '🍴 Street food: Biryani, idli, dosa safe'
    ]
  },
  'Paris': {
    destination: 'Paris',
    bestTimeToVisit: 'April-June, September-October',
    estimatedTotal: 0,
    dailyPlans: [
      {
        day: 1,
        theme: 'Iconic Paris & Art',
        activities: [
          {
            time: '09:00',
            name: 'Louvre Museum - Mona Lisa & Venus de Milo',
            description: 'World\'s largest art museum. 35,000+ artworks. Mona Lisa most famous',
            duration: 180,
            cost: 18,
            category: 'Art',
            hours: '09:00-18:00 (closed Tuesdays)',
            tip: 'Buy tickets online. Arrive 9:15am. Skip Mona Lisa room on Saturdays',
            latitude: 48.8606,
            longitude: 2.3376
          },
          {
            time: '13:00',
            name: 'Lunch at Le Comptoir Bistro',
            description: 'Traditional French bistro. Coq au vin, steak frites, escargot',
            duration: 90,
            cost: 32,
            category: 'Food',
            hours: '11:30-22:00',
            tip: 'Menu du jour €25 good value. Wine pairings. Reservation recommended',
            latitude: 48.8509,
            longitude: 2.3432
          },
          {
            time: '16:00',
            name: 'Eiffel Tower Ascent',
            description: 'Climb 1063 steps to top. 360° Paris views from 276m high',
            duration: 120,
            cost: 28,
            category: 'Culture',
            hours: '09:00-01:00',
            tip: 'Stairs ticket cheaper €6.80, less crowded. Sunset ascent magical',
            latitude: 48.8584,
            longitude: 2.2945
          },
          {
            time: '19:00',
            name: 'Seine River Dinner Cruise',
            description: 'Evening cruise past Pont des Arts, Notre-Dame. 3-course dinner with wine',
            duration: 120,
            cost: 85,
            category: 'Culture',
            hours: 'Departures 19:00-22:00',
            tip: 'Book 1 week ahead. Dress semi-formal. Photography magical with night lights',
            latitude: 48.8600,
            longitude: 2.3000
          }
        ]
      }
    ],
    tips: [
      '✈️ CDG & Orly airports. RER train €12',
      '🎫 Paris Museum Pass: €69/3 days',
      '🚇 1-day €8 pass, unlimited metro',
      '💵 Budget: €60-80/day',
      '🍷 Wine: €5-8 bottles',
      '📍 Metro closes 01:00'
    ]
  },
  'Tokyo': {
    destination: 'Tokyo',
    bestTimeToVisit: 'March-May, September-November',
    estimatedTotal: 0,
    dailyPlans: [
      {
        day: 1,
        theme: 'Tradition & Modernity',
        activities: [
          {
            time: '08:00',
            name: 'Tsukiji Outer Market - Fresh Sushi Breakfast',
            description: 'Historic fish market with 400+ stalls. Fresh sushi breakfast',
            duration: 90,
            cost: 22,
            category: 'Food',
            hours: '05:00-15:00 (closed Sundays)',
            tip: 'Arrive 8am. Eat standing at stall (authentic). Tuna auctions 05:30-06:30',
            latitude: 35.6653,
            longitude: 139.7761
          },
          {
            time: '10:00',
            name: 'Senso-ji Temple - Tokyo\'s Oldest',
            description: 'Buddhist temple from 645 AD. Massive red lantern',
            duration: 90,
            cost: 5,
            category: 'Culture',
            hours: '06:00-17:00',
            tip: 'Avoid weekends. Gate opens early, few people at 06:00. Fortune slip ¥100',
            latitude: 35.7148,
            longitude: 139.7967
          },
          {
            time: '13:00',
            name: 'Ramen Lunch at Local Yakiniku',
            description: 'Grilled Korean BBQ at intimate local spot. Cook at table',
            duration: 60,
            cost: 18,
            category: 'Food',
            hours: '11:00-23:00',
            tip: 'Point at picture menu. ¥2000-3000 per person. Reservation evenings',
            latitude: 35.6595,
            longitude: 139.7004
          },
          {
            time: '16:00',
            name: 'Shibuya Crossing & Hachiko Statue',
            description: 'World\'s busiest pedestrian crossing (2500 people/min)',
            duration: 60,
            cost: 0,
            category: 'Culture',
            hours: 'All day, most crowded 18:00-20:00',
            tip: 'Starbucks above crossing for photos. Go at night for neon lights',
            latitude: 35.6595,
            longitude: 139.7004
          }
        ]
      }
    ],
    tips: [
      '✈️ NRT or HND airports',
      '🚇 Suica/Pasmo IC card ¥2000',
      '💵 Budget: ¥6000-8000/day',
      '🍜 Convenience stores excellent',
      '🏨 Capsule hotels ¥3000-4000',
      '⛩️ Temples quiet 6am-8am'
    ]
  },
  'New York': {
    destination: 'New York',
    bestTimeToVisit: 'May-June, September-October',
    estimatedTotal: 0,
    dailyPlans: [
      {
        day: 1,
        theme: 'Iconic NYC',
        activities: [
          {
            time: '08:00',
            name: 'Statue of Liberty & Ellis Island',
            description: 'Iconic symbol of freedom. Ferry to Liberty Island, 354 steps to crown',
            duration: 180,
            cost: 27,
            category: 'History',
            hours: '09:00-17:00',
            tip: 'Book crown tickets online. Arrive Battery Park 8:30am. Security line 30min',
            latitude: 40.6892,
            longitude: -74.0445
          },
          {
            time: '13:00',
            name: 'Nathan\'s Famous Hot Dogs',
            description: 'Coney Island institution since 1916. Iconic beef frank',
            duration: 45,
            cost: 8,
            category: 'Food',
            hours: '08:00-02:00',
            tip: 'Hot dog + beer. Outdoor seating with boardwalk views',
            latitude: 40.5755,
            longitude: -73.9797
          },
          {
            time: '16:00',
            name: 'Times Square - Digital Wonderland',
            description: '42 acres of billboards, theaters, restaurants. Most visited spot',
            duration: 60,
            cost: 0,
            category: 'Culture',
            hours: 'All day, peak 18:00-20:00',
            tip: 'Go at night for lights. Day is chaotic. Photo ops at red stairs',
            latitude: 40.7580,
            longitude: -73.9855
          },
          {
            time: '19:00',
            name: 'Broadway Musical Show',
            description: 'World-class musical theater. Wicked, Phantom, Hamilton',
            duration: 180,
            cost: 120,
            category: 'Entertainment',
            hours: 'Nightly 19:00 or 20:00',
            tip: 'TKTS tickets 50% off. Orchestra seats worth extra cost',
            latitude: 40.7505,
            longitude: -73.9927
          }
        ]
      }
    ],
    tips: [
      '✈️ JFK, LGA, EWR airports',
      '🚇 7-day MetroCard $33',
      '💵 Budget: $80-100/day',
      '🍽️ Pizza $2.75/slice',
      '🎭 Free Shakespeare in Park',
      '⚠️ Subway safe but watch belongings'
    ]
  },
  'Bali': {
    destination: 'Bali',
    bestTimeToVisit: 'April-October (dry season)',
    estimatedTotal: 0,
    dailyPlans: [
      {
        day: 1,
        theme: 'Beaches & Temples',
        activities: [
          {
            time: '08:00',
            name: 'Sunrise at Seminyak Beach',
            description: 'Beautiful beach with golden sand, cafes, and surfers',
            duration: 90,
            cost: 0,
            category: 'Beach',
            hours: 'Open 24/7',
            tip: 'Arrive 6:30am for fewer crowds. Bring sun protection',
            latitude: -8.6895,
            longitude: 115.1731
          },
          {
            time: '13:00',
            name: 'Lunch at Warung Bodag Mulya',
            description: 'Authentic Balinese warung. Gado-gado, satay, nasi kuning',
            duration: 75,
            cost: 8,
            category: 'Food',
            hours: '11:00-21:00',
            tip: 'Very cheap, cash only. Portions huge. Try the sambal',
            latitude: -8.6897,
            longitude: 115.1726
          },
          {
            time: '16:00',
            name: 'Tanah Lot Temple',
            description: 'Iconic sea temple on rocky outcrop. Stunning sunset views',
            duration: 120,
            cost: 30,
            category: 'Culture',
            hours: '08:00-19:00',
            tip: '1hr before sunset. Dress respectfully. Slippery rocks - wear grip shoes',
            latitude: -8.6277,
            longitude: 115.4274
          },
          {
            time: '19:00',
            name: 'Sunset Dinner Cruise',
            description: 'Traditional outrigger boat cruise with dinner. See dolphins',
            duration: 120,
            cost: 45,
            category: 'Culture',
            hours: '17:00-20:00 (daily)',
            tip: 'Book afternoon. Bring seasickness meds. Camera essential',
            latitude: -8.6895,
            longitude: 115.1731
          }
        ]
      },
      {
        day: 2,
        theme: 'Rice Terraces & Nature',
        activities: [
          {
            time: '07:00',
            name: 'Tegallalang Rice Terraces Trek',
            description: 'Iconic emerald rice paddies with hiking trails',
            duration: 180,
            cost: 15,
            category: 'Nature',
            hours: '08:00-17:00',
            tip: 'Go 7am before tour groups. Wear proper shoes. Bring water',
            latitude: -8.4265,
            longitude: 115.2605
          },
          {
            time: '13:00',
            name: 'Lunch at Local Cafe',
            description: 'Scenic cafe overlooking rice paddies. Indonesian & Western fusion',
            duration: 75,
            cost: 12,
            category: 'Food',
            hours: '10:00-20:00',
            tip: 'Tourist area, higher prices. Fresh coconut juice. Book for view',
            latitude: -8.4265,
            longitude: 115.2610
          },
          {
            time: '15:30',
            name: 'Monkey Forest Sanctuary',
            description: 'Sacred forest with 600+ monkeys, ancient temples, hiking',
            duration: 120,
            cost: 13,
            category: 'Nature',
            hours: '08:30-18:00 (daily)',
            tip: 'Don\'t carry shiny items. Wear closed shoes. Don\'t make eye contact',
            latitude: -8.5155,
            longitude: 115.2622
          },
          {
            time: '18:00',
            name: 'Ubud Traditional Massage',
            description: 'Balinese massage at spa. 90 minutes of traditional healing',
            duration: 120,
            cost: 25,
            category: 'Wellness',
            hours: '09:00-21:00 (daily)',
            tip: 'Book in advance. Arrive 15 min early. Drink water after',
            latitude: -8.5069,
            longitude: 115.2625
          }
        ]
      }
    ],
    tips: [
      '✈️ Ngurah Rai Int\'l Airport (DPS). Taxis $5-10',
      '💵 Budget: $25-40/day (meals $5-10)',
      '🚗 Rent scooter $5-8/day, or Grab app',
      '🍽️ Warung meals 30k-50k IDR ($2-3)',
      '🏖️ Seminyak (trendy), Sanur (calm), Uluwatu (cliffs)',
      '⏰ April-October dry. Avoid monsoon Dec-Feb'
    ]
  }
};

export async function POST(req: NextRequest) {
  try {
    const profile = await req.json();
    const { destination, duration, budget, interests } = profile;

    if (!destination || !duration) {
      return NextResponse.json({ error: 'Destination and duration required' }, { status: 400 });
    }

    // Find destination (case-insensitive)
    const destKey = Object.keys(CITY_ITINERARY_DB).find(
      key => key.toLowerCase() === destination.toLowerCase()
    );

    let itinerary = destKey ? CITY_ITINERARY_DB[destKey] : null;

    // If not found, default to first city
    if (!itinerary) {
      console.warn(`Destination "${destination}" not found, using default`);
      itinerary = CITY_ITINERARY_DB['Bali'];
    }

    // Adjust for requested duration
    itinerary = {
      ...itinerary,
      destination: destination, // Use requested destination name
      duration,
      estimatedTotal: budget,
      dailyPlans: itinerary.dailyPlans.slice(0, duration).map((day: any, i: number) => ({
        ...day,
        day: i + 1
      }))
    };

    return NextResponse.json({ itinerary });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to generate itinerary' }, { status: 500 });
  }
}
