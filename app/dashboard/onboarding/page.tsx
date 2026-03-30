'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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
    budget: 2000,
    interests: ['Culture', 'Food', 'Adventure']
  });

  const [destinationSearch, setDestinationSearch] = useState('');
  const [destinationResults, setDestinationResults] = useState<DestinationResult[]>([]);
  const [searchingDestination, setSearchingDestination] = useState(false);

  // Search for destination using Nominatim (ANY city on Earth)
  const searchDestination = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setDestinationResults([]);
      return;
    }

    setSearchingDestination(true);
    try {
      const response = await fetch(`/api/destinations-search?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.results) {
        setDestinationResults(data.results);
      } else {
        setDestinationResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setDestinationResults([]);
    } finally {
      setSearchingDestination(false);
    }
  }, []);

  // Select a destination
  const selectDestination = (dest: DestinationResult) => {
    setFormData(prev => ({
      ...prev,
      destination: dest.name,
      latitude: dest.latitude,
      longitude: dest.longitude
    }));
    setDestinationSearch(dest.name);
    setDestinationResults([]);
  };

  // Generate itinerary
  const handleGenerateItinerary = async () => {
    // Validate required fields
    if (!formData.destination || !formData.arrivalDate || !formData.departureDate) {
      setError('Please fill in all required fields');
      return;
    }

    if (new Date(formData.departureDate) <= new Date(formData.arrivalDate)) {
      setError('Departure date must be after arrival date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate-itinerary-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          duration: Math.ceil(
            (new Date(formData.departureDate).getTime() - new Date(formData.arrivalDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate itinerary');
      }

      // Save trip to Supabase and navigate
      const tripData = await saveTrip({
        destination: formData.destination,
        duration: Math.ceil(
          (new Date(formData.departureDate).getTime() - new Date(formData.arrivalDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
        budget: String(formData.budget),
        interests: formData.interests,
        itinerary: result.itinerary
      });

      router.push(`/trip/${tripData.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate itinerary');
    } finally {
      setLoading(false);
    }
  };

  const interests = ['Beach', 'Mountain', 'Culture', 'Food', 'History', 'Art', 'Adventure', 'Nature', 'Shopping', 'Nightlife'];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Plan Your Journey</h1>
          <p className="text-slate-400">Answer a few questions and we'll create your perfect itinerary</p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              className={`h-2 flex-1 rounded-full ${
                idx <= currentStep ? 'bg-blue-500' : 'bg-slate-700'
              }`}
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: idx * 0.1 }}
            />
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
        >
          {/* Step 1: Destination */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Where do you want to go?</h2>
              <p className="text-slate-400">Search any city, town, or village on Earth</p>

              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., Gokarna, Paris, Tokyo, Rishikesh..."
                  value={destinationSearch}
                  onChange={e => {
                    setDestinationSearch(e.target.value);
                    searchDestination(e.target.value);
                  }}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                />

                {searchingDestination && (
                  <div className="absolute right-4 top-3 text-blue-400">
                    <div className="animate-spin">⟳</div>
                  </div>
                )}

                {/* Search Results */}
                {destinationResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                    {destinationResults.map((dest, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => selectDestination(dest)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700 last:border-0"
                        whileHover={{ x: 4 }}
                      >
                        <div className="font-semibold">{dest.name}</div>
                        <div className="text-sm text-slate-400">{dest.address}</div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {formData.destination && (
                <div className="p-3 bg-slate-800 border border-blue-500 rounded-lg">
                  ✓ Selected: <strong>{formData.destination}</strong>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Travel Dates */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">When are you traveling?</h2>

              <div>
                <label className="block text-sm font-semibold mb-2">Arrival Date & Time</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={formData.arrivalDate}
                    onChange={e => setFormData(prev => ({ ...prev, arrivalDate: e.target.value }))}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="time"
                    value={formData.arrivalTime}
                    onChange={e => setFormData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={formData.arrivalMethod}
                    onChange={e => setFormData(prev => ({ ...prev, arrivalMethod: e.target.value as any }))}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option>Flight</option>
                    <option>Train</option>
                    <option>Drive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Departure Date & Time</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={formData.departureDate}
                    onChange={e => setFormData(prev => ({ ...prev, departureDate: e.target.value }))}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="time"
                    value={formData.departureTime}
                    onChange={e => setFormData(prev => ({ ...prev, departureTime: e.target.value }))}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Budget (USD)</label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={e => setFormData(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Preferences */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Your Preferences</h2>

              <div>
                <label className="block text-sm font-semibold mb-3">Activity Intensity</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Relaxed', 'Balanced', 'Packed'].map(intensity => (
                    <button
                      key={intensity}
                      onClick={() => setFormData(prev => ({ ...prev, activityIntensity: intensity as any }))}
                      className={`p-3 rounded-lg border transition ${
                        formData.activityIntensity === intensity
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {intensity}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Sleep Hours: <strong>{formData.sleepHours}h</strong>
                </label>
                <input
                  type="range"
                  min="6"
                  max="10"
                  value={formData.sleepHours}
                  onChange={e => setFormData(prev => ({ ...prev, sleepHours: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">Interests (select at least 1)</label>
                <div className="grid grid-cols-2 gap-2">
                  {interests.map(interest => (
                    <button
                      key={interest}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          interests: prev.interests.includes(interest)
                            ? prev.interests.filter(i => i !== interest)
                            : [...prev.interests, interest]
                        }));
                      }}
                      className={`p-2 rounded-lg border text-sm transition ${
                        formData.interests.includes(interest)
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Review Your Plan</h2>

              <div className="space-y-3 p-4 bg-slate-800 rounded-lg">
                <div>
                  <strong>Destination:</strong> {formData.destination}
                </div>
                <div>
                  <strong>Travel:</strong> {formData.arrivalDate} → {formData.departureDate}
                </div>
                <div>
                  <strong>Budget:</strong> ${formData.budget}
                </div>
                <div>
                  <strong>Interests:</strong> {formData.interests.join(', ')}
                </div>
                <div>
                  <strong>Intensity:</strong> {formData.activityIntensity}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 rounded-lg">
              ⚠️ {error}
            </div>
          )}
        </motion.div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            className="px-6 py-2 border border-slate-700 rounded-lg hover:border-slate-600 transition"
            disabled={currentStep === 0}
          >
            Back
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              disabled={
                (currentStep === 0 && !formData.destination) ||
                (currentStep === 1 && (!formData.arrivalDate || !formData.departureDate))
              }
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleGenerateItinerary}
              disabled={loading}
              className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Itinerary'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
