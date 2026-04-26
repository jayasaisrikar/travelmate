import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { lookupDestinationPhotoUrl } from '@/services/place-photo';
import { buildPublicShareUrl, createOrRefreshTripShare } from '@/services/trip-sharing';
import { saveTravelerPreferences } from '@/services/traveler-preferences';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function summarizeTripBody(body: unknown) {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const trip = body as Record<string, unknown>;

  return {
    id: typeof trip.id === 'string' ? trip.id : undefined,
    destination: typeof trip.destination === 'string' ? trip.destination : undefined,
    duration: typeof trip.duration === 'number' ? trip.duration : undefined,
    budgetType: typeof trip.budget === 'string' ? 'string' : typeof trip.budget,
    interestsCount: Array.isArray(trip.interests) ? trip.interests.length : undefined,
    itineraryDays:
      trip.itinerary && typeof trip.itinerary === 'object' && Array.isArray((trip.itinerary as { dailyPlans?: unknown[] }).dailyPlans)
        ? (trip.itinerary as { dailyPlans?: unknown[] }).dailyPlans?.length
        : undefined,
  };
}

function formatTripError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) {
    return 'Failed to save trip';
  }

  if (error.code === 'PGRST205') {
    return 'The trips table is missing in Supabase. Apply supabase/migrations/20260411_create_trips.sql first.';
  }

  if (error.code === '42703' || error.message?.includes('cover_image_url')) {
    return 'The trips table is missing cover_image_url. Apply supabase/migrations/20260416_add_trip_cover_image_url.sql first.';
  }

  return error.message || 'Failed to save trip';
}

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/trips] load failed', {
        error: error.message,
        code: error.code,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const trips = await Promise.all(
      (data ?? []).map(async trip => ({
        ...trip,
        cover_image_url: trip.cover_image_url ?? (await lookupDestinationPhotoUrl(trip.destination)),
      }))
    );

    return NextResponse.json({ trips });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load trips' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const now = new Date().toISOString();
    const preferences = body.preferences ?? null;
    const coverImageUrl = typeof body.destination === 'string'
      ? await lookupDestinationPhotoUrl(body.destination)
      : null;

    const { data, error } = await supabase
      .from('trips')
      .insert({
        id: body.id,
        user_id: user.id,
        destination: body.destination,
        duration: body.duration,
        budget: body.budget,
        interests: body.interests,
        itinerary: body.itinerary,
        cover_image_url: coverImageUrl,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('[api/trips] save failed', {
        body: summarizeTripBody(body),
        error: error?.message,
        code: error?.code,
      });
      return NextResponse.json(
        { error: formatTripError(error) },
        { status: 500 }
      );
    }

    if (preferences) {
      const savedPreferences = await saveTravelerPreferences({
        userId: user.id,
        email: user.email ?? null,
        preferences,
      });

      if (!savedPreferences) {
        console.warn('[api/trips] preference save failed', {
          tripId: data.id,
          userId: user.id,
        });
      }
    }

    const { share, error: shareError } = await createOrRefreshTripShare(data as any, user.id);

    if (shareError) {
      console.error('[api/trips] share precreate failed', {
        tripId: data.id,
        error: shareError.message,
        code: shareError.code,
      });
    }

    const baseUrl = new URL(request.url).origin;

    return NextResponse.json({
      ...data,
      share: share
        ? {
            ...share,
            shareUrl: buildPublicShareUrl(baseUrl, share.token),
          }
        : null,
      shareUrl: share ? buildPublicShareUrl(baseUrl, share.token) : null,
    });
  } catch (error) {
    console.error('[api/trips] unexpected error', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save trip' },
      { status: 500 }
    );
  }
}
