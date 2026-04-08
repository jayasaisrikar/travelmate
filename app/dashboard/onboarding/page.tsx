'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { saveTrip } from '@/lib/supabase-trips';

const STEPS = ['Destination', 'Dates', 'Preferences', 'Review'];
const INTERESTS = ['Culture', 'Food', 'Adventure', 'Beach', 'History', 'Nature', 'Art', 'Shopping'];

interface SearchResult { name: string; latitude: number; longitude: number; address: string; }

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    destination: '', latitude: 0, longitude: 0,
    arrivalDate: '', departureDate: '',
    arrivalMethod: 'flight' as 'flight' | 'train' | 'drive',
    activityIntensity: 'Balanced' as 'Relaxed' | 'Balanced' | 'Packed',
    budget: 1000,
    interests: [] as string[],
  });

  const [results, setResults] = useState<SearchResult[]>([]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    try {
      const r = await fetch(`/api/destinations-search?query=${encodeURIComponent(q)}`);
      const d = await r.json();
      setResults(d.results || []);
    } catch { setResults([]); }
  }, []);

  const isValid = () => {
    if (step === 0) return form.destination.length > 0;
    if (step === 1) return !!form.arrivalDate && !!form.departureDate && form.departureDate >= form.arrivalDate;
    if (step === 2) return form.interests.length > 0 && form.budget > 0;
    return true;
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }

    setLoading(true);
    setError('');
    try {
      const duration = Math.max(1, Math.ceil(
        (new Date(form.departureDate).getTime() - new Date(form.arrivalDate).getTime()) / 86400000
      ));

      const res = await fetch('/api/generate-itinerary-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      // Save using Supabase with localStorage fallback
      const savedTrip = await saveTrip({
        destination: form.destination,
        duration,
        budget: form.budget.toString(),
        interests: form.interests,
        itinerary: data.itinerary,
      });
      router.push(`/trip/${savedTrip.id}`);
    } catch (e: any) {
      console.error('Trip creation error:', e);
      setError(e.message || 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav */}
      <div style={{ borderBottom: '1px solid #1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', borderRadius: 8 }} />
        <span style={{ fontWeight: 700, fontSize: 18 }}>TravelMate</span>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 120px' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 48 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 4, borderRadius: 4, background: i <= step ? '#3b82f6' : '#1e293b', transition: 'background .3s' }} />
              <div style={{ marginTop: 6, fontSize: 11, color: i === step ? '#93c5fd' : '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, letterSpacing: -1 }}>
          {['Where to next?', 'When are you going?', 'What do you love?', 'Ready to go?'][step]}
        </h1>
        <p style={{ color: '#64748b', marginBottom: 40, fontSize: 16 }}>
          {['Search any city, village, or hidden gem.', 'Set your travel dates and transport.', 'Pick interests and set your budget.', 'Review your trip and generate the itinerary.'][step]}
        </p>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 24, padding: '12px 16px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 12, color: '#fca5a5', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* STEP 0 – Destination */}
        {step === 0 && (
          <div>
            <div style={{ position: 'relative' }}>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Paris, Gokarna, Tokyo..."
                value={form.destination}
                onChange={e => { setForm(p => ({ ...p, destination: e.target.value })); search(e.target.value); }}
                style={{ width: '100%', padding: '16px 20px', fontSize: 18, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, color: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
              />
              {results.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, overflow: 'hidden', zIndex: 50 }}>
                  {results.map((r, i) => (
                    <button key={i} onClick={() => { setForm(p => ({ ...p, destination: r.name, latitude: r.latitude, longitude: r.longitude })); setResults([]); }}
                      style={{ width: '100%', padding: '14px 20px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #1e293b', cursor: 'pointer', color: '#f8fafc' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1e293b')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{r.address}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              {['Paris', 'Tokyo', 'Gokarna', 'Bali', 'London', 'Rome'].map(c => (
                <button key={c} onClick={() => { setForm(p => ({ ...p, destination: c })); search(c); }}
                  style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid #1e293b', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 – Dates */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Arrival Date', key: 'arrivalDate' as const },
                { label: 'Departure Date', key: 'departureDate' as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>
                  <input type="date" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '14px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#f8fafc', colorScheme: 'dark', fontSize: 16, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 12, fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Arriving by</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {(['flight', 'train', 'drive'] as const).map(m => (
                  <button key={m} onClick={() => setForm(p => ({ ...p, arrivalMethod: m }))}
                    style={{ padding: '16px 12px', borderRadius: 12, border: `2px solid ${form.arrivalMethod === m ? '#3b82f6' : '#1e293b'}`, background: form.arrivalMethod === m ? '#1d4ed8' : '#0f172a', color: form.arrivalMethod === m ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 700, textTransform: 'capitalize', fontSize: 14 }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 – Preferences */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 16, fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Interests</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {INTERESTS.map(i => (
                  <button key={i} onClick={() => setForm(p => ({ ...p, interests: p.interests.includes(i) ? p.interests.filter(x => x !== i) : [...p.interests, i] }))}
                    style={{ padding: '12px 8px', borderRadius: 12, border: `2px solid ${form.interests.includes(i) ? '#3b82f6' : '#1e293b'}`, background: form.interests.includes(i) ? '#1d4ed8' : '#0f172a', color: form.interests.includes(i) ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Budget (USD)</label>
                <input type="number" min={100} value={form.budget} onChange={e => setForm(p => ({ ...p, budget: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '14px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#f8fafc', fontSize: 16, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Intensity</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {(['Relaxed', 'Balanced', 'Packed'] as const).map(l => (
                    <button key={l} onClick={() => setForm(p => ({ ...p, activityIntensity: l }))}
                      style={{ padding: '12px 4px', borderRadius: 10, border: `2px solid ${form.activityIntensity === l ? '#06b6d4' : '#1e293b'}`, background: form.activityIntensity === l ? '#0e7490' : '#0f172a', color: form.activityIntensity === l ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 – Review */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Destination', value: form.destination },
              { label: 'Dates', value: `${form.arrivalDate} → ${form.departureDate}` },
              { label: 'Arriving by', value: form.arrivalMethod },
              { label: 'Intensity', value: form.activityIntensity },
              { label: 'Budget', value: `$${form.budget}` },
              { label: 'Interests', value: form.interests.join(', ') || 'None selected' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }}>
                <span style={{ color: '#64748b', fontWeight: 600, fontSize: 14 }}>{label}</span>
                <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: 14, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation buttons — always rendered, no conditions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 48 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: '16px 28px', borderRadius: 14, border: '1px solid #1e293b', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!isValid() || loading}
            style={{
              flex: 1, padding: '16px 28px', borderRadius: 14, border: 'none', cursor: isValid() && !loading ? 'pointer' : 'not-allowed',
              background: isValid() && !loading ? 'linear-gradient(135deg,#3b82f6,#06b6d4)' : '#1e293b',
              color: isValid() && !loading ? '#fff' : '#475569', fontWeight: 800, fontSize: 16,
              opacity: loading ? 0.7 : 1, transition: 'background .2s'
            }}>
            {loading ? 'Building your itinerary...' : step === STEPS.length - 1 ? 'Generate Itinerary →' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
