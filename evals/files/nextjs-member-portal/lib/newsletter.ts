import * as Brevo from '@getbrevo/brevo'

const contacts = new Brevo.ContactsApi()
contacts.setApiKey(Brevo.ContactsApiApiKeys.apiKey, process.env.BREVO_API_KEY!)
const mails = new Brevo.TransactionalEmailsApi()
mails.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!)

// called when the "Newsletter" checkbox on /konto is ticked
export async function subscribe(email: string, vorname: string) {
  await contacts.createContact({ email, attributes: { VORNAME: vorname }, listIds: [Number(process.env.BREVO_LIST_ID)] })
}

// monthly "Neue Kurse" mail, sent from an admin script to everyone with newsletter = true
export async function sendMonthly(to: { email: string; vorname: string }[], html: string) {
  for (const r of to) {
    await mails.sendTransacEmail({
      sender: { email: 'studio@yogastudio-beispiel.de', name: 'Yogastudio Beispiel' },
      to: [{ email: r.email }],
      subject: 'Neue Kurse im Studio',
      htmlContent: html.replace('{{vorname}}', r.vorname),
    })
  }
}
