# Consent-Gating & Self-Hosting — generische Prinzipien, dann Framework-Beispiele

Die Prinzipien gelten für jeden Stack. Die Beispiele sind Illustrationen, nicht die Regel — ein Muster, das die Prinzipien erfüllt, ist konform, egal in welchem Framework.

## Die sieben Prinzipien

1. **Gate den Load, nicht die Nutzung.** Ein Script, das geladen und dann per `consent: denied` „stillgelegt“ wird, hat den Request an den Drittanbieter schon gemacht — IP, User-Agent, Referrer sind übertragen. Der Tag existiert im DOM erst nach der Einwilligung.
2. **Ein Consent-State, eine Quelle der Wahrheit.** Ein Speicherort (First-Party-Cookie oder localStorage — selbst technisch notwendig nach § 25 Abs. 2 Nr. 2 TDDDG), versioniert, mit Zeitstempel und Zwecken (`{ v: 3, ts, statistics: false, marketing: false, external: false }`). Jeder Loader abonniert diesen State; niemand liest ihn „einmal beim Start“.
3. **Nichts Fremdes in der statischen Hülle.** `index.html`, Root-Layout, `<head>`: nur eigener Origin und ggf. das CMP (self-hosted oder EU). Kein `preconnect`/`dns-prefetch` zu Dritten — auch das ist eine Verbindung.
4. **Widerruf ist ein Zustandswechsel, kein Reload-Hack — aber ehrlich.** Nach Widerruf: keine neuen Loads, Consent-Cookie aktualisiert, ggf. Cookies des Dienstes löschen (soweit First-Party). Bereits geladene Scripts lassen sich nicht entladen → nach Widerruf Seite neu laden und das im UI sagen.
5. **Assets kommen vom eigenen Origin.** Fonts, Icons, CSS, JS: `npm install` + Bundling oder `.woff2` im Repo. Lizenz prüfen (Google Fonts: OFL, self-hosting erlaubt; Adobe Fonts: nicht).
6. **Embeds sind Zwei-Klick.** Platzhalter (Vorschaubild + Text „Beim Laden werden Daten an *Anbieter, Land* übertragen“ + Button). Der Klick ist die Einwilligung für **dieses** Embed — optional „immer erlauben“ als Zweck im Consent-State.
7. **Verifizieren, nicht glauben.** Nach jeder Änderung `scripts/scan-origins.mjs` laufen lassen: null fremde Origins vor Consent, null neue nach „Ablehnen“. Was der Scan nicht sieht (GTM-Container, Unterseiten), separat prüfen.

Anti-Patterns, die immer wieder auftauchen: Script im `<head>` + `gtag('consent','default',{…denied})` (Prinzip 1 verletzt); CMP von einem US-CDN geladen (Prinzip 3); Consent nur in React-State ohne Persistenz (Prinzip 2 — jeder Reload fragt neu, und SSR weiß nichts davon); `youtube-nocookie.com` ohne Platzhalter (Prinzip 6 — lädt trotzdem von Google); Fonts über `@import url(...)` in einer SCSS-Datei, die niemand mehr liest (Prinzip 5 — grep findet es).

---

## Beispiele

### Plain HTML / beliebiges Framework — das Typ-Umschalt-Muster

Funktioniert überall, weil der Browser `type="text/plain"` nicht ausführt:

```html
<script type="text/plain" data-consent="statistics" data-src="https://analytics.example.de/script.js"></script>
<script>
  // Loader — läuft first-party, liest den Consent-State, aktiviert freigegebene Scripts
  function applyConsent(state) {
    document.querySelectorAll('script[type="text/plain"][data-consent]').forEach((el) => {
      if (!state[el.dataset.consent]) return;
      const s = document.createElement('script');
      s.src = el.dataset.src; s.defer = true;
      el.replaceWith(s);            // einmalig; nach Widerruf: location.reload()
    });
  }
  window.addEventListener('consentchange', (e) => applyConsent(e.detail));
  applyConsent(JSON.parse(localStorage.getItem('consent') || '{}'));
</script>
```

### Next.js (App Router)

```tsx
// components/Analytics.tsx — Client Component; gerendert wird nichts, solange kein Consent
'use client'
import Script from 'next/script'
import { useConsent } from '@/lib/consent'   // liest/abonniert den Consent-Cookie

export function Analytics() {
  const { statistics } = useConsent()
  if (!statistics) return null              // kein Script-Tag im DOM = kein Request
  return <Script src="https://analytics.example.de/script.js" strategy="afterInteractive" />
}
```

Fonts: `next/font/google` lädt **zur Buildzeit** und liefert vom eigenen Origin — konform (der Build-Server kontaktiert Google, der Nutzer nicht). Ein `<link href="https://fonts.googleapis.com/…">` im Layout ist es nicht; beides im Repo prüfen. Ohne Google-Kontakt auch beim Build: `next/font/local` mit `.woff2` im Repo.

Server Actions / Route Handler: jeder Handler, der Formulardaten annimmt, ist ein Hop in `architecture.md` — `console.log(body)` in Produktion ist PII im Log (🟠).

