import { expect, test, type Page } from '@playwright/test';

type Traveler = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  travel_style: 'solo' | 'couple' | 'group' | 'flexible' | null;
  is_public: boolean;
  verified: boolean;
  verification_provider: 'didit' | null;
  verification_level: 'unverified' | 'basic' | 'trusted' | 'high_trust';
  verification_status: 'not_started' | 'pending' | 'approved' | 'declined' | 'in_review' | 'expired' | 'abandoned' | 'resubmitted';
  verification_session_id: string | null;
  verification_requested_at: string | null;
  verified_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  signal_id: string;
  destination: string;
  destination_slug: string;
  travel_month: string | null;
  connection_status: 'none' | 'wave_sent' | 'wave_received' | 'connected' | 'blocked';
  is_self: boolean;
};

type Room = {
  id: string;
  created_by: string;
  destination: string;
  destination_slug: string;
  title: string | null;
  travel_month: string | null;
  max_members: number;
  is_open: boolean;
  member_count: number;
  is_member?: boolean;
  current_user_role?: 'host' | 'member' | null;
  created_at: string;
};

function installSupabaseMock(page: Page) {
  return page.addInitScript(() => {
    window.localStorage.setItem(
      'wayflo-cookie-consent',
      JSON.stringify({
        version: 1,
        consentedAt: new Date().toISOString(),
        preferences: {
          essential: true,
          analytics: true,
          personalization: true,
        },
      })
    );

    const listeners = new Set<(event: string, session: unknown) => void>();
    let session: {
      access_token: string;
      token_type: 'bearer';
      user: {
        id: string;
        email: string;
        email_confirmed_at: string;
        created_at: string;
        last_sign_in_at: string;
      };
    } | null = {
      access_token: 'access-e2e',
      token_type: 'bearer',
      user: {
        id: 'user-e2e',
        email: 'traveler@example.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
      },
    };
    let user: typeof session.user | null = session.user;

    const emit = (event: string) => {
      for (const listener of listeners) {
        listener(event, session);
      }
    };

    (window as Window & { __WAYFLO_SUPABASE_MOCK__?: unknown }).__WAYFLO_SUPABASE_MOCK__ = {
      auth: {
        async getSession() {
          return { data: { session }, error: null };
        },
        async getUser() {
          return { data: { user }, error: null };
        },
        async signInWithPassword({ email }: { email: string; password: string }) {
          const now = new Date().toISOString();
          user = {
            id: `user-${email}`,
            email,
            email_confirmed_at: now,
            created_at: now,
            last_sign_in_at: now,
          };
          session = {
            access_token: `access-${email}`,
            token_type: 'bearer',
            user,
          };
          emit('SIGNED_IN');

          return { data: { session, user }, error: null };
        },
        async signOut() {
          session = null;
          user = null;
          emit('SIGNED_OUT');

          return { error: null };
        },
        onAuthStateChange(callback: (event: string, session: unknown) => void) {
          listeners.add(callback);

          return {
            data: {
              subscription: {
                unsubscribe() {
                  listeners.delete(callback);
                },
              },
            },
          };
        },
      },
    };
  });
}

async function mockSignedInShell(page: Page) {
  await installSupabaseMock(page);

  await page.route('**/api/auth/me', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'user-e2e',
          email: 'traveler@example.com',
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        isAdmin: false,
      }),
    });
  });
}

const destinationPulses = [
  {
    destination: 'Bali',
    destination_slug: 'bali',
    traveler_count: 12,
    room_count: 3,
    travel_months: ['June 2026', 'July 2026'],
    recent_travelers: [
      { id: 't1', display_name: 'Maya', avatar_url: null, verified: true, verification_level: 'trusted' },
      { id: 't2', display_name: 'Noah', avatar_url: null, verified: false, verification_level: 'basic' },
    ],
  },
  {
    destination: 'Kyoto',
    destination_slug: 'kyoto',
    traveler_count: 8,
    room_count: 1,
    travel_months: ['May 2026'],
    recent_travelers: [
      { id: 't3', display_name: 'Ivy', avatar_url: null, verified: true, verification_level: 'trusted' },
    ],
  },
];

const travelers: Traveler[] = [
  {
    id: 't1',
    display_name: 'Maya',
    avatar_url: null,
    bio: 'Quiet coffee stops and early trains.',
    travel_style: 'solo',
    is_public: true,
    verified: true,
    verification_provider: 'didit',
    verification_level: 'trusted',
    verification_status: 'approved',
    verification_session_id: 'session-1',
    verification_requested_at: new Date().toISOString(),
    verified_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    signal_id: 'signal-1',
    destination: 'Bali',
    destination_slug: 'bali',
    travel_month: 'June 2026',
    connection_status: 'none',
    is_self: false,
  },
  {
    id: 't2',
    display_name: 'Noah',
    avatar_url: null,
    bio: 'Looking for easy-going room planning.',
    travel_style: 'flexible',
    is_public: true,
    verified: false,
    verification_provider: 'didit',
    verification_level: 'basic',
    verification_status: 'pending',
    verification_session_id: 'session-2',
    verification_requested_at: new Date().toISOString(),
    verified_at: null,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    signal_id: 'signal-2',
    destination: 'Bali',
    destination_slug: 'bali',
    travel_month: 'June 2026',
    connection_status: 'none',
    is_self: false,
  },
];

