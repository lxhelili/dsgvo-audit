import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const SYSTEM = `Du bist der Assistent der Steuerberatung Beispiel. Beantworte Fragen zu unseren Leistungen
und stufe die Anfrage ein: "einfach" (Standardfall), "komplex" (Rückruf durch Berater) oder "abgelehnt"
(passt nicht zu unserem Angebot). Antworte auf Deutsch.`

export async function POST(req: Request) {
  const { messages, sessionId } = await req.json()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: SYSTEM }, ...messages],
  })
  const answer = completion.choices[0].message.content ?? ''

  // full transcript kept for "quality review" — no TTL yet
  await supabase.from('chat_logs').insert({ session_id: sessionId, messages, answer, created_at: new Date().toISOString() })

  return Response.json({ answer })
}
