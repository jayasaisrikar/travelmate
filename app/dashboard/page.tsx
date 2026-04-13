'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { Brand } from '@/components/common/Brand';
import { getSupabaseBrowser } from '@/services/supabase-browser';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@travelmate.com').trim().toLowerCase();

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

function shorten(value: string, length = 120) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function chipClass(active: boolean) {
  return active
    ? 'border border-[#2e2833] bg-[#def4d8] text-[#2e2833]'
    : 'border border-[#2e2833] bg-[#fff3f7] text-[#a65372]';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

  useEffect(() => {
    let mounted = true;

    const loadCurrentUserAndOverview = async () => {
      const { data } = await getSupabaseBrowser().auth.getUser();

      if (!mounted) {
        return;
      }

      const user = data.user;

      if (!user || user.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
        router.replace('/dashboard/onboarding');
        return;
      }

      setCurrentUserId(user.id);
      await loadOverview();
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
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-4 text-[#2e2833]">
        <div className="border border-[#2e2833] bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
              className="h-5 w-5 border-2 border-[#5aa7e8] border-t-transparent"
            />
            <span className="text-sm font-semibold sm:text-base">Loading admin dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#2e2833]">
      <div className="border-b border-[#2e2833] bg-[#fffdf9]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Brand href="/" compact className="shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Admin</div>
              <div className="text-lg font-black tracking-tight">TravelMate control center</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => router.push('/dashboard/onboarding')}
              className="border border-[#2e2833] bg-[#2e2833] px-4 py-3 text-sm font-semibold text-white"
            >
              New trip
            </button>
            <button
              onClick={handleSignOut}
              className="border border-[#2e2833] bg-white px-4 py-3 text-sm font-semibold text-[#2e2833]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-4 border border-[#2e2833] bg-white p-5 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="inline-flex border border-[#2e2833] bg-[#f6d23c] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
              Admin only
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Manage every TravelMate surface from one place.</h1>
            <p className="max-w-3xl text-sm leading-7 text-[#756978] sm:text-base">
              Trips, public shares, guest suggestions, and profile data all sit behind this panel.
              Only <span className="font-semibold text-[#2e2833]">{ADMIN_EMAIL}</span> can enter it.
            </p>
          </div>

          {overview && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Trips', value: overview.stats.trips.toString(), color: '#5aa7e8' },
                { label: 'Active shares', value: overview.stats.activeShares.toString(), color: '#f6d23c' },
                { label: 'Suggestions', value: overview.stats.suggestions.toString(), color: '#ff9a45' },
                { label: 'Users', value: overview.stats.users.toString(), color: '#2e2833' },
                { label: 'Confirmed', value: overview.stats.confirmedUsers.toString(), color: '#15a15f' },
                { label: 'Profiles', value: overview.profiles.length.toString(), color: '#a65372' },
              ].map(card => (
                <div key={card.label} className="border border-[#2e2833] bg-[#fffdf9] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">{card.label}</div>
                  <div className="mt-2 text-2xl font-black tracking-tight" style={{ color: card.color }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 border border-[#a65372] bg-[#fff3f7] px-4 py-3 text-sm font-medium text-[#a65372]">
            {error}
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-[#2e2833] pb-4">
          {DASHBOARD_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? 'border border-[#2e2833] bg-[#2e2833] px-4 py-3 text-sm font-semibold text-white'
                  : 'border border-[#2e2833] bg-white px-4 py-3 text-sm font-semibold text-[#2e2833]'
              }
            >
              <span className="block text-[11px] uppercase tracking-[0.18em] opacity-70">{tab.description}</span>
              <span className="block">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="border border-[#2e2833] bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#2e2833] pb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Overview</div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">Activity summary</h2>
                </div>
                <button
                  onClick={loadOverview}
                  className="border border-[#2e2833] bg-[#fffdf9] px-3 py-2 text-sm font-semibold text-[#2e2833]"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {overview &&
                  [
                    { label: 'Trips', value: overview.stats.trips.toString(), color: '#5aa7e8' },
                    { label: 'Active shares', value: overview.stats.activeShares.toString(), color: '#f6d23c' },
                    { label: 'Suggestions', value: overview.stats.suggestions.toString(), color: '#ff9a45' },
                    { label: 'Users', value: overview.stats.users.toString(), color: '#2e2833' },
                    { label: 'Confirmed', value: overview.stats.confirmedUsers.toString(), color: '#15a15f' },
                    { label: 'Profiles', value: overview.profiles.length.toString(), color: '#a65372' },
                  ].map(card => (
                    <div key={card.label} className="border border-[#2e2833] bg-[#fffdf9] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">{card.label}</div>
                      <div className="mt-2 text-2xl font-black tracking-tight" style={{ color: card.color }}>
                        {card.value}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="border border-[#2e2833] bg-[#fffdf9] p-4">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#a79aaa]">Recent trips</h3>
                  <div className="mt-3 space-y-3">
                    {(overview?.trips ?? []).slice(0, 3).map(trip => (
                      <div key={trip.id} className="border border-[#2e2833] bg-white px-3 py-2 text-sm">
                        <div className="font-semibold">{trip.destination}</div>
                        <div className="text-xs text-[#756978]">{trip.owner_email || 'Unknown owner'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-[#2e2833] bg-[#fffdf9] p-4">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#a79aaa]">Recent shares</h3>
                  <div className="mt-3 space-y-3">
                    {(overview?.shares ?? []).slice(0, 3).map(share => (
                      <div key={share.id} className="border border-[#2e2833] bg-white px-3 py-2 text-sm">
                        <div className="font-semibold">{share.destination}</div>
                        <div className="text-xs text-[#756978]">{share.revoked_at ? 'Revoked' : 'Live'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-[#2e2833] bg-[#fffdf9] p-4">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#a79aaa]">Recent users</h3>
                  <div className="mt-3 space-y-3">
                    {(overview?.users ?? []).slice(0, 3).map(user => (
                      <div key={user.id} className="border border-[#2e2833] bg-white px-3 py-2 text-sm">
                        <div className="font-semibold">{user.email || 'No email'}</div>
                        <div className="text-xs text-[#756978]">{user.usage.total_actions} actions</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-[#2e2833] bg-white p-5 sm:p-6">
              <div className="border-b border-[#2e2833] pb-4">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Need a shortcut?</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Jump into a management tab</h2>
              </div>

              <div className="mt-5 space-y-3 text-sm leading-7 text-[#756978]">
                <p>Use Trips to delete an itinerary, Shares to revoke a public link, Suggestions to moderate feedback, and Users to inspect activity.</p>
                <p>The dashboard now uses existing app data for usage tracking, so you can see who’s active without adding extra tables.</p>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'trips' && (
          <section className="mt-6 border border-[#2e2833] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#2e2833] pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Trips</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">All trips</h2>
              </div>
              <button
                onClick={loadOverview}
                className="border border-[#2e2833] bg-[#fffdf9] px-3 py-2 text-sm font-semibold text-[#2e2833]"
              >
                Refresh
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {overview?.trips.length ? (
                overview.trips.map(trip => (
                  <article key={trip.id} className="border border-[#2e2833] bg-[#fffdf9] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black tracking-tight">{trip.destination}</h3>
                          <span className={chipClass(Boolean(trip.share && !trip.share.revoked_at)) + ' px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em]'}>
                            {trip.share && !trip.share.revoked_at ? 'Shared' : 'Private'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#756978]">
                          {trip.duration} days · {trip.owner_email || 'Unknown owner'}{trip.owner_name ? ` · ${trip.owner_name}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-[#a79aaa]">
                          Created {formatDate(trip.created_at)} · Updated {formatDate(trip.updated_at)}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">Suggestions</div>
                        <div className="text-2xl font-black tracking-tight">{trip.suggestions_count}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => router.push(`/trip/${trip.id}`)}
                        className="border border-[#2e2833] bg-[#2e2833] px-3 py-2 text-sm font-semibold text-white"
                      >
                        Open trip
                      </button>
                      {trip.share?.share_url && (
                        <a
                          href={trip.share.share_url}
                          target="_blank"
                          rel="noreferrer"
                          className="border border-[#2e2833] bg-white px-3 py-2 text-sm font-semibold text-[#2e2833]"
                        >
                          Open share
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        disabled={actionId === `trip-${trip.id}`}
                        className="border border-[#2e2833] bg-[#fff3f7] px-3 py-2 text-sm font-semibold text-[#a65372] disabled:opacity-70"
                      >
                        {actionId === `trip-${trip.id}` ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>

                    {trip.share && (
                      <div className="mt-4 border border-dashed border-[#eadde5] bg-white px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">
                              Share link
                            </div>
                            <p className="mt-1 text-[#2e2833]">
                              {trip.share.revoked_at ? 'Revoked' : trip.share.share_url}
                            </p>
                          </div>
                          {!trip.share.revoked_at && (
                            <button
                              onClick={() => handleRevokeShare(trip.share!.id)}
                              disabled={actionId === `share-${trip.share.id}`}
                              className="border border-[#2e2833] bg-white px-3 py-2 text-sm font-semibold text-[#2e2833] disabled:opacity-70"
                            >
                              {actionId === `share-${trip.share.id}` ? 'Revoking...' : 'Revoke share'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <div className="border border-dashed border-[#eadde5] bg-[#fffdf9] px-4 py-6 text-sm text-[#756978]">
                  No trips yet.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'shares' && (
          <section className="mt-6 border border-[#2e2833] bg-white p-5 sm:p-6">
            <div className="border-b border-[#2e2833] pb-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Shares</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Public links</h2>
            </div>

            <div className="mt-5 space-y-3">
              {overview?.shares.length ? (
                overview.shares.map(share => (
                  <div key={share.id} className="border border-[#2e2833] bg-[#fffdf9] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#2e2833]">{share.destination}</div>
                        <div className="text-xs text-[#756978]">
                          {share.owner_email || 'Unknown owner'} · {formatDate(share.created_at)}
                        </div>
                        <div className="mt-1 text-xs text-[#a79aaa]">
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
                        className="border border-[#2e2833] bg-white px-3 py-2 text-sm font-semibold text-[#2e2833]"
                      >
                        Open share
                      </a>
                      {!share.revoked_at && (
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          disabled={actionId === `share-${share.id}`}
                          className="border border-[#2e2833] bg-[#fff3f7] px-3 py-2 text-sm font-semibold text-[#a65372] disabled:opacity-70"
                        >
                          {actionId === `share-${share.id}` ? 'Revoking...' : 'Revoke'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-[#eadde5] bg-[#fffdf9] px-4 py-6 text-sm text-[#756978]">
                  No shares yet.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'suggestions' && (
          <section className="mt-6 border border-[#2e2833] bg-white p-5 sm:p-6">
            <div className="border-b border-[#2e2833] pb-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Suggestions</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Guest feedback</h2>
            </div>

            <div className="mt-5 space-y-3">
              {overview?.suggestions.length ? (
                overview.suggestions.map(suggestion => (
                  <div key={suggestion.id} className="border border-[#2e2833] bg-[#fffdf9] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#2e2833]">{suggestion.destination}</div>
                        <div className="text-xs text-[#756978]">
                          {suggestion.guest_name || 'A guest'}
                          {suggestion.guest_email ? ` · ${suggestion.guest_email}` : ''}
                        </div>
                      </div>
                      <div className="text-xs text-[#a79aaa]">{formatDate(suggestion.created_at)}</div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#2e2833]">{shorten(suggestion.message, 180)}</p>
                    <div className="mt-3">
                      <button
                        onClick={() => handleDeleteSuggestion(suggestion.id)}
                        disabled={actionId === `suggestion-${suggestion.id}`}
                        className="border border-[#2e2833] bg-[#fff3f7] px-3 py-2 text-sm font-semibold text-[#a65372] disabled:opacity-70"
                      >
                        {actionId === `suggestion-${suggestion.id}` ? 'Deleting...' : 'Delete suggestion'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-[#eadde5] bg-[#fffdf9] px-4 py-6 text-sm text-[#756978]">
                  No suggestions yet.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="mt-6 border border-[#2e2833] bg-white p-5 sm:p-6">
            <div className="border-b border-[#2e2833] pb-4">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Users</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Manage accounts and usage</h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {overview &&
                [
                  { label: 'Trips created', value: overview.users.reduce((sum, user) => sum + user.usage.trips_created, 0), color: '#5aa7e8' },
                  { label: 'Shares created', value: overview.users.reduce((sum, user) => sum + user.usage.shares_created, 0), color: '#f6d23c' },
                  { label: 'Suggestions received', value: overview.users.reduce((sum, user) => sum + user.usage.suggestions_received, 0), color: '#ff9a45' },
                ].map(card => (
                  <div key={card.label} className="border border-[#2e2833] bg-[#fffdf9] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">{card.label}</div>
                    <div className="mt-2 text-2xl font-black tracking-tight" style={{ color: card.color }}>
                      {card.value}
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#756978]">
                Search users
              </label>
              <input
                value={userQuery}
                onChange={event => setUserQuery(event.target.value)}
                placeholder="Search by email, name, role, or usage count"
                className="w-full border border-[#2e2833] bg-[#fffdf9] px-4 py-3 text-base text-[#2e2833] outline-none placeholder:text-[#a79aaa] focus:bg-white"
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 border border-[#2e2833] bg-[#fffdf9] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-[#2e2833]">
                {selectedUserIds.length > 0
                  ? `${selectedUserIds.length} user${selectedUserIds.length === 1 ? '' : 's'} selected`
                  : 'No users selected'}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleVisibleUsers}
                  disabled={selectableUserIds.length === 0}
                  className="border border-[#2e2833] bg-white px-3 py-2 text-sm font-semibold text-[#2e2833] disabled:opacity-70"
                >
                  {allVisibleSelected ? 'Unselect visible' : someVisibleSelected ? 'Select visible' : 'Select visible'}
                </button>
                <button
                  onClick={() => setSelectedUserIds([])}
                  disabled={selectedUserIds.length === 0}
                  className="border border-[#2e2833] bg-white px-3 py-2 text-sm font-semibold text-[#2e2833] disabled:opacity-70"
                >
                  Clear selection
                </button>
                <button
                  onClick={handleBulkDeleteUsers}
                  disabled={selectedUserIds.filter(id => id !== currentUserId).length === 0 || actionId === 'bulk-users'}
                  className="border border-[#2e2833] bg-[#fff3f7] px-3 py-2 text-sm font-semibold text-[#a65372] disabled:opacity-70"
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
                    <div key={user.id} className="border border-[#2e2833] bg-[#fffdf9] px-4 py-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isCurrentUser}
                            onChange={() => toggleUserSelection(user.id)}
                            className="mt-1 h-4 w-4 border-[#2e2833] text-[#2e2833] accent-[#2e2833]"
                          />
                          <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-[#2e2833]">{user.email || 'No email'}</div>
                            <span className={chipClass(Boolean(user.email_confirmed_at)) + ' px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em]'}>
                              {user.email_confirmed_at ? 'Confirmed' : 'Unconfirmed'}
                            </span>
                          </div>
                          <div className="text-xs text-[#756978]">
                            {user.full_name || 'No profile name'} · {user.role || 'authenticated'}
                          </div>
                          <div className="mt-2 text-xs text-[#a79aaa]">
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
                            <div key={metric.label} className="border border-[#2e2833] bg-white px-3 py-2">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a79aaa]">{metric.label}</div>
                              <div className="mt-1 text-lg font-black tracking-tight">{metric.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="text-xs text-[#756978]">
                          Last activity: {user.usage.last_activity_at ? formatDate(user.usage.last_activity_at) : 'No tracked activity yet'}
                          {' · '}
                          Total actions: {user.usage.total_actions}
                        </div>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={actionId === `user-${user.id}` || isCurrentUser}
                          className="border border-[#2e2833] bg-[#fff3f7] px-3 py-2 text-sm font-semibold text-[#a65372] disabled:opacity-70"
                        >
                          {actionId === `user-${user.id}` ? 'Deleting...' : isCurrentUser ? 'Current admin' : 'Delete user'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="border border-dashed border-[#eadde5] bg-[#fffdf9] px-4 py-6 text-sm text-[#756978]">
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
