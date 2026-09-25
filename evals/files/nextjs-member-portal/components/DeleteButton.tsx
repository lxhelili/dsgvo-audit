'use client'
export function DeleteButton() {
  async function del() {
    if (!confirm('Konto wirklich löschen? Alle Daten werden unwiderruflich entfernt.')) return
    await fetch('/api/account/delete', { method: 'POST' })
    location.href = '/'
  }
  return <button onClick={del} className="danger">Konto löschen</button>
}
