'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { 
  Compass, 
  Calendar, 
  ChevronRight, 
  Plus, 
  LogOut, 
  Trash2, 
  Share2, 
  Search, 
  Users, 
  Check, 
  Settings, 
  Activity, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  SlidersHorizontal, 
  ShieldAlert, 
  ExternalLink,
  MailCheck, 
  ShieldCheck,
  MapPin,
  Clock,
  Heart,
  Undo2,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';

import { Brand } from '@/components/common/Brand';
import { deleteTrip, listTrips, type Trip } from '@/lib/supabase-trips';
import { getSupabaseBrowser } from '@/services/supabase-browser';
import { DestinationPhotoCover } from '@/components/common/DestinationPhotoCover';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { BookingConfirmationImportCard } from '@/components/dashboard/BookingConfirmationImportCard';
import { TripTicketCard } from '@/components/dashboard/TripTicketCard';
import { CompanionStrip } from '@/components/social/CompanionStrip';
import { SocialProfileSettings } from '@/components/social/SocialProfileSettings';

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

type DashboardTab = 'overview' | 'trips' | 'shares' | 'suggestions' | 'users' | 'social';

const DASHBOARD_TABS: Array<{ id: DashboardTab; label: string; description: string; icon: LucideIcon }> = [
  { id: 'overview',     label: 'Overview',    description: 'Summary',   icon: Activity  },
  { id: 'trips',        label: 'Trips',       description: 'Manage',    icon: Compass   },
  { id: 'shares',       label: 'Shares',      description: 'Revoke',    icon: Share2    },
  { id: 'suggestions',  label: 'Suggestions', description: 'Moderate',  icon: MailCheck },
  { id: 'users',        label: 'Users',       description: 'Activity',  icon: Users     },
  { id: 'social',       label: 'Social',      description: 'Profile',   icon: Heart     },
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
    ? 'border border-emerald-100 bg-emerald-500/15 text-emerald-600 font-bold'
    : 'border border-rose-100 bg-rose-500/15 text-rose-600 font-bold';
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
    <div className="relative h-48 overflow-hidden rounded-t-[28px] sm:h-56">
      <div className="absolute inset-0 z-0 scale-105 transition-transform duration-700 group-hover:scale-100">
        <DestinationPhotoCover destination={destination} className="h-full w-full" />
      </div>
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-stone-950/95 via-stone-950/50 to-stone-900/10 pointer-events-none" />
      <div className="absolute inset-0 z-10 ring-1 ring-inset ring-white/10 pointer-events-none" />

      <div className="relative z-20 flex h-full flex-col justify-between p-5 sm:p-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex rounded-full bg-stone-900/60 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white border border-white/20 shadow-sm">
            {meta}
          </span>
          <span className="inline-flex rounded-full bg-stone-900/60 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/90 border border-white/5 shadow-sm">
            {rightLabel}
          </span>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-white text-2xl font-black text-[#ea580c] shadow-xl shadow-black/40 backdrop-blur-sm transition-transform group-hover:scale-110 group-hover:rotate-6 duration-300">
            {destination
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map(part => part[0]?.toUpperCase() ?? '')
              .join('') || 'TR'}
          </div>
          <div className="min-w-0 pb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#f43f5e] block mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Destination
            </span>
            <h3 className="truncate text-2xl font-black text-white tracking-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] group-hover:text-pink-100 transition-colors duration-200">
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
  const [refreshSpin, setRefreshSpin] = useState(false);

  const loadOverview = async () => {
    try {
      setError('');
      setLoading(true);
      setRefreshSpin(true);
      const data = await fetchAdminOverview();
      setOverview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshSpin(false), 500);
    }
  };

  const loadUserTrips = async () => {
    try {
      setError('');
      setLoading(true);
      setRefreshSpin(true);
      const trips = await listTrips();
      setUserTrips(trips);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load your trips');
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshSpin(false), 500);
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

  const filteredUsers = useMemo(() => {
    return (overview?.users ?? []).filter(user => {
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
      ].filter((value): value is string => Boolean(value));

      return searchable.some(value => value.toLowerCase().includes(query));
    });
  }, [overview?.users, userQuery]);

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
      <div className="relative flex min-h-screen items-center justify-center bg-stone-50 px-4 text-[#3a2540] overflow-hidden">
        {/* Background blobs */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#ea580c]/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#f43f5e]/80 opacity-10 blur-[120px]" />
        
        <div className="relative max-w-sm rounded-[32px] border border-stone-200/50 bg-white/70 p-6 text-center shadow-[0_32px_64px_rgba(234,88,12,0.08)] backdrop-blur-xl sm:p-8">
          <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#ea580c]/10 text-[#ea580c]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-4 border-[#ea580c]/20 border-t-[#ea580c]"
            />
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-stone-900 tracking-tight">Syncing Wayflo</h2>
          <p className="mt-2 text-xs text-[#7c6a72] leading-relaxed">
            {dashboardMode === 'admin'
              ? 'Loading admin overview control systems...'
              : dashboardMode === 'user'
                ? 'Securing your itineraries and bookings...'
                : 'Resolving account access clearance...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAdminUser) {
    const latestTrip = userTrips[0] ?? null;

    return (
      <main className="relative min-h-screen bg-[#fbf6ef] text-[#3a2540] overflow-hidden pb-12">
        {/* Colorful flowing vector blobs to make UI look organic & high-end */}
        <div className="pointer-events-none absolute -top-40 right-10 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[#ea580c]/5 to-[#f43f5e]/5 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-10 -left-20 h-[400px] w-[400px] rounded-full bg-[#ea580c]/3 blur-[100px]" />

        {/* Global Nav-Bar */}
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/70 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Brand href="/" compact className="shrink-0 transition-transform hover:scale-102" />
              <div className="hidden h-6 w-[1px] bg-stone-200 sm:block" />
              <div className="hidden sm:block">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Dashboard</div>
                <div className="text-sm font-black tracking-tight text-stone-800">Your Wayflo Trips</div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => router.push('/dashboard/community')}
                aria-label="Community settings"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 sm:px-3.5"
              >
                <Heart className="h-4 w-4 text-[#f43f5e]" />
                <span className="hidden md:inline">Community</span>
              </button>
              <button
                type="button"
                onClick={() => router.push('/explore')}
                aria-label="Find travelers"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#ea580c] shadow-sm transition hover:bg-[#fff7ed] sm:px-3.5"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Find travelers</span>
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/dashboard/onboarding')}
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[#ea580c] px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-[#ea580c]/20 transition-all hover:bg-[#c2410c] sm:px-4"
              >
                <Plus className="h-4 w-4" />
                <span>New trip</span>
              </motion.button>
              <button
                onClick={handleSignOut}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 sm:px-3.5"
              >
                <LogOut className="h-4 w-4 text-stone-400" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Elegant Welcome Hero Card */}
            <div className="bg-sunset-soft relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#fed7aa] p-5 shadow-[0_24px_50px_rgba(234,88,12,0.06)] backdrop-blur-md sm:rounded-[32px] sm:p-8">
              <div className="absolute top-0 right-0 p-8 text-[#ea580c] opacity-[0.06] pointer-events-none">
                <Compass className="h-48 w-44" />
              </div>
              <div className="route-line absolute inset-x-8 top-0 h-0.5 opacity-30 pointer-events-none" />
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#f43f5e]">
                  <Sparkles className="h-3 w-3" />
                  Welcome back
                </span>
                <h1 className="mt-4 text-3xl font-black leading-[1.08] tracking-tight text-stone-900 sm:text-5xl sm:leading-[1.12]">
                  Plan, reopen, and edit your trips from one place.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#7c6a72] sm:text-base">
                  Start a new AI-guided itinerary when you are ready, or jump back into a saved journey to customize destinations, budgets, and schedules.
                </p>
              </div>

              <div className="relative z-10 mt-8 grid gap-3 sm:flex sm:flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push('/dashboard/onboarding')}
                  className="bg-sunset shadow-sunset inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white transition-all hover:brightness-105"
                >
                  <Plus className="h-4 w-4" />
                  {latestTrip ? 'Create another trip' : 'Plan your first trip'}
                </motion.button>
                {latestTrip && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => router.push(`/trip/${latestTrip.id}`)}
                    className="rounded-2xl border border-stone-200 bg-white px-5 py-3.5 text-sm font-bold text-stone-800 shadow-sm hover:border-stone-300"
                  >
                    Open latest trip
                  </motion.button>
                )}
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-center">
                <div className="absolute right-4 bottom-2 text-stone-100 font-extrabold text-7xl select-none opacity-40">
                  {userTrips.length}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Trips planned</div>
                <div className="relative mt-2 text-3xl font-black text-stone-950">{userTrips.length}</div>
              </div>
              <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Latest target</div>
                <div className="mt-2 flex items-center gap-1.5 font-bold text-[#3a2540] truncate">
                  <MapPin className="h-4 w-4 shrink-0 text-[#ea580c]" />
                  <span className="truncate text-stone-900">{latestTrip ? latestTrip.destination : 'No active trips'}</span>
                </div>
              </div>
              <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Next Action</div>
                <div className="mt-2 text-xs font-semibold text-stone-600">
                  {latestTrip ? 'Review recommendations or export' : 'Run the AI generation onboarding'}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm font-semibold text-rose-600 shadow-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Trips Directory Grid Section */}
          <section className="mt-10">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Saved plans</span>
                <h2 className="mt-0.5 text-2xl font-black text-stone-950 tracking-tight sm:text-3xl">Your travel logs</h2>
              </div>
              <button
                onClick={loadUserTrips}
                className="group flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-500 shadow-sm transition-all hover:bg-stone-50 hover:text-stone-800"
              >
                <RefreshCw className={`h-4.5 w-4.5 text-stone-500 transition-transform ${refreshSpin ? 'animate-spin text-[#ea580c]' : 'group-hover:rotate-45'}`} />
              </button>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {userTrips.length > 0 ? (
                userTrips.map(trip => (
                  <TripTicketCard
                    key={trip.id}
                    destination={trip.destination}
                    durationLabel={trip.duration ? `${trip.duration} Days` : 'Trip'}
                    budget={trip.budget}
                    savedLabel={formatDateCompact(trip.updated_at)}
                    deleting={actionId === `user-trip-${trip.id}`}
                    onOpen={() => router.push(`/trip/${trip.id}`)}
                    onNew={() => router.push('/dashboard/onboarding')}
                    onDelete={() => handleDeleteUserTrip(trip.id, trip.destination)}
                  />
                ))
              ) : (
                <div className="rounded-[28px] border-2 border-dashed border-stone-200 bg-white p-8 text-center md:col-span-2 py-12">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ea580c]/10 text-[#ea580c] mb-4">
                    <Compass className="h-6 w-6 animate-pulse" />
                  </div>
                  <h3 className="text-base font-black text-stone-800 tracking-tight">No itineraries created yet</h3>
                  <p className="mt-2 text-xs text-[#7c6a72] max-w-sm mx-auto leading-relaxed">
                    Ready to build your dream schedule? Press the button below to feed the AI generator.
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/onboarding')}
                    className="mt-5 rounded-2xl bg-[#ea580c] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-[#c2410c]"
                  >
                    Build first trip
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Booking Conf. Wrapper */}
          <section className="mt-12">
            <BookingConfirmationImportCard />
          </section>

          {/* Social companions */}
          <CompanionStrip />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#fbf6ef] text-[#3a2540] overflow-hidden pb-16">
      {/* Dynamic ambient vector glows */}
      <div className="pointer-events-none absolute -top-40 left-1/3 h-[600px] w-[600px] rounded-full bg-[#ea580c]/3 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-0 h-[500px] w-[500px] rounded-full bg-[#f43f5e]/3 blur-[120px]" />

      {/* Modern sticky glass header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Brand href="/" compact className="shrink-0 transition-transform hover:scale-102" />
            <div className="hidden h-6 w-[1px] bg-stone-200 sm:block" />
            <div className="hidden sm:block">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f43f5e]">Wayflo HQ</div>
              <div className="text-sm font-black tracking-tight text-stone-800">Control Center</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard/community')}
              aria-label="Community settings"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 sm:px-3.5"
            >
              <Heart className="h-4 w-4 text-[#f43f5e]" />
              <span className="hidden md:inline">Community</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/explore')}
              aria-label="Find travelers"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#ea580c] shadow-sm transition hover:bg-[#fff7ed] sm:px-3.5"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Find travelers</span>
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/dashboard/onboarding')}
              className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[#ea580c] px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-[#ea580c]/20 transition-all hover:bg-[#c2410c] sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span>New trip</span>
            </motion.button>
            <button
              onClick={handleSignOut}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 sm:px-3.5"
            >
              <LogOut className="h-4 w-4 text-stone-400" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Welcome Dashboard Banner */}
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_24px_50px_rgba(234,88,12,0.03)] backdrop-blur-md sm:rounded-[32px] sm:p-8">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <SlidersHorizontal className="h-48 w-44" />
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffedd5] px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#ea580c]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Console
              </span>
              <h1 className="mt-4 text-3xl font-black leading-[1.08] tracking-tight text-stone-900 sm:text-5xl sm:leading-[1.12]">
                Manage every Wayflo surface from one place.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#7c6a72] sm:text-base">
                Trips, public shares, guest suggestions, and profile data all sit behind this secure management area. Only accounts holding trusted roles have access.
              </p>
            </div>
          </div>

          {/* Glowing Metrics Grid Header */}
          {overview && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {[
                { label: 'Trips planned', value: overview.stats.trips.toString(), color: '#ea580c', bg: 'bg-[#ea580c]/5', border: 'border-[#ea580c]/10' },
                { label: 'Active shares', value: overview.stats.activeShares.toString(), color: '#f43f5e', bg: 'bg-[#f43f5e]/5', border: 'border-[#f43f5e]/10' },
                { label: 'Suggestions', value: overview.stats.suggestions.toString(), color: '#f43f5e', bg: 'bg-rose-50', border: 'border-rose-100' },
                { label: 'Users total', value: overview.stats.users.toString(), color: '#3a2540', bg: 'bg-stone-50', border: 'border-stone-100' },
                { label: 'Confirmed emails', value: overview.stats.confirmedUsers.toString(), color: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                { label: 'User profiles', value: overview.profiles.length.toString(), color: '#d97706', bg: 'bg-amber-50', border: 'border-amber-100' },
              ].map(card => (
                <div key={card.label} className={`flex flex-col justify-center rounded-[22px] border ${card.border} ${card.bg} p-3 shadow-sm transition-all hover:shadow-md sm:rounded-[24px] sm:p-4`}>
                  <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8b92] sm:tracking-[0.18em]">{card.label}</div>
                  <div className="mt-2 text-2xl font-black tracking-tight" style={{ color: card.color }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm font-semibold text-rose-600 shadow-sm animate-shake">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Premium Active Tab Bar */}
        <div className="mt-10 border-b border-stone-200">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-px sm:mx-0 sm:flex-wrap sm:px-0">
            {DASHBOARD_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative min-w-[112px] px-4 py-4 pb-4 text-left outline-none transition-all sm:min-w-0 sm:px-5"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeAdminTabLine"
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#ea580c]"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className={`block text-[9px] font-bold uppercase tracking-[0.18em] ${isActive ? 'text-[#ea580c]' : 'text-stone-400'}`}>
                    {tab.description}
                  </span>
                  <span className={`block mt-1 text-sm font-black tracking-tight ${isActive ? 'text-stone-900' : 'text-stone-600 hover:text-stone-900'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Panel Renderers */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="tab-overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]"
              >
                <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
                  <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Overview</span>
                      <h2 className="mt-0.5 text-2xl font-black text-stone-950 tracking-tight">Active operations summary</h2>
                    </div>
                    <button
                      onClick={loadOverview}
                      className="group flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-500 shadow-sm transition-all hover:bg-stone-50 hover:text-stone-800"
                    >
                      <RefreshCw className={`h-4.5 w-4.5 text-stone-500 transition-transform ${refreshSpin ? 'animate-spin text-[#ea580c]' : 'group-hover:rotate-45'}`} />
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-3">
                    <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-5">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Recent trips</h3>
                      <div className="mt-3.5 space-y-2.5">
                        {(overview?.trips ?? []).slice(0, 3).map(trip => (
                          <div key={trip.id} className="rounded-xl border border-stone-100 bg-white px-3.5 py-2.5 text-xs shadow-sm hover:border-stone-200 transition-colors">
                            <div className="font-bold text-stone-800 truncate">{trip.destination}</div>
                            <div className="mt-0.5 text-[#9b8b92] font-mono truncate">{trip.owner_email || 'No email'}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-5">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Recent shares</h3>
                      <div className="mt-3.5 space-y-2.5">
                        {(overview?.shares ?? []).slice(0, 3).map(share => (
                          <div key={share.id} className="rounded-xl border border-stone-100 bg-white px-3.5 py-2.5 text-xs shadow-sm hover:border-stone-200 transition-colors">
                            <div className="font-bold text-stone-800 truncate">{share.destination}</div>
                            <span className={`inline-flex mt-1 items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800`}>
                              {share.revoked_at ? 'Revoked' : 'Live link'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-5">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Recent users</h3>
                      <div className="mt-3.5 space-y-2.5">
                        {(overview?.users ?? []).slice(0, 3).map(user => (
                          <div key={user.id} className="rounded-xl border border-stone-100 bg-white px-3.5 py-2.5 text-xs shadow-sm hover:border-stone-200 transition-colors">
                            <div className="font-bold text-stone-800 truncate">{user.email || 'No email'}</div>
                            <div className="mt-0.5 text-[#ea580c] font-bold">{user.usage.total_actions} actions</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Shortcuts</span>
                    <h2 className="mt-0.5 text-xl font-black text-stone-900 tracking-tight">HQ management guides</h2>
                    <p className="mt-4 text-xs leading-relaxed text-[#7c6a72]">
                      Use the active tabs to manage system operations. You can revoke shares instantly, filter registered users, bulk-delete spammers, or prune orphan itineraries.
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-[#7c6a72]">
                      Usage metrics are generated inside real-time app metadata hooks, allowing server security to run without slowing query times.
                    </p>
                  </div>
                  <div className="mt-6 border-t border-stone-100 pt-5 flex items-center justify-between text-xs font-semibold text-[#ea580c]">
                    <span>Secure shell connected</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'trips' && (
              <motion.div
                key="tab-trips"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8"
              >
                <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">All records</span>
                    <h2 className="mt-0.5 text-2xl font-black text-stone-950 tracking-tight">Active trips catalog</h2>
                  </div>
                  <button
                    onClick={loadOverview}
                    className="group flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-500 shadow-sm transition-all hover:bg-stone-50 hover:text-stone-800"
                  >
                    <RefreshCw className={`h-4.5 w-4.5 text-stone-500 transition-transform ${refreshSpin ? 'animate-spin text-[#ea580c]' : 'group-hover:rotate-45'}`} />
                  </button>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2 lg:gap-6">
                  {overview?.trips.length ? (
                    overview.trips.map(trip => (
                      <motion.article
                        key={trip.id}
                        className="group overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col h-full"
                      >
                        <TripCardCover
                          destination={trip.destination}
                          meta={trip.share && !trip.share.revoked_at ? 'Public Shared' : 'Private'}
                          rightLabel={`${trip.suggestions_count} recommendations`}
                        />

                        <div className="flex flex-col flex-1 p-5 sm:p-6 bg-white/60 backdrop-blur-3xl">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
                            <div className="min-w-0">
                              <p className="text-xs font-medium leading-6 text-stone-500">
                                <span className="font-extrabold text-stone-700 bg-stone-100 rounded-full px-2.5 py-0.5">{trip.duration} Days</span>
                                <span className="mx-2 text-stone-300">•</span>
                                <span className="font-semibold text-stone-800">{trip.owner_email || 'Unknown owner'}</span>
                                {trip.owner_name ? ` (${trip.owner_name})` : ''}
                              </p>
                              <p className="mt-2 text-[10px] uppercase font-bold tracking-widest text-[#9b8b92]">
                                Created {formatDate(trip.created_at)}
                              </p>
                            </div>
                          </div>

                            <div className="mt-auto grid gap-2 text-xs sm:flex sm:flex-wrap">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => router.push(`/trip/${trip.id}`)}
                              className="flex min-w-[100px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#ea580c] px-4 py-3 text-xs font-black text-white shadow-lg shadow-[#ea580c]/25 transition-all hover:bg-[#c2410c]"
                            >
                              <Compass className="h-4 w-4" />
                              Open
                            </motion.button>
                            {trip.share?.share_url && (
                              <a
                                href={trip.share.share_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs font-bold text-stone-700 shadow-sm transition-all hover:bg-stone-50 sm:flex-none"
                              >
                                View Share
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteTrip(trip.id)}
                              disabled={actionId === `trip-${trip.id}`}
                              className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-xs font-black text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50 sm:flex-none"
                            >
                              {actionId === `trip-${trip.id}` ? '...' : 'Del'}
                            </button>
                          </div>

                          {trip.share && (
                            <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-[#fffbf2] p-4 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9b8b92]">
                                    Live deployment url
                                  </div>
                                  <p className="mt-1 truncate font-mono text-stone-600">
                                    {trip.share.revoked_at ? 'REVOKED/INACTIVE' : trip.share.share_url}
                                  </p>
                                </div>
                                {!trip.share.revoked_at && (
                                  <button
                                    onClick={() => handleRevokeShare(trip.share!.id)}
                                    disabled={actionId === `share-${trip.share.id}`}
                                    className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-bold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-50"
                                  >
                                    {actionId === `share-${trip.share.id}` ? 'Revoking...' : 'Revoke URL'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.article>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-stone-200 bg-[#fffbf2] px-4 py-12 text-center text-xs text-[#7c6a72] col-span-2">
                      No matching trips found in database search.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'shares' && (
              <motion.div
                key="tab-shares"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8"
              >
                <div className="border-b border-stone-100 pb-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Shares</span>
                  <h2 className="mt-0.5 text-2xl font-black text-stone-950 tracking-tight">Active public deployments</h2>
                </div>

                <div className="mt-8 space-y-4">
                  {overview?.shares.length ? (
                    overview.shares.map(share => (
                      <div key={share.id} className="rounded-2xl border border-stone-100 bg-[#fffbf2] p-5 shadow-sm flex flex-col justify-between sm:flex-row sm:items-center gap-4">
                        <div>
                          <div className="font-bold text-stone-900 text-sm">{share.destination}</div>
                          <div className="text-xs text-[#7c6a72] mt-1">
                            Uploaded by <span className="font-semibold">{share.owner_email || 'Unknown'}</span> · {formatDate(share.created_at)}
                          </div>
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 bg-white border border-stone-200/60 rounded-full px-2.5 py-0.5">
                            {share.suggestions_count} suggestion{share.suggestions_count === 1 ? '' : 's'}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className={`${share.revoked_at ? 'bg-stone-100 text-stone-500' : 'bg-emerald-50 text-emerald-800'} rounded-full px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider`}>
                            {share.revoked_at ? 'Revoked' : 'Live'}
                          </span>
                          <a
                            href={share.share_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50"
                          >
                            Open share
                          </a>
                          {!share.revoked_at && (
                            <button
                              onClick={() => handleRevokeShare(share.id)}
                              disabled={actionId === `share-${share.id}`}
                              className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                            >
                              {actionId === `share-${share.id}` ? 'Revoking...' : 'Revoke link'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-stone-200 bg-[#fffbf2] py-12 text-center text-xs text-[#7c6a72]">
                      No active deployment hashes found inside the schema database.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'suggestions' && (
              <motion.div
                key="tab-suggestions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8"
              >
                <div className="border-b border-stone-100 pb-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">suggestions</span>
                  <h2 className="mt-0.5 text-2xl font-black text-stone-950 tracking-tight">Guest suggestions feed</h2>
                </div>

                <div className="mt-8 space-y-4">
                  {overview?.suggestions.length ? (
                    overview.suggestions.map(suggestion => (
                      <div key={suggestion.id} className="rounded-2xl border border-stone-100 bg-[#fffbf2] p-5 shadow-xs">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <div>
                            <div className="font-bold text-stone-900 text-sm">{suggestion.destination}</div>
                            <div className="text-xs text-[#7c6a72] mt-1">
                              From <span className="font-semibold">{suggestion.guest_name || 'Anonymous Guest'}</span>
                              {suggestion.guest_email ? ` (${suggestion.guest_email})` : ''}
                            </div>
                          </div>
                          <div className="text-[10px] font-mono text-[#9b8b92]">{formatDate(suggestion.created_at)}</div>
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-[#3a2540] bg-white border border-stone-100 rounded-xl p-3.5 italic">
                          &quot;{shorten(suggestion.message, 180)}&quot;
                        </p>
                        <div className="mt-3.5 text-right">
                          <button
                            onClick={() => handleDeleteSuggestion(suggestion.id)}
                            disabled={actionId === `suggestion-${suggestion.id}`}
                            className="rounded-xl bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                          >
                            {actionId === `suggestion-${suggestion.id}` ? 'Deleting...' : 'Prune feedback'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-stone-200 bg-[#fffbf2] py-12 text-center text-xs text-[#7c6a72]">
                      No recommendations or feedback notes from guest shares are available.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="tab-users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8"
              >
                <div className="border-b border-stone-100 pb-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">accounts</span>
                  <h2 className="mt-0.5 text-2xl font-black text-stone-950 tracking-tight">Manage registered profiles</h2>
                </div>

                {/* Big System Total Indicators */}
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {overview &&
                    [
                      { label: 'Total trips logged', value: overview.users.reduce((sum, user) => sum + user.usage.trips_created, 0), color: '#ea580c', bg: 'bg-[#ea580c]/5', border: 'border-[#ea580c]/10' },
                      { label: 'Total shares logged', value: overview.users.reduce((sum, user) => sum + user.usage.shares_created, 0), color: '#f43f5e', bg: 'bg-[#f43f5e]/5', border: 'border-[#f43f5e]/10' },
                      { label: 'Total feedback received', value: overview.users.reduce((sum, user) => sum + user.usage.suggestions_received, 0), color: '#f43f5e', bg: 'bg-[#f43f5e]/5', border: 'border-[#f43f5e]/10' },
                    ].map(card => (
                      <div key={card.label} className={`rounded-2xl border ${card.border} ${card.bg} p-4`}>
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b8b92]">{card.label}</div>
                        <div className="mt-2.5 text-2xl font-black tracking-tight" style={{ color: card.color }}>
                          {card.value}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Secure Search Bar */}
                <div className="mt-8">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#7c6a72]">
                    Inspect and search accounts
                  </label>
                  <div className="relative">
                    <input
                      value={userQuery}
                      onChange={event => setUserQuery(event.target.value)}
                      placeholder="Search accounts catalog by email, name, role, tags or activity..."
                      className="w-full rounded-2xl border border-stone-200 bg-[#fffbf2] pl-4 pr-10 py-3.5 text-sm text-[#3a2540] outline-none placeholder:text-[#9b8b92] focus:border-[#ea580c] focus:bg-white transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Bulk Handling Deck */}
                <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-stone-100 bg-[#fffbf2] p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
                  <div className="text-xs font-bold text-[#7c6a72]">
                    {selectedUserIds.length > 0
                      ? `${selectedUserIds.length} user record${selectedUserIds.length === 1 ? '' : 's'} highlighted`
                      : 'Highlight records below to invoke bulk modifiers'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={toggleVisibleUsers}
                      disabled={selectableUserIds.length === 0}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                    >
                      {allVisibleSelected ? 'Unselect page' : 'Select page'}
                    </button>
                    <button
                      onClick={() => setSelectedUserIds([])}
                      disabled={selectedUserIds.length === 0}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={handleBulkDeleteUsers}
                      disabled={selectedUserIds.filter(id => id !== currentUserId).length === 0 || actionId === 'bulk-users'}
                      className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {actionId === 'bulk-users' ? 'Pruning visible selections...' : 'Bulk Prune Highlighted'}
                    </button>
                  </div>
                </div>

                {/* Profile Directory Feed */}
                <div className="mt-6 space-y-4">
                  {filteredUsers.length ? (
                    filteredUsers.map(user => {
                      const isCurrentUser = currentUserId === user.id;
                      const isSelected = selectedUserIds.includes(user.id);

                      return (
                        <div key={user.id} className="rounded-2xl border border-stone-100 bg-[#fffbf2] p-5 shadow-xs">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isCurrentUser}
                                onChange={() => toggleUserSelection(user.id)}
                                className="mt-1 h-4.5 w-4.5 rounded-md border-stone-300 text-[#ea580c] focus:ring-[#ea580c] accent-[#ea580c]"
                              />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-stone-900 text-sm">{user.email || 'No email registered'}</span>
                                  <span className={`${user.email_confirmed_at ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'} rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide`}>
                                    {user.email_confirmed_at ? 'Verified' : 'Unconfirmed'}
                                  </span>
                                </div>
                                <div className="text-xs text-[#7c6a72] mt-0.5">
                                  {user.full_name || 'No custom display name set'} · <span className="font-mono bg-stone-100 px-1.5 py-0.2 rounded text-stone-700">{user.role || 'authenticated'}</span>
                                </div>
                                <div className="mt-2 text-[10px] font-mono text-[#9b8b92]">
                                  Since {formatDate(user.created_at)}
                                  {user.last_sign_in_at ? ` · Last active session ${formatDate(user.last_sign_in_at)}` : ''}
                                </div>
                              </div>
                            </div>

                            {/* Stat indicators for each profile */}
                            <div className="grid gap-2 grid-cols-2 lg:w-[420px]">
                              {[
                                { label: 'Trips built', value: user.usage.trips_created, color: 'text-[#ea580c]' },
                                { label: 'Shares launched', value: user.usage.shares_created, color: 'text-stone-800' },
                                { label: 'Guest reviews', value: user.usage.suggestions_received, color: 'text-[#f43f5e]' },
                                { label: 'Active shares', value: user.usage.active_shares, color: 'text-stone-800' },
                              ].map(metric => (
                                <div key={metric.label} className="rounded-xl border border-stone-100 bg-white px-3.5 py-2">
                                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">{metric.label}</div>
                                  <div className={`mt-0.5 text-base font-black ${metric.color}`}>{metric.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-stone-100/60 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div className="text-[11px] text-[#7c6a72]">
                              Activity: {user.usage.last_activity_at ? formatDate(user.usage.last_activity_at) : 'No sessions tracked yet'}
                              {' · '}
                              Total API calls: <span className="font-bold text-stone-800">{user.usage.total_actions}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={actionId === `user-${user.id}` || isCurrentUser}
                              className="rounded-xl bg-[#ffe4e6] px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                            >
                              {actionId === `user-${user.id}` ? 'Pruning...' : isCurrentUser ? 'Active Superuser' : 'Prune client record'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-stone-200 bg-[#fffbf2] py-12 text-center text-xs text-[#7c6a72]">
                      No traveler metadata tracks match your selection filters.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'social' && (
              <motion.div
                key="social"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-black tracking-tight text-[#1c1018]">Traveler profile</h2>
                  <p className="mt-1 text-sm text-[#7c6a72]">
                    Control how other wayflo travelers see you on the explore page.
                  </p>
                </div>
                <div className="max-w-lg">
                  <SocialProfileSettings />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
