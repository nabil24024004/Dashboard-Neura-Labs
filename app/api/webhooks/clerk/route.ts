import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { setDoc, deleteDoc } from '@/lib/firebase/db'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', { status: 400 })
  }

  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, first_name, last_name, email_addresses, image_url } = evt.data

    const primaryEmail = email_addresses?.length > 0 ? email_addresses[0].email_address : ''

    // Upsert user in Firestore using their Clerk ID as the document ID
    await setDoc('users', id, {
      email: primaryEmail,
      first_name: first_name ?? '',
      last_name: last_name ?? '',
      avatar_url: image_url ?? '',
    })

    console.log(`Successfully synced user ${id} to Firestore`)
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data
    if (id) {
      await deleteDoc('users', id)
      console.log(`Successfully deleted user ${id} from Firestore`)
    }
  }

  return new Response('', { status: 200 })
}