Consent-Cookie statt localStorage, wenn SSR den Zustand kennen soll (z. B. um Embeds serverseitig als Platzhalter zu rendern).

### Angular (Signals, v17+)

```ts
// consent.service.ts
import { Injectable, Injector, effect, inject, signal } from '@angular/core';

type Consent = { statistics: boolean; marketing: boolean; external: boolean };

@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly injector = inject(Injector);
  readonly categories = signal<Consent>(this.restore());

  loadWhen(cat: keyof Consent, loader: () => void) {
    // effect() braucht einen Injection-Context — außerhalb von Konstruktoren den Injector mitgeben
    let done = false;
    effect(() => {
      if (!done && this.categories()[cat]) { done = true; loader(); }
    }, { injector: this.injector });
  }

  update(patch: Partial<Consent>) {
    const next = { ...this.categories(), ...patch };
    this.categories.set(next);
    localStorage.setItem('consent', JSON.stringify({ v: 1, ts: Date.now(), ...next }));
  }

  private restore(): Consent {
    try { const s = JSON.parse(localStorage.getItem('consent') ?? 'null'); return s ?? { statistics: false, marketing: false, external: false }; }
    catch { return { statistics: false, marketing: false, external: false }; }
  }
}
```

Kein Third-Party-Script in `index.html` — von dort kann kein Gate blockieren. Fonts: `.woff2` unter `src/assets/fonts` + `@font-face` mit `font-display: swap`, in `angular.json` → `styles`; kein `@import url(https://fonts.googleapis.com/…)`.

### Astro

```astro
---
// src/components/Analytics.astro — Server rendert nur die Hülle, der Client entscheidet
---
<script>
  import { onConsent } from '../lib/consent';   // gebündelt, first-party
  onConsent('statistics', () => {
    const s = document.createElement('script');
    s.src = 'https://analytics.example.de/script.js'; s.defer = true;
    document.head.appendChild(s);
  });
</script>
```

Fonts: `@fontsource/<font>` importieren oder `.woff2` unter `public/fonts` + `@font-face`. Astro-spezifisch prüfen: `<script is:inline>` umgeht das Bundling — dort landen gern Analytics-Snippets; `<link rel="preconnect">` in `Layout.astro`; Integrationen wie `@astrojs/partytown` (verlagert Third-Party-Scripts in einen Worker — **ändert nichts** an der Rechtslage, der Request geht trotzdem raus).

### WordPress / CMS

Kein eigener Code-Pfad: CMP-Plugin (Borlabs, Real Cookie Banner, Complianz) mit Script-Blocking **und** Content-Blocking für Embeds; Fonts über Theme-Option „lokal laden“ oder Plugin; jedes Plugin mit externem Call in der DSE. Der Scanner ist hier das wichtigste Werkzeug, weil Plugins Scripts injizieren, die im Theme nicht sichtbar sind.

---

## Ergänzende Muster

### Consent Mode v2 (nur wenn Google unvermeidbar)
Default **vor** jedem Google-Snippet, und das Snippet selbst erst nach Consent laden (Prinzip 1 gilt weiter):
```js
gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied',
  ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
```
Consent Mode ersetzt **keine** Einwilligung — es ist die Übersetzung der Bannerentscheidung für Google.

### Zwei-Klick-Embed
Platzhalter = statisches Bild (self-hosted) + Text mit Empfänger und Drittland + Button. Iframe erst nach Klick, YouTube über `youtube-nocookie.com`, Vimeo mit `dnt=1`, Maps ggf. durch statisches Bild + Link ersetzen.

### Region-Pinning (Vercel)
```json
// vercel.json — Serverless Functions nach Frankfurt; Edge Middleware läuft weiterhin global
{ "regions": ["fra1"] }
```
Edge/Middleware in der DSE als weltweit verteilte Verarbeitung benennen oder auf Node-Runtime umstellen.

### Supabase
Projekt-Region `eu-central-1` bei Anlage wählen (nachträglich nur per Migration); RLS auf **jeder** Tabelle mit PII; `service_role`-Key nie im Client; Storage-Buckets privat + signierte URLs; `auth.users`/Auth-Logs (IP) in DSE nennen; Löschkonzept per Cron/Edge-Function (z. B. Kontaktanfragen nach 6 Monaten).

### Formulare ohne reCAPTCHA
Honeypot-Feld + Zeitfalle (< 2 s = Bot) + serverseitiges Rate-Limit deckt den Großteil ab. Reicht das nicht: Friendly Captcha (EU) → Turnstile (US-Konzern, AVV + DSE) → hCaptcha (Consent).

### Security-Header
```js
// Beispiel Next.js — analog in netlify.toml, vercel.json, nginx, .htaccess
headers: async () => [{ source: '/(.*)', headers: [
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'" },
]}]
```
CSP ist zusätzlich das beste technische Netz gegen versehentliche Third-Party-Calls — `font-src 'self'` macht den nächsten Google-Fonts-Unfall unmöglich. Mit `Content-Security-Policy-Report-Only` anfangen, Verstöße sammeln, dann scharf schalten.
