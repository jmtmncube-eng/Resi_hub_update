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
interface PasswordResetData    { name: string; resetUrl: string; expiresInMinutes: number; }
interface ComplianceDocUploadedData { adminName: string; studentName: string; docType: string; }
interface ComplianceDocRejectedData { name: string; docType: string; reason: string; }
interface ComplianceDocReminderData { name: string; docTypes: string[]; }
interface PaymentProofAcknowledgedData { name: string; period: string; }
interface PaymentProofClearedData      { name: string; period: string; amount: string; }
interface PaymentProofRejectedData     { name: string; period: string; }

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
  complianceDocUploaded: (d: ComplianceDocUploadedData): Rendered => {
    const subject = `Compliance doc to review — ${d.studentName}`;
    const intro   = `Hi ${escapeHtml(d.adminName)}, <b>${escapeHtml(d.studentName)}</b> just uploaded their <b>${escapeHtml(d.docType)}</b> for review.`;
    return { subject, html: shell({ title: 'Compliance doc submitted', intro, body: '', cta: { label: 'Open compliance review', url: `${APP_URL}/admin/compliance` } }), text: stripHtml(intro) };
  },
  complianceDocReminder: (d: ComplianceDocReminderData): Rendered => {
    const list   = d.docTypes.map(t => `<li>${escapeHtml(t)}</li>`).join('');
    const plural = d.docTypes.length === 1 ? 'a compliance document' : 'compliance documents';
    const subject = `Reminder: please upload your ${plural}`;
    const intro   = `Hi ${escapeHtml(d.name)}, this is a friendly reminder to upload the following compliance ${d.docTypes.length === 1 ? 'document' : 'documents'} to your ResiHub profile.`;
    const body    = `<ul style="margin:0 0 8px;padding-left:20px;color:rgba(255,255,255,.78);">${list}</ul>`;
    return { subject, html: shell({ title: 'Compliance docs needed', intro, body, cta: { label: 'Upload from your profile', url: `${APP_URL}/profile` } }), text: stripHtml(intro + ' ' + d.docTypes.join(', ')) };
  },
  complianceDocRejected: (d: ComplianceDocRejectedData): Rendered => {
    const subject = `Your ${d.docType} needs re-uploading`;
    const intro   = `Hi ${escapeHtml(d.name)}, an admin reviewed your <b>${escapeHtml(d.docType)}</b> and it didn't pass. Please upload a clearer / corrected version.`;
    const body    = d.reason ? `<p style="margin:0 0 8px;color:rgba(255,255,255,.78);">Reason: <em>${escapeHtml(d.reason)}</em></p>` : '';
    return { subject, html: shell({ title: 'Compliance doc rejected', intro, body, cta: { label: 'Re-upload from your profile', url: `${APP_URL}/profile` } }), text: stripHtml(intro + ' ' + body) };
  },
  paymentProofAcknowledged: (d: PaymentProofAcknowledgedData): Rendered => {
    const subject = `We've received your proof — ${d.period}`;
    const intro   = `Hi ${escapeHtml(d.name)}, admin has reviewed your payment proof for <b>${escapeHtml(d.period)}</b>. Your invoice will be marked Paid once the funds reflect in the residence account (usually 1–3 business days for EFT).`;
    return { subject, html: shell({ title: 'Proof received', intro, body: '', cta: { label: 'Open Invoices', url: `${APP_URL}/documents` } }), text: stripHtml(intro) };
  },
  paymentProofCleared: (d: PaymentProofClearedData): Rendered => {
    const subject = `Payment cleared — ${d.period}`;
    const intro   = `Hi ${escapeHtml(d.name)}, your <b>R${escapeHtml(d.amount)}</b> rent payment for <b>${escapeHtml(d.period)}</b> has been confirmed in the residence account. Your invoice is now marked <b>Paid</b>. Thank you!`;
    return { subject, html: shell({ title: 'Payment cleared 🎉', intro, body: '', cta: { label: 'View receipt', url: `${APP_URL}/documents` } }), text: stripHtml(intro) };
  },
  paymentProofRejected: (d: PaymentProofRejectedData): Rendered => {
    const subject = `Re-upload needed — ${d.period}`;
    const intro   = `Hi ${escapeHtml(d.name)}, your payment proof for <b>${escapeHtml(d.period)}</b> couldn't be verified — please upload a clearer screenshot or the correct one.`;
    const body    = `<p style="margin:0;color:rgba(255,255,255,.62);font-size:12px;">Common reasons: image too blurry, wrong reference / period, amount doesn't match the invoice.</p>`;
    return { subject, html: shell({ title: 'Proof needs re-uploading', intro, body, cta: { label: 'Re-upload from Invoices', url: `${APP_URL}/documents` } }), text: stripHtml(intro + ' ' + body) };
  },
  passwordReset: (d: PasswordResetData): Rendered => {
    const subject = `Reset your ResiHub password`;
    const intro   = `Hi ${escapeHtml(d.name)}, we received a request to reset your password. Tap the button below to set a new one — the link expires in <b>${d.expiresInMinutes} minutes</b>.`;
    const body    = `<p style="margin:0;color:rgba(255,255,255,.62);font-size:12px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>`;
    return { subject, html: shell({ title: 'Reset your password', intro, body, cta: { label: 'Reset password', url: d.resetUrl } }), text: stripHtml(intro + ' ' + body) };
  },
};

export type EmailTemplateName = keyof typeof templates;
export type EmailTemplateData<K extends EmailTemplateName> =
  Parameters<typeof templates[K]>[0];

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
