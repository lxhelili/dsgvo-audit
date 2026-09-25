import * as Sentry from '@sentry/nextjs'
import { CookieBanner } from '@/components/CookieBanner'
import { createServerClient } from '@/lib/supabase-server'

Sentry.init({ dsn: process.env.SENTRY_DSN, sendDefaultPii: true })

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) Sentry.setUser({ id: user.id, email: user.email })

  return (
    <html lang="de">
      <body>
        {children}
        <CookieBanner />
        <footer>
          <a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a>
        </footer>
      </body>
    </html>
  )
}
