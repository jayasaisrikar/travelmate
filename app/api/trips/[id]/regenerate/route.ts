import { NextRequest, NextResponse } from 'next/server';

import { isAdminEmail } from '@/services/admin-access';
import { lookupDestinationPhotoUrl } from '@/services/place-photo';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { generateItineraryFromLiveData } from '@/services/itinerary';
import { regenerateItineraryCluster, regenerateItineraryDay, type RegenerationScope } from '@/services/itinerary-regeneration';
import { resolveDestination } from '@/services/places';
import {
  buildPublicShareUrl,
  buildSharePreview,
  createOrRefreshTripShare,
  type TripRow,
} from '@/services/trip-sharing';
import { saveTravelerPreferences } from '@/services/traveler-preferences';
import type { GeneratedItinerary, ItineraryDayPlan, TripShareRecord } from '@/lib/travel-types';

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

function formatTripError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) {
    return 'Failed to update trip';
  }

  if (error.code === '42703' || error.message?.includes('cover_image_url')) {
    return 'The trips table is missing cover_image_url. Apply supabase/migrations/20260416_add_trip_cover_image_url.sql first.';
  }

  return error.message || 'Failed to update trip';
}

function isValidScope(value: unknown): value is RegenerationScope {
  return value === 'day' || value === 'cluster';
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeInterests(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => normalizeString(item))
    .filter(Boolean);
}