const rooms: Room[] = [
  {
    id: 'room-1',
    created_by: 't1',
    destination: 'Bali',
    destination_slug: 'bali',
    title: 'Week in Ubud',
    travel_month: 'June 2026',
    max_members: 6,
    is_open: true,
    member_count: 4,
    is_member: false,
    current_user_role: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'room-2',
    created_by: 't2',
    destination: 'Kyoto',
    destination_slug: 'kyoto',
    title: 'Temple + food crawl',
    travel_month: 'May 2026',
    max_members: 6,
    is_open: true,
    member_count: 2,
    is_member: true,
    current_user_role: 'member',
    created_at: new Date().toISOString(),
  },
];

test('home page surfaces live destination pulses', async ({ page }) => {
  await page.route('**/api/social/destinations**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(destinationPulses),
    });
  });

  await page.goto('/');

  await expect(page.getByText('Live social proof')).toBeVisible();
  await expect(page.getByText('12 travelers going')).toBeVisible();
  await expect(page.getByText('12 travelers going')).toBeVisible();
  await expect(page.getByRole('link', { name: /explore/i }).first()).toBeVisible();
});

test('explore page shows travelers and can open the room modal', async ({ page }) => {
  await mockSignedInShell(page);

  await page.route('**/api/social/destinations**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(destinationPulses),
    });
  });

  await page.route('**/api/social/companions**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(travelers),
    });
  });

  await page.goto('/explore');

  await expect(page.getByRole('heading', { name: 'Live travel clusters' })).toBeVisible();
  await expect(page.getByText('Maya')).toBeVisible();
  await expect(page.getByText('Noah')).toBeVisible();
  await expect(page.getByText('12 travelers going')).toBeVisible();
  await expect(page.getByText('Trusted traveler')).toBeVisible();
  await expect(page.getByText('In review')).toBeVisible();

  await page.getByRole('button', { name: 'Start a room' }).first().click();
  await expect(page.getByRole('heading', { name: 'Start a trip room' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('destination page groups travelers and rooms for one place', async ({ page }) => {
  await mockSignedInShell(page);

  await page.route('**/api/social/companions**', route => {
    const url = new URL(route.request().url());
    const destination = url.searchParams.get('destination');
    const payload = destination === 'bali' ? travelers : [];

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });

  await page.route('**/api/social/rooms**', route => {
    const url = new URL(route.request().url());
    const destination = url.searchParams.get('destination');
    const payload = destination === 'bali' ? [rooms[0]] : [];

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });

  await page.goto('/explore/bali');

  await expect(page.getByRole('heading', { name: 'Bali' })).toBeVisible();
  await expect(page.getByText('Travelers (2)')).toBeVisible();
  await expect(page.getByText('Trip Rooms (1)')).toBeVisible();
  await expect(page.getByText('Week in Ubud')).toBeVisible();
});

test('rooms hub lists the traveler rooms', async ({ page }) => {
  await mockSignedInShell(page);

  await page.route('**/api/social/rooms/mine**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rooms),
    });
  });

  await page.goto('/rooms');

  await expect(page.getByText('Your trip rooms')).toBeVisible();
  await expect(page.getByText('Rooms joined')).toBeVisible();
  await expect(page.getByText('Week in Ubud')).toBeVisible();
  await expect(page.getByText('Temple + food crawl')).toBeVisible();
});

test('community settings page starts the Didit verification flow', async ({ page }) => {
  await mockSignedInShell(page);

  await page.route('**/api/trips**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ trips: [] }),
    });
  });

  await page.route('**/api/social/profile', route => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-e2e',
          display_name: 'Jordan',
          avatar_url: null,
          bio: 'I like scenic trains.',
          travel_style: 'solo',
          is_public: true,
          verified: false,
          verification_provider: null,
          verification_level: 'unverified',
          verification_status: 'not_started',
          verification_session_id: null,
          verification_requested_at: null,
          verified_at: null,
          last_seen_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }),
      });
      return;
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-e2e',
        display_name: 'Jordan',
        avatar_url: null,
        bio: 'I like scenic trains.',
        travel_style: 'solo',
        is_public: true,
        verified: false,
        verification_provider: null,
        verification_level: 'unverified',
        verification_status: 'not_started',
        verification_session_id: null,
        verification_requested_at: null,
        verified_at: null,
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }),
    });
  });

  await page.route('**/api/social/signals**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/social/messages**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/social/verification/didit/session', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: 'didit-session-1',
        sessionUrl: '/dashboard/community?didit-session=mock',
        status: 'Not Started',
      }),
    });
  });

  await page.goto('/dashboard/community');

  await expect(page.getByText('Identity verification')).toBeVisible();
  await expect(page.getByLabel('Verification status: Not started')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start with Didit' })).toBeVisible();

  await page.getByRole('button', { name: 'Start with Didit' }).click();
  await page.waitForURL(/didit-session=mock/);
});
