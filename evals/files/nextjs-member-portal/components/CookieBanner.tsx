'use client'
import { useEffect, useState } from 'react'
import Script from 'next/script'

// Meta Pixel for the "Probestunde" campaign
export function CookieBanner() {
  const [consent, setConsent] = useState<'all' | 'necessary' | null>(null)
  useEffect(() => { setConsent(localStorage.getItem('consent') as any) }, [])

  function choose(v: 'all' | 'necessary') { localStorage.setItem('consent', v); setConsent(v) }

  return (
    <>
      {consent === 'all' && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){/* fbevents.js */}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','000000000000000');fbq('track','PageView');`}</Script>
      )}
      {consent === null && (
        <div className="banner">
          <p>Wir nutzen Cookies für Marketing (Meta Pixel).</p>
          <button onClick={() => choose('necessary')}>Nur notwendige</button>
          <button onClick={() => choose('all')}>Alle akzeptieren</button>
        </div>
      )}
    </>
  )
}
