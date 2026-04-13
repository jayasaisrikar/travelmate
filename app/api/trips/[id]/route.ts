import { NextRequest, NextResponse } from 'next/server';

import { isAdminEmail } from '@/services/admin-access';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { buildPublicShareUrl, getTripShareByTripId } from '@/services/trip-sharing';

function formatTripError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) {
    return 'Failed to load trip';
  }

  if (error.code === 'PGRST205') {
    return 'The trips table is missing in Supabase. Apply supabase/migrations/20260411_create_trips.sql first.';
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

    return NextResponse.json({
      trip: data ?? null,
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
    const itinerary = body?.itinerary;

    if (!itinerary || typeof itinerary !== 'object') {
      return NextResponse.json({ error: 'An itinerary payload is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updateQuery = supabase
      .from('trips')
      .update({
        itinerary,
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

    return NextResponse.json({ success: true, trip: data });
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
