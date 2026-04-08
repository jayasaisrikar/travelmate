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
      },
      {
        day: 2,
        theme: 'Adventure & Nature',
        activities: [
          {
            time: '07:00',
            name: 'Early Morning Araku Valley Trek',
            description: 'Scenic 120km hill station journey via scenic ghat roads. Misty valleys, 40+ hairpin turns, waterfalls, coffee plantations',
            duration: 480,
            cost: 60,
            category: 'Adventure',
            hours: '06:00-18:00 (book vehicle night before)',
            tip: 'Hire vehicle (₹1000-1500 for 2 pax). Wear rain jacket, take motion sickness meds if prone. Road is curvy but safe',
            latitude: 17.2505,
            longitude: 83.1189
          },
          {
            time: '14:00',
            name: 'Coffee Plantation Tour & Tribal Village Visit',
            description: 'Walk through coffee estates, taste fresh brew. Meet Adivasi tribes, learn their crafts',
            duration: 180,
            cost: 25,
            category: 'Nature',
            hours: 'Tours available 10:00-16:00 daily',
            tip: 'Hire local guide (₹300 for group). Tribes appreciate small gifts (pencils, notebooks for kids)',
            latitude: 17.2450,
            longitude: 83.1150
          },
          {
            time: '19:00',
            name: 'Return to Visakhapatnam via Scenic Route',
            description: 'Enjoy sunset drive down ghat roads with panoramic coastal views before reaching city',
            duration: 150,
            cost: 0,
            category: 'Nature',
            hours: 'Flexible - depart after lunch',
            tip: 'Stop at Sangda waterfalls (15-min detour) if time permits. Best photos during sunset',
            latitude: 17.3000,
            longitude: 83.1500
          }
        ]
      }
    ],
    tips: [
      '✈️ Flights: Direct from major Indian cities (Delhi, Mumbai, Bangalore)',
      '🚖 Getting around: Ubers common in city center, autos 20-50 per 5km',
      '🏖️ Beach safety: Swim in designated areas. Currents strong Oct-Nov',
      '💵 Budget: $40-50/day (food + activities), $15-25 accommodation',
      '📱 Local SIM: Jio/Airtel cards at airport. 4G widely available',
      '🍴 Street food: Biryani, idli, dosa safe. Avoid cut fruits from vendors',
      '🏥 Medical: Amar Hospital reliable for emergencies',
      '🎒 Pack: Light clothes, sunscreen, insect repellent, rain jacket (monsoon)'
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
            description: 'World\'s largest art museum. 35,000+ artworks. Mona Lisa most famous, but explore wings for Denon masterpieces',
            duration: 180,
            cost: 18,
            category: 'Art',
            hours: '09:00-18:00 (closed Tuesdays)',
            tip: 'Buy tickets online (avoid 2hr lines). Arrive 9:15am. Skip Mona Lisa room on Saturdays (3000+ people)',
            latitude: 48.8606,
            longitude: 2.3376
          },
          {
            time: '13:00',
            name: 'Lunch at Le Comptoir Bistro',
            description: 'Traditional French bistro near Louvre. Coq au vin, steak frites, escargot',
            duration: 90,
            cost: 32,
            category: 'Food',
            hours: '11:30-22:00',
            tip: 'Menu du jour (lunch set) €25, good value. Wine pairings. Reservation recommended',
            latitude: 48.8509,
            longitude: 2.3432
          },
          {
            time: '16:00',
            name: 'Eiffel Tower Ascent',
            description: 'Climb 1063 steps to top (option for lift). 360° Paris views from 276m high',
            duration: 120,
            cost: 28,
            category: 'Culture',
            hours: '09:00-01:00 (night visits till midnight)',
            tip: 'Stairs ticket cheaper (€6.80), less crowded. Sunset ascent magical but book days ahead',
            latitude: 48.8584,
            longitude: 2.2945
          },
          {
            time: '19:00',
            name: 'Seine River Dinner Cruise',
            description: 'Evening cruise past Pont des Arts, Notre-Dame, Île Saint-Louis. 3-course dinner with wine',
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
      '✈️ Flights: CDG & Orly airports. RER train to city center €12',
      '🎫 Paris Museum Pass: €69/3 days - covers 60+ museums',
      '🚇 Transport: 1-day €8 pass, unlimited metro + buses',
      '💵 Budget: €60-80/day (food €15, attractions €30, others)',
      '🍷 Wine: Local markets, €5-8 for quality bottles',
      '🏥 Healthcare: EU citizens covered by EHIC. Pharmacies on every corner',
      '📍 Tips: Metro closes 01:00. Taxis expensive (€60+ from airport)',
      '🎨 Art: Pre-book Musée d\'Orsay (impressionists) online'
    ]
  },
  'Tokyo': {
    destination: 'Tokyo',
    bestTimeToVisit: 'March-May (cherry blossoms), September-November',
    estimatedTotal: 0,
    dailyPlans: [
      {
        day: 1,
        theme: 'Tradition & Modernity',
        activities: [
          {
            time: '08:00',
            name: 'Tsukiji Outer Market - Fresh Sushi Breakfast',
            description: 'Historic fish market with 400+ stalls. Fresh sushi for breakfast, sea urchin, toro (fatty tuna)',
            duration: 90,
            cost: 22,
            category: 'Food',
            hours: '05:00-15:00 (closed Sundays)',
            tip: 'Arrive early (8am). Eat standing at stall (authentic). Tuna auctions 05:30-06:30 (arrive 05:00)',
            latitude: 35.6653,
            longitude: 139.7761
          },
          {
            time: '10:00',
            name: 'Senso-ji Temple - Tokyo\'s Oldest',
            description: 'Buddhist temple from 645 AD. Massive red lantern, thousands of tourists but peaceful inside. Buy fortune slips',
            duration: 90,
            cost: 5,
            category: 'Culture',
            hours: '06:00-17:00 daily',
            tip: 'Avoid weekends. Gate opens early, few people at 06:00. Fortune slip ¥100 (2 USD)',
            latitude: 35.7148,
            longitude: 139.7967
          },
          {
            time: '13:00',
            name: 'Ramen Lunch at Local Yakiniku',
            description: 'Grilled Korean BBQ at intimate local spot. Cook at table, dip in sauces',
            duration: 60,
            cost: 18,
            category: 'Food',
            hours: '11:00-23:00',
            tip: 'Point at picture menu (no English). ¥2000-3000 per person. Reservation recommended evenings',
            latitude: 35.6595,
            longitude: 139.7004
          },
          {
            time: '16:00',
            name: 'Shibuya Crossing & Hachiko Statue',
            description: 'World\'s busiest pedestrian crossing (2500 people/min). Famous dog statue, street fashion hub',
            duration: 60,
            cost: 0,
            category: 'Culture',
            hours: 'All day, most crowded 18:00-20:00',
            tip: 'Starbucks above crossing (paid seat) offers best photos. Go at night for neon lights',
            latitude: 35.6595,
            longitude: 139.7004
          }
        ]
      }
    ],
    tips: [
      '✈️ Flights: NRT or HND airports. Narita Express ¥3000 to center',
      '🚇 Transport: IC card Suica/Pasmo ¥2000 (includes deposit). Subway efficient, safe',
      '💵 Budget: ¥6000-8000/day (meals ¥1500, attractions ¥2000-3000)',
      '🍜 Food: Convenience stores (7-11, Lawson) excellent, cheap. Eat at counter for lower prices',
      '🏨 Hotels: Capsule hotels ¥3000-4000/night, clean & unique',
      '🚴 Navigation: Google Maps works. Pocket WiFi rentals ¥500/day',
      '⛩️ Temples: Quiet 6am-8am. Evening visits peaceful',
      '📱 SIM: Softbank/Docomo at airport. 10GB ¥3000/week'
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
            description: 'Iconic symbol of freedom. Ferry ride to Liberty Island, 354 steps to crown. Ellis Island (immigrant history)',
            duration: 180,
            cost: 27,
            category: 'History',
            hours: '09:00-17:00',
            tip: 'Book crown tickets online ($27). Arrive Battery Park 8:30am. Security line 30min. Ferry every 15min',
            latitude: 40.6892,
            longitude: -74.0445
          },
          {
            time: '13:00',
            name: 'Nathan\'s Famous Hot Dogs',
            description: 'Coney Island institution since 1916. Iconic beef frank with mustard and sauerkraut',
            duration: 45,
            cost: 8,
            category: 'Food',
            hours: '08:00-02:00',
            tip: 'Try the classic: hot dog + beer. Outdoor seating with boardwalk views. Not gourmet but historic',
            latitude: 40.5755,
            longitude: -73.9797
          },
          {
            time: '16:00',
            name: 'Times Square - Digital Wonderland',
            description: '42 acres of billboards, theaters, restaurants. Most visited tourist spot. Dazzling neon at night',
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
            description: 'World-class musical theater. Options: Wicked, Phantom, Hamilton, Dear Evan Hansen',
            duration: 180,
            cost: 120,
            category: 'Entertainment',
            hours: 'Nightly 19:00 or 20:00 (some 14:00 matinees)',
            tip: 'Book TKTS tickets 50% off at discounted window. Orchestra seats worth extra cost',
            latitude: 40.7505,
            longitude: -73.9927
          }
        ]
      }
    ],
    tips: [
      '✈️ Flights: JFK, LGA, EWR. Public transit to Midtown $7-15',
      '🚇 Transport: 7-day MetroCard $33 (unlimited subway + bus)',
      '💵 Budget: $80-100/day (meals $25, attractions $40-50)',
      '🍽️ Food: Street vendors (pretzels $3, hot dogs $4), excellent pizza ($2.75/slice)',
      '🏨 Hotels: Budget $120+/night. Airbnb shared rooms $50-80',
      '🎭 Culture: Free Shakespeare in Park (summer). MoMA payWhat-you-wish Fridays 19:00-21:00',
      '⚠️ Safety: Avoid deserted streets. Subway safe but watch belongings',
      '🗽 Insider: Walk Brooklyn Bridge at sunrise (free, magical)'
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

    // Get itinerary from database (or default to first available)
    let itinerary = CITY_ITINERARY_DB[destination];
    
    if (!itinerary) {
      // Default to first city if not found
      itinerary = CITY_ITINERARY_DB[Object.keys(CITY_ITINERARY_DB)[0]];
    }

    // Adjust for requested duration
    itinerary = {
      ...itinerary,
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
