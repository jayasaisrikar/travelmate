'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { saveTrip } from '@/lib/supabase-trips';

const steps = ['Destination', 'Travel Dates', 'Preferences', 'Review'];

interface DestinationResult {
  name: string;
  latitude: number;
  longitude: number;
  address: string;
}

interface TravelerProfile {
  destination: string;
  latitude: number;
  longitude: number;
  arrivalDate: string;
  arrivalTime: string;
  arrivalMethod: 'flight' | 'train' | 'drive';
  departureDate: string;
  departureTime: string;
  activityIntensity: 'Relaxed' | 'Balanced' | 'Packed';
  sleepHours: number;
  dietaryRestrictions: string[];
  budget: number;
  interests: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<TravelerProfile>({
    destination: '',
    latitude: 0,
    longitude: 0,
    arrivalDate: '',
    arrivalTime: '09:00',
    arrivalMethod: 'flight',
    departureDate: '',
    departureTime: '18:00',
    activityIntensity: 'Balanced',
    sleepHours: 8,
    dietaryRestrictions: [],
    budget: 1000,
    interests: []
  });

  const [searchResults, setSearchResults] = useState<DestinationResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleDestinationSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/destinations-search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSelectDestination = (result: DestinationResult) => {
    setFormData(prev => ({
      ...prev,
      destination: result.name,
      latitude: result.latitude,
      longitude: result.longitude
    }));
    setSearchResults([]);
  };

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      // Generate itinerary
      setLoading(true);
      try {
        const response = await fetch('/api/generate-itinerary-real', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination: formData.destination,
            latitude: formData.latitude,
            longitude: formData.longitude,
            arrivalDate: formData.arrivalDate,
            arrivalTime: formData.arrivalTime,
            arrivalMethod: formData.arrivalMethod,
            departureDate: formData.departureDate,
            departureTime: formData.departureTime,
            activityIntensity: formData.activityIntensity,
            sleepHours: formData.sleepHours,
            dietaryRestrictions: formData.dietaryRestrictions,
            budget: formData.budget,
            interests: formData.interests,
            duration: Math.ceil((new Date(formData.departureDate).getTime() - new Date(formData.arrivalDate).getTime()) / (1000 * 60 * 60 * 24))
          })
        });

        const result = await response.json();
        
        // Save trip
        const trip = await saveTrip({
          destination: formData.destination,
          duration: Math.ceil((new Date(formData.departureDate).getTime() - new Date(formData.arrivalDate).getTime()) / (1000 * 60 * 60 * 24)),
          budget: formData.budget.toString(),
          interests: formData.interests,
          itinerary: result.itinerary
        });

        router.push(`/trip/${trip.id}`);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to generate itinerary');
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.destination.length > 0;
      case 1:
        return formData.arrivalDate && formData.departureDate && new Date(formData.departureDate) > new Date(formData.arrivalDate);
      case 2:
        return formData.interests.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Plan Your Journey</h1>
          <p className="text-slate-600">Answer a few questions and we'll create your perfect itinerary</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${i <= currentStep ? 'bg-blue-600' : 'bg-slate-200'}`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Step 0: Destination */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Where do you want to go?</h2>
              <p className="text-slate-600">Search any city, town, or village on Earth</p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., Gokarna, Paris, Tokyo, Rishikesh..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, destination: e.target.value }));
                    handleDestinationSearch(e.target.value);
                  }}
                  value={formData.destination}
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-10">
                    {searchResults.map((result, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectDestination(result)}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-slate-200 last:border-b-0"
                      >
                        <div className="font-semibold">{result.name}</div>
                        <div className="text-sm text-slate-500">{result.address}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Travel Dates */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">When are you traveling?</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Arrival Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    value={formData.arrivalDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, arrivalDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Departure Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    value={formData.departureDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, departureDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preferences */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">What are your interests?</h2>
              <div className="grid grid-cols-2 gap-3">
                {['Culture', 'Food', 'Adventure', 'Beach', 'History', 'Nature', 'Art', 'Shopping'].map(interest => (
                  <button
                    key={interest}
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      interests: prev.interests.includes(interest)
                        ? prev.interests.filter(i => i !== interest)
                        : [...prev.interests, interest]
                    }))}
                    className={`px-4 py-2 rounded-lg border font-semibold transition ${
                      formData.interests.includes(interest)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-900 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold">Budget ($)</label>
              <input
                type="number"
                min="100"
                step="100"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Review Your Trip</h2>
              <div className="bg-slate-50 p-6 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Destination:</span>
                  <span>{formData.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Dates:</span>
                  <span>{formData.arrivalDate} to {formData.departureDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Interests:</span>
                  <span>{formData.interests.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Budget:</span>
                  <span>${formData.budget}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-6 py-2 border border-slate-300 rounded-lg hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!isStepValid() || loading}
            className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Generating...' : currentStep === steps.length - 1 ? 'Create Trip' : 'Next'}
          </button>
        </div>
      </div>
    </main>
  );
}
