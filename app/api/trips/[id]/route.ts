import { NextRequest, NextResponse } from 'next/server';

import { isAdminEmail } from '@/services/admin-access';
import { lookupDestinationPhotoUrl } from '@/services/place-photo';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { buildPublicShareUrl, buildSharePreview, getTripShareByTripId, type TripRow } from '@/services/trip-sharing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatTripError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) {
    return 'Failed to load trip';
  }

  if (error.code === 'PGRST205') {
    return 'The trips table is missing in Supabase. Apply supabase/migrations/20260411_create_trips.sql first.';
  }

  if (error.code === '42703' || error.message?.includes('cover_image_url')) {
    return 'The trips table is missing cover_image_url. Apply supabase/migrations/20260416_add_trip_cover_image_url.sql first.';
  }

  return error.message || 'Failed to load trip';
}

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

async function loadTripById(id: string) {
  const { data, error } = await supabase.from('trips').select('*').eq('id', id).maybeSingle();
  return { data: data ?? null, error };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeIsoDate(value: unknown) {
  const trimmed = normalizeString(value);
  return ISO_DATE_PATTERN.test(trimmed) ? trimmed : '';
}

function normalizeInterests(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const interests = value
    .map(item => normalizeString(item))
    .filter(Boolean);

  return interests.length > 0 ? interests : [];
}

export async function GET(
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

    const [tripResult, shareResult] = await Promise.all([
      canAccessAllTrips
        ? loadTripById(id)
        : supabase.from('trips').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
      canAccessAllTrips
        ? supabase.from('trip_shares').select('*').eq('trip_id', id).maybeSingle()
        : getTripShareByTripId(id, user.id),
    ]);

    const { data, error } = tripResult;
    const shareData = 'share' in shareResult ? shareResult.share : shareResult.data;

    if (error) {
      console.error('[api/trips/:id] load failed', {
        id,
        error: error.message,
        code: error.code,
      });
      return NextResponse.json({ error: formatTripError(error) }, { status: 500 });
    }

    const baseUrl = new URL(request.url).origin;
    const tripWithCover = data
      ? {
          ...data,
          cover_image_url: data.cover_image_url ?? (await lookupDestinationPhotoUrl(data.destination)),
        }
      : null;

    return NextResponse.json({
      trip: tripWithCover,
      share: shareData
        ? {
            ...shareData,
            shareUrl: buildPublicShareUrl(baseUrl, shareData.token),
          }
        : null,
      shareUrl: shareData ? buildPublicShareUrl(baseUrl, shareData.token) : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load trip' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const updates: Record<string, unknown> = {};

    const destination = normalizeString(body?.destination);
    const budget = normalizeString(body?.budget);
    const itinerary = body?.itinerary;
    const interests = normalizeInterests(body?.interests);
    const duration = typeof body?.duration === 'number' ? body.duration : Number(body?.duration);
    const tripStartDate = normalizeIsoDate(body?.trip_start_date);
    const tripEndDate = normalizeIsoDate(body?.trip_end_date);

    if (tripStartDate && tripEndDate && tripEndDate < tripStartDate) {
      return NextResponse.json({ error: 'end date must be on or after start date' }, { status: 400 });
    }

    if (destination) {
      updates.destination = destination;
      updates.cover_image_url = await lookupDestinationPhotoUrl(destination);
    }

    if (Number.isInteger(duration) && duration > 0) {
      updates.duration = duration;
    }

    if (budget) {
      updates.budget = budget;
    }

    if (interests) {
      updates.interests = interests;
    }

    if (itinerary && typeof itinerary === 'object') {
      updates.itinerary = itinerary;
    }

    if (tripStartDate) {
      updates.trip_start_date = tripStartDate;
    }

    if (tripEndDate) {
      updates.trip_end_date = tripEndDate;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Add at least one trip field to update' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updateQuery = supabase
      .from('trips')
      .update({
        ...updates,
        updated_at: now,
      })
      .eq('id', id);

    if (!canAccessAllTrips) {
      updateQuery.eq('user_id', user.id);
    }

    const { data, error } = await updateQuery.select('*').single();

    if (error || !data) {
      console.error('[api/trips/:id] update failed', {
        id,
        error: error?.message,
        code: error?.code,
      });
      return NextResponse.json({ error: error?.message || 'Failed to update trip' }, { status: 500 });
    }

    const preview = await buildSharePreview(data as TripRow);
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

    const { data: shareData, error: shareUpdateError } = await shareUpdateQuery.select('*').maybeSingle();

    if (shareUpdateError) {
      console.warn('[api/trips/:id] share preview sync failed', {
        id,
        error: shareUpdateError.message,
      });
    }

    const baseUrl = new URL(request.url).origin;

    return NextResponse.json({
      success: true,
      trip: data,
      share: shareData
        ? {
            ...shareData,
            shareUrl: buildPublicShareUrl(baseUrl, shareData.token),
          }
        : null,
      shareUrl: shareData ? buildPublicShareUrl(baseUrl, shareData.token) : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update trip' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const deleteQuery = supabase.from('trips').delete().eq('id', id);

    if (!canAccessAllTrips) {
      deleteQuery.eq('user_id', user.id);
    }

    const { data, error } = await deleteQuery.select('id').maybeSingle();

    if (error || !data) {
      console.error('[api/trips/:id] delete failed', {
        id,
        error: error?.message,
        code: error?.code,
      });
      return NextResponse.json({ error: error?.message || 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete trip' },
      { status: 500 }
    );
  }
}
