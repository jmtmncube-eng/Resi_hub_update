import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, MapPin, Calendar, Tag, AlertOctagon, Send,
  MessageSquare, User as UserIcon, ShieldCheck, Image as ImageIcon,
} from 'lucide-react';
import { getTicket, updateTicket } from '../../services/maintenance.service';
import { useAuth } from '../../contexts/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ROUTES } from '../../constants/routes';
import { TicketPriority, TicketStatus } from '../../types/domain.types';
import { TicketSLAChip } from '../../components/TicketSLAChip';

// Same accent palette as the queue page — one colour grammar across
// list + detail. Industry-standard ITSM hues: rose / amber / green / gray.
const STATUS_ACCENT: Record<TicketStatus, { border: string; tint: string; label: string }> = {
  OPEN:        { border: '#E8197A', tint: 'rgba(232,25,122,.08)', label: 'OPEN' },
  IN_PROGRESS: { border: '#f59e0b', tint: 'rgba(245,158,11,.08)', label: 'IN PROGRESS' },
  RESOLVED:    { border: '#22c55e', tint: 'rgba(34,197,94,.08)',  label: 'RESOLVED' },
  CLOSED:      { border: '#6b7280', tint: 'rgba(107,114,128,.06)', label: 'CLOSED' },
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  EMERGENCY: '#ef4444',
  HIGH:      '#fb923c',
  NORMAL:    'var(--text2)',
  LOW:       'var(--text4)',
};

/**
 * Ticket detail — Freshdesk-style conversation thread.
 *
 * Header carries the subject + meta chips (status, priority, category,
 * location, dates). Below is an email-style thread: the original ticket
 * from the student, then every status / priority change as a system
 * message with the actor's name, then admin notes as reply bubbles.
 * Bottom of the page has a reply box where the admin can post a new
 * admin note + change status/priority in one go.
 */
