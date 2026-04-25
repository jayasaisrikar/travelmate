'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { Brand } from '@/components/common/Brand';
import { deleteTrip, listTrips, type Trip } from '@/lib/supabase-trips';
import { getSupabaseBrowser } from '@/services/supabase-browser';

interface AdminShare {
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

interface AdminTrip {
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
  share: AdminShare | null;
  suggestions_count: number;
}

interface AdminSuggestion {
  id: string;
  trip_id: string;
  destination: string;
  owner_email: string | null;
  guest_name: string | null;
  guest_email: string | null;
  message: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  role: string | null;
  full_name: string | null;
  usage: {
    trips_created: number;
    shares_created: number;
    active_shares: number;
    suggestions_received: number;
    total_actions: number;
    last_trip_at: string | null;
    last_share_at: string | null;
    last_suggestion_at: string | null;
    last_activity_at: string | null;
  };
}

interface AdminProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  preferences: Record<string, unknown> | null;
}

interface AdminOverview {
  stats: {
    trips: number;
    shares: number;
    activeShares: number;
    suggestions: number;
    users: number;
    confirmedUsers: number;
  };
  trips: AdminTrip[];
  shares: AdminShare[];
  suggestions: AdminSuggestion[];
  users: AdminUser[];
  profiles: AdminProfile[];
}

type DashboardTab = 'overview' | 'trips' | 'shares' | 'suggestions' | 'users';

