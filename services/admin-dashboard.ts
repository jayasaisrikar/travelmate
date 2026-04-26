import { buildPublicShareUrl } from '@/services/trip-sharing';
import { lookupDestinationPhotoUrl } from '@/services/place-photo';
import { supabaseAdmin } from '@/services/supabase-admin';

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  travel_preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type TripRow = {
  id: string;
  user_id: string | null;
  destination: string;
  duration: number;
  budget: string;
  interests: string[];
  cover_image_url: string | null;
  itinerary: unknown;
  created_at: string;
  updated_at: string;
};

type ShareRow = {
  id: string;
  trip_id: string;
  owner_user_id: string;
  token: string;
  share_title: string | null;
  share_description: string | null;
  share_image_url: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

type SuggestionRow = {
  id: string;
  share_id: string;
  trip_id: string;
  owner_user_id: string;
  guest_name: string | null;
  guest_email: string | null;
  message: string;
  created_at: string;
  updated_at: string;
};

type AuthUserRow = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
};

export interface AdminDashboardTrip {
  id: string;
  destination: string;
  duration: number;
  budget: string;
  interests: string[];
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  owner_email: string | null;
  owner_name: string | null;
  share: AdminDashboardShare | null;
  suggestions_count: number;
}

export interface AdminDashboardShare {
  id: string;
  trip_id: string;
  destination: string;
  owner_email: string | null;
  share_title: string | null;
  share_description: string | null;
  share_image_url: string | null;
  token: string;
  share_url: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  suggestions_count: number;
}

export interface AdminDashboardSuggestion {
  id: string;
  trip_id: string;
  destination: string;
  owner_email: string | null;
  guest_name: string | null;
  guest_email: string | null;
  message: string;
  created_at: string;
}

export interface AdminDashboardUser {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  role: string | null;
  full_name: string | null;
  usage: AdminDashboardUserUsage;
}

export interface AdminDashboardUserUsage {
  trips_created: number;
  shares_created: number;
  active_shares: number;
  suggestions_received: number;
  total_actions: number;
  last_trip_at: string | null;
  last_share_at: string | null;
  last_suggestion_at: string | null;
  last_activity_at: string | null;
}

export interface AdminDashboardProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  preferences: Record<string, unknown> | null;
}

export interface AdminDashboardOverview {
  stats: {
    trips: number;
    shares: number;
    activeShares: number;
    suggestions: number;
    users: number;
    confirmedUsers: number;
  };
  trips: AdminDashboardTrip[];
  shares: AdminDashboardShare[];
  suggestions: AdminDashboardSuggestion[];
  users: AdminDashboardUser[];
  profiles: AdminDashboardProfile[];
}

function createShareUrl(baseUrl: string, token: string) {
  return buildPublicShareUrl(baseUrl, token);
}

function createEmptyUsage() {
  return {
    trips_created: 0,
    shares_created: 0,
    active_shares: 0,
    suggestions_received: 0,
    last_trip_at: null as string | null,
    last_share_at: null as string | null,
    last_suggestion_at: null as string | null,
    last_activity_at: null as string | null,
  };
}

