import { NextRequest, NextResponse } from 'next/server';

import { isAdminEmail } from '@/services/admin-access';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { listTripSuggestionsByTripId } from '@/services/trip-sharing';
import type { TripSuggestionRecord } from '@/lib/travel-types';

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const canAccessAllTrips = isAdminEmail(user.email);

    const tripQuery = supabase.from('trips').select('id').eq('id', id);

    if (!canAccessAllTrips) {
      tripQuery.eq('user_id', user.id);
    }

    const { data: trip, error: tripError } = await tripQuery.maybeSingle();

    if (tripError) {
      return NextResponse.json({ error: tripError.message }, { status: 500 });
    }

    if (!trip) {
      return NextResponse.json({ share: null, suggestions: [] });
    }

    const shareQuery = supabase
      .from('trip_shares')
      .select('id, token, revoked_at, created_at, updated_at, share_title, share_description, share_image_url')
      .eq('trip_id', id);

    if (!canAccessAllTrips) {
      shareQuery.eq('owner_user_id', user.id);
    }

    const { data: share, error: shareError } = await shareQuery.maybeSingle();

    if (shareError) {
      return NextResponse.json({ error: shareError.message }, { status: 500 });
    }

    if (!share) {
      return NextResponse.json({ share: null, suggestions: [] });
    }

    const { suggestions, error } = canAccessAllTrips
      ? await supabase
          .from('trip_suggestions')
          .select('*')
          .eq('trip_id', id)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => ({ suggestions: (data ?? []) as TripSuggestionRecord[], error }))
      : await listTripSuggestionsByTripId(id, user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      share,
      suggestions: suggestions.map(suggestion => ({
        ...suggestion,
        suggestion: suggestion.message,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load suggestions' },
      { status: 500 }
    );
  }
}
