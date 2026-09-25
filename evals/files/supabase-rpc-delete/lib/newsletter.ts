import * as Brevo from '@getbrevo/brevo'

const contacts = new Brevo.ContactsApi()
contacts.setApiKey(Brevo.ContactsApiApiKeys.apiKey, process.env.BREVO_API_KEY!)

// Double opt-in: Brevo sends the confirmation mail; the contact joins the list only after the click.
// Every campaign mail from Brevo carries the unsubscribe link and List-Unsubscribe header.
export async function subscribe(email: string, vorname: string) {
  await contacts.createDoiContact({
    email,
    attributes: { VORNAME: vorname },
    includeListIds: [Number(process.env.BREVO_LIST_ID)],
    templateId: Number(process.env.BREVO_DOI_TEMPLATE_ID),
    redirectionUrl: 'https://sprachschule-beispiel.de/newsletter/bestaetigt',
  })
}