function touchLatest(current: string | null, next: string) {
  if (!current) {
    return next;
  }

  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

export async function loadAdminDashboardOverview(baseUrl: string): Promise<AdminDashboardOverview> {
  const [
    { data: trips, error: tripsError },
    { data: shares, error: sharesError },
    { data: suggestions, error: suggestionsError },
    { data: profiles, error: profilesError },
    { data: usersResponse, error: usersError },
  ] = await Promise.all([
    supabaseAdmin.from('trips').select('*').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('trip_shares').select('*').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('trip_suggestions').select('*').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, travel_preferences, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  if (tripsError) {
    throw tripsError;
  }
  if (sharesError) {
    throw sharesError;
  }
  if (suggestionsError) {
    throw suggestionsError;
  }
  if (profilesError) {
    throw profilesError;
  }
  if (usersError) {
    throw usersError;
  }

  const tripRows = (trips ?? []) as TripRow[];
  const shareRows = (shares ?? []) as ShareRow[];
  const suggestionRows = (suggestions ?? []) as SuggestionRow[];
  const profileRows = (profiles ?? []) as ProfileRow[];
  const authUsers = (usersResponse?.users ?? []) as AuthUserRow[];

  const profileById = new Map(profileRows.map(profile => [profile.id, profile]));
  const shareByTripId = new Map(shareRows.map(share => [share.trip_id, share]));
  const suggestionsCountByTripId = new Map<string, number>();
  const suggestionsCountByShareId = new Map<string, number>();
  const usageByUserId = new Map(authUsers.map(user => [user.id, createEmptyUsage()]));

  function getUsage(userId: string) {
    const usage = usageByUserId.get(userId);

    if (usage) {
      return usage;
    }

    const emptyUsage = createEmptyUsage();
    usageByUserId.set(userId, emptyUsage);
    return emptyUsage;
  }

  for (const suggestion of suggestionRows) {
    suggestionsCountByTripId.set(
      suggestion.trip_id,
      (suggestionsCountByTripId.get(suggestion.trip_id) ?? 0) + 1
    );
    suggestionsCountByShareId.set(
      suggestion.share_id,
      (suggestionsCountByShareId.get(suggestion.share_id) ?? 0) + 1
    );

    const usage = getUsage(suggestion.owner_user_id);
    usage.suggestions_received += 1;
    usage.last_suggestion_at = touchLatest(usage.last_suggestion_at, suggestion.created_at);
    usage.last_activity_at = touchLatest(usage.last_activity_at, suggestion.created_at);
  }

  for (const trip of tripRows) {
    if (!trip.user_id) {
      continue;
    }

    const usage = getUsage(trip.user_id);
    usage.trips_created += 1;
    usage.last_trip_at = touchLatest(usage.last_trip_at, trip.created_at);
    usage.last_activity_at = touchLatest(usage.last_activity_at, trip.created_at);
  }

  for (const share of shareRows) {
    const usage = getUsage(share.owner_user_id);
    usage.shares_created += 1;

    if (!share.revoked_at) {
      usage.active_shares += 1;
    }

    usage.last_share_at = touchLatest(usage.last_share_at, share.created_at);
    usage.last_activity_at = touchLatest(usage.last_activity_at, share.created_at);
  }

  const tripsOverview: AdminDashboardTrip[] = await Promise.all(
    tripRows.map(async trip => {
      const ownerProfile = trip.user_id ? profileById.get(trip.user_id) ?? null : null;
      const share = trip.id ? shareByTripId.get(trip.id) ?? null : null;
      const coverImageUrl = trip.cover_image_url ?? (await lookupDestinationPhotoUrl(trip.destination));

      return {
        id: trip.id,
        destination: trip.destination,
        duration: trip.duration,
        budget: trip.budget,
        interests: trip.interests,
        cover_image_url: coverImageUrl,
        created_at: trip.created_at,
        updated_at: trip.updated_at,
        owner_email: ownerProfile?.email ?? null,
        owner_name: ownerProfile?.full_name ?? null,
        share: share
          ? {
              id: share.id,
              trip_id: share.trip_id,
              destination: trip.destination,
              owner_email: ownerProfile?.email ?? null,
              share_title: share.share_title,
              share_description: share.share_description,
              share_image_url: share.share_image_url,
              token: share.token,
              share_url: createShareUrl(baseUrl, share.token),
              revoked_at: share.revoked_at,
              created_at: share.created_at,
              updated_at: share.updated_at,
              suggestions_count: suggestionsCountByShareId.get(share.id) ?? 0,
            }
          : null,
        suggestions_count: suggestionsCountByTripId.get(trip.id) ?? 0,
      };
    })
  );

  const sharesOverview: AdminDashboardShare[] = shareRows.map(share => {
    const ownerProfile = share.owner_user_id ? profileById.get(share.owner_user_id) ?? null : null;
    const trip = tripRows.find(candidate => candidate.id === share.trip_id) ?? null;

    return {
      id: share.id,
      trip_id: share.trip_id,
      destination: trip?.destination ?? 'Unknown trip',
      owner_email: ownerProfile?.email ?? null,
      share_title: share.share_title,
      share_description: share.share_description,
      share_image_url: share.share_image_url,
      token: share.token,
      share_url: createShareUrl(baseUrl, share.token),
      revoked_at: share.revoked_at,
      created_at: share.created_at,
      updated_at: share.updated_at,
      suggestions_count: suggestionsCountByShareId.get(share.id) ?? 0,
    };
  });

  const suggestionsOverview: AdminDashboardSuggestion[] = suggestionRows.map(suggestion => {
    const trip = tripRows.find(candidate => candidate.id === suggestion.trip_id) ?? null;
    const ownerProfile = suggestion.owner_user_id ? profileById.get(suggestion.owner_user_id) ?? null : null;

    return {
      id: suggestion.id,
      trip_id: suggestion.trip_id,
      destination: trip?.destination ?? 'Unknown trip',
      owner_email: ownerProfile?.email ?? null,
      guest_name: suggestion.guest_name,
      guest_email: suggestion.guest_email,
      message: suggestion.message,
      created_at: suggestion.created_at,
    };
  });

  const usersOverview: AdminDashboardUser[] = authUsers.map(user => {
    const profile = user.email
      ? profileRows.find(candidate => candidate.email?.toLowerCase() === user.email?.toLowerCase()) ?? null
      : null;
    const usage = getUsage(user.id);

    return {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      created_at: user.created_at,
      role:
        typeof user.app_metadata?.role === 'string'
          ? user.app_metadata.role
          : typeof user.user_metadata?.role === 'string'
            ? user.user_metadata.role
            : null,
      full_name: profile?.full_name ?? null,
      usage: {
        ...usage,
        total_actions:
          usage.trips_created + usage.shares_created + usage.suggestions_received,
      },
    };
  });

  const stats = {
    trips: tripRows.length,
    shares: shareRows.length,
    activeShares: shareRows.filter(share => !share.revoked_at).length,
    suggestions: suggestionRows.length,
    users: authUsers.length,
    confirmedUsers: authUsers.filter(user => Boolean(user.email_confirmed_at)).length,
  };

  return {
    stats,
    trips: tripsOverview,
    shares: sharesOverview,
    suggestions: suggestionsOverview,
    users: usersOverview,
    profiles: profileRows.map(profile => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      preferences: profile.travel_preferences,
    })),
  };
}
