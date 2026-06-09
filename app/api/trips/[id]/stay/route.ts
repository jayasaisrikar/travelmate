import { NextRequest, NextResponse } from 'next/server';

import { isAdminEmail } from '@/services/admin-access';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { searchStayCandidates } from '@/services/places';
import { suggestStayRetry } from '@/services/stay';
import type { GeneratedItinerary, PointOfInterest } from '@/lib/travel-types';

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

function formatTripError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) {
    return 'Failed to update stay';
  }

  return error.message || 'Failed to update stay';
}

function getCandidateArray(itinerary: GeneratedItinerary | null | undefined): PointOfInterest[] {
  if (!itinerary?.sourceData || typeof itinerary.sourceData !== 'object') {
    return [];
  }

  return Array.isArray(itinerary.sourceData.stayCandidates) ? itinerary.sourceData.stayCandidates : [];
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

    const canAccessAllTrips = isAdminEmail(user.email);

    const body = await request.json();
    const budgetRange = typeof body.budgetRange === 'string' ? body.budgetRange.trim() : '';
    const preferredLocation = typeof body.preferredLocation === 'string' ? body.preferredLocation.trim() : '';

    if (!budgetRange || !preferredLocation) {
      return NextResponse.json(
        { error: 'Budget range and preferred location are required' },
        { status: 400 }
      );
    }

    const loadQuery = supabase.from('trips').select('*').eq('id', id);

    if (!canAccessAllTrips) {
      loadQuery.eq('user_id', user.id);
    }

    const { data: trip, error: loadError } = await loadQuery.maybeSingle();

    if (loadError) {
      console.error('[api/trips/:id/stay] load failed', {
        id,
        error: loadError.message,
        code: loadError.code,
      });
      return NextResponse.json({ error: formatTripError(loadError) }, { status: 500 });
    }

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const itinerary = trip.itinerary as GeneratedItinerary;
    const destination = itinerary?.sourceData?.destination;

    if (
      !destination ||
      typeof destination.latitude !== 'number' ||
      typeof destination.longitude !== 'number' ||
      typeof destination.name !== 'string'
    ) {
      return NextResponse.json({ error: 'Trip destination is unavailable' }, { status: 400 });
    }

    const freshCandidates = await searchStayCandidates(trip.destination);
    const liveCandidates = getCandidateArray(itinerary);
    const stayCandidates = freshCandidates.length > 0 ? freshCandidates : liveCandidates;

    const retryResult = await suggestStayRetry({
      destination,
      currentStay: itinerary?.stay ?? null,
      stayCandidates,
      budgetRange,
      preferredLocation,
    });

    const previousStayName = typeof itinerary?.stay?.name === 'string' ? itinerary.stay.name : null;
    const updatedStay = retryResult.stay;
    const updatedTransfers = Array.isArray(itinerary?.transfers)
      ? itinerary.transfers.map(transfer => {
          if (transfer.kind === 'arrival') {
            return {
              ...transfer,
              to: updatedStay?.name ?? transfer.to ?? null,
            };
          }

          if (transfer.kind === 'departure') {
            return {
              ...transfer,
              from: updatedStay?.name ?? transfer.from ?? null,
            };
          }

          return transfer;
        })
      : [];

    const updatedItinerary = {
      ...itinerary,
      stay: updatedStay,
      transfers: updatedTransfers,
      sourceData: {
        ...itinerary?.sourceData,
        stayCandidates,
      },
    };

    const now = new Date().toISOString();
    const updateQuery = supabase
      .from('trips')
      .update({
        itinerary: updatedItinerary,
        updated_at: now,
      })
      .eq('id', id);

    if (!canAccessAllTrips) {
      updateQuery.eq('user_id', user.id);
    }

    const { data: updatedTrip, error: updateError } = await updateQuery.select('*').single();

    if (updateError || !updatedTrip) {
      console.error('[api/trips/:id/stay] update failed', {
        id,
        previousStayName,
        error: updateError?.message,
        code: updateError?.code,
      });
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update stay' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      stay: updatedStay,
      notes: retryResult.notes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update stay' },
      { status: 500 }
    );
  }
}