export default function AdminTicketDetail() {
  const { ticketId = '' } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const qc = useQueryClient();

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn:  () => getTicket(ticketId),
    enabled:  !!ticketId,
  });

  usePageTitle(ticket ? `${ticket.category} · Ticket` : 'Ticket');

  const [reply, setReply]       = useState('');
  const [newStatus, setStatus]  = useState<string>('');
  const [newPriority, setPrio]  = useState<string>('');

  const update = useMutation({
    mutationFn: () => updateTicket(ticketId, {
      adminNote: reply.trim() || undefined,
      status:    (newStatus   || undefined) as TicketStatus | undefined,
      priority:  (newPriority || undefined) as TicketPriority | undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      setReply(''); setStatus(''); setPrio('');
      toast.success('Update posted — student notified.');
    },
    onError: () => toast.error('Could not post update'),
  });

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--cyan)' }} />
      </div>
    );
  }
  if (isError || !ticket) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'var(--rose)' }}>Could not load this ticket.</p>
        <button onClick={() => navigate(ROUTES.ADMIN_MAINTENANCE)} className="btn-secondary" style={{ marginTop: 12 }}>
          Back to tickets
        </button>
      </div>
    );
  }

  const accent      = STATUS_ACCENT[ticket.status] ?? STATUS_ACCENT.CLOSED;
  const prioColor   = PRIORITY_COLOR[ticket.priority] ?? 'var(--text3)';
  const isEmergency = ticket.priority === 'EMERGENCY';
  // Newest-first from backend → render in chronological order in the
  // thread so it reads top-to-bottom (oldest first, like an email
  // thread). Reverse a copy so we don't mutate the cached array.
  const updatesChrono = [...(ticket.updates ?? [])].reverse();
  const studentName   = ticket.student?.name  ?? 'Resident';
  const studentEmail  = ticket.student?.email ?? '';

  return (
    <div className="space-y-5 appear">
      {/* Back link */}
      <div>
        <Link to={ROUTES.ADMIN_MAINTENANCE} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)', textDecoration: 'none' }}>
          <ArrowLeft size={13} /> All tickets
        </Link>
      </div>

      {/* Header card — accent-bordered to match the queue list */}
      <div className="card" style={{
        padding: '20px 24px',
        borderLeft: `4px solid ${accent.border}`,
        background: accent.tint,
        position: 'relative',
      }}>
        {isEmergency && (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') && (
          <span
            title="EMERGENCY priority"
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 10, height: 10, borderRadius: '50%',
              background: '#ef4444',
              animation: 'rh-pulse 1.6s ease-in-out infinite',
            }}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          <h1 className="page-title" style={{ margin: 0 }}>{ticket.category}</h1>
          <span className="badge" style={{
            fontSize: 10, fontWeight: 700,
            background: accent.tint, color: accent.border, border: `1px solid ${accent.border}55`,
          }}>
            {accent.label}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: prioColor, fontFamily: "'IBM Plex Mono', monospace" }}>
            {isEmergency && <AlertOctagon size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />}
            {ticket.priority}
          </span>
          <TicketSLAChip ticket={ticket} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text3)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MapPin size={12} /> {ticket.location}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Calendar size={12} /> {new Date(ticket.createdAt).toLocaleString()}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Tag size={12} /> #{ticket.id.slice(0, 8)}</span>
        </div>
      </div>

      {/* Conversation thread — Freshdesk-style messages */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.04em', textTransform: 'uppercase' }}>
          Conversation · {updatesChrono.length + 1} {updatesChrono.length === 0 ? 'entry' : 'entries'}
        </div>

        {/* Original ticket — first message from the student */}
        <Message
          from={studentName}
          fromEmail={studentEmail}
          tone="student"
          when={ticket.createdAt}
          subject="Reported"
        >
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>
            {ticket.description}
          </p>
          {/* Attachments — clickable thumbnails */}
          {ticket.mediaUrls && ticket.mediaUrls.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {ticket.mediaUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                   style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 10px',
                     borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)',
                     color: 'var(--text2)', textDecoration: 'none' }}>
                  <ImageIcon size={11} /> attachment-{i + 1}
                </a>
              ))}
            </div>
          )}
        </Message>

        {/* Every audit-trail entry as a system / admin message */}
        {updatesChrono.map(u => {
          const isAdminNote = !!u.changes?.adminNote;
          return (
            <Message
              key={u.id}
              from={u.actorName}
              tone={isAdminNote ? 'admin' : 'system'}
              when={u.createdAt}
              subject={isAdminNote ? 'Replied' : 'Updated'}
            >
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>{u.summary}</p>
              {isAdminNote && typeof u.changes.adminNote === 'object' && u.changes.adminNote && 'to' in u.changes.adminNote && (
                <p style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                  {String((u.changes.adminNote as { to: unknown }).to)}
                </p>
              )}
            </Message>
          );
        })}

        {/* Reply composer — admin can post a note + change status/priority
            in one go. Mirrors the inline editor on the queue page but
            framed as a "reply" for the conversation metaphor. */}
        <div style={{ padding: '18px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.04em', textTransform: 'uppercase' }}>
            <MessageSquare size={13} style={{ color: 'var(--cyan)' }} />
            Reply as {me?.name}
          </div>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            placeholder="Type a note — visible to the student in their ticket history…"
            className="input-base"
            style={{ resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={newStatus} onChange={e => setStatus(e.target.value)} className="input-base" style={{ maxWidth: 200, fontSize: 12 }}>
              <option value="">Keep status ({ticket.status})</option>
              {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as TicketStatus[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={newPriority} onChange={e => setPrio(e.target.value)} className="input-base" style={{ maxWidth: 200, fontSize: 12 }}>
              <option value="">Keep priority ({ticket.priority})</option>
              {(['EMERGENCY', 'HIGH', 'NORMAL', 'LOW'] as TicketPriority[]).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <span style={{ flex: 1 }} />
            <button
              onClick={() => update.mutate()}
              disabled={update.isPending || (!reply.trim() && !newStatus && !newPriority)}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {update.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {update.isPending ? 'Posting…' : 'Post update'}
            </button>
          </div>
          <p style={{ marginTop: 8, fontSize: 10, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace" }}>
            The note + any state changes are recorded in the conversation and the student is notified.
          </p>
        </div>
      </div>

      {/* Reuse the keyframes injected by the queue page (no-op on this
          page if user navigated here directly — the animation just won't
          run, which is fine. Defining locally too is harmless). */}
      <style>{`
        @keyframes rh-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,.55); }
          50%      { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────
// `tone='student'` = cyan avatar (original report).
// `tone='admin'`   = rose avatar (admin reply with a note).
// `tone='system'`  = neutral icon (status/priority change with no note).
function Message({ from, fromEmail, tone, when, subject, children }: {
  from: string;
  fromEmail?: string;
  tone: 'student' | 'admin' | 'system';
  when: string;
  subject: string;
  children: React.ReactNode;
}) {
  const isStudent = tone === 'student';
  const isAdmin   = tone === 'admin';
  const isSystem  = tone === 'system';
  const avatarBg  = isStudent ? 'rgba(0,204,204,.15)'
                  : isAdmin   ? 'rgba(232,25,122,.15)'
                  :             'var(--bg3)';
  const avatarColor = isStudent ? 'var(--cyan)' : isAdmin ? 'var(--rose)' : 'var(--text3)';
  const Icon = isStudent ? UserIcon : isAdmin ? ShieldCheck : MessageSquare;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '40px 1fr',
      gap: 14,
      padding: '16px 20px',
      borderBottom: '1px solid var(--border)',
      background: isSystem ? 'transparent' : 'var(--bg)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: avatarBg, color: avatarColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} />
      </div>
      <div style={{ minWidth: 0 }}>
        {/* Email-style "From / Subject / Date" header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{from}</span>
          {fromEmail && (
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
              &lt;{fromEmail}&gt;
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace" }}>
            · {subject}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace" }}>
            {new Date(when).toLocaleString()}
          </span>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
