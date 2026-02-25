import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// We use the service role key to bypass RLS when acting locally from our secure webhook
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, first_name, last_name, email_addresses, image_url } = evt.data
    
    const primaryEmail = email_addresses?.length > 0 ? email_addresses[0].email_address : ''

    // Init Supabase Service Role client to write to the database
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    
    // Insert or update the user in the database
    const { error } = await supabase
      .from('users')
      .upsert({
        id: id,
        email: primaryEmail,
        first_name: first_name ?? '',
        last_name: last_name ?? '',
        avatar_url: image_url ?? ''
      }, {
        onConflict: 'id'
      })

    if (error) {
      console.error('Error syncing user to Supabase:', error)
      return new Response('Error syncing user to Supabase', { status: 500 })
    }
    
    console.log(`Successfully synced user ${id} to Supabase`)
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    
    // Delete the user from the database
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
       console.error('Error deleting user from Supabase:', error)
       return new Response('Error deleting user from Supabase', { status: 500 })
    }
  }

  return new Response('', { status: 200 })
}
