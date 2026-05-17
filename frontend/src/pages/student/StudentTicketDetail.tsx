import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Loader2, MapPin, Calendar, Tag, AlertOctagon,
  MessageSquare, User as UserIcon, ShieldCheck, Image as ImageIcon,
} from 'lucide-react';
import { getTicket } from '../../services/maintenance.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ROUTES } from '../../constants/routes';
import { TicketPriority, TicketStatus } from '../../types/domain.types';
import { TicketSLAChip } from '../../components/TicketSLAChip';

// Same accent palette as the admin queue + detail page so the student
// sees the same colour grammar on her own ticket.
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
 * Student-side ticket detail — read-only Freshdesk-style thread.
 * Mirrors AdminTicketDetail but without the reply composer, since
 * student-to-admin messaging isn't a feature yet. Lets the student
 * see exactly what the admin sees about their ticket: the original
 * report, every status / priority change, and any admin notes.
 */
export default function StudentTicketDetail() {
  const { ticketId = '' } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn:  () => getTicket(ticketId),
    enabled:  !!ticketId,
  });

  usePageTitle(ticket ? `${ticket.category} · Ticket` : 'Ticket');

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
        <button onClick={() => navigate(ROUTES.MAINTENANCE)} className="btn-secondary" style={{ marginTop: 12 }}>
          Back to maintenance
        </button>
      </div>
    );
  }

  const accent      = STATUS_ACCENT[ticket.status] ?? STATUS_ACCENT.CLOSED;
  const prioColor   = PRIORITY_COLOR[ticket.priority] ?? 'var(--text3)';
  const isEmergency = ticket.priority === 'EMERGENCY';
  const updatesChrono = [...(ticket.updates ?? [])].reverse();
  const studentName   = ticket.student?.name ?? 'You';

  return (
    <div className="space-y-5 appear">
      <div>
        <Link to={ROUTES.MAINTENANCE} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)', textDecoration: 'none' }}>
          <ArrowLeft size={13} /> Back to my tickets
        </Link>
      </div>

      <div className="card" style={{
        padding: '20px 24px',
        borderLeft: `4px solid ${accent.border}`,
        background: accent.tint,
      }}>
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

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.04em', textTransform: 'uppercase' }}>
          Conversation · {updatesChrono.length + 1} {updatesChrono.length === 0 ? 'entry' : 'entries'}
        </div>

        <Message from={studentName} tone="student" when={ticket.createdAt} subject="You reported">
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>
            {ticket.description}
          </p>
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
      </div>
    </div>
  );
}

function Message({ from, tone, when, subject, children }: {
  from: string;
  tone: 'student' | 'admin' | 'system';
  when: string;
  subject: string;
  children: React.ReactNode;
}) {
  const isStudent = tone === 'student';
  const isAdmin   = tone === 'admin';
  const avatarBg  = isStudent ? 'rgba(0,204,204,.15)'
                  : isAdmin   ? 'rgba(232,25,122,.15)'
                  :             'var(--bg3)';
  const avatarColor = isStudent ? 'var(--cyan)' : isAdmin ? 'var(--rose)' : 'var(--text3)';
  const Icon = isStudent ? UserIcon : isAdmin ? ShieldCheck : MessageSquare;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '40px 1fr', gap: 14,
      padding: '16px 20px', borderBottom: '1px solid var(--border)',
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{from}</span>
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
