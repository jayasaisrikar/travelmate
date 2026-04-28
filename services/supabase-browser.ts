import { createClient } from '@supabase/supabase-js';

let supabaseBrowserClient: ReturnType<typeof createClient> | null = null;

type SupabaseBrowserMock = any;

export function getSupabaseBrowser(): ReturnType<typeof createClient> {
  if (typeof window !== 'undefined') {
    const maybeMock = (window as Window & { __WAYFLO_SUPABASE_MOCK__?: SupabaseBrowserMock })
      .__WAYFLO_SUPABASE_MOCK__;

    if (maybeMock) {
      return maybeMock;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing browser Supabase environment variables');
  }

  if (!supabaseBrowserClient) {
    supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseBrowserClient;
}
