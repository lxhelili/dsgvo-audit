import { createServerClient } from '@/lib/supabase-server'
import { DeleteButton } from '@/components/DeleteButton'

export default async function Konto() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: p } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  return (
    <main>
      <h1>Mein Konto</h1>
      <form action="/api/profile" method="POST">
        <label>Vorname <input name="vorname" defaultValue={p.vorname} /></label>
        <label>Nachname <input name="nachname" defaultValue={p.nachname} /></label>
        <label>Telefon <input name="telefon" defaultValue={p.telefon ?? ''} /></label>
        <label>Geburtsdatum <input type="date" name="geburtsdatum" defaultValue={p.geburtsdatum ?? ''} /></label>
        <label>Gibt es etwas, das deine Lehrerin wissen sollte? (Verletzungen, Schwangerschaft …)
          <textarea name="gesundheitshinweise" defaultValue={p.gesundheitshinweise ?? ''} />
        </label>
        <label>Profilbild <input type="file" name="avatar" accept="image/*" /></label>
        <label><input type="checkbox" name="newsletter" defaultChecked={p.newsletter} /> Newsletter „Neue Kurse“</label>
        <button>Speichern</button>
      </form>
      <DeleteButton />
    </main>
  )
}
