import { createClient } from '@supabase/supabase-js'

// This admin client should ONLY be used in secure server environments (like API routes or Edge Functions).
// It bypasses all Row Level Security (RLS) policies.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
