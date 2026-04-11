import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/services/supabase';
import { countTripSuggestionsByShareId, getTripShareByToken } from '@/services/trip-sharing';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { share, error: shareError } = await getTripShareByToken(token);

    if (shareError) {
      return NextResponse.json({ error: shareError.message }, { status: 500 });
    }

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', share.trip_id)
      .maybeSingle();

    if (tripError) {
      return NextResponse.json({ error: tripError.message }, { status: 500 });
    }

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const { count, error: countError } = await countTripSuggestionsByShareId(share.id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    return NextResponse.json({
      share,
      trip,
      suggestionsCount: count ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load public trip' },
      { status: 500 }
    );
  }
}
