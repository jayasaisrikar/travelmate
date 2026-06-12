'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Compass, Heart, Users } from 'lucide-react';
import { Brand } from '@/components/common/Brand';
import { SocialProfileSettings } from '@/components/social/SocialProfileSettings';
import { TripSignalSettings } from '@/components/social/TripSignalSettings';
import { TravelerMessageInbox } from '@/components/social/TravelerMessageInbox';
import { RequestInbox } from '@/components/social/RequestInbox';
import { listTrips, type Trip } from '@/lib/supabase-trips';
import type { TravelerProfile } from '@/services/social';

export default function CommunitySettingsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [profile, setProfile] = useState<TravelerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listTrips()
      .then(setTrips)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load your trips'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#fbf6ef] text-[#3a2540]">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Brand href="/" compact className="shrink-0" />
            <div className="hidden h-6 w-px bg-stone-200 sm:block" />
            <div className="hidden sm:block">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f43f5e]">Community</div>
              <div className="text-sm font-black tracking-tight text-stone-800">Traveler visibility</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#ea580c] shadow-sm transition hover:bg-[#fff7ed]"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Find travelers</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#f43f5e]">
            <Heart className="h-3 w-3" />
            Community visibility
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-950 sm:text-5xl">
            Find travel companions
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#7c6a72] sm:text-base">
            Opt into a traveler profile, then publish the saved trips you want other logged-in travelers to discover.
          </p>
        </div>

        {error && (
          <p className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
            {error}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <SocialProfileSettings onProfileSaved={setProfile} />
          </section>
          <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            {loading ? (
              <div className="flex h-24 items-center justify-center gap-2 text-sm font-semibold text-[#7c6a72]">
                <Compass className="h-4 w-4 animate-pulse text-[#ea580c]" />
                Loading saved trips...
              </div>
            ) : (
              <TripSignalSettings trips={trips} profile={profile} />
            )}
          </section>
        </div>
        <RequestInbox />
        <TravelerMessageInbox />
      </div>
    </main>
  );
}
