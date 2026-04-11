import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import {
  loadTravelerPreferences,
  mergeTravelerPreferences,
  normalizeTravelerPreferences,
} from '@/services/traveler-preferences';

function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const preferences = await loadTravelerPreferences(user.id);

    return NextResponse.json({
      preferences,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load preferences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const body = await request.json().catch(() => ({}));
    const existingPreferences = await loadTravelerPreferences(user.id);
    const nextPreferences = mergeTravelerPreferences(existingPreferences, body?.preferences ?? body);
    const { updatedAt: _updatedAt, ...persistedPreferences } = nextPreferences;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          travel_preferences: persistedPreferences,
          updated_at: now,
        },
        { onConflict: 'id' }
      )
      .select('travel_preferences, updated_at')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Failed to save preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferences: normalizeTravelerPreferences({
        ...(data.travel_preferences as Record<string, unknown> | null | undefined),
        updatedAt: data.updated_at,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save preferences' },
      { status: 500 }
    );
  }
}
