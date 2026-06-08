export interface DestinationSearchResult {
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  address?: string;
  boundingBox?: string[];
  importance?: number;
}

export interface PointOfInterest {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address?: string;
  tags?: Record<string, string>;
}

export interface BookingConfirmationFlightSegment {
  airline: string | null;
  flightNumber: string | null;
  confirmationCode: string | null;
  departurePlace: string | null;
  arrivalPlace: string | null;
  departureDate: string | null;
  departureTime: string | null;
  arrivalDate: string | null;
  arrivalTime: string | null;
  notes: string | null;
}

export interface BookingConfirmationStay {
  name: string | null;
  confirmationCode: string | null;
  address: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  notes: string | null;
}

export interface BookingConfirmationTransportLeg {
  kind: string;
  provider: string | null;
  confirmationCode: string | null;
  from: string | null;
  to: string | null;
  date: string | null;
  time: string | null;
  notes: string | null;
}

export interface BookingConfirmationReservation {
  kind: string;
  vendor: string | null;
  confirmationCode: string | null;
  date: string | null;
  time: string | null;
  notes: string | null;
}

export interface BookingConfirmationWindow {
  arrivalDate: string | null;
  departureDate: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
  timezone: string | null;
}

export interface BookingConfirmationSource {
  subject: string | null;
  from: string | null;
  medium: 'email' | 'manual' | 'webhook';
  receivedAt: string | null;
}

export interface BookingConfirmationExtraction {
  destinationName: string;
  destinationAddress: string | null;
  tripWindow: BookingConfirmationWindow;
  arrivalMethod: 'flight' | 'train' | 'drive' | 'bus' | 'other' | null;
  flightSegments: BookingConfirmationFlightSegment[];
  stay: BookingConfirmationStay | null;
  transportLegs: BookingConfirmationTransportLeg[];
  reservations: BookingConfirmationReservation[];
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  source: BookingConfirmationSource;
}

export interface WeatherSnapshot {
  temperature: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number | null;
  windSpeed: number;
}

export interface ItineraryActivity {
  time: string;
  name: string;
  description: string;
  duration: number | null;
  cost: number | null;
  estimated_cost: number | null;
  category: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

export interface ItineraryDayPlan {
  day: number;
  date: string;
  theme: string;
  activities: ItineraryActivity[];
  restSlots?: { time: string; duration: string }[];
  totalActiveHours?: number | null;
  intensity?: string | null;
}

export interface TravelStay {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address: string | null;
  checkInDate: string | null;
  checkInTime: string | null;
  checkOutDate: string | null;
  checkOutTime: string | null;
  notes: string | null;
}

export interface TripTransfer {
  kind: 'arrival' | 'departure';
  title: string;
  from: string | null;
  to: string | null;
  time: string | null;
  notes: string | null;
}

export interface TripSuggestion {
  id: string;
  share_id: string;
  trip_id: string;
  owner_user_id: string;
  guest_name: string | null;
  guest_email: string | null;
  suggestion: string;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface TripShare {
  id: string;
  trip_id: string;
  owner_user_id: string;
  token: string;
  share_title: string | null;
  share_description: string | null;
  share_image_url: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetBreakdown {
  flights: number | null;
  hotels: number | null;
  food: number | null;
  activities: number | null;
  transport: number | null;
  misc: number | null;
  total: number | null;
}

export interface TravelerPreferences {
  arrivalMethod?: 'flight' | 'train' | 'drive' | null;
  activityIntensity?: 'Relaxed' | 'Balanced' | 'Packed' | null;
  budget?: string;
  interests?: string[];
  arrivalTransferContext?: string;
  departureTransferContext?: string;
  dietaryRestrictions?: string[];
  sleepPreference?: string;
  updatedAt?: string;
}

export interface GeneratedItinerary {
  title: string;
  destination: string;
  duration: number;
  stay: TravelStay | null;
  transfers: TripTransfer[];
  dailyPlans: ItineraryDayPlan[];
  daily_plans: ItineraryDayPlan[];
  totalEstimatedCost: number | null;
  total_estimated_cost: number | null;
  budgetBreakdown: BudgetBreakdown;
  budget_breakdown: BudgetBreakdown;
  tips: string[];
  sourceData: {
    destination: DestinationSearchResult;
    weather: WeatherSnapshot | null;
    pois: PointOfInterest[];
    stayCandidates: PointOfInterest[];
    confirmation?: BookingConfirmationExtraction | null;
    tripWindow?: BookingConfirmationWindow;
  };
}

export type TripShareRecord = TripShare;
export type TripSuggestionRecord = TripSuggestion;

export interface PublicTripSharePayload {
  share: TripShareRecord;
  trip: {
    id: string;
    destination: string;
    duration: number;
    budget: string;
    interests: string[];
    itinerary: GeneratedItinerary;
    created_at: string;
    updated_at: string;
  };
  suggestionsCount: number;
  shareUrl: string;
}

export interface ItineraryGenerationInput {
  destination: string;
  latitude?: number | null;
  longitude?: number | null;
  resolvedDestination?: DestinationSearchResult | null;
  duration?: number | null;
  arrivalDate?: string | null;
  departureDate?: string | null;
  arrivalTime?: string | null;
  departureTime?: string | null;
  arrivalMethod?: 'flight' | 'train' | 'drive' | 'bus' | 'other' | null;
  activityIntensity?: 'Relaxed' | 'Balanced' | 'Packed' | null;
  arrivalTransferContext?: string | null;
  departureTransferContext?: string | null;
  budget?: number | string | null;
  interests?: string[] | null;
  dietaryRestrictions?: string[] | null;
  confirmation?: BookingConfirmationExtraction | null;
}
