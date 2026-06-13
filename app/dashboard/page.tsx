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
import { Button } from '@/components/ui/button';
import { deleteTrip, listTrips, type Trip } from '@/lib/supabase-trips';
import { getSupabaseBrowser } from '@/services/supabase-browser';
import { formatCurrency } from '@/lib/utils';
import { DestinationPhotoCover } from '@/components/common/DestinationPhotoCover';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { BookingConfirmationImportCard } from '@/components/dashboard/BookingConfirmationImportCard';
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
    ? 'border-2 border-ink bg-primary/15 text-primary font-bold'
    : 'border-2 border-ink bg-destructive/15 text-destructive font-bold';
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
    <div className="relative h-48 overflow-hidden rounded-t-lg sm:h-56">
      <div className="absolute inset-0 z-0 scale-105 transition-transform duration-700 group-hover:scale-100">
        <DestinationPhotoCover destination={destination} className="h-full w-full" />
      </div>
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-900/10 pointer-events-none" />
      <div className="absolute inset-0 z-10 ring-1 ring-inset ring-white/10 pointer-events-none" />

      <div className="relative z-20 flex h-full flex-col justify-between p-5 sm:p-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex rounded-md bg-slate-900/60 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white border border-white/20 shadow-sm">
            {meta}
          </span>
          <span className="inline-flex rounded-md bg-slate-900/60 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/90 border border-white/20 shadow-sm">
            {rightLabel}
          </span>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-white text-2xl font-black text-primary shadow-xl shadow-black/40 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-300">
            {destination
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map(part => part[0]?.toUpperCase() ?? '')
              .join('') || 'TR'}
          </div>
          <div className="min-w-0 pb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-accent block mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
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
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="surface-brutal shadow-brutal-lg p-8 text-center max-w-sm">
          <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-md border-2 border-ink bg-primary/10 text-primary">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary"
            />
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-foreground tracking-tight">Syncing Wayflo</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
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
      <main className="relative min-h-screen bg-background text-foreground pb-12">
        {/* Global Nav-Bar */}
        <header className="sticky top-0 z-30 border-b-2 border-ink bg-background">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Brand href="/" compact className="shrink-0 transition-transform hover:scale-102" />
              <div className="hidden h-6 w-[2px] bg-ink sm:block" />
              <div className="hidden sm:block">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Dashboard</div>
                <div className="text-sm font-black tracking-tight text-foreground">Your Wayflo Trips</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push('/dashboard/community')}
                aria-label="Community settings"
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-card px-3.5 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted"
              >
                <Heart className="h-4 w-4 text-accent" />
                <span className="hidden md:inline">Community</span>
              </button>
              <button
                type="button"
                onClick={() => router.push('/explore')}
                aria-label="Find travelers"
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-card px-3.5 py-2.5 text-xs font-bold text-primary transition hover:bg-muted"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Find travelers</span>
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/dashboard/onboarding')}
                className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>New trip</span>
              </motion.button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-card px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Elegant Welcome Hero Card */}
            <div className="relative overflow-hidden rounded-lg border-2 border-ink bg-card p-6 sm:p-8 shadow-brutal-lg flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                <Compass className="h-48 w-44" />
              </div>
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-accent-foreground">
                  <Sparkles className="h-3 w-3" />
                  Welcome back
                </span>
                <h1 className="mt-4 text-headline text-foreground">
                  Plan, reopen, and edit your trips from one place.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Start a new AI-guided itinerary when you are ready, or jump back into a saved journey to customize destinations, budgets, and schedules.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 relative z-10">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push('/dashboard/onboarding')}
                  className="rounded-md border-2 border-ink bg-secondary px-5 py-3.5 text-sm font-bold text-secondary-foreground shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  {latestTrip ? 'Create another trip' : 'Plan your first trip'}
                </motion.button>
                {latestTrip && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => router.push(`/trip/${latestTrip.id}`)}
                    className="rounded-md border-2 border-ink bg-card px-5 py-3.5 text-sm font-bold text-foreground hover:bg-muted shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    Open latest trip
                  </motion.button>
                )}
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-lg border-2 border-ink bg-card p-5 shadow-brutal relative overflow-hidden flex flex-col justify-center">
                <div className="absolute right-4 bottom-2 text-muted font-extrabold text-7xl select-none opacity-40">
                  {userTrips.length}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Trips planned</div>
                <div className="relative mt-2 text-2xl font-extrabold text-primary">{userTrips.length}</div>
              </div>
              <div className="rounded-lg border-2 border-ink bg-card p-5 shadow-brutal flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Latest target</div>
                <div className="mt-2 flex items-center gap-1.5 font-bold text-foreground truncate">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-foreground">{latestTrip ? latestTrip.destination : 'No active trips'}</span>
                </div>
              </div>
              <div className="rounded-lg border-2 border-ink bg-card p-5 shadow-brutal flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Next Action</div>
                <div className="mt-2 text-xs font-semibold text-muted-foreground">
                  {latestTrip ? 'Review recommendations or export' : 'Run the AI generation onboarding'}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-3 rounded-md border-2 border-destructive bg-destructive/10 p-4 text-sm font-semibold text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Trips Directory Grid Section */}
          <section className="mt-10">
            <div className="flex items-center justify-between border-b-2 border-ink pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Saved plans</span>
                <h2 className="mt-0.5 text-title text-foreground">Your travel logs</h2>
              </div>
              <button
                onClick={loadUserTrips}
                className="group flex h-10 w-10 items-center justify-center rounded-md border-2 border-ink bg-card text-foreground shadow-brutal transition-all hover:bg-muted"
              >
                <RefreshCw className={`h-4.5 w-4.5 transition-transform ${refreshSpin ? 'animate-spin text-primary' : 'group-hover:rotate-45'}`} />
              </button>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {userTrips.length > 0 ? (
                userTrips.map(trip => (
                  <motion.article
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    key={trip.id}
                    className="group overflow-hidden rounded-lg border-2 border-ink bg-card shadow-brutal transition-all hover:-translate-y-1 hover:shadow-brutal-lg flex flex-col h-full"
                  >
                    <TripCardCover
                      destination={trip.destination}
                      meta={trip.duration ? `${trip.duration} Days` : 'Trip'}
                      rightLabel={`Saved ${formatDateCompact(trip.updated_at)}`}
                    />

                    <div className="flex flex-col flex-1 p-5 sm:p-6 bg-card border-t-2 border-ink">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-6">
                        <span className="font-semibold text-primary bg-primary/10 text-[11px] rounded-md px-3 py-1 font-mono border-2 border-ink">
                          {trip.budget
                            ? Number.isFinite(Number.parseFloat(trip.budget))
                              ? formatCurrency(Number.parseFloat(trip.budget), trip.itinerary?.currency?.home ?? 'USD')
                              : trip.budget
                            : 'Custom budget'}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          Updated {formatDateCompact(trip.updated_at)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 mt-auto">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => router.push(`/trip/${trip.id}`)}
                          className="flex-1 min-w-[120px] rounded-md border-2 border-ink bg-primary px-4 py-3 text-xs font-bold text-primary-foreground shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
                        >
                          <Compass className="h-4 w-4" />
                          Open
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => router.push('/dashboard/onboarding')}
                          className="flex-none rounded-md border-2 border-ink bg-card px-4 py-3 text-xs font-bold text-foreground hover:bg-muted transition-all text-center"
                        >
                          New
                        </motion.button>
                        <button
                          onClick={() => handleDeleteUserTrip(trip.id, trip.destination)}
                          disabled={actionId === `user-trip-${trip.id}`}
                          className="flex-none rounded-md border-2 border-ink bg-destructive px-4 py-3 text-xs font-bold text-destructive-foreground hover:-translate-y-0.5 transition-all disabled:opacity-50 text-center"
                        >
                          {actionId === `user-trip-${trip.id}` ? '...' : 'Del'}
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))
              ) : (
                <div className="rounded-lg border-2 border-dashed border-ink/40 bg-muted p-8 text-center md:col-span-2 py-12">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border-2 border-ink bg-primary/10 text-primary mb-4">
                    <Compass className="h-6 w-6 animate-pulse" />
                  </div>
                  <h3 className="text-base font-black text-foreground tracking-tight">No itineraries yet</h3>
                  <p className="mt-2 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Create your first itinerary — start with a destination and we’ll plan the days for you.
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/onboarding')}
                    className="mt-5 rounded-md border-2 border-ink bg-primary px-5 py-3 text-xs font-bold text-primary-foreground shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    Create your first itinerary
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
    <main className="relative min-h-screen bg-background text-foreground pb-16">
      {/* Modern sticky header */}
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Brand href="/" compact className="shrink-0 transition-transform hover:scale-102" />
            <div className="hidden h-6 w-[2px] bg-ink sm:block" />
            <div className="hidden sm:block">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Wayflo HQ</div>
              <div className="text-sm font-black tracking-tight text-foreground">Control Center</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard/community')}
              aria-label="Community settings"
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-card px-3.5 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted"
            >
              <Heart className="h-4 w-4 text-accent" />
              <span className="hidden md:inline">Community</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/explore')}
              aria-label="Find travelers"
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-card px-3.5 py-2.5 text-xs font-bold text-primary transition hover:bg-muted"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Find travelers</span>
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/dashboard/onboarding')}
              className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>New trip</span>
            </motion.button>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-card px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted animate-fade-in"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Welcome Dashboard Banner */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-lg border-2 border-ink bg-card p-6 sm:p-8 shadow-brutal-lg flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
              <SlidersHorizontal className="h-48 w-44" />
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Console
              </span>
              <h1 className="mt-4 text-headline text-foreground">
                Manage every Wayflo surface from one place.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Trips, public shares, guest suggestions, and profile data all sit behind this secure management area. Only accounts holding trusted roles have access.
              </p>
            </div>
          </div>

          {/* Glowing Metrics Grid Header */}
          {overview && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: 'Trips planned', value: overview.stats.trips.toString(), color: 'text-primary' },
                { label: 'Active shares', value: overview.stats.activeShares.toString(), color: 'text-accent' },
                { label: 'Suggestions', value: overview.stats.suggestions.toString(), color: 'text-accent' },
                { label: 'Users total', value: overview.stats.users.toString(), color: 'text-foreground' },
                { label: 'Confirmed emails', value: overview.stats.confirmedUsers.toString(), color: 'text-primary' },
                { label: 'User profiles', value: overview.profiles.length.toString(), color: 'text-foreground' },
              ].map(card => (
                <div key={card.label} className="flex flex-col justify-center rounded-lg border-2 border-ink bg-card p-4 shadow-brutal">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{card.label}</div>
                  <div className={`mt-2 text-2xl font-extrabold tracking-tight ${card.color}`}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-md border-2 border-destructive bg-destructive/10 p-4 text-sm font-semibold text-destructive animate-shake">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Premium Active Tab Bar */}
        <div className="mt-10 border-b-2 border-ink">
          <div className="flex flex-wrap gap-2 pb-px overflow-x-auto scrollbar-none">
            {DASHBOARD_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative px-5 py-4 pb-4 text-left transition-all outline-none"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeAdminTabLine"
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className={`block text-[9px] font-bold uppercase tracking-[0.18em] ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {tab.description}
                  </span>
                  <span className={`block mt-1 text-sm font-black tracking-tight ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
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
                <div className="rounded-lg border-2 border-ink bg-card p-6 sm:p-8 shadow-brutal">
                  <div className="flex items-center justify-between border-b-2 border-ink pb-5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Overview</span>
                      <h2 className="mt-0.5 text-title text-foreground">Active operations summary</h2>
                    </div>
                    <button
                      onClick={loadOverview}
                      className="group flex h-10 w-10 items-center justify-center rounded-md border-2 border-ink bg-card text-foreground shadow-brutal transition-all hover:bg-muted"
                    >
                      <RefreshCw className={`h-4.5 w-4.5 transition-transform ${refreshSpin ? 'animate-spin text-primary' : 'group-hover:rotate-45'}`} />
                    </button>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border-2 border-ink bg-muted p-5">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Recent trips</h3>
                      <div className="mt-3.5 space-y-2.5">
                        {(overview?.trips ?? []).slice(0, 3).map(trip => (
                          <div key={trip.id} className="rounded-md border-2 border-ink bg-card px-3.5 py-2.5 text-xs">
                            <div className="font-bold text-foreground truncate">{trip.destination}</div>
                            <div className="mt-0.5 text-muted-foreground font-mono truncate">{trip.owner_email || 'No email'}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border-2 border-ink bg-muted p-5">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Recent shares</h3>
                      <div className="mt-3.5 space-y-2.5">
                        {(overview?.shares ?? []).slice(0, 3).map(share => (
                          <div key={share.id} className="rounded-md border-2 border-ink bg-card px-3.5 py-2.5 text-xs">
                            <div className="font-bold text-foreground truncate">{share.destination}</div>
                            <span className={`inline-flex mt-1 items-center gap-1.5 rounded border-2 border-ink px-2 py-0.5 text-[9px] font-extrabold uppercase ${share.revoked_at ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
                              {share.revoked_at ? 'Revoked' : 'Live link'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border-2 border-ink bg-muted p-5">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Recent users</h3>
                      <div className="mt-3.5 space-y-2.5">
                        {(overview?.users ?? []).slice(0, 3).map(user => (
                          <div key={user.id} className="rounded-md border-2 border-ink bg-card px-3.5 py-2.5 text-xs">
                            <div className="font-bold text-foreground truncate">{user.email || 'No email'}</div>
                            <div className="mt-0.5 text-primary font-bold">{user.usage.total_actions} actions</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border-2 border-ink bg-card p-6 sm:p-8 shadow-brutal flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Shortcuts</span>
                    <h2 className="mt-0.5 text-title text-foreground">HQ management guides</h2>
                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                      Use the active tabs to manage system operations. You can revoke shares instantly, filter registered users, bulk-delete spammers, or prune orphan itineraries.
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Usage metrics are generated inside real-time app metadata hooks, allowing server security to run without slowing query times.
                    </p>
                  </div>
                  <div className="mt-6 border-t-2 border-ink pt-5 flex items-center justify-between text-xs font-semibold text-primary">
                    <span>Secure shell connected</span>
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
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
                className="rounded-lg border-2 border-ink bg-card p-6 sm:p-8 shadow-brutal"
              >
                <div className="flex items-center justify-between border-b-2 border-ink pb-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">All records</span>
                    <h2 className="mt-0.5 text-title text-foreground">Active trips catalog</h2>
                  </div>
                  <button
                    onClick={loadOverview}
                    className="group flex h-10 w-10 items-center justify-center rounded-md border-2 border-ink bg-card text-foreground shadow-brutal transition-all hover:bg-muted"
                  >
                    <RefreshCw className={`h-4.5 w-4.5 transition-transform ${refreshSpin ? 'animate-spin text-primary' : 'group-hover:rotate-45'}`} />
                  </button>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {overview?.trips.length ? (
                    overview.trips.map(trip => (
                      <motion.article
                        key={trip.id}
                        className="group overflow-hidden rounded-lg border-2 border-ink bg-card shadow-brutal transition-all hover:-translate-y-1 hover:shadow-brutal-lg flex flex-col h-full"
                      >
                        <TripCardCover
                          destination={trip.destination}
                          meta={trip.share && !trip.share.revoked_at ? 'Public Shared' : 'Private'}
                          rightLabel={`${trip.suggestions_count} recommendations`}
                        />

                        <div className="flex flex-col flex-1 p-5 sm:p-6 bg-card border-t-2 border-ink">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
                            <div className="min-w-0">
                              <p className="text-xs font-medium leading-6 text-muted-foreground">
                                <span className="font-extrabold text-foreground bg-primary/10 border-2 border-ink rounded-md px-2.5 py-0.5">{trip.duration} Days</span>
                                <span className="mx-2 text-muted-foreground">•</span>
                                <span className="font-semibold text-foreground">{trip.owner_email || 'Unknown owner'}</span>
                                {trip.owner_name ? ` (${trip.owner_name})` : ''}
                              </p>
                              <p className="mt-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                Created {formatDate(trip.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-auto flex flex-wrap gap-2 text-xs">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => router.push(`/trip/${trip.id}`)}
                              className="flex-1 min-w-[100px] rounded-md border-2 border-ink bg-primary px-4 py-3 text-xs font-bold text-primary-foreground shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
                            >
                              <Compass className="h-4 w-4" />
                              Open
                            </motion.button>
                            {trip.share?.share_url && (
                              <a
                                href={trip.share.share_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-none flex items-center justify-center rounded-md border-2 border-ink bg-card px-4 py-3 text-xs font-bold text-foreground hover:bg-muted transition-all"
                              >
                                View Share
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteTrip(trip.id)}
                              disabled={actionId === `trip-${trip.id}`}
                              className="flex-none rounded-md border-2 border-ink bg-destructive px-4 py-3 text-xs font-bold text-destructive-foreground hover:-translate-y-0.5 transition-all disabled:opacity-50 text-center"
                            >
                              {actionId === `trip-${trip.id}` ? '...' : 'Del'}
                            </button>
                          </div>

                          {trip.share && (
                            <div className="mt-5 rounded-md border-2 border-dashed border-ink/40 bg-muted p-4 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                    Live deployment url
                                  </div>
                                  <p className="mt-1 truncate font-mono text-muted-foreground">
                                    {trip.share.revoked_at ? 'REVOKED/INACTIVE' : trip.share.share_url}
                                  </p>
                                </div>
                                {!trip.share.revoked_at && (
                                  <button
                                    onClick={() => handleRevokeShare(trip.share!.id)}
                                    disabled={actionId === `share-${trip.share.id}`}
                                    className="rounded-md border-2 border-ink bg-card px-3 py-1.5 text-[11px] font-bold text-foreground hover:bg-muted disabled:opacity-50"
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
                    <div className="rounded-lg border-2 border-dashed border-ink/40 bg-muted px-4 py-12 text-center text-xs text-muted-foreground col-span-2">
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
                className="rounded-lg border-2 border-ink bg-card p-6 sm:p-8 shadow-brutal"
              >
                <div className="border-b-2 border-ink pb-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Shares</span>
                  <h2 className="mt-0.5 text-title text-foreground">Active public deployments</h2>
                </div>

                <div className="mt-8 space-y-4">
                  {overview?.shares.length ? (
                    overview.shares.map(share => (
                      <div key={share.id} className="rounded-lg border-2 border-ink bg-muted p-5 shadow-brutal flex flex-col justify-between sm:flex-row sm:items-center gap-4">
                        <div>
                          <div className="font-bold text-foreground text-sm">{share.destination}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Uploaded by <span className="font-semibold">{share.owner_email || 'Unknown'}</span> · {formatDate(share.created_at)}
                          </div>
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-foreground bg-card border-2 border-ink rounded px-2.5 py-0.5">
                            {share.suggestions_count} suggestion{share.suggestions_count === 1 ? '' : 's'}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className={`${share.revoked_at ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'} border-2 border-ink rounded px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider`}>
                            {share.revoked_at ? 'Revoked' : 'Live'}
                          </span>
                          <a
                            href={share.share_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border-2 border-ink bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
                          >
                            Open share
                          </a>
                          {!share.revoked_at && (
                            <button
                              onClick={() => handleRevokeShare(share.id)}
                              disabled={actionId === `share-${share.id}`}
                              className="rounded-md border-2 border-ink bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground hover:-translate-y-0.5 transition-all disabled:opacity-50"
                            >
                              {actionId === `share-${share.id}` ? 'Revoking...' : 'Revoke link'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-ink/40 bg-muted py-12 text-center text-xs text-muted-foreground">
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
                className="rounded-lg border-2 border-ink bg-card p-6 sm:p-8 shadow-brutal"
              >
                <div className="border-b-2 border-ink pb-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">suggestions</span>
                  <h2 className="mt-0.5 text-title text-foreground">Guest suggestions feed</h2>
                </div>

                <div className="mt-8 space-y-4">
                  {overview?.suggestions.length ? (
                    overview.suggestions.map(suggestion => (
                      <div key={suggestion.id} className="rounded-lg border-2 border-ink bg-muted p-5 shadow-brutal">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-foreground text-sm">{suggestion.destination}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              From <span className="font-semibold">{suggestion.guest_name || 'Anonymous Guest'}</span>
                              {suggestion.guest_email ? ` (${suggestion.guest_email})` : ''}
                            </div>
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">{formatDate(suggestion.created_at)}</div>
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-foreground bg-card border-2 border-ink rounded-md p-3.5 italic">
                          &quot;{shorten(suggestion.message, 180)}&quot;
                        </p>
                        <div className="mt-3.5 text-right">
                          <button
                            onClick={() => handleDeleteSuggestion(suggestion.id)}
                            disabled={actionId === `suggestion-${suggestion.id}`}
                            className="rounded-md border-2 border-ink bg-destructive px-3.5 py-1.5 text-xs font-bold text-destructive-foreground hover:-translate-y-0.5 transition-all disabled:opacity-50"
                          >
                            {actionId === `suggestion-${suggestion.id}` ? 'Deleting...' : 'Prune feedback'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-ink/40 bg-muted py-12 text-center text-xs text-muted-foreground">
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
                className="rounded-lg border-2 border-ink bg-card p-6 sm:p-8 shadow-brutal"
              >
                <div className="border-b-2 border-ink pb-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">accounts</span>
                  <h2 className="mt-0.5 text-title text-foreground">Manage registered profiles</h2>
                </div>

                {/* Big System Total Indicators */}
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {overview &&
                    [
                      { label: 'Total trips logged', value: overview.users.reduce((sum, user) => sum + user.usage.trips_created, 0), color: 'text-primary' },
                      { label: 'Total shares logged', value: overview.users.reduce((sum, user) => sum + user.usage.shares_created, 0), color: 'text-accent' },
                      { label: 'Total feedback received', value: overview.users.reduce((sum, user) => sum + user.usage.suggestions_received, 0), color: 'text-accent' },
                    ].map(card => (
                      <div key={card.label} className="rounded-lg border-2 border-ink bg-card p-4 shadow-brutal">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{card.label}</div>
                        <div className={`mt-2.5 text-2xl font-extrabold tracking-tight ${card.color}`}>
                          {card.value}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Secure Search Bar */}
                <div className="mt-8">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Inspect and search accounts
                  </label>
                  <div className="relative">
                    <input
                      value={userQuery}
                      onChange={event => setUserQuery(event.target.value)}
                      placeholder="Search accounts catalog by email, name, role, tags or activity..."
                      className="w-full rounded-md border-2 border-ink bg-background pl-4 pr-10 py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-card transition-all"
                    />
                  </div>
                </div>

                {/* Bulk Handling Deck */}
                <div className="mt-6 flex flex-col gap-3 rounded-lg border-2 border-ink bg-muted p-4 sm:flex-row sm:items-center sm:justify-between shadow-brutal">
                  <div className="text-xs font-bold text-muted-foreground">
                    {selectedUserIds.length > 0
                      ? `${selectedUserIds.length} user record${selectedUserIds.length === 1 ? '' : 's'} highlighted`
                      : 'Highlight records below to invoke bulk modifiers'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={toggleVisibleUsers}
                      disabled={selectableUserIds.length === 0}
                      className="rounded-md border-2 border-ink bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      {allVisibleSelected ? 'Unselect page' : 'Select page'}
                    </button>
                    <button
                      onClick={() => setSelectedUserIds([])}
                      disabled={selectedUserIds.length === 0}
                      className="rounded-md border-2 border-ink bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={handleBulkDeleteUsers}
                      disabled={selectedUserIds.filter(id => id !== currentUserId).length === 0 || actionId === 'bulk-users'}
                      className="rounded-md border-2 border-ink bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground hover:-translate-y-0.5 transition-all disabled:opacity-50"
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
                        <div key={user.id} className="rounded-lg border-2 border-ink bg-muted p-5 shadow-brutal">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isCurrentUser}
                                onChange={() => toggleUserSelection(user.id)}
                                className="mt-1 h-4.5 w-4.5 rounded-md border-ink text-primary focus:ring-primary accent-primary"
                              />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-foreground text-sm">{user.email || 'No email registered'}</span>
                                  <span className={`${user.email_confirmed_at ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'} border-2 border-ink rounded px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide`}>
                                    {user.email_confirmed_at ? 'Verified' : 'Unconfirmed'}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {user.full_name || 'No custom display name set'} · <span className="font-mono bg-card border-2 border-ink px-1.5 py-0.2 rounded text-foreground">{user.role || 'authenticated'}</span>
                                </div>
                                <div className="mt-2 text-[10px] font-mono text-muted-foreground">
                                  Since {formatDate(user.created_at)}
                                  {user.last_sign_in_at ? ` · Last active session ${formatDate(user.last_sign_in_at)}` : ''}
                                </div>
                              </div>
                            </div>

                            {/* Stat indicators for each profile */}
                            <div className="grid gap-2 grid-cols-2 lg:w-[420px]">
                              {[
                                { label: 'Trips built', value: user.usage.trips_created, color: 'text-primary' },
                                { label: 'Shares launched', value: user.usage.shares_created, color: 'text-foreground' },
                                { label: 'Guest reviews', value: user.usage.suggestions_received, color: 'text-accent' },
                                { label: 'Active shares', value: user.usage.active_shares, color: 'text-foreground' },
                              ].map(metric => (
                                <div key={metric.label} className="rounded-md border-2 border-ink bg-card px-3.5 py-2">
                                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</div>
                                  <div className={`mt-0.5 text-base font-black ${metric.color}`}>{metric.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t-2 border-ink grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div className="text-[11px] text-muted-foreground">
                              Activity: {user.usage.last_activity_at ? formatDate(user.usage.last_activity_at) : 'No sessions tracked yet'}
                              {' · '}
                              Total API calls: <span className="font-bold text-foreground">{user.usage.total_actions}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={actionId === `user-${user.id}` || isCurrentUser}
                              className="rounded-md border-2 border-ink bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:-translate-y-0.5 transition-all disabled:opacity-50"
                            >
                              {actionId === `user-${user.id}` ? 'Pruning...' : isCurrentUser ? 'Active Superuser' : 'Prune client record'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-ink/40 bg-muted py-12 text-center text-xs text-muted-foreground">
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
                  <h2 className="text-title text-foreground">Traveler profile</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
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
