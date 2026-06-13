import { test, type Page, type Route } from '@playwright/test';
import path from 'node:path';

/**
 * Theme A/B screenshot suite.
 *
 * Renders each key route and saves a full-page screenshot to
 *   screenshots/<WAYFLO_VARIANT>/<name>.png
 *
 * The runner (scripts/visual-ab.mjs) executes this twice — once on the current
 * working tree (sunset) and once on a git-stashed HEAD (indigo) — then builds a
 * side-by-side compare.html. This spec is intentionally self-contained (mirrors
 * the mocks in tests/e2e/social.spec.ts) so it keeps working when the app code
 * is stashed back to the old theme.
 */

const VARIANT = process.env.WAYFLO_VARIANT || 'current';
const OUT_DIR = path.join(process.cwd(), 'screenshots', VARIANT);

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
  // framer-motion respects reduced motion -> renders final states, not opacity:0
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function shot(page: Page, name: string) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(700); // let any entrance settle
  await page.screenshot({
    path: path.join(OUT_DIR, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

/** Cookie consent only — keeps the consent modal from covering screenshots. */
function setConsent(page: Page) {
  return page.addInitScript(() => {
    window.localStorage.setItem(
      'wayflo-cookie-consent',
      JSON.stringify({
        version: 1,
        consentedAt: new Date().toISOString(),
        preferences: { essential: true, analytics: true, personalization: true },
      })
    );
  });
}

/** Consent + a faked signed-in Supabase session (for app pages). */
function installSignedIn(page: Page) {
  return page.addInitScript(() => {
    window.localStorage.setItem(
      'wayflo-cookie-consent',
      JSON.stringify({
        version: 1,
        consentedAt: new Date().toISOString(),
        preferences: { essential: true, analytics: true, personalization: true },
      })
    );

    const now = new Date().toISOString();
    const session = {
      access_token: 'access-visual',
      token_type: 'bearer',
      user: {
        id: 'user-visual',
        email: 'traveler@example.com',
        email_confirmed_at: now,
        created_at: now,
        last_sign_in_at: now,
      },
    };
    (window as Window & { __WAYFLO_SUPABASE_MOCK__?: unknown }).__WAYFLO_SUPABASE_MOCK__ = {
      auth: {
        async getSession() {
          return { data: { session }, error: null };
        },
        async getUser() {
          return { data: { user: session.user }, error: null };
        },
        async signOut() {
          return { error: null };
        },
        onAuthStateChange() {
          return { data: { subscription: { unsubscribe() {} } } };
        },
      },
    };
  });
}

async function mockMe(page: Page) {
  await page.route('**/api/auth/me', route =>
    json(route, {
      user: {
        id: 'user-visual',
        email: 'traveler@example.com',
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      isAdmin: false,
    })
  );
}

// ---- fixtures -------------------------------------------------------------
const iso = new Date().toISOString();

const destinationPulses = [
  { destination: 'Bali', destination_slug: 'bali', traveler_count: 12, room_count: 3, travel_months: ['June 2026', 'July 2026'], recent_travelers: [{ id: 't1', display_name: 'Maya', avatar_url: null, verified: true, verification_level: 'trusted' }, { id: 't2', display_name: 'Noah', avatar_url: null, verified: false, verification_level: 'basic' }] },
  { destination: 'Kyoto', destination_slug: 'kyoto', traveler_count: 8, room_count: 1, travel_months: ['May 2026'], recent_travelers: [{ id: 't3', display_name: 'Ivy', avatar_url: null, verified: true, verification_level: 'trusted' }] },
  { destination: 'Lisbon', destination_slug: 'lisbon', traveler_count: 6, room_count: 2, travel_months: ['August 2026'], recent_travelers: [{ id: 't4', display_name: 'Theo', avatar_url: null, verified: true, verification_level: 'basic' }] },
];

const traveler = (over: Record<string, unknown>) => ({
  id: 't1', display_name: 'Maya', avatar_url: null, bio: 'Quiet coffee stops and early trains.',
  travel_style: 'solo', interests: ['food', 'slow travel'], languages: ['english'],
  budget_preference: 'moderate', pace_preference: 'slow', is_public: true, verified: true,
  verification_provider: 'didit', verification_level: 'trusted', verification_status: 'approved',
  verification_session_id: 's1', verification_requested_at: iso, verified_at: iso, last_seen_at: iso,
  created_at: iso, signal_id: 'sig1', destination: 'Bali', destination_slug: 'bali',
  travel_month: 'June 2026', connection_status: 'none', match_score: 84,
  match_reasons: ["You're both heading to Bali", 'Shared interests: food, slow travel'], is_self: false,
  ...over,
});

const travelers = [
  traveler({}),
  traveler({ id: 't2', display_name: 'Noah', bio: 'Looking for easy-going room planning.', verified: false, verification_level: 'basic', match_score: 61, match_reasons: ["You're both heading to Bali", 'Shared interests: food'] }),
  traveler({ id: 't3', display_name: 'Ivy', bio: 'Temples, ramen, slow mornings.', destination: 'Kyoto', destination_slug: 'kyoto', match_score: 73 }),
];

const rooms = [
  { id: 'room-1', created_by: 't1', destination: 'Bali', destination_slug: 'bali', title: 'Week in Ubud', travel_month: 'June 2026', max_members: 6, is_open: true, member_count: 4, is_member: false, current_user_role: null, created_at: iso },
  { id: 'room-2', created_by: 't2', destination: 'Kyoto', destination_slug: 'kyoto', title: 'Temple + food crawl', travel_month: 'May 2026', max_members: 6, is_open: true, member_count: 2, is_member: true, current_user_role: 'member', created_at: iso },
];

const trips = [
  { id: 'trip-1', destination: 'Bali, Indonesia', duration: 5, budget: 'Comfort', interests: ['food', 'nature'], cover_image_url: null, created_at: iso, updated_at: iso },
  { id: 'trip-2', destination: 'Kyoto, Japan', duration: 7, budget: 'Moderate', interests: ['temples', 'food'], cover_image_url: null, created_at: iso, updated_at: iso },
];

const profile = {
  id: 'user-visual', display_name: 'Jordan', avatar_url: null, bio: 'I like scenic trains.',
  travel_style: 'solo', is_public: true, verified: false, verification_provider: null,
  verification_level: 'unverified', verification_status: 'not_started', verification_session_id: null,
  verification_requested_at: null, verified_at: null, last_seen_at: iso, created_at: iso,
};

const minimalItinerary = {
  title: 'Bali trip', destination: 'Bali, Indonesia', duration: 5, stay: null, transfers: [],
  dailyPlans: [], daily_plans: [], totalEstimatedCost: 0, total_estimated_cost: 0,
  budgetBreakdown: {}, budget_breakdown: {}, tips: [],
  sourceData: { destination: { name: 'Bali', country: 'Indonesia' }, weather: null, pois: [], stayCandidates: [] },
};

// ---- screenshots ----------------------------------------------------------
test.describe.configure({ mode: 'serial' });

test('landing', async ({ page }) => {
  await setConsent(page);
  await page.route('**/api/social/destinations**', r => json(r, destinationPulses));
  await page.goto('/');
  // scroll through so whileInView reveal sections trigger (once:true keeps them shown)
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await shot(page, '01-landing');
});

test('login', async ({ page }) => {
  await setConsent(page);
  await page.goto('/login');
  await shot(page, '02-login');
});

test('signup', async ({ page }) => {
  await setConsent(page);
  await page.goto('/signup');
  await shot(page, '03-signup');
});

test('explore', async ({ page }) => {
  await installSignedIn(page);
  await mockMe(page);
  await page.route('**/api/social/destinations**', r => json(r, destinationPulses));
  await page.route('**/api/social/companions**', r => json(r, travelers));
  await page.route('**/api/social/rooms**', r => json(r, rooms));
  await page.goto('/explore');
  await shot(page, '04-explore');
});

test('destination', async ({ page }) => {
  await installSignedIn(page);
  await mockMe(page);
  await page.route('**/api/social/companions**', r => json(r, travelers.filter(t => t.destination_slug === 'bali')));
  await page.route('**/api/social/rooms**', r => json(r, rooms.filter(r2 => r2.destination_slug === 'bali')));
  await page.goto('/explore/bali');
  await shot(page, '05-destination');
});

test('rooms', async ({ page }) => {
  await installSignedIn(page);
  await mockMe(page);
  await page.route('**/api/social/rooms/mine**', r => json(r, rooms.filter(r2 => r2.is_member)));
  await page.route('**/api/social/rooms**', r => json(r, rooms));
  await page.goto('/rooms');
  await shot(page, '06-rooms');
});

test('dashboard', async ({ page }) => {
  await installSignedIn(page);
  await mockMe(page);
  await page.route('**/api/trips**', r => json(r, { trips }));
  await page.route('**/api/social/companions**', r => json(r, travelers));
  await page.goto('/dashboard');
  await shot(page, '07-dashboard');
});

test('community', async ({ page }) => {
  await installSignedIn(page);
  await mockMe(page);
  await page.route('**/api/trips**', r => json(r, { trips: [] }));
  await page.route('**/api/social/profile', r => json(r, profile));
  await page.route('**/api/social/signals**', r => json(r, []));
  await page.route('**/api/social/messages**', r => json(r, []));
  await page.route('**/api/social/requests', r => json(r, { incoming: [], outgoing: [] }));
  await page.goto('/dashboard/community');
  await shot(page, '08-community');
});

test('trip-detail', async ({ page }) => {
  await installSignedIn(page);
  await mockMe(page);
  await page.route('**/api/trips/trip-1**', r =>
    json(r, {
      trip: { id: 'trip-1', user_id: 'user-visual', destination: 'Bali, Indonesia', duration: 5, budget: 'Comfort', interests: ['food', 'nature'], itinerary: minimalItinerary, cover_image_url: null, created_at: iso, updated_at: iso },
      share: null,
      shareUrl: null,
    })
  );
  await page.route('**/api/trips/trip-1/suggestions**', r => json(r, { suggestions: [] }));
  await page.goto('/trip/trip-1');
  await shot(page, '09-trip-detail');
});

test('share-pass', async ({ page }) => {
  await installSignedIn(page);
  await mockMe(page);
  // trip load returns an existing share link so the modal generates the pass
  // immediately (no createTripShare round-trip needed).
  await page.route('**/api/trips/trip-1/suggestions**', route => json(route, { suggestions: [] }));
  await page.route('**/api/trips/trip-1**', route =>
    json(route, {
      trip: { id: 'trip-1', user_id: 'user-visual', destination: 'Bali, Indonesia', duration: 5, budget: 'Comfort', interests: ['food'], itinerary: minimalItinerary, cover_image_url: null, created_at: iso, updated_at: iso },
      share: { token: 'demo123' },
      shareUrl: 'http://127.0.0.1:3000/share/demo123',
    })
  );
  await page.goto('/trip/trip-1');
  await page.getByRole('button', { name: 'Share trip' }).first().click();
  await page.getByRole('img', { name: /boarding pass/i }).waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, '11-share-pass.png'), fullPage: false, animations: 'disabled' });
});

test('legal', async ({ page }) => {
  await setConsent(page);
  await page.goto('/privacy-policy');
  await shot(page, '10-privacy');
});
