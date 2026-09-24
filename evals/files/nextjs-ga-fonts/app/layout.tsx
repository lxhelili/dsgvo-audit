import Script from 'next/script'
import './globals.css'

export const metadata = { title: 'Beispiel Agentur GmbH' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
        {/* GA4 — set up by the previous agency, "just leave it" */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-EXAMPLE123" strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-EXAMPLE123');
        `}</Script>
      </head>
      <body>
        {children}
        <footer>
          <a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a> ·{' '}
          <a href="https://ec.europa.eu/consumers/odr">Online-Streitbeilegung</a>
        </footer>
      </body>
    </html>
  )
}
