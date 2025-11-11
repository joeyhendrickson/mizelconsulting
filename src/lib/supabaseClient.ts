import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  ''

const missingSupabaseProxy = new Proxy(
  {},
  {
    get() {
      throw new Error(
        'Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      )
    }
  }
) as SupabaseClient

const isConfigured = Boolean(supabaseUrl && supabaseKey)

if (!isConfigured) {
  console.warn(
    'Supabase environment variables are not fully configured. Some features may be unavailable.'
  )
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : missingSupabaseProxy

export const supabaseConfigured = isConfigured