function toNumberOrNull(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isFullScope(value: unknown): value is 'full' {
  return value === 'full';
}

async function loadShareByTripId(tripId: string, ownerUserId?: string) {
  const query = supabase.from('trip_shares').select('*').eq('trip_id', tripId);

  if (ownerUserId) {
    query.eq('owner_user_id', ownerUserId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { share: null as TripShareRecord | null, error };
  }

  return { share: (data ?? null) as TripShareRecord | null, error: null };
}

function getDailyPlans(itinerary: GeneratedItinerary | null | undefined): ItineraryDayPlan[] {
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

    const canAccessAllTrips = isAdminEmail(user.email);

    const body = await request.json().catch(() => ({}));
    const scope = isValidScope(body?.scope) ? body.scope : isFullScope(body?.scope) ? body.scope : null;

    if (!scope) {
      return NextResponse.json({ error: 'A regeneration scope is required' }, { status: 400 });
    }

    const loadQuery = supabase.from('trips').select('*').eq('id', id);

    if (!canAccessAllTrips) {
      loadQuery.eq('user_id', user.id);
    }

    const { data: trip, error: loadError } = await loadQuery.maybeSingle();

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

    const rawItinerary = trip.itinerary as GeneratedItinerary | null;
    const dailyPlans = getDailyPlans(rawItinerary);
    const itinerary = rawItinerary;

    if (!itinerary || dailyPlans.length === 0) {
      return NextResponse.json({ error: 'Trip itinerary is unavailable' }, { status: 400 });
    }

    if (scope === 'full') {
      const destination = normalizeString(body?.destination);
      const budget = normalizeString(body?.budget);
      const interests = normalizeInterests(body?.interests);
      const arrivalDate = normalizeString(body?.arrivalDate) || null;
      const departureDate = normalizeString(body?.departureDate) || null;
      const arrivalTime = normalizeString(body?.arrivalTime) || null;
      const departureTime = normalizeString(body?.departureTime) || null;
      const arrivalMethod =
        body?.arrivalMethod === 'flight' ||
        body?.arrivalMethod === 'train' ||
        body?.arrivalMethod === 'drive' ||
        body?.arrivalMethod === 'bus' ||
        body?.arrivalMethod === 'other'
          ? body.arrivalMethod
          : null;
      const activityIntensity =
        body?.activityIntensity === 'Relaxed' ||
        body?.activityIntensity === 'Balanced' ||
        body?.activityIntensity === 'Packed'
          ? body.activityIntensity
          : null;
      const arrivalTransferContext = normalizeString(body?.arrivalTransferContext) || null;
      const departureTransferContext = normalizeString(body?.departureTransferContext) || null;
      const latitude = toNumberOrNull(body?.latitude);
      const longitude = toNumberOrNull(body?.longitude);

      if (!destination) {
        return NextResponse.json({ error: 'A destination is required' }, { status: 400 });
      }

      const resolvedDestination = await resolveDestination(destination, {
        latitude,
        longitude,
      }, {
        skipReverseGeocode: Boolean(latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined),
      });

      const generated = await generateItineraryFromLiveData({
        destination,
        latitude: resolvedDestination.latitude,
        longitude: resolvedDestination.longitude,
        resolvedDestination,
        duration: Number.isInteger(Number(body?.duration)) ? Number(body.duration) : null,
        arrivalDate,
        departureDate,
        arrivalTime,
        departureTime,
        arrivalMethod,
        activityIntensity,
        arrivalTransferContext,
        departureTransferContext,
        budget,
        interests,
      });

      const now = new Date().toISOString();
      const updateQuery = supabase
        .from('trips')
        .update({
          destination,
          duration: generated.duration,
          budget: budget || String(body?.budget ?? ''),
          interests,
          itinerary: generated,
          cover_image_url: await lookupDestinationPhotoUrl(destination),
          updated_at: now,
        })
        .eq('id', id);

      if (!canAccessAllTrips) {
        updateQuery.eq('user_id', user.id);
      }

      const { data: updatedTrip, error: updateError } = await updateQuery.select('*').single();

      if (updateError || !updatedTrip) {
        console.error('[api/trips/:id/regenerate] full update failed', {
          id,
          error: updateError?.message,
          code: updateError?.code,
        });
        return NextResponse.json({ error: updateError?.message || 'Failed to update trip' }, { status: 500 });
      }

      const preview = await buildSharePreview(updatedTrip as TripRow);
      const shareUpdateQuery = supabase
        .from('trip_shares')
        .update({
          share_title: preview.title,
          share_description: preview.description,
          updated_at: now,
        })
        .eq('trip_id', id);

      if (!canAccessAllTrips) {
        shareUpdateQuery.eq('owner_user_id', user.id);
      }

      let shareData: TripShareRecord | null = null;
      const { data: refreshedShare, error: shareUpdateError } = await shareUpdateQuery.select('*').maybeSingle();

      if (shareUpdateError) {
        console.warn('[api/trips/:id/regenerate] share sync failed', {
          id,
          error: shareUpdateError.message,
        });
      }

      if (refreshedShare) {
        shareData = refreshedShare;
      } else {
        const existingShare = await loadShareByTripId(id, canAccessAllTrips ? undefined : user.id);
        shareData = existingShare.share;

        if (!shareData) {
          const refreshed = await createOrRefreshTripShare(
            updatedTrip as TripRow,
            updatedTrip.user_id || user.id
          );
          shareData = refreshed.share;
        }
      }

      if (body?.preferences) {
        await saveTravelerPreferences({
          userId: user.id,
          email: user.email ?? null,
          preferences: body.preferences,
        });
      }

      const baseUrl = new URL(request.url).origin;

      return NextResponse.json({
        success: true,
        trip: updatedTrip,
        share: shareData
          ? {
              ...shareData,
              shareUrl: buildPublicShareUrl(baseUrl, shareData.token),
            }
          : null,
        shareUrl: shareData ? buildPublicShareUrl(baseUrl, shareData.token) : null,
        generated,
      });
    }

    const dayIndex = typeof body?.dayIndex === 'number' ? body.dayIndex : Number(body?.dayIndex);
    const activityIndex =
      typeof body?.activityIndex === 'number' ? body.activityIndex : Number(body?.activityIndex);
    const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : '';

    if (!Number.isInteger(dayIndex) || dayIndex < 0) {
      return NextResponse.json({ error: 'A valid day index is required' }, { status: 400 });
    }

    if (!instruction) {
      return NextResponse.json({ error: 'Please add a regeneration instruction' }, { status: 400 });
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
        cover_image_url: trip.cover_image_url ?? null,
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
    const updateQuery = supabase
      .from('trips')
      .update({
        itinerary: regenerated.itinerary,
        updated_at: now,
      })
      .eq('id', id);

    if (!canAccessAllTrips) {
      updateQuery.eq('user_id', user.id);
    }

    const { data: updatedTrip, error: updateError } = await updateQuery.select('*').single();

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
