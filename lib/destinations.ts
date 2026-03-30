// Curated destinations with their types and available interests
export const CURATED_DESTINATIONS = [
  // Beach Cities
  { name: 'Bali', country: 'Indonesia', types: ['Beach', 'Culture', 'Adventure', 'Nightlife', 'Food'], lat: -8.65, lon: 115.21 },
  { name: 'Maldives', country: 'Maldives', types: ['Beach', 'Adventure', 'Nightlife'], lat: 4.17, lon: 73.51 },
  { name: 'Cancun', country: 'Mexico', types: ['Beach', 'Nightlife', 'Adventure', 'Food'], lat: 21.16, lon: -86.85 },
  { name: 'Miami', country: 'USA', types: ['Beach', 'Nightlife', 'Shopping', 'Food'], lat: 25.76, lon: -80.19 },
  { name: 'Goa', country: 'India', types: ['Beach', 'Culture', 'Nightlife', 'Food', 'Adventure'], lat: 15.30, lon: 73.83 },
  { name: 'Santorini', country: 'Greece', types: ['Beach', 'Culture', 'Food', 'Shopping'], lat: 36.42, lon: 25.43 },
  { name: 'Boracay', country: 'Philippines', types: ['Beach', 'Adventure', 'Nightlife', 'Food'], lat: 11.95, lon: 121.93 },
  
  // Mountain Cities
  { name: 'Banff', country: 'Canada', types: ['Nature', 'Adventure', 'Culture'], lat: 51.18, lon: -115.57 },
  { name: 'Interlaken', country: 'Switzerland', types: ['Nature', 'Adventure', 'Culture', 'Food'], lat: 46.68, lon: 8.28 },
  { name: 'Queenstown', country: 'New Zealand', types: ['Adventure', 'Nature', 'Nightlife'], lat: -42.42, lon: 171.20 },
  { name: 'Aspen', country: 'USA', types: ['Adventure', 'Shopping', 'Food', 'Nightlife'], lat: 39.19, lon: -106.82 },
  { name: 'Chamonix', country: 'France', types: ['Adventure', 'Nature', 'Food', 'Culture'], lat: 45.87, lon: 6.87 },
  
  // Cultural Cities
  { name: 'Paris', country: 'France', types: ['Culture', 'Food', 'Art', 'Shopping', 'Nightlife'], lat: 48.86, lon: 2.35 },
  { name: 'Rome', country: 'Italy', types: ['History', 'Culture', 'Food', 'Art'], lat: 41.90, lon: 12.50 },
  { name: 'Tokyo', country: 'Japan', types: ['Culture', 'Food', 'Shopping', 'Nightlife', 'Adventure'], lat: 35.68, lon: 139.69 },
  { name: 'Barcelona', country: 'Spain', types: ['Culture', 'Beach', 'Food', 'Art', 'Nightlife'], lat: 41.39, lon: 2.17 },
  { name: 'Venice', country: 'Italy', types: ['History', 'Culture', 'Art', 'Food'], lat: 45.44, lon: 12.34 },
  { name: 'Berlin', country: 'Germany', types: ['History', 'Culture', 'Art', 'Nightlife', 'Food'], lat: 52.52, lon: 13.41 },
  { name: 'Istanbul', country: 'Turkey', types: ['History', 'Culture', 'Food', 'Shopping'], lat: 41.01, lon: 28.98 },
  { name: 'Bangkok', country: 'Thailand', types: ['Culture', 'Food', 'Nightlife', 'Shopping', 'Adventure'], lat: 13.73, lon: 100.49 },
  { name: 'New York', country: 'USA', types: ['Culture', 'Art', 'Shopping', 'Food', 'Nightlife'], lat: 40.71, lon: -74.01 },
  { name: 'London', country: 'UK', types: ['History', 'Culture', 'Art', 'Shopping', 'Food'], lat: 51.51, lon: -0.13 },
  
  // India Cities
  { name: 'Agra', country: 'India', types: ['History', 'Culture', 'Art'], lat: 27.18, lon: 78.01 },
  { name: 'Delhi', country: 'India', types: ['History', 'Culture', 'Food', 'Shopping'], lat: 28.70, lon: 77.10 },
  { name: 'Jaipur', country: 'India', types: ['Culture', 'History', 'Art', 'Shopping'], lat: 26.91, lon: 75.78 },
  { name: 'Mumbai', country: 'India', types: ['Culture', 'Nightlife', 'Food', 'Shopping', 'Beach'], lat: 19.08, lon: 72.88 },
  { name: 'Hyderabad', country: 'India', types: ['Culture', 'Food', 'History', 'Shopping'], lat: 17.36, lon: 78.47 },
  { name: 'Bangalore', country: 'India', types: ['Culture', 'Food', 'Shopping', 'Nightlife'], lat: 12.97, lon: 77.59 },
  { name: 'Vizag', country: 'India', types: ['Beach', 'Nature', 'Culture', 'Adventure'], lat: 17.69, lon: 83.22 },
  { name: 'Pune', country: 'India', types: ['Culture', 'Food', 'History', 'Nightlife'], lat: 18.52, lon: 73.86 },
  { name: 'Kochi', country: 'India', types: ['Beach', 'Culture', 'Food', 'History'], lat: 9.94, lon: 76.27 },
  { name: 'Kerala', country: 'India', types: ['Nature', 'Beach', 'Adventure', 'Food'], lat: 10.34, lon: 76.27 },
  { name: 'Goa', country: 'India', types: ['Beach', 'Culture', 'Nightlife', 'Food', 'Adventure'], lat: 15.30, lon: 73.83 },
  
  // Nature & Adventure
  { name: 'Iceland', country: 'Iceland', types: ['Nature', 'Adventure', 'Culture'], lat: 64.96, lon: -19.02 },
  { name: 'Costa Rica', country: 'Costa Rica', types: ['Adventure', 'Nature', 'Beach', 'Food'], lat: 9.75, lon: -83.75 },
  { name: 'Nepal', country: 'Nepal', types: ['Adventure', 'Nature', 'Culture', 'History'], lat: 27.72, lon: 85.34 },
  { name: 'Peru', country: 'Peru', types: ['History', 'Adventure', 'Culture', 'Nature'], lat: -12.05, lon: -77.04 },
  
  // Food Cities
  { name: 'Lyon', country: 'France', types: ['Food', 'Culture', 'Art'], lat: 45.76, lon: 4.84 },
  { name: 'Singapore', country: 'Singapore', types: ['Food', 'Shopping', 'Culture', 'Nightlife'], lat: 1.35, lon: 103.82 },
];

// Get interests available for a specific destination
export function getInterestsForDestination(destination: string): string[] {
  const dest = CURATED_DESTINATIONS.find(
    d => d.name.toLowerCase() === destination.toLowerCase()
  );
  return dest?.types || ['Culture', 'Adventure', 'Food', 'Nightlife', 'Nature', 'Shopping', 'Beach', 'Mountains', 'History', 'Art'];
}

// Get popular destinations
export function getPopularDestinations(): typeof CURATED_DESTINATIONS {
  return CURATED_DESTINATIONS.sort(() => Math.random() - 0.5).slice(0, 12);
}

// Search destinations
export function searchDestinations(query: string): typeof CURATED_DESTINATIONS {
  if (!query) return getPopularDestinations();
  const q = query.toLowerCase();
  return CURATED_DESTINATIONS.filter(d => 
    d.name.toLowerCase().includes(q) || 
    d.country.toLowerCase().includes(q)
  );
}
