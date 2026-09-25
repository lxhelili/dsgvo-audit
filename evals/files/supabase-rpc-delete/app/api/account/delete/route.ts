import { createServerClient } from '@/lib/supabase-server'

// "Konto löschen" on /konto
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  await supabase.storage.from('avatars').remove([`${user.id}.jpg`])

  const { error } = await supabase.rpc('delete_my_account')
  if (error) return new Response('Löschen fehlgeschlagen', { status: 500 })

  await supabase.auth.signOut()
  return Response.json({ ok: true })
}
