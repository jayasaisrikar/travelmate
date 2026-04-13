import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { regenerateItineraryCluster, regenerateItineraryDay, type RegenerationScope } from '@/services/itinerary-regeneration';
import type { GeneratedItinerary } from '@/lib/travel-types';

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

function formatTripError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) {
    return 'Failed to update trip';
  }

  return error.message || 'Failed to update trip';
}

function isValidScope(value: unknown): value is RegenerationScope {
  return value === 'day' || value === 'cluster';
}

function getDailyPlans(itinerary: Record<string, any> | null | undefined) {
  if (Array.isArray(itinerary?.dailyPlans)) {
    return itinerary.dailyPlans;
  }

  if (Array.isArray(itinerary?.daily_plans)) {
    return itinerary.daily_plans;
  }

  return [];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const body = await request.json().catch(() => ({}));
    const scope = isValidScope(body?.scope) ? body.scope : null;
    const dayIndex = typeof body?.dayIndex === 'number' ? body.dayIndex : Number(body?.dayIndex);
    const activityIndex =
      typeof body?.activityIndex === 'number' ? body.activityIndex : Number(body?.activityIndex);
    const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : '';

    if (!scope) {
      return NextResponse.json({ error: 'A regeneration scope is required' }, { status: 400 });
    }

    if (!Number.isInteger(dayIndex) || dayIndex < 0) {
      return NextResponse.json({ error: 'A valid day index is required' }, { status: 400 });
    }

    if (!instruction) {
      return NextResponse.json({ error: 'Please add a regeneration instruction' }, { status: 400 });
    }

    const { data: trip, error: loadError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (loadError) {
      console.error('[api/trips/:id/regenerate] load failed', {
        id,
        error: loadError.message,
        code: loadError.code,
      });
      return NextResponse.json({ error: formatTripError(loadError) }, { status: 500 });
    }

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const rawItinerary = trip.itinerary as Record<string, any> | null;
    const dailyPlans = getDailyPlans(rawItinerary);
    const itinerary = rawItinerary
      ? ({
          ...rawItinerary,
          dailyPlans,
          daily_plans: dailyPlans,
        } as GeneratedItinerary)
      : null;

    if (!itinerary || dailyPlans.length === 0) {
      return NextResponse.json({ error: 'Trip itinerary is unavailable' }, { status: 400 });
    }

    const regenerationInput = {
      trip: {
        id: trip.id,
        user_id: trip.user_id,
        destination: trip.destination,
        duration: trip.duration,
        budget: trip.budget,
        interests: Array.isArray(trip.interests) ? trip.interests : [],
        itinerary,
        created_at: trip.created_at,
        updated_at: trip.updated_at,
      },
      itinerary,
      dayIndex,
      activityIndex: Number.isInteger(activityIndex) && activityIndex >= 0 ? activityIndex : null,
      instruction,
      scope,
    };

    const regenerated =
      scope === 'day'
        ? await regenerateItineraryDay(regenerationInput)
        : await regenerateItineraryCluster(regenerationInput);

    const now = new Date().toISOString();
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        itinerary: regenerated.itinerary,
        updated_at: now,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError || !updatedTrip) {
      console.error('[api/trips/:id/regenerate] update failed', {
        id,
        error: updateError?.message,
        code: updateError?.code,
      });
      return NextResponse.json({ error: updateError?.message || 'Failed to update trip' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      regenerated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate itinerary' },
      { status: 500 }
    );
  }
}
