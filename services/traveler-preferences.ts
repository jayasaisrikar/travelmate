import { supabase } from '@/services/supabase';
import type { TravelerPreferences } from '@/lib/travel-types';

type PreferenceInput = Partial<TravelerPreferences> | null | undefined;

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => normalizeString(item))
    .filter(Boolean);
}

export function normalizeTravelerPreferences(value: unknown): TravelerPreferences {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  const arrivalMethod =
    raw.arrivalMethod === 'flight' || raw.arrivalMethod === 'train' || raw.arrivalMethod === 'drive'
      ? raw.arrivalMethod
      : null;

  const activityIntensity =
    raw.activityIntensity === 'Relaxed' ||
    raw.activityIntensity === 'Balanced' ||
    raw.activityIntensity === 'Packed'
      ? raw.activityIntensity
      : null;

  return {
    arrivalMethod,
    activityIntensity,
    budget: normalizeString(raw.budget) || undefined,
    interests: normalizeStringArray(raw.interests),
    arrivalTransferContext: normalizeString(raw.arrivalTransferContext) || undefined,
    departureTransferContext: normalizeString(raw.departureTransferContext) || undefined,
    dietaryRestrictions: normalizeStringArray(raw.dietaryRestrictions),
    sleepPreference: normalizeString(raw.sleepPreference) || undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

export function mergeTravelerPreferences(existing: PreferenceInput, update: PreferenceInput): TravelerPreferences {
  const normalizedExisting = normalizeTravelerPreferences(existing);
  const normalizedUpdate = normalizeTravelerPreferences(update);
  const merged: TravelerPreferences = { ...normalizedExisting };

  if (normalizedUpdate.arrivalMethod !== null && normalizedUpdate.arrivalMethod !== undefined) {
    merged.arrivalMethod = normalizedUpdate.arrivalMethod;
  }

  if (normalizedUpdate.activityIntensity !== null && normalizedUpdate.activityIntensity !== undefined) {
    merged.activityIntensity = normalizedUpdate.activityIntensity;
  }

  if (normalizedUpdate.budget) {
    merged.budget = normalizedUpdate.budget;
  }

  if (normalizedUpdate.interests?.length) {
    merged.interests = normalizedUpdate.interests;
  }

  if (normalizedUpdate.arrivalTransferContext) {
    merged.arrivalTransferContext = normalizedUpdate.arrivalTransferContext;
  }

  if (normalizedUpdate.departureTransferContext) {
    merged.departureTransferContext = normalizedUpdate.departureTransferContext;
  }

  if (normalizedUpdate.dietaryRestrictions?.length) {
    merged.dietaryRestrictions = normalizedUpdate.dietaryRestrictions;
  }

  if (normalizedUpdate.sleepPreference) {
    merged.sleepPreference = normalizedUpdate.sleepPreference;
  }

  return merged;
}

function toPersistablePreferences(preferences: TravelerPreferences): Record<string, unknown> {
  const { updatedAt, ...persisted } = preferences;
  return persisted;
}

export async function loadTravelerPreferences(userId: string): Promise<TravelerPreferences | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('travel_preferences, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeTravelerPreferences({
    ...(data.travel_preferences as Record<string, unknown> | null | undefined),
    updatedAt: data.updated_at,
  });
}

export async function saveTravelerPreferences(input: {
  userId: string;
  email: string | null | undefined;
  preferences: PreferenceInput;
}): Promise<TravelerPreferences | null> {
  const mergedPreferences = mergeTravelerPreferences(null, input.preferences);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: input.userId,
        email: input.email ?? null,
        travel_preferences: toPersistablePreferences(mergedPreferences),
        updated_at: now,
      },
      { onConflict: 'id' }
    )
    .select('travel_preferences, updated_at')
    .single();

  if (error || !data) {
    return null;
  }

  return normalizeTravelerPreferences({
    ...(data.travel_preferences as Record<string, unknown> | null | undefined),
    updatedAt: data.updated_at,
  });
}
