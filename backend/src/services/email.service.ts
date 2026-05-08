/**
 * Email delivery layer.
 *
 * Three transports:
 *   - 'console'  (default in dev): logs the email to stdout — never sends.
 *   - 'resend':  uses RESEND_API_KEY; ideal for prod.
 *   - 'smtp':    uses nodemailer + SMTP_* envs; works with any provider.
 *
 * Pick via EMAIL_TRANSPORT env var. Failures are logged but never throw —
 * notifications are best-effort, the app keeps running if delivery fails.
 *
 * Usage:
 *   await sendEmail({ to: 'sarah@campus.edu', template: 'invoiceCreated', data: {...} });
 */

import { templates, EmailTemplateName, EmailTemplateData } from './email.templates';

const TRANSPORT = (process.env.EMAIL_TRANSPORT ?? 'console') as 'console' | 'resend' | 'smtp';
const FROM      = process.env.EMAIL_FROM ?? 'ResiHub <no-reply@resihub.co>';

interface SendArgs<K extends EmailTemplateName> {
  to:       string | string[];
  template: K;
  data:     EmailTemplateData<K>;
  /** Override the rendered subject if the template default doesn't fit. */
  subject?: string;
}

interface RenderedEmail { subject: string; html: string; text: string; }

export async function sendEmail<K extends EmailTemplateName>(args: SendArgs<K>): Promise<{ ok: boolean }> {
  const recipients = Array.isArray(args.to) ? args.to : [args.to];
  if (recipients.length === 0) return { ok: false };

  let rendered: RenderedEmail;
  try {
    const tmpl = templates[args.template] as (data: EmailTemplateData<K>) => RenderedEmail;
    rendered = tmpl(args.data);
  } catch (err) {
    console.error('[email] template render failed:', err);
    return { ok: false };
  }
  const subject = args.subject ?? rendered.subject;

  try {
    if (TRANSPORT === 'console') {
      consoleTransport(recipients, subject, rendered);
      return { ok: true };
    }
    if (TRANSPORT === 'resend') {
      return await resendTransport(recipients, subject, rendered);
    }
    if (TRANSPORT === 'smtp') {
      return await smtpTransport(recipients, subject, rendered);
    }
  } catch (err) {
    // Best-effort — log and continue.
    console.error('[email] send failed:', err);
  }
  return { ok: false };
}

// ─────────────────────────────────────────────────────────────────
// Transports
// ─────────────────────────────────────────────────────────────────

function consoleTransport(to: string[], subject: string, body: RenderedEmail): void {
  const line = '─'.repeat(70);
  console.log('\n' + line);
  console.log(`📧  EMAIL [console transport — set EMAIL_TRANSPORT=resend|smtp to send]`);
  console.log(`    From:    ${FROM}`);
  console.log(`    To:      ${to.join(', ')}`);
  console.log(`    Subject: ${subject}`);
  console.log(line);
  console.log(body.text);
  console.log(line + '\n');
}

async function resendTransport(to: string[], subject: string, body: RenderedEmail): Promise<{ ok: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY missing — falling back to console');
    consoleTransport(to, subject, body);
    return { ok: false };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html: body.html, text: body.text }),
  });
  if (!res.ok) {
    console.error('[email] Resend failure:', res.status, await res.text().catch(() => ''));
    return { ok: false };
  }
  return { ok: true };
}

async function smtpTransport(to: string[], subject: string, body: RenderedEmail): Promise<{ ok: boolean }> {
  // Lazy-require nodemailer so it's only loaded if the transport is actually used.
  let nodemailer;
  try { nodemailer = (await import('nodemailer')).default; }
  catch { console.warn('[email] nodemailer not installed — falling back to console'); consoleTransport(to, subject, body); return { ok: false }; }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn('[email] SMTP_* envs missing — falling back to console');
    consoleTransport(to, subject, body);
    return { ok: false };
  }
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transporter.sendMail({ from: FROM, to, subject, html: body.html, text: body.text });
  return { ok: true };
}
