import { supabase } from '@/services/supabase';

export const ACTIVE_TRAVELER_WINDOW_DAYS = 90;

export function activeTravelerCutoff(): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACTIVE_TRAVELER_WINDOW_DAYS);
  return cutoff.toISOString();
}

export async function touchTravelerLastSeen(userId: string): Promise<void> {
  if (!userId) {
    return;
  }

  await supabase
    .from('traveler_profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', userId);
}
