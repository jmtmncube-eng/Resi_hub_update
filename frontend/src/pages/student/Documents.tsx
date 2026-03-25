import { useQuery } from '@tanstack/react-query';
import { FileText, Download, FileCheck, FileClock } from 'lucide-react';
import { getMyDocuments } from '../../services/document.service';
import { ResidentDocument } from '../../types/domain.types';

const STATUS_STYLE: Record<string, string> = {
  Paid:    'bg-green-500/15 text-green-400',
  Overdue: 'bg-rh-rose/15 text-rh-rose',
  Signed:  'bg-rh-cyan/15 text-rh-cyan',
  Pending: 'bg-yellow-500/15 text-yellow-400',
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  INVOICE:  <FileClock  size={16} />,
  CONTRACT: <FileCheck  size={16} />,
  LETTER:   <FileText   size={16} />,
};

const TYPE_COLOR: Record<string, string> = {
  INVOICE:  'bg-rh-rose/15 text-rh-rose',
  CONTRACT: 'bg-rh-cyan/15 text-rh-cyan',
  LETTER:   'bg-white/10 text-white/60',
};

export default function Documents() {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn:  getMyDocuments,
  });

  const invoices  = docs.filter(d => d.type === 'INVOICE');
  const contracts = docs.filter(d => d.type === 'CONTRACT');
  const letters   = docs.filter(d => d.type === 'LETTER');

  return (
    <div className="space-y-5 appear">
      <div>
        <h1 className="text-xl font-semibold text-white">Documents</h1>
        <p className="text-sm text-white/40 mt-0.5">Your invoices, contracts, and official letters</p>
      </div>

      {isLoading
        ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-rh-bg2 rounded-xl animate-pulse" />)}</div>
        : docs.length === 0
          ? (
            <div className="bg-rh-bg2 border border-white/7 rounded-2xl py-12 text-center">
              <FileText size={28} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No documents yet</p>
            </div>
          )
          : (
            <div className="space-y-6">
              {[
                { label: 'Invoices', items: invoices },
                { label: 'Contracts', items: contracts },
                { label: 'Letters', items: letters },
              ].filter(g => g.items.length > 0).map(group => (
                <div key={group.label}>
                  <h2 className="text-sm font-semibold text-white/60 mb-2">{group.label}</h2>
                  <div className="bg-rh-bg2 border border-white/7 rounded-2xl divide-y divide-white/5">
                    {group.items.map(doc => <DocRow key={doc.id} doc={doc} />)}
                  </div>
                </div>
              ))}
            </div>
          )
      }
    </div>
  );
}

function DocRow({ doc }: { doc: ResidentDocument }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${TYPE_COLOR[doc.type]}`}>
        {TYPE_ICON[doc.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{doc.type.charAt(0) + doc.type.slice(1).toLowerCase()}</p>
          <span className="text-xs text-white/30 font-mono">—</span>
          <p className="text-sm text-white/60">{doc.period}</p>
        </div>
        {doc.amount && doc.amount !== '—' && (
          <p className="text-xs text-white/40 font-mono mt-0.5">{doc.amount}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${STATUS_STYLE[doc.status] ?? 'bg-white/5 text-white/30'}`}>
          {doc.status}
        </span>
        {doc.fileUrl && (
          <a href={doc.fileUrl} download
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <Download size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
