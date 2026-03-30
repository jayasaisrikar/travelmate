'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

const fadeInUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } };

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const textY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const bentoY1 = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const bentoY2 = useTransform(scrollYProgress, [0, 1], [0, -120]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden selection:bg-purple-200">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200 py-3 shadow-sm' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-fuchsia-700 rounded-lg shadow-lg flex items-center justify-center transform transition-transform hover:rotate-12">
              <span className="text-white text-xs">✈️</span>
            </div>
            <span className="text-xl font-marseille font-bold tracking-tight">TravelMate</span>
          </motion.div>
          <div className="hidden md:flex gap-8 items-center bg-white/50 px-6 py-2 rounded-full border border-slate-200/50 backdrop-blur-sm shadow-sm">
            <a href="#features" className="text-slate-600 hover:text-purple-600 transition font-medium text-sm">Features</a>
            <a href="#how-it-works" className="text-slate-600 hover:text-purple-600 transition font-medium text-sm">How it Works</a>
            <a href="#pricing" className="text-slate-600 hover:text-purple-600 transition font-medium text-sm">Pricing</a>
          </div>
          <div className="flex gap-4 items-center">
            <button className="hidden sm:block text-slate-600 hover:text-slate-900 transition font-medium text-sm">Sign In</button>
            <Link href="/dashboard/onboarding" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0">
              Start Planning
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-[90vh] flex items-center">
        {/* Decorative background blurs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400/20 rounded-full blur-[80px] -z-10 mix-blend-multiply"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-fuchsia-400/20 rounded-full blur-[100px] -z-10 mix-blend-multiply"></div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
          {/* Left Content */}
          <motion.div 
            style={{ y: textY, opacity: textOpacity }}
            className="text-left z-10"
          >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-block py-1 px-3 rounded-full bg-purple-100/50 border border-purple-200 text-purple-700 text-sm font-semibold mb-6 shadow-sm">
                ✨ Gemini 3.1 Pro Powered
              </span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="text-6xl sm:text-7xl lg:text-8xl font-marseille font-bold tracking-tight mb-6 leading-tight"
            >
              AI-Powered
              <br />
              <span className="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-700 bg-clip-text text-transparent transform inline-block -translate-y-1 sm:-translate-y-2">Travel Planning</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-slate-600 leading-relaxed font-borscha mb-10 max-w-xl"
            >
              Skip the research. Get personalized itineraries crafted by AI in seconds. From hidden gems to must-see landmarks, discover your perfect trip.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 mb-12 lg:mb-0"
            >
              <Link href="/dashboard/onboarding" className="group relative bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all font-borscha text-center shadow-[0_0_40px_-10px_rgba(147,51,234,0.5)] hover:shadow-[0_0_60px_-15px_rgba(147,51,234,0.7)] hover:-translate-y-1">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Create Trip <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </Link>
              <button className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-900 px-8 py-4 rounded-xl font-semibold transition-all font-borscha hover:-translate-y-1 shadow-sm">
                See Demo
              </button>
            </motion.div>
          </motion.div>

          {/* Right Content - Bento Grid with Parallax */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="grid grid-cols-2 gap-4 h-[450px] sm:h-[600px] w-full relative z-10">
            {/* Tall Image */}
            <motion.div style={{ y: bentoY1 }} className="col-span-1 row-span-2 rounded-3xl overflow-hidden relative group shadow-2xl">
              <img src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800" alt="Kyoto, Japan" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute bottom-6 left-6 text-white text-left transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                <p className="font-bold text-2xl font-marseille mb-1">Kyoto</p>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                  <span className="text-xs bg-white/20 backdrop-blur-md px-2 py-1 rounded font-medium">Japan</span>
                  <span className="text-xs bg-white/20 backdrop-blur-md px-2 py-1 rounded font-medium">⛩️ Culture</span>
                </div>
              </div>
            </motion.div>
            
            {/* Top Right Square */}
            <motion.div style={{ y: bentoY2 }} className="col-span-1 row-span-1 rounded-3xl overflow-hidden relative group shadow-xl">
              <img src="https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=800" alt="Paris, France" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
              <div className="absolute bottom-5 left-5 text-white text-left">
                <p className="font-bold text-xl font-marseille mb-0.5">Paris</p>
                <p className="text-sm text-slate-200 font-borscha opacity-80">France</p>
              </div>
            </motion.div>

            {/* Bottom Right Square */}
            <motion.div style={{ y: bentoY1 }} className="col-span-1 row-span-1 rounded-3xl overflow-hidden relative group shadow-xl">
              <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800" alt="Bali, Indonesia" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
              <div className="absolute bottom-5 left-5 text-white text-left">
                <p className="font-bold text-xl font-marseille mb-0.5">Bali</p>
                <p className="text-sm text-slate-200 font-borscha opacity-80">Indonesia</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Mockup Section */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden aspect-[16/10] sm:aspect-video flex flex-col relative">
          {/* Browser Header Mockup */}
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="bg-white rounded-md text-xs text-slate-400 px-3 py-1 flex-1 mx-4 text-center border border-slate-200">
              travelmate.app/trip/tokyo-7days
            </div>
          </div>
          
          {/* App UI Mockup */}
          <div className="flex-1 flex flex-col sm:flex-row bg-slate-50 overflow-hidden">
            {/* Sidebar Mockup */}
            <div className="hidden sm:block w-64 bg-white border-r border-slate-200 p-6">
              <div className="h-6 w-32 bg-slate-200 rounded mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 w-full bg-purple-100 rounded"></div>
                <div className="h-4 w-3/4 bg-slate-100 rounded"></div>
                <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
                <div className="h-4 w-full bg-slate-100 rounded"></div>
              </div>
              <div className="mt-12 h-32 w-full bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                <span className="text-slate-400 text-2xl">🗺️</span>
              </div>
            </div>
            {/* Main Content Mockup */}
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">7 Days in Tokyo</h3>
                  <p className="text-sm text-slate-500">Oct 12 - Oct 18 • $2,500 Budget</p>
                </div>
                <div className="h-10 w-24 bg-purple-600 rounded-lg"></div>
              </div>
              {/* Daily Itinerary Mockup */}
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-16 text-right pt-2 font-medium text-slate-500">Day 1</div>
                  <div className="flex-1 space-y-3">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">🍜</div>
                      <div>
                        <div className="font-semibold text-slate-800">Ichiran Shibuya</div>
                        <div className="text-sm text-slate-500">12:30 PM • Lunch</div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">⛩️</div>
                      <div>
                        <div className="font-semibold text-slate-800">Meiji Shrine</div>
                        <div className="text-sm text-slate-500">3:00 PM • Sightseeing</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-16 text-right pt-2 font-medium text-slate-500">Day 2</div>
                  <div className="flex-1 space-y-3">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">🗼</div>
                      <div>
                        <div className="font-semibold text-slate-800">Tokyo Tower</div>
                        <div className="text-sm text-slate-500">10:00 AM • Sightseeing</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100/40 via-transparent to-transparent"></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-5xl font-marseille font-bold mb-4">How It Works</h2>
            <p className="text-lg text-slate-600 font-borscha">Three simple steps to your next adventure</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { number: '01', title: 'Tell Us Your Style', desc: 'Destination, budget, interests, and duration. Just 2 minutes.', icon: '🎯' },
              { number: '02', title: 'AI Crafts Your Trip', desc: 'Gemini 3.1 Pro personalizes every detail to your preferences.', icon: '🧠' },
              { number: '03', title: 'Explore & Share', desc: 'Activities, costs, maps, and timings. Share instantly with friends.', icon: '🚀' }
            ].map((step, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 30 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                whileHover={{ y: -10, scale: 1.02 }}
                transition={{ delay: i * 0.1, duration: 0.4 }} 
                viewport={{ once: true, margin: "-50px" }} 
                className="relative p-8 bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 transition-all cursor-default group overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full blur-2xl group-hover:bg-purple-100 transition-colors"></div>
                <div className="text-4xl mb-6 transform group-hover:scale-110 transition-transform origin-left">{step.icon}</div>
                <div className="text-5xl font-marseille font-bold text-slate-100 mb-4 group-hover:text-purple-100 transition-colors">{step.number}</div>
                <h3 className="text-2xl font-marseille font-bold mb-3 text-slate-900 group-hover:text-purple-600 transition-colors">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed font-borscha relative z-10">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features with Mockups */}
      <section id="features" className="py-32 px-6 overflow-hidden relative">
        <div className="absolute left-0 top-1/2 w-[800px] h-[800px] bg-purple-100/30 rounded-full blur-[120px] -z-10 mix-blend-multiply transform -translate-y-1/2 -translate-x-1/2"></div>
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-24">
            <h2 className="text-5xl font-marseille font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-slate-600 font-borscha max-w-2xl mx-auto">Everything you need for the perfect trip, designed to feel like magic.</p>
          </motion.div>

          <div className="space-y-32">
            {/* Feature 1: Timeline View */}
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true, margin: "-100px" }} className="grid md:grid-cols-2 gap-16 items-center">
              <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-3xl border border-purple-100 shadow-2xl shadow-purple-900/5 overflow-hidden aspect-[4/3] flex flex-col relative">
                <div className="bg-white/60 backdrop-blur-md border-b border-purple-100 p-4 font-semibold text-slate-800 flex justify-between items-center">
                  <span>Day 1 • Oct 12</span>
                  <span className="text-purple-600 text-sm bg-purple-100 px-2 py-1 rounded">Tokyo</span>
                </div>
                <div className="p-6 overflow-hidden flex-1 relative">
                  <div className="absolute left-8 top-6 bottom-0 w-0.5 bg-purple-200"></div>
                  <div className="space-y-6 relative">
                    <div className="flex gap-4 items-start">
                      <div className="w-4 h-4 rounded-full bg-purple-500 mt-1 relative z-10 shadow-sm shadow-purple-300"></div>
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex-1">
                        <div className="text-xs font-bold text-purple-500 mb-1">10:00 AM</div>
                        <div className="font-semibold text-slate-800">Senso-ji Temple</div>
                        <div className="text-sm text-slate-500 mt-1 line-clamp-2">Historic Buddhist temple in Asakusa. Perfect for traditional souvenirs and snacks along Nakamise street.</div>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-4 h-4 rounded-full bg-slate-300 mt-1 relative z-10"></div>
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex-1 opacity-70">
                        <div className="text-xs font-bold text-slate-400 mb-1">1:00 PM</div>
                        <div className="font-semibold text-slate-700">Sushi Zanmai Lunch</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-marseille font-bold mb-4 flex items-center gap-3 text-purple-900">
                  <span className="p-2 bg-purple-100 rounded-lg text-purple-600 shadow-sm border border-purple-200">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  Smart Itineraries
                </h3>
                <p className="text-slate-600 leading-relaxed font-borscha mb-4">See every activity with exact times, estimated costs, and descriptions. AI optimizes your daily schedule for maximum enjoyment.</p>
                <ul className="space-y-2 font-borscha text-sm text-slate-600">
                  <li className="flex items-center gap-2"><span className="text-purple-500">✓</span> Hour-by-hour breakdown</li>
                  <li className="flex items-center gap-2"><span className="text-purple-500">✓</span> Real cost estimates</li>
                  <li className="flex items-center gap-2"><span className="text-purple-500">✓</span> Exact locations & GPS</li>
                </ul>
              </div>
            </motion.div>

            {/* Feature 2: Map View */}
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true, margin: "-100px" }} className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h3 className="text-3xl font-marseille font-bold mb-4 flex items-center gap-3 text-purple-900">
                  <span className="p-2 bg-purple-100 rounded-lg text-purple-600 shadow-sm border border-purple-200">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                  </span>
                  Interactive Maps
                </h3>
                <p className="text-slate-600 leading-relaxed font-borscha mb-4 text-lg">Visualize your entire trip on an interactive map with optimized routes, nearby restaurants, and attractions.</p>
                <ul className="space-y-4 font-borscha text-slate-600 mt-8">
                  <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</div> Route optimization</li>
                  <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</div> Nearby POIs</li>
                  <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</div> Distance estimates</li>
                </ul>
              </div>
              <div className="bg-slate-200 rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/10 overflow-hidden aspect-[4/3] flex flex-col relative order-first md:order-last">
                <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800" alt="Map mockup" className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply" />
                <div className="absolute inset-0 bg-purple-900/10"></div>
                
                {/* Map Pins Mockups */}
                <div className="absolute top-1/4 left-1/4 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '3s' }}>
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2">1</div>
                </div>
                <div className="absolute top-1/2 right-1/3 animate-bounce" style={{ animationDelay: '1000ms', animationDuration: '3s' }}>
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2">2</div>
                </div>
                <div className="absolute bottom-1/3 left-1/2 animate-bounce" style={{ animationDelay: '500ms', animationDuration: '3s' }}>
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2">3</div>
                </div>
                
                {/* Floating Map Panel */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur rounded-xl p-4 shadow-lg flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-lg">🚶</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-800">12 min walk</p>
                    <p className="text-xs text-slate-500">to Shibuya Crossing</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 3: Budget */}
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true, margin: "-100px" }} className="grid md:grid-cols-2 gap-16 items-center">
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl border border-orange-100 shadow-2xl shadow-orange-900/5 overflow-hidden aspect-[4/3] flex flex-col p-8 relative">
                <div className="flex justify-between items-end mb-8 relative z-10">
                  <div>
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Est. Cost</h4>
                    <p className="text-5xl font-marseille font-bold text-slate-800 tracking-tight">$2,450</p>
                  </div>
                  <div className="bg-white rounded-full px-4 py-1.5 text-xs font-bold text-orange-600 border border-orange-200 shadow-sm animate-pulse">
                    On Budget
                  </div>
                </div>
                
                <div className="space-y-6 flex-1 relative z-10">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-slate-700 flex items-center gap-2"><span>✈️</span> Flights</span>
                      <span className="text-slate-600 font-medium">$850</span>
                    </div>
                    <div className="h-3 w-full bg-white rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-purple-400 w-[35%] rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-slate-700 flex items-center gap-2"><span>🏨</span> Stay</span>
                      <span className="text-slate-600 font-medium">$1,200</span>
                    </div>
                    <div className="h-3 w-full bg-white rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-fuchsia-400 w-[50%] rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-slate-700 flex items-center gap-2"><span>🍣</span> Food & Activities</span>
                      <span className="text-slate-600 font-medium">$400</span>
                    </div>
                    <div className="h-3 w-full bg-white rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-amber-400 w-[15%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-marseille font-bold mb-4 flex items-center gap-3 text-purple-900">
                  <span className="p-2 bg-purple-100 rounded-lg text-purple-600 shadow-sm border border-purple-200">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  Real Budget Tracking
                </h3>
                <p className="text-slate-600 leading-relaxed font-borscha mb-4 text-lg">Transparent cost breakdowns across flights, hotels, food, and activities. Never be surprised by prices again.</p>
                <ul className="space-y-4 font-borscha text-slate-600 mt-8">
                  <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs">✓</div> Per-category breakdown</li>
                  <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs">✓</div> Honest estimates</li>
                  <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs">✓</div> Alternative options</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Premium CTA */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden bg-slate-900 px-6 py-20 sm:py-32 flex flex-col items-center justify-center border border-slate-800 shadow-2xl"
          >
            {/* Background elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_10%,transparent_100%)]"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] md:w-[60%] h-32 bg-purple-500/30 blur-[100px] rounded-full"></div>
            <div className="absolute bottom-0 left-1/4 w-[50%] h-32 bg-fuchsia-500/20 blur-[100px] rounded-full"></div>

            <div className="relative z-10 flex flex-col items-center">
              <span className="inline-block py-1.5 px-4 rounded-full bg-slate-800/80 backdrop-blur-md border border-slate-700 text-purple-400 text-sm font-semibold mb-8 shadow-sm tracking-wide">
                🚀 Start your journey today
              </span>
              <h2 className="text-4xl sm:text-6xl lg:text-7xl font-marseille font-bold text-white mb-6 text-center tracking-tight leading-tight">
                Ready to explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">the world?</span>
              </h2>
              <p className="text-lg sm:text-xl text-slate-400 mb-10 font-borscha max-w-2xl text-center leading-relaxed">
                Join thousands of travelers creating their personalized, expert-curated itineraries in under 2 minutes. No planning fatigue, just pure adventure.
              </p>
              
              <Link href="/dashboard/onboarding" className="group relative bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 rounded-xl font-bold transition-all font-borscha text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:-translate-y-1 flex items-center gap-3">
                Plan Your Trip Now
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              {/* Social Proof */}
              <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex -space-x-4">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100" className="w-10 h-10 rounded-full border-2 border-slate-900 object-cover" alt="User" />
                  <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100&h=100" className="w-10 h-10 rounded-full border-2 border-slate-900 object-cover" alt="User" />
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100&h=100" className="w-10 h-10 rounded-full border-2 border-slate-900 object-cover" alt="User" />
                  <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-white z-10">+2k</div>
                </div>
                <div className="text-sm font-borscha text-slate-400">
                  <div className="flex text-amber-400 mb-0.5 text-xs">★★★★★</div>
                  <span className="text-white font-bold">4.9/5</span> from happy travelers
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-sm text-slate-600 font-borscha">
          <p>© 2026 TravelMate. Built with AI.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-900 transition">Privacy</a>
            <a href="#" className="hover:text-slate-900 transition">Terms</a>
            <a href="#" className="hover:text-slate-900 transition">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
