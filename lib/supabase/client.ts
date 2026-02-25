import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseClient(supabaseToken: string) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseToken}`,
        },
      },
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // Empty implementation since auth is managed by Clerk
        },
      }
    }
  )
}
