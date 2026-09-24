import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const body = await req.json() // { name, email, phone, message, utm_source }
  console.log('contact request', body)

  try {
    await resend.emails.send({
      from: 'website@beispiel-agentur.de',
      to: 'info@beispiel-agentur.de',
      subject: `Anfrage von ${body.name}`,
      text: `${body.name} <${body.email}> ${body.phone}\n\n${body.message}\n\nQuelle: ${body.utm_source}`,
    })
  } catch (e) {
    Sentry.captureException(e, { extra: { body } })
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
