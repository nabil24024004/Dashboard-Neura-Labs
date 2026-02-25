import { createServerClient } from '@supabase/ssr'
import { auth } from '@clerk/nextjs/server'

export async function createClient() {
  const { getToken } = await auth()
  
  // Obtain the JWT token from Clerk configured with the 'supabase' JWT template
  const supabaseToken = await getToken({ template: 'supabase' })

  return createServerClient(
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
      },
    }
  )
}
