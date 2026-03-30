export type BudgetLevel = "budget" | "mid" | "luxury";
export type Duration = 3 | 5 | 7;
export type Interest = "culture"|"food"|"adventure"|"nature"|"nightlife"|"shopping"|"history"|"art"|"wellness"|"beaches";
export interface TripFormData { destination: string; duration: Duration; budget: BudgetLevel; interests: Interest[]; }
export interface Activity { id: string; tripId: string; day: number; time: string; name: string; description: string; cost: number; category: string; lat: number; lng: number; }
export interface DayItinerary { day: number; theme: string; activities: Activity[]; totalCost: number; }
export interface BudgetBreakdown { flights: number; hotels: number; food: number; activities: number; transport: number; misc: number; total: number; }
export interface Trip { id: string; userId: string; destination: string; duration: Duration; budget: BudgetLevel; interests: Interest[]; itinerary: DayItinerary[]; budgetBreakdown: BudgetBreakdown; createdAt: string; updatedAt: string; }
export interface GenerateItineraryRequest { destination: string; duration: Duration; budget: BudgetLevel; interests: Interest[]; }
export interface GenerateItineraryResponse { itinerary: DayItinerary[]; budgetBreakdown: BudgetBreakdown; }
export interface WeatherInfo { temp: number; feels_like: number; description: string; icon: string; humidity: number; wind_speed: number; }
