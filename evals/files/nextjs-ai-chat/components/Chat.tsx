'use client'
import { useState } from 'react'

export function Chat() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const sessionId = typeof window !== 'undefined' ? (localStorage.getItem('chat-session') ?? crypto.randomUUID()) : ''

  async function send() {
    localStorage.setItem('chat-session', sessionId)
    const next = [...messages, { role: 'user' as const, content: input }]
    setMessages(next); setInput('')
    const r = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ messages: next, sessionId }) })
    const { answer } = await r.json()
    setMessages([...next, { role: 'assistant', content: answer }])
  }

  return (
    <div className="chat">
      <div className="chat-header">Fragen? Unser Team antwortet sofort.</div>
      {messages.map((m, i) => <p key={i} className={m.role}>{m.content}</p>)}
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ihre Frage, z. B. zu Ihrer Steuersituation …" />
      <button onClick={send}>Senden</button>
    </div>
  )
}
