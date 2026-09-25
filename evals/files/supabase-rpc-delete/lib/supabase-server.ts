import { createServerClient as create } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const store = await cookies()
  return create(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => store.set(name, value, options)) },
  })
}
