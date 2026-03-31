'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveTrip } from '@/lib/supabase-trips';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Calendar, 
  Plane, 
  Compass, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  ChevronRight,
  Search,
  Sparkles,
  DollarSign,
  Clock
} from 'lucide-react';

const steps = ['Destination', 'Logistics', 'Preferences', 'Review'];

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/generate-itinerary-real', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            duration: Math.ceil((new Date(formData.departureDate).getTime() - new Date(formData.arrivalDate).getTime()) / (1000 * 60 * 60 * 24)) || 1
          })
        });

        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Failed to generate itinerary');

        const trip = await saveTrip({
          destination: formData.destination,
          duration: Math.ceil((new Date(formData.departureDate).getTime() - new Date(formData.arrivalDate).getTime()) / (1000 * 60 * 60 * 24)) || 1,
          budget: formData.budget.toString(),
          interests: formData.interests,
          itinerary: result.itinerary
        });

        router.push(`/trip/${trip.id}`);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message || 'Failed to generate itinerary. Please try again.');
        setLoading(false);
      }
    } else {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.destination.length > 0;
      case 1:
        return formData.arrivalDate && formData.departureDate && new Date(formData.departureDate) >= new Date(formData.arrivalDate);
      case 2:
        return formData.interests.length > 0 && formData.budget > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-50 selection:bg-blue-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4"
          >
            <Sparkles className="w-3 h-3" />
            <span>Step {currentStep + 1} of {steps.length}</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4 tracking-tight"
          >
            {currentStep === 0 && "Where to next?"}
            {currentStep === 1 && "When & How?"}
            {currentStep === 2 && "Personalize it"}
            {currentStep === 3 && "Ready for adventure?"}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg max-w-lg mx-auto"
          >
            {currentStep === 0 && "Search any city, town, or hidden gem on Earth."}
            {currentStep === 1 && "Tell us your schedule and how you're arriving."}
            {currentStep === 2 && "Define your vibe, budget, and what you love."}
            {currentStep === 3 && "Review your choices and let AI work its magic."}
          </motion.p>
        </div>

        {/* Progress bar */}
        <div className="mb-16 relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-between">
            {steps.map((step, i) => (
              <div key={step} className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    i < currentStep 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : i === currentStep 
                        ? 'bg-[#020617] border-blue-500 text-blue-500 ring-4 ring-blue-500/10' 
                        : 'bg-[#020617] border-slate-800 text-slate-500'
                  }`}
                >
                  {i < currentStep ? <Check className="w-5 h-5" /> : <span>{i + 1}</span>}
                </div>
                <span className={`mt-3 text-xs font-medium hidden md:block ${i === currentStep ? 'text-blue-400' : 'text-slate-500'}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {error}
          </motion.div>
        )}

        {/* Form Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* Step 0: Destination */}
              {currentStep === 0 && (
                <div className="space-y-8">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                      <Search className="w-6 h-6" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Enter a destination (e.g. Gokarna, Paris...)"
                      className="w-full pl-14 pr-6 py-5 bg-slate-900/50 border border-slate-800 rounded-2xl text-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-600 shadow-xl"
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, destination: e.target.value }));
                        handleDestinationSearch(e.target.value);
                      }}
                      value={formData.destination}
                    />
                    
                    <AnimatePresence>
                      {searchResults.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full mt-4 w-full bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800/50"
                        >
                          {searchResults.map((result, i) => (
                            <button
                              key={i}
                              onClick={() => handleSelectDestination(result)}
                              className="w-full text-left px-6 py-4 hover:bg-blue-500/5 transition-colors flex items-center gap-4 group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                                <MapPin className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-100">{result.name}</div>
                                <div className="text-sm text-slate-500 truncate max-w-md">{result.address}</div>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    {['Tokyo', 'Paris', 'Gokarna', 'London'].map((city) => (
                      <button
                        key={city}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, destination: city }));
                          handleDestinationSearch(city);
                        }}
                        className="px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-sm hover:border-slate-700 hover:text-slate-200 transition-all"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1: Logistics */}
              {currentStep === 1 && (
                <div className="space-y-10">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-400 ml-1">
                        <Calendar className="w-4 h-4" /> Arrival Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-5 py-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all [color-scheme:dark]"
                        value={formData.arrivalDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, arrivalDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-400 ml-1">
                        <Calendar className="w-4 h-4" /> Departure Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-5 py-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all [color-scheme:dark]"
                        value={formData.departureDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, departureDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-400 ml-1">
                      <Plane className="w-4 h-4" /> Arrival Method
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {(['flight', 'train', 'drive'] as const).map((method) => (
                        <button
                          key={method}
                          onClick={() => setFormData(prev => ({ ...prev, arrivalMethod: method }))}
                          className={`px-4 py-4 rounded-xl border capitalize font-medium transition-all flex flex-col items-center gap-2 ${
                            formData.arrivalMethod === method
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-sm">{method}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Preferences */}
              {currentStep === 2 && (
                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-400 ml-1">
                      <Compass className="w-4 h-4" /> Interests (Select multiple)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['Culture', 'Food', 'Adventure', 'Beach', 'History', 'Nature', 'Art', 'Shopping'].map(interest => (
                        <button
                          key={interest}
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            interests: prev.interests.includes(interest)
                              ? prev.interests.filter(i => i !== interest)
                              : [...prev.interests, interest]
                          }))}
                          className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                            formData.interests.includes(interest)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800/50'
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-400 ml-1">
                        <DollarSign className="w-4 h-4" /> Budget (USD)
                      </label>
                      <input
                        type="number"
                        min="100"
                        className="w-full px-5 py-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={formData.budget}
                        onChange={(e) => setFormData(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-400 ml-1">
                        <Clock className="w-4 h-4" /> Intensity
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Relaxed', 'Balanced', 'Packed'] as const).map((level) => (
                          <button
                            key={level}
                            onClick={() => setFormData(prev => ({ ...prev, activityIntensity: level }))}
                            className={`px-2 py-4 rounded-xl border text-xs font-bold transition-all ${
                              formData.activityIntensity === level
                                ? 'bg-cyan-600 border-cyan-600 text-white'
                                : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {currentStep === 3 && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Destination', value: formData.destination, icon: MapPin },
                      { label: 'Duration', value: `${formData.arrivalDate} - ${formData.departureDate}`, icon: Calendar },
                      { label: 'Intensity', value: formData.activityIntensity, icon: Clock },
                      { label: 'Budget', value: `$${formData.budget}`, icon: DollarSign },
                    ].map((item, i) => (
                      <div key={i} className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{item.label}</div>
                          <div className="font-semibold text-slate-100">{item.value || 'Not set'}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <Compass className="w-5 h-5 text-blue-400" />
                      <h3 className="font-bold text-slate-200">Interests</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.interests.map(interest => (
                        <span key={interest} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-xs font-semibold">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex items-center justify-between gap-4 pt-8 border-t border-slate-800">
          <button
            onClick={handleBack}
            className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all ${
              currentStep === 0 
                ? 'opacity-0 pointer-events-none' 
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700'
            }`}
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          
          <button
            onClick={handleNext}
            disabled={!isStepValid() || loading}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-12 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              currentStep === steps.length - 1
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-white text-slate-900 hover:bg-slate-100'
            }`}
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                <span>Designing your trip...</span>
              </div>
            ) : (
              <>
                {currentStep === steps.length - 1 ? "Generate Itinerary" : "Continue"}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
