/**
 * Email templates — kept as plain functions returning {subject, html, text}
 * so we don't need a templating library. Adding a new template is one
 * function + one entry in the `templates` map below.
 */

interface Rendered { subject: string; html: string; text: string; }

// ─────────────────────────────────────────────────────────────────
// Shared chrome
// ─────────────────────────────────────────────────────────────────

function shell(args: { title: string; intro: string; body: string; cta?: { label: string; url: string } }): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0f0f12;font-family:'Helvetica Neue',Arial,sans-serif;color:#e8e8e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f12;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#16161b;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">
        <tr><td style="height:3px;background:linear-gradient(90deg,#00CCCC,#E8197A);"></td></tr>
        <tr><td style="padding:28px 32px 18px;">
          <p style="margin:0;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#00CCCC;font-weight:700;">RESIHUB</p>
          <h1 style="margin:14px 0 0;font-size:22px;color:#fff;letter-spacing:-.01em;">${escapeHtml(args.title)}</h1>
          <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,.78);line-height:1.6;">${args.intro}</p>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <div style="font-size:14px;color:rgba(255,255,255,.78);line-height:1.7;">${args.body}</div>
          ${args.cta ? `<p style="margin:24px 0 0;"><a href="${args.cta.url}" style="display:inline-block;padding:11px 22px;background:#00CCCC;color:#0f0f12;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">${escapeHtml(args.cta.label)}</a></p>` : ''}
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid rgba(255,255,255,.08);font-size:11px;color:rgba(255,255,255,.42);font-family:'Courier New',monospace;">
          Built by Athera · You're receiving this because you have a ResiHub account.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────

interface InvoiceCreatedData    { name: string; period: string; amount: string | number; }
interface ContractReadyData     { name: string; period: string; }
interface ChoreApprovedData     { name: string; choreName: string; credits: number; }
interface ChoreRejectedData     { name: string; choreName: string; reason: string; }
interface NewApplicantData      { adminName: string; applicantName: string; applicantEmail: string; }
interface MaintenanceTriagedData{ studentName: string; ticketTitle: string; status: string; adminNote?: string; }
interface AccountApprovedData   { name: string; }
interface AccountDeactivatedData{ name: string; }

export const templates = {
  invoiceCreated: (d: InvoiceCreatedData): Rendered => {
    const subject = `Your ResiHub invoice — ${d.period}`;
    const intro   = `Hi ${escapeHtml(d.name)}, your rent invoice for <b>${escapeHtml(d.period)}</b> is ready.`;
    const body    = `<p style="margin:0 0 12px;"><b style="color:#fff;font-size:18px;">R${escapeHtml(String(d.amount))}</b> due — pay via EFT and upload your proof in the app.</p>`;
    return { subject, html: shell({ title: 'New rent invoice', intro, body, cta: { label: 'Open Documents', url: `${APP_URL}/documents` } }), text: stripHtml(intro + ' ' + body) };
  },
  contractReady: (d: ContractReadyData): Rendered => {
    const subject = `Sign your lease — ${d.period}`;
    const intro   = `Hi ${escapeHtml(d.name)}, your lease agreement is ready to review and e-sign.`;
    return { subject, html: shell({ title: 'Lease ready to sign', intro, body: '', cta: { label: 'Open Contract', url: `${APP_URL}/documents` } }), text: stripHtml(intro) };
  },
  choreApproved: (d: ChoreApprovedData): Rendered => {
    const subject = `+${d.credits} 🪙 — chore approved`;
    const intro   = `Nice work, ${escapeHtml(d.name)}! Admin approved your proof for <b>${escapeHtml(d.choreName)}</b>.`;
    const body    = `<p style="margin:0;"><b style="color:#00CCCC;">+${d.credits} credits</b> have been added to your wallet.</p>`;
    return { subject, html: shell({ title: 'Chore approved', intro, body, cta: { label: 'View Wallet', url: `${APP_URL}/wallet` } }), text: stripHtml(intro + ' ' + body) };
  },
  choreRejected: (d: ChoreRejectedData): Rendered => {
    const subject = `Resubmit your proof — ${d.choreName}`;
    const intro   = `Hi ${escapeHtml(d.name)}, admin rejected your proof for <b>${escapeHtml(d.choreName)}</b>. Take a clearer photo and resubmit.`;
    const body    = d.reason ? `<p style="margin:0 0 8px;color:rgba(255,255,255,.55);font-size:12px;">Reason: ${escapeHtml(d.reason)}</p>` : '';
    return { subject, html: shell({ title: 'Chore proof rejected', intro, body, cta: { label: 'Open Chores', url: `${APP_URL}/housemates` } }), text: stripHtml(intro + ' ' + body) };
  },
  newApplicant: (d: NewApplicantData): Rendered => {
    const subject = `New applicant: ${d.applicantName}`;
    const intro   = `Hi ${escapeHtml(d.adminName)}, <b>${escapeHtml(d.applicantName)}</b> (${escapeHtml(d.applicantEmail)}) just registered and is awaiting approval.`;
    return { subject, html: shell({ title: 'New applicant awaiting approval', intro, body: '', cta: { label: 'Review applicant', url: `${APP_URL}/admin/accounts` } }), text: stripHtml(intro) };
  },
  maintenanceTriaged: (d: MaintenanceTriagedData): Rendered => {
    const subject = `Your maintenance ticket — ${d.status}`;
    const intro   = `Hi ${escapeHtml(d.studentName)}, your ticket "<b>${escapeHtml(d.ticketTitle)}</b>" is now <b>${escapeHtml(d.status)}</b>.`;
    const body    = d.adminNote ? `<p style="margin:0;color:rgba(255,255,255,.78);">Note from admin: <em>${escapeHtml(d.adminNote)}</em></p>` : '';
    return { subject, html: shell({ title: 'Maintenance update', intro, body, cta: { label: 'Open ticket', url: `${APP_URL}/maintenance` } }), text: stripHtml(intro + ' ' + body) };
  },
  accountApproved: (d: AccountApprovedData): Rendered => {
    const subject = `Welcome to ResiHub — you're approved`;
    const intro   = `Hi ${escapeHtml(d.name)}, an admin has approved your application. Your room and first invoice are ready in the app.`;
    return { subject, html: shell({ title: 'Account approved 🎉', intro, body: '', cta: { label: 'Open ResiHub', url: APP_URL } }), text: stripHtml(intro) };
  },
  accountDeactivated: (d: AccountDeactivatedData): Rendered => {
    const subject = `Your ResiHub account has been deactivated`;
    const intro   = `Hi ${escapeHtml(d.name)}, your account was deactivated by an administrator. Please contact your residence office if you think this is a mistake.`;
    return { subject, html: shell({ title: 'Account deactivated', intro, body: '' }), text: stripHtml(intro) };
  },
};

export type EmailTemplateName = keyof typeof templates;
export type EmailTemplateData<K extends EmailTemplateName> =
  Parameters<typeof templates[K]>[0];

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
