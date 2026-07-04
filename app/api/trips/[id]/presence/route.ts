import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { evaluatePresence, isWithinTripWindow } from '@/services/presence';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { lat?: number; lng?: number };
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('id, destination, dest_lat, dest_lng, trip_start_date, trip_end_date')
    .eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  if (!isWithinTripWindow(today, trip.trip_start_date, trip.trip_end_date)) {
    return NextResponse.json({ verified: false, reason: 'out_of_window' });
  }

  // Ensure destination coords (geocode once + persist).
  let destLat = trip.dest_lat as number | null;
  let destLng = trip.dest_lng as number | null;
  if (destLat == null || destLng == null) {
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000';
      const geo = await fetch(`${base}/api/places?address=${encodeURIComponent(trip.destination)}`, { cache: 'no-store' });
      const g = (await geo.json().catch(() => null)) as { lat?: number; lon?: number } | null;
      if (g && typeof g.lat === 'number' && typeof g.lon === 'number') {
        destLat = g.lat; destLng = g.lon;
        await supabase.from('trips').update({ dest_lat: destLat, dest_lng: destLng }).eq('id', id);
      }
    } catch { /* fall through to no-coords */ }
  }
  if (destLat == null || destLng == null) {
    return NextResponse.json({ verified: false, reason: 'no_destination_coords' });
  }

  const { withinRadius, distanceKm } = evaluatePresence({ destLat, destLng, lat: body.lat, lng: body.lng });
  if (!withinRadius) return NextResponse.json({ verified: false, distance_km: distanceKm, reason: 'too_far' });

  await supabase.from('trip_presence_checks').upsert(
    { trip_id: id, user_id: user.id, lat: body.lat, lng: body.lng, distance_km: distanceKm, verified_at: new Date().toISOString() },
    { onConflict: 'trip_id,user_id' }
  );
  return NextResponse.json({ verified: true, distance_km: distanceKm });
}
