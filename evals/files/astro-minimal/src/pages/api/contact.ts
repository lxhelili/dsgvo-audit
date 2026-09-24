import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

// SMTP of the Hetzner-hosted mailbox (kontakt@tischlerei-beispiel.de)
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // mail.your-server.de
  port: 465,
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  if (data.get('website')) return new Response(null, { status: 204 }); // honeypot hit
  const name = String(data.get('name') || '').slice(0, 200);
  const email = String(data.get('email') || '').slice(0, 200);
  const message = String(data.get('message') || '').slice(0, 5000);

  await transport.sendMail({
    from: 'website@tischlerei-beispiel.de',
    replyTo: email,
    to: 'kontakt@tischlerei-beispiel.de',
    subject: `Kontaktanfrage von ${name}`,
    text: message,
  });
  return new Response(null, { status: 303, headers: { Location: '/kontakt/danke' } });
};