const DASHBOARD_TABS: Array<{ id: DashboardTab; label: string; description: string }> = [
  { id: 'overview', label: 'Overview', description: 'Summary' },
  { id: 'trips', label: 'Trips', description: 'Manage' },
  { id: 'shares', label: 'Shares', description: 'Revoke' },
  { id: 'suggestions', label: 'Suggestions', description: 'Moderate' },
  { id: 'users', label: 'Users', description: 'Activity' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDateCompact(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function shorten(value: string, length = 120) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function chipClass(active: boolean) {
  return active
    ? 'border border-[#3F3D56] bg-[#def4d8] text-[#3F3D56]'
    : 'border border-[#3F3D56] bg-[#FFF0F4] text-[#C14D72]';
}

function TripCardCover({
  destination,
  meta,
  rightLabel,
}: {
  destination: string;
  meta: string;
  rightLabel: string;
}) {
  return (
    <div className="relative h-40 overflow-hidden rounded-none border-b border-[#D5D1DE] bg-[linear-gradient(135deg,#6C63FF_0%,#FF6584_55%,#3F3D56_100%)] sm:h-44">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.28),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.08),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(0,0,0,0.06))]" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
      <div className="relative z-10 flex h-full flex-col justify-between p-4 text-white sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex border border-white/18 bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            {meta}
          </span>
          <span className="inline-flex border border-white/16 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/92">
            {rightLabel}
          </span>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/18 bg-white/94 text-lg font-black text-[#3F3D56]">
            {destination
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map(part => part[0]?.toUpperCase() ?? '')
              .join('') || 'TR'}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/74">
              Saved trip
            </div>
            <h3 className="truncate text-[1.15rem] font-black tracking-[-0.03em] sm:text-[1.45rem]">
              {destination}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

async function fetchAdminOverview() {
  const { data: sessionData } = await getSupabaseBrowser().auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const response = await fetch('/api/admin/overview', {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load admin dashboard');
  }

  return payload as AdminOverview;
}

async function callAdminAction(path: string, init?: RequestInit) {
  const { data: sessionData } = await getSupabaseBrowser().auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Action failed');
  }

  return payload;
}

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [dashboardMode, setDashboardMode] = useState<'checking' | 'admin' | 'user'>('checking');
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [userQuery, setUserQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const loadOverview = async () => {
    try {
      setError('');
      setLoading(true);
      const data = await fetchAdminOverview();
      setOverview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadUserTrips = async () => {
    try {
      setError('');
      setLoading(true);
      const trips = await listTrips();
      setUserTrips(trips);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load your trips');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUserTrip = async (id: string, destination: string) => {
    const confirmed = window.confirm(
      `Delete "${destination}"? This removes the trip from your dashboard permanently.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(`user-trip-${id}`);
      setError('');
      await deleteTrip(id);
      setUserTrips(previous => previous.filter(trip => trip.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip');
    } finally {
      setActionId(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadCurrentUserAndOverview = async () => {
      try {
        const supabase = getSupabaseBrowser();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          router.replace('/login?next=/dashboard');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const payload = await response.json().catch(() => null);

        if (!mounted) {
          return;
        }

        if (!response.ok || !payload?.user) {
          router.replace('/login?next=/dashboard');
          return;
        }

        setCurrentUserId(payload.user.id);
        setOverview(null);
        setUserTrips([]);
        setIsAdminUser(Boolean(payload.isAdmin));
        setDashboardMode(payload.isAdmin ? 'admin' : 'user');

        if (payload.isAdmin) {
          await loadOverview();
          return;
        }

        await loadUserTrips();
      } catch (err: unknown) {
        if (!mounted) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load your dashboard');
        setLoading(false);
      }
    };

    void loadCurrentUserAndOverview();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleDeleteTrip = async (id: string) => {
    try {
      setActionId(`trip-${id}`);
      await callAdminAction(`/api/admin/trips/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip');
    } finally {
      setActionId(null);
    }
  };

  const handleRevokeShare = async (id: string) => {
    try {
      setActionId(`share-${id}`);
      await callAdminAction(`/api/admin/shares/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke share');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    try {
      setActionId(`suggestion-${id}`);
      await callAdminAction(`/api/admin/suggestions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete suggestion');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      setActionId(`user-${id}`);
      await callAdminAction(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setActionId(null);
    }
  };

  const handleBulkDeleteUsers = async () => {
    const targetIds = selectedUserIds.filter(id => id !== currentUserId);

    if (targetIds.length === 0) {
      setError('Select at least one user to delete.');
      return;
    }

    try {
      setActionId('bulk-users');
      const payload = await callAdminAction('/api/admin/users/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: targetIds }),
      });

      const deletedIds = new Set<string>(payload?.deletedIds ?? targetIds);
      const failedIds = new Set<string>((payload?.failed ?? []).map((item: { id: string }) => item.id));

      setOverview(previous =>
        previous
          ? {
              ...previous,
              users: previous.users.filter(user => !deletedIds.has(user.id) && !failedIds.has(user.id)),
              stats: {
                ...previous.stats,
                users: previous.stats.users - deletedIds.size,
              },
            }
          : previous
      );
      setSelectedUserIds(previous => previous.filter(id => !deletedIds.has(id)));
      if ((payload?.failed ?? []).length > 0) {
        setError(
          `Deleted ${deletedIds.size} user${deletedIds.size === 1 ? '' : 's'}; some deletes failed. Refresh to recheck.`
        );
      } else {
        setError('');
      }
      void loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete users');
    } finally {
      setActionId(null);
    }
  };

  const handleSignOut = async () => {
    await getSupabaseBrowser().auth.signOut();
    router.replace('/login');
  };

  const filteredUsers = (overview?.users ?? []).filter(user => {
    const query = userQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    const searchable = [
      user.email,
      user.full_name,
      user.role,
      String(user.usage.trips_created),
      String(user.usage.shares_created),
      String(user.usage.suggestions_received),
    ]
      .filter((value): value is string => Boolean(value));

    return searchable.some(value => value.toLowerCase().includes(query));
  });

  const selectableUserIds = filteredUsers.filter(user => user.id !== currentUserId).map(user => user.id);
  const selectedVisibleUserIds = selectableUserIds.filter(id => selectedUserIds.includes(id));
  const allVisibleSelected =
    selectableUserIds.length > 0 && selectedVisibleUserIds.length === selectableUserIds.length;
  const someVisibleSelected = selectedVisibleUserIds.length > 0 && !allVisibleSelected;

  const toggleUserSelection = (id: string) => {
    if (id === currentUserId) {
      return;
    }

    setSelectedUserIds(previous =>
      previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]
    );
  };

  const toggleVisibleUsers = () => {
    setSelectedUserIds(previous => {
      if (allVisibleSelected) {
        return previous.filter(id => !selectableUserIds.includes(id));
      }

      const next = new Set(previous);
      selectableUserIds.forEach(id => next.add(id));
      return Array.from(next);
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F2] px-4 text-[#3F3D56]">
        <div className="border border-[#3F3D56] bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
              className="h-5 w-5 border-2 border-[#6C63FF] border-t-transparent"
            />
            <span className="text-sm font-semibold sm:text-base">
              {dashboardMode === 'admin'
                ? 'Loading admin dashboard...'
                : dashboardMode === 'user'
                  ? 'Loading your dashboard...'
                  : 'Checking your dashboard access...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdminUser) {
    const latestTrip = userTrips[0] ?? null;

    return (
      <main className="min-h-screen bg-[#F2F2F2] text-[#3F3D56]">
        <div className="border-b border-[#3F3D56] bg-[#FBFAFF]">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Brand href="/" compact className="shrink-0" />
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Dashboard</div>
                <div className="text-lg font-black tracking-tight">Your wayflo trips</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => router.push('/dashboard/onboarding')}
                className="border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white"
              >
                New trip
              </button>
              <button
                onClick={handleSignOut}
                className="border border-[#3F3D56] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56]"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="grid gap-4 border border-[#3F3D56] bg-white p-5 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="inline-flex border border-[#3F3D56] bg-[#FF6584] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
                Welcome back
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Plan, reopen, and edit your trips from one place.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-[#6F6C82] sm:text-base">
                Start a new itinerary when you are ready, or jump back into an existing one to edit the destination, budget, and trip details.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push('/dashboard/onboarding')}
                  className="border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white"
                >
                  {latestTrip ? 'Create another trip' : 'Create your first trip'}
                </button>
                {latestTrip && (
                  <button
                    onClick={() => router.push(`/trip/${latestTrip.id}`)}
                    className="border border-[#3F3D56] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56]"
                  >
                    Open latest trip
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="border border-[#3F3D56] bg-[#FBFAFF] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Trips</div>
                <div className="mt-2 text-2xl font-black tracking-tight text-[#3F3D56]">{userTrips.length}</div>
              </div>
              <div className="border border-[#3F3D56] bg-[#FBFAFF] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Latest</div>
                <div className="mt-2 text-sm font-semibold text-[#3F3D56]">
                  {latestTrip ? latestTrip.destination : 'No trips yet'}
                </div>
              </div>
              <div className="border border-[#3F3D56] bg-[#FBFAFF] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Next step</div>
                <div className="mt-2 text-sm font-semibold text-[#3F3D56]">
                  {latestTrip ? 'Open or edit a saved trip' : 'Start by creating a trip'}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
              {error}
            </div>
          )}

          <section className="mt-6 border border-[#3F3D56] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#3F3D56] pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Your trips</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Saved itineraries</h2>
              </div>
              <button
                onClick={loadUserTrips}
                className="border border-[#3F3D56] bg-[#FBFAFF] px-3 py-2 text-sm font-semibold text-[#3F3D56]"
              >
                Refresh
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {userTrips.length > 0 ? (
                userTrips.map(trip => (
                  <article
                    key={trip.id}
                    className="overflow-hidden rounded-none border border-[#D5D1DE] bg-white shadow-[0_16px_32px_rgba(63,61,86,0.08)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(63,61,86,0.12)]"
                  >
                    <TripCardCover
                      destination={trip.destination}
                      meta={`${trip.duration} days`}
                      rightLabel={formatDateCompact(trip.updated_at)}
                    />

                    <div className="p-4 sm:p-5">
                      <p className="text-sm leading-6 text-[#6F6C82]">
                        {trip.budget || 'Budget not set'} · Saved {formatDateCompact(trip.updated_at)}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => router.push(`/trip/${trip.id}`)}
                          className="rounded-xl border border-[#3F3D56] bg-[#3F3D56] px-3 py-2 text-sm font-semibold text-white"
                        >
                          Open trip
                        </button>
                        <button
                          onClick={() => router.push('/dashboard/onboarding')}
                          className="rounded-xl border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56]"
                        >
                          Create new
                        </button>
                        <button
                          onClick={() => handleDeleteUserTrip(trip.id, trip.destination)}
                          disabled={actionId === `user-trip-${trip.id}`}
                          className="rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-3 py-2 text-sm font-semibold text-[#C14D72] disabled:opacity-70"
                        >
                          {actionId === `user-trip-${trip.id}` ? 'Deleting...' : 'Delete trip'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="border border-dashed border-[#3F3D56] bg-[#FBFAFF] p-6 text-sm leading-7 text-[#6F6C82] lg:col-span-2">
                  You do not have any saved trips yet. Start a new trip to build your first itinerary.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2F2F2] text-[#3F3D56]">
      <div className="border-b border-[#3F3D56] bg-[#FBFAFF]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Brand href="/" compact className="shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Admin</div>
              <div className="text-lg font-black tracking-tight">wayflo control center</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => router.push('/dashboard/onboarding')}
              className="border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white"
            >
              New trip
            </button>
            <button
              onClick={handleSignOut}
              className="border border-[#3F3D56] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-4 border border-[#3F3D56] bg-white p-5 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="inline-flex border border-[#3F3D56] bg-[#FF6584] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
              Admin only
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Manage every wayflo surface from one place.</h1>
              <p className="max-w-3xl text-sm leading-7 text-[#6F6C82] sm:text-base">
                Trips, public shares, guest suggestions, and profile data all sit behind this panel.
                Only a verified admin account can enter it.
              </p>
            </div>

          {overview && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Trips', value: overview.stats.trips.toString(), color: '#6C63FF' },
                { label: 'Active shares', value: overview.stats.activeShares.toString(), color: '#FF6584' },
                { label: 'Suggestions', value: overview.stats.suggestions.toString(), color: '#FF6584' },
                { label: 'Users', value: overview.stats.users.toString(), color: '#3F3D56' },
                { label: 'Confirmed', value: overview.stats.confirmedUsers.toString(), color: '#15a15f' },
                { label: 'Profiles', value: overview.profiles.length.toString(), color: '#C14D72' },
              ].map(card => (
                <div key={card.label} className="border border-[#3F3D56] bg-[#FBFAFF] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">{card.label}</div>
                  <div className="mt-2 text-2xl font-black tracking-tight" style={{ color: card.color }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
            {error}
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-[#3F3D56] pb-4">
          {DASHBOARD_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? 'border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white'
                  : 'border border-[#3F3D56] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56]'
              }
            >
              <span className="block text-[11px] uppercase tracking-[0.18em] opacity-70">{tab.description}</span>
              <span className="block">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="border border-[#3F3D56] bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#3F3D56] pb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Overview</div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">Activity summary</h2>
                </div>
                <button
                  onClick={loadOverview}
                  className="border border-[#3F3D56] bg-[#FBFAFF] px-3 py-2 text-sm font-semibold text-[#3F3D56]"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {overview &&
                  [
                    { label: 'Trips', value: overview.stats.trips.toString(), color: '#6C63FF' },
                    { label: 'Active shares', value: overview.stats.activeShares.toString(), color: '#FF6584' },
                    { label: 'Suggestions', value: overview.stats.suggestions.toString(), color: '#FF6584' },
                    { label: 'Users', value: overview.stats.users.toString(), color: '#3F3D56' },
                    { label: 'Confirmed', value: overview.stats.confirmedUsers.toString(), color: '#15a15f' },
                    { label: 'Profiles', value: overview.profiles.length.toString(), color: '#C14D72' },
                  ].map(card => (
                    <div key={card.label} className="border border-[#3F3D56] bg-[#FBFAFF] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">{card.label}</div>
                      <div className="mt-2 text-2xl font-black tracking-tight" style={{ color: card.color }}>
                        {card.value}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="border border-[#3F3D56] bg-[#FBFAFF] p-4">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#8A869C]">Recent trips</h3>
                  <div className="mt-3 space-y-3">
                    {(overview?.trips ?? []).slice(0, 3).map(trip => (
                      <div key={trip.id} className="border border-[#3F3D56] bg-white px-3 py-2 text-sm">
                        <div className="font-semibold">{trip.destination}</div>
                        <div className="text-xs text-[#6F6C82]">{trip.owner_email || 'Unknown owner'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-[#3F3D56] bg-[#FBFAFF] p-4">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#8A869C]">Recent shares</h3>
                  <div className="mt-3 space-y-3">
                    {(overview?.shares ?? []).slice(0, 3).map(share => (
                      <div key={share.id} className="border border-[#3F3D56] bg-white px-3 py-2 text-sm">
                        <div className="font-semibold">{share.destination}</div>
                        <div className="text-xs text-[#6F6C82]">{share.revoked_at ? 'Revoked' : 'Live'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-[#3F3D56] bg-[#FBFAFF] p-4">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#8A869C]">Recent users</h3>
                  <div className="mt-3 space-y-3">
                    {(overview?.users ?? []).slice(0, 3).map(user => (
                      <div key={user.id} className="border border-[#3F3D56] bg-white px-3 py-2 text-sm">
                        <div className="font-semibold">{user.email || 'No email'}</div>
                        <div className="text-xs text-[#6F6C82]">{user.usage.total_actions} actions</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-[#3F3D56] bg-white p-5 sm:p-6">
              <div className="border-b border-[#3F3D56] pb-4">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Need a shortcut?</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Jump into a management tab</h2>
              </div>

              <div className="mt-5 space-y-3 text-sm leading-7 text-[#6F6C82]">
                <p>Use Trips to delete an itinerary, Shares to revoke a public link, Suggestions to moderate feedback, and Users to inspect activity.</p>
                <p>The dashboard now uses existing app data for usage tracking, so you can see who’s active without adding extra tables.</p>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'trips' && (
          <section className="mt-6 border border-[#3F3D56] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#3F3D56] pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Trips</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">All trips</h2>
              </div>
              <button
                onClick={loadOverview}
                className="border border-[#3F3D56] bg-[#FBFAFF] px-3 py-2 text-sm font-semibold text-[#3F3D56]"
              >
                Refresh
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {overview?.trips.length ? (
                overview.trips.map(trip => (
                  <article
                    key={trip.id}
                    className="overflow-hidden rounded-none border border-[#D5D1DE] bg-white shadow-[0_16px_32px_rgba(63,61,86,0.08)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(63,61,86,0.12)]"
                  >
                    <TripCardCover
                      destination={trip.destination}
                      meta={trip.share && !trip.share.revoked_at ? 'Shared trip' : 'Private trip'}
                      rightLabel={`${trip.suggestions_count} sugg.`}
                    />

                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm leading-6 text-[#6F6C82]">
                            {trip.duration} days · {trip.owner_email || 'Unknown owner'}
                            {trip.owner_name ? ` · ${trip.owner_name}` : ''}
                          </p>
                          <p className="mt-1 text-xs text-[#8A869C]">
                            Created {formatDate(trip.created_at)} · Updated {formatDate(trip.updated_at)}
                          </p>
                        </div>

                        <div className="rounded-full border border-[#DDDCE8] bg-[#FBFAFF] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A869C]">
                          {trip.suggestions_count} suggestion{trip.suggestions_count === 1 ? '' : 's'}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => router.push(`/trip/${trip.id}`)}
                          className="rounded-xl border border-[#3F3D56] bg-[#3F3D56] px-3 py-2 text-sm font-semibold text-white"
                        >
                          Open trip
                        </button>
                        {trip.share?.share_url && (
                          <a
                            href={trip.share.share_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56]"
                          >
                            Open share
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteTrip(trip.id)}
                          disabled={actionId === `trip-${trip.id}`}
                          className="rounded-xl border border-[#3F3D56] bg-[#FFF0F4] px-3 py-2 text-sm font-semibold text-[#C14D72] disabled:opacity-70"
                        >
                          {actionId === `trip-${trip.id}` ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>

                      {trip.share && (
                        <div className="mt-4 rounded-2xl border border-dashed border-[#DDDCE8] bg-[#FBFAFF] px-4 py-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">
                                Share link
                              </div>
                              <p className="mt-1 truncate text-[#3F3D56]">
                                {trip.share.revoked_at ? 'Revoked' : trip.share.share_url}
                              </p>
                            </div>
                            {!trip.share.revoked_at && (
                              <button
                                onClick={() => handleRevokeShare(trip.share!.id)}
                                disabled={actionId === `share-${trip.share.id}`}
                                className="rounded-xl border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56] disabled:opacity-70"
                              >
                                {actionId === `share-${trip.share.id}` ? 'Revoking...' : 'Revoke share'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="border border-dashed border-[#DDDCE8] bg-[#FBFAFF] px-4 py-6 text-sm text-[#6F6C82]">
                  No trips yet.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'shares' && (
          <section className="mt-6 border border-[#3F3D56] bg-white p-5 sm:p-6">
            <div className="border-b border-[#3F3D56] pb-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Shares</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Public links</h2>
            </div>

            <div className="mt-5 space-y-3">
              {overview?.shares.length ? (
                overview.shares.map(share => (
                  <div key={share.id} className="border border-[#3F3D56] bg-[#FBFAFF] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#3F3D56]">{share.destination}</div>
                        <div className="text-xs text-[#6F6C82]">
                          {share.owner_email || 'Unknown owner'} · {formatDate(share.created_at)}
                        </div>
                        <div className="mt-1 text-xs text-[#8A869C]">
                          {share.suggestions_count} suggestion{share.suggestions_count === 1 ? '' : 's'}
                        </div>
                      </div>
                      <span className={chipClass(!share.revoked_at) + ' px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em]'}>
                        {share.revoked_at ? 'Revoked' : 'Live'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={share.share_url}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56]"
                      >
                        Open share
                      </a>
                      {!share.revoked_at && (
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          disabled={actionId === `share-${share.id}`}
                          className="border border-[#3F3D56] bg-[#FFF0F4] px-3 py-2 text-sm font-semibold text-[#C14D72] disabled:opacity-70"
                        >
                          {actionId === `share-${share.id}` ? 'Revoking...' : 'Revoke'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-[#DDDCE8] bg-[#FBFAFF] px-4 py-6 text-sm text-[#6F6C82]">
                  No shares yet.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'suggestions' && (
          <section className="mt-6 border border-[#3F3D56] bg-white p-5 sm:p-6">
            <div className="border-b border-[#3F3D56] pb-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Suggestions</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Guest feedback</h2>
            </div>

            <div className="mt-5 space-y-3">
              {overview?.suggestions.length ? (
                overview.suggestions.map(suggestion => (
                  <div key={suggestion.id} className="border border-[#3F3D56] bg-[#FBFAFF] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#3F3D56]">{suggestion.destination}</div>
                        <div className="text-xs text-[#6F6C82]">
                          {suggestion.guest_name || 'A guest'}
                          {suggestion.guest_email ? ` · ${suggestion.guest_email}` : ''}
                        </div>
                      </div>
                      <div className="text-xs text-[#8A869C]">{formatDate(suggestion.created_at)}</div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#3F3D56]">{shorten(suggestion.message, 180)}</p>
                    <div className="mt-3">
                      <button
                        onClick={() => handleDeleteSuggestion(suggestion.id)}
                        disabled={actionId === `suggestion-${suggestion.id}`}
                        className="border border-[#3F3D56] bg-[#FFF0F4] px-3 py-2 text-sm font-semibold text-[#C14D72] disabled:opacity-70"
                      >
                        {actionId === `suggestion-${suggestion.id}` ? 'Deleting...' : 'Delete suggestion'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-[#DDDCE8] bg-[#FBFAFF] px-4 py-6 text-sm text-[#6F6C82]">
                  No suggestions yet.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="mt-6 border border-[#3F3D56] bg-white p-5 sm:p-6">
            <div className="border-b border-[#3F3D56] pb-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Users</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Manage accounts and usage</h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {overview &&
                [
                  { label: 'Trips created', value: overview.users.reduce((sum, user) => sum + user.usage.trips_created, 0), color: '#6C63FF' },
                  { label: 'Shares created', value: overview.users.reduce((sum, user) => sum + user.usage.shares_created, 0), color: '#FF6584' },
                  { label: 'Suggestions received', value: overview.users.reduce((sum, user) => sum + user.usage.suggestions_received, 0), color: '#FF6584' },
                ].map(card => (
                  <div key={card.label} className="border border-[#3F3D56] bg-[#FBFAFF] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">{card.label}</div>
                    <div className="mt-2 text-2xl font-black tracking-tight" style={{ color: card.color }}>
                      {card.value}
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                Search users
              </label>
              <input
                value={userQuery}
                onChange={event => setUserQuery(event.target.value)}
                placeholder="Search by email, name, role, or usage count"
                className="w-full border border-[#3F3D56] bg-[#FBFAFF] px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:bg-white"
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 border border-[#3F3D56] bg-[#FBFAFF] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-[#3F3D56]">
                {selectedUserIds.length > 0
                  ? `${selectedUserIds.length} user${selectedUserIds.length === 1 ? '' : 's'} selected`
                  : 'No users selected'}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleVisibleUsers}
                  disabled={selectableUserIds.length === 0}
                  className="border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56] disabled:opacity-70"
                >
                  {allVisibleSelected ? 'Unselect visible' : someVisibleSelected ? 'Select visible' : 'Select visible'}
                </button>
                <button
                  onClick={() => setSelectedUserIds([])}
                  disabled={selectedUserIds.length === 0}
                  className="border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56] disabled:opacity-70"
                >
                  Clear selection
                </button>
                <button
                  onClick={handleBulkDeleteUsers}
                  disabled={selectedUserIds.filter(id => id !== currentUserId).length === 0 || actionId === 'bulk-users'}
                  className="border border-[#3F3D56] bg-[#FFF0F4] px-3 py-2 text-sm font-semibold text-[#C14D72] disabled:opacity-70"
                >
                  {actionId === 'bulk-users' ? 'Deleting selected...' : 'Delete selected'}
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {filteredUsers.length ? (
                filteredUsers.map(user => {
                  const isCurrentUser = currentUserId === user.id;
                  const isSelected = selectedUserIds.includes(user.id);

                  return (
                    <div key={user.id} className="border border-[#3F3D56] bg-[#FBFAFF] px-4 py-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isCurrentUser}
                            onChange={() => toggleUserSelection(user.id)}
                            className="mt-1 h-4 w-4 border-[#3F3D56] text-[#3F3D56] accent-[#3F3D56]"
                          />
                          <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-[#3F3D56]">{user.email || 'No email'}</div>
                            <span className={chipClass(Boolean(user.email_confirmed_at)) + ' px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em]'}>
                              {user.email_confirmed_at ? 'Confirmed' : 'Unconfirmed'}
                            </span>
                          </div>
                          <div className="text-xs text-[#6F6C82]">
                            {user.full_name || 'No profile name'} · {user.role || 'authenticated'}
                          </div>
                          <div className="mt-2 text-xs text-[#8A869C]">
                            Joined {formatDate(user.created_at)}
                            {user.last_sign_in_at ? ` · Last sign in ${formatDate(user.last_sign_in_at)}` : ''}
                          </div>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
                          {[
                            { label: 'Trips', value: user.usage.trips_created },
                            { label: 'Shares', value: user.usage.shares_created },
                            { label: 'Suggestions', value: user.usage.suggestions_received },
                            { label: 'Active shares', value: user.usage.active_shares },
                          ].map(metric => (
                            <div key={metric.label} className="border border-[#3F3D56] bg-white px-3 py-2">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A869C]">{metric.label}</div>
                              <div className="mt-1 text-lg font-black tracking-tight">{metric.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="text-xs text-[#6F6C82]">
                          Last activity: {user.usage.last_activity_at ? formatDate(user.usage.last_activity_at) : 'No tracked activity yet'}
                          {' · '}
                          Total actions: {user.usage.total_actions}
                        </div>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={actionId === `user-${user.id}` || isCurrentUser}
                          className="border border-[#3F3D56] bg-[#FFF0F4] px-3 py-2 text-sm font-semibold text-[#C14D72] disabled:opacity-70"
                        >
                          {actionId === `user-${user.id}` ? 'Deleting...' : isCurrentUser ? 'Current admin' : 'Delete user'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="border border-dashed border-[#DDDCE8] bg-[#FBFAFF] px-4 py-6 text-sm text-[#6F6C82]">
                  No users match your search.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
