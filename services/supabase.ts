import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

let instance: ReturnType<typeof createClient> | null = null

function initializeClient(): ReturnType<typeof createClient> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  if (!instance) {
    instance = createClient(supabaseUrl, supabaseKey)
  }
  return instance
}

// Lazy-load supabase on first property access to support unit tests
// that import modules referencing this file without env vars.
export const supabase = new Proxy<ReturnType<typeof createClient>>(
  {} as any,
  {
    get(_target, prop) {
      return (initializeClient() as any)[prop]
    },
  }
)
