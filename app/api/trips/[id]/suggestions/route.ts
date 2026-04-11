import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { listTripSuggestionsByTripId } from '@/services/trip-sharing';

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

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (tripError) {
      return NextResponse.json({ error: tripError.message }, { status: 500 });
    }

    if (!trip) {
      return NextResponse.json({ share: null, suggestions: [] });
    }

    const { data: share, error: shareError } = await supabase
      .from('trip_shares')
      .select('id, token, revoked_at, created_at, updated_at, share_title, share_description, share_image_url')
      .eq('trip_id', id)
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (shareError) {
      return NextResponse.json({ error: shareError.message }, { status: 500 });
    }

    if (!share) {
      return NextResponse.json({ share: null, suggestions: [] });
    }

    const { suggestions, error } = await listTripSuggestionsByTripId(id, user.id);

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
