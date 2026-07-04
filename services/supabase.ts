import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

function makeClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, supabaseKey)
}

type SupabaseClientInstance = ReturnType<typeof makeClient>

let instance: SupabaseClientInstance | null = null

function initializeClient(): SupabaseClientInstance {
  if (!instance) {
    instance = makeClient()
  }
  return instance
}

// Lazy-load supabase on first property access so unit tests can import
// modules that reference this file without Supabase env vars. Methods are
// bound to the real client so destructured calls keep their `this`.
export const supabase = new Proxy<SupabaseClientInstance>({} as SupabaseClientInstance, {
  get(_target, prop) {
    const client = initializeClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
})
