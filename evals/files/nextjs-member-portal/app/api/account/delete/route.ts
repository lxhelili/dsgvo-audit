import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// "Konto löschen" button on /konto
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // cascades to bookings + invoices
  const { error } = await admin.from('profiles').delete().eq('id', user.id)
  if (error) return new Response(error.message, { status: 500 })

  await supabase.auth.signOut()
  return Response.json({ ok: true })
}
