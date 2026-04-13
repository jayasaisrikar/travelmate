import { NextRequest, NextResponse } from 'next/server';

import { isAdminEmail } from '@/services/admin-access';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import {
  buildPublicShareUrl,
  createOrRefreshTripShare,
  getTripShareByTripId,
  type TripRow,
} from '@/services/trip-sharing';

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

async function loadOwnedTrip(tripId: string, userId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { trip: null as TripRow | null, error };
  }

  return { trip: (data ?? null) as TripRow | null, error: null };
}

async function loadTripById(tripId: string) {
  const { data, error } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();

  if (error) {
    return { trip: null as TripRow | null, error };
  }

  return { trip: (data ?? null) as TripRow | null, error: null };
}

async function loadShareByTripId(tripId: string, ownerUserId?: string) {
  const query = supabase.from('trip_shares').select('*').eq('trip_id', tripId);

  if (ownerUserId) {
    query.eq('owner_user_id', ownerUserId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { share: null as any, error };
  }

  return { share: (data ?? null) as any, error: null };
}

function shareResponse(baseUrl: string, share: { token: string; id: string; revoked_at: string | null; created_at: string; updated_at: string; share_title: string | null; share_description: string | null; share_image_url: string | null } | null, suggestionsCount = 0) {
  if (!share) {
    return { share: null, shareUrl: null, suggestionsCount };
  }

  return {
    share: {
      ...share,
      shareUrl: buildPublicShareUrl(baseUrl, share.token),
    },
    shareUrl: buildPublicShareUrl(baseUrl, share.token),
    suggestionsCount,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const canAccessAllTrips = isAdminEmail(user.email);

    const [tripResult, shareResult] = await Promise.all([
      canAccessAllTrips ? loadTripById(id) : loadOwnedTrip(id, user.id),
      canAccessAllTrips ? loadShareByTripId(id) : getTripShareByTripId(id, user.id),
    ]);

    if (tripResult.error) {
      return NextResponse.json({ error: tripResult.error.message }, { status: 500 });
    }

    let resolvedShare = shareResult.share;

    if (!resolvedShare && tripResult.trip) {
      const createdShareResult = await createOrRefreshTripShare(
        tripResult.trip,
        tripResult.trip.user_id || user.id
      );

      if (createdShareResult.error) {
        return NextResponse.json({ error: createdShareResult.error.message }, { status: 500 });
      }

      resolvedShare = createdShareResult.share;
    }

    const { count: suggestionsCount, error: countError } = resolvedShare
      ? await supabase
          .from('trip_suggestions')
          .select('*', { count: 'exact', head: true })
          .eq('share_id', resolvedShare.id)
      : { count: 0, error: null };

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const baseUrl = new URL(request.url).origin;

    return NextResponse.json({
      trip: tripResult.trip,
      ...shareResponse(baseUrl, resolvedShare, suggestionsCount ?? 0),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load share link' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const canAccessAllTrips = isAdminEmail(user.email);

    const body = await request.json().catch(() => ({}));
    const regenerate = body?.regenerate === true;

    const { trip, error: tripError } = canAccessAllTrips
      ? await loadTripById(id)
      : await loadOwnedTrip(id, user.id);

    if (tripError) {
      return NextResponse.json({ error: tripError.message }, { status: 500 });
    }

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const { share: existingShare, error: shareError } = canAccessAllTrips
      ? await loadShareByTripId(id)
      : await getTripShareByTripId(id, user.id);

    if (shareError) {
      return NextResponse.json({ error: shareError.message }, { status: 500 });
    }

    if (existingShare && !regenerate && !existingShare.revoked_at) {
      const baseUrl = new URL(request.url).origin;
      const countQuery = supabase
        .from('trip_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('share_id', existingShare.id);

      const { count: suggestionsCount, error: countError } = await countQuery;

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          created: false,
          ...shareResponse(baseUrl, existingShare, suggestionsCount ?? 0),
        },
        { status: 200 }
      );
    }

    const { share, error } = await createOrRefreshTripShare(trip, trip.user_id || user.id);

    if (error || !share) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create share link' },
        { status: 500 }
      );
    }

    const baseUrl = new URL(request.url).origin;
    return NextResponse.json({
      created: true,
      ...shareResponse(baseUrl, share, 0),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const canAccessAllTrips = isAdminEmail(user.email);

    const revokeQuery = supabase
      .from('trip_shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('trip_id', id);

    if (!canAccessAllTrips) {
      revokeQuery.eq('owner_user_id', user.id);
    }

    const { data, error } = await revokeQuery.select('*').maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, share: data ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}